// Veri güvencesi: kullanıcıya "verim sunucuda mı?" sorusunun net, kanıta dayalı cevabı.
// Saf mantık (DOM/DB/ağ yok): hem uygulama hem testler aynı kuralları kullanır.
// Bu modül uygunluk veya belgelendirme kararı üretmez; yalnız kaydın nerede durduğunu söyler.
(function (root) {
  'use strict';

  const VARSAYILAN_ESIK_MS = 10 * 60 * 1000; // çevrimiçiyken bu kadar süredir giden olmayan veri "uyarı" olur

  const dakika = ms => Math.max(1, Math.round(ms / 60000));
  const sure = ms => {
    const dk = dakika(ms);
    if (dk < 90) return `${dk} dk`;
    const saat = Math.round(dk / 60);
    return saat < 48 ? `${saat} saat` : `${Math.round(saat / 24)} gün`;
  };
  const saatMetni = iso => {
    const t = Date.parse(iso || '');
    if (!Number.isFinite(t)) return '';
    return new Date(t).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  // girdi: { bekleyen, korunan, bekleyenFoto, bekleyenPdf, enEskiMs, cevrimici, dogrulama, kalicidepo, esikMs }
  // dönüş: { seviye, baslik, detay, eylem } — seviye: guvende | bekliyor | cevrimdisi | uyari | sorun
  function durum(girdi) {
    const g = girdi || {};
    const bekleyen = Number(g.bekleyen || 0);
    const korunan = Number(g.korunan || 0);
    const foto = Number(g.bekleyenFoto || 0);
    const pdf = Number(g.bekleyenPdf || 0);
    const toplam = bekleyen + foto + pdf;
    const esik = Number.isFinite(g.esikMs) ? g.esikMs : VARSAYILAN_ESIK_MS;
    const cevrimici = g.cevrimici !== false;
    const parcalar = [bekleyen && `${bekleyen} işlem`, foto && `${foto} fotoğraf`, pdf && `${pdf} teknik PDF`].filter(Boolean).join(' · ');
    const yas = Number.isFinite(g.enEskiMs) ? g.enEskiMs : null;
    const not = g.kalicidepo === false
      ? ' Tarayıcı verinizi kalıcı saklama izni vermedi; yedek almayı unutmayın.' : '';

    if (korunan > 0) {
      return {
        seviye: 'sorun',
        baslik: `⚠ ${korunan} kayıt sunucuya GİTMEDİ (inceleme gerekiyor)`,
        detay: `Verileriniz bu cihazda korunuyor ama sunucuda yok. Senkron Merkezi’nden inceleyin.${not}`,
        eylem: 'merkez',
      };
    }
    if (toplam > 0 && !cevrimici) {
      return {
        seviye: 'cevrimdisi',
        baslik: `Çevrimdışı · ${parcalar} yalnızca bu cihazda`,
        detay: `Bağlantı gelince otomatik gönderilir.${not}`,
        eylem: null,
      };
    }
    if (toplam > 0 && yas !== null && yas >= esik) {
      return {
        seviye: 'uyari',
        baslik: `⚠ ${parcalar} ${sure(yas)}dır SUNUCUDA DEĞİL`,
        detay: `Bu cihaz çevrimiçi ama veriler gönderilemedi. Şimdi göndermeyi deneyin; olmazsa yedek alın.${not}`,
        eylem: 'gonder',
      };
    }
    if (toplam > 0) {
      return { seviye: 'bekliyor', baslik: `Sunucuya gönderiliyor · ${parcalar}`, detay: `Birkaç saniye içinde tamamlanır.${not}`, eylem: null };
    }
    const d = g.dogrulama || null;
    if (d && d.ok === false) {
      return {
        seviye: 'sorun',
        baslik: '⚠ Sunucudaki kopya bu cihazdakinden FARKLI',
        detay: `${(d.farklar || []).slice(0, 3).join(' · ') || 'Fark ayrıntısı yok'}. Yedek alıp Senkron Merkezi’ni açın.${not}`,
        eylem: 'merkez',
      };
    }
    if (d && d.ok === true) {
      return { seviye: 'guvende', baslik: `✓ Sunucuda doğrulandı${saatMetni(d.at) ? ` · ${saatMetni(d.at)}` : ''}`, detay: `Cihaz ve sunucu kopyaları aynı.${not}`, eylem: null };
    }
    return { seviye: 'guvende', baslik: '✓ Tüm işlemler sunucuya gönderildi', detay: `Henüz karşılaştırmalı doğrulama yapılmadı.${not}`, eylem: null };
  }

  const kanonik = deger => {
    if (Array.isArray(deger)) return `[${deger.map(kanonik).join(',')}]`;
    if (deger && typeof deger === 'object') {
      return `{${Object.keys(deger).sort().filter(k => deger[k] !== undefined).map(k => `${JSON.stringify(k)}:${kanonik(deger[k])}`).join(',')}}`;
    }
    return JSON.stringify(deger === undefined ? null : deger);
  };
  // Yalnız saat damgaları sunucu/yerel arasında farklı olabilir; veri alanları karşılaştırılır.
  const damgaSiz = deger => {
    if (Array.isArray(deger)) return deger.map(damgaSiz);
    if (deger && typeof deger === 'object') {
      const kopya = {};
      for (const k of Object.keys(deger)) if (k !== 'updated_at') kopya[k] = damgaSiz(deger[k]);
      return kopya;
    }
    return deger;
  };

  // yerel/sunucu: { durum, maddeler: [{ madde_id, durum }], formlar: object|null }
  function karsilastir(yerel, sunucu) {
    const farklar = [];
    if (!sunucu) return { ok: false, farklar: ['Denetim sunucuda bulunamadı'] };
    if ((yerel.durum || null) !== (sunucu.durum || null)) farklar.push(`Denetim durumu: cihaz “${yerel.durum}” · sunucu “${sunucu.durum}”`);
    const yerelHarita = new Map((yerel.maddeler || []).map(m => [m.madde_id, m.durum || null]));
    const sunucuHarita = new Map((sunucu.maddeler || []).map(m => [m.madde_id, m.durum || null]));
    const eksik = [...yerelHarita.keys()].filter(id => !sunucuHarita.has(id)).length;
    const fazla = [...sunucuHarita.keys()].filter(id => !yerelHarita.has(id)).length;
    if (eksik) farklar.push(`${eksik} madde sunucuda yok`);
    if (fazla) farklar.push(`${fazla} madde yalnız sunucuda`);
    let farkliSonuc = 0;
    for (const [id, d] of yerelHarita) if (sunucuHarita.has(id) && sunucuHarita.get(id) !== d) farkliSonuc++;
    if (farkliSonuc) farklar.push(`${farkliSonuc} maddenin sonucu farklı`);
    if (yerel.formlar || sunucu.formlar) {
      if (kanonik(damgaSiz(yerel.formlar || null)) !== kanonik(damgaSiz(sunucu.formlar || null))) farklar.push('Form verileri (FR.65/RP.14) farklı');
    }
    return { ok: farklar.length === 0, farklar };
  }

  root.AVES_VERI_GUVENCE = Object.freeze({ durum, karsilastir, kanonik, VARSAYILAN_ESIK_MS });
})(globalThis);
