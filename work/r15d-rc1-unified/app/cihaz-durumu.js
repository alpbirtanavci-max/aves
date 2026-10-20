// Cihaz senkron durumu: cihazın sunucuya bildirdiği satırın üretimi ve yönetici görünümü için sınıflandırma.
// Satır SAHA CEVABI, firma adı, adres veya parola İÇERMEZ: yalnız sayılar, durum, kısa hata ve denetim kimlikleri.
(function expose(root) {
  'use strict';

  const BEKLEYEN = ['pending', 'retry', 'sending'];
  const kes = (value, n) => String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, n);
  const durumuOf = item => item.sync_status || 'pending';
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // girdi: { cihazId, surum, cevrimici, outbox:[], bekleyenFotograf }
  function olustur(girdi) {
    const outbox = Array.isArray(girdi.outbox) ? girdi.outbox : [];
    const sayi = durum => outbox.filter(item => durumuOf(item) === durum).length;
    const denetimler = new Map();
    outbox.forEach(item => {
      const id = String(item.inspection_id || '');
      if (!UUID.test(id)) return;
      const kayit = denetimler.get(id) || { id, bekleyen: 0, cakisma: 0, yetki: 0 };
      const d = durumuOf(item);
      if (d === 'conflict') kayit.cakisma += 1;
      else if (d === 'forbidden') kayit.yetki += 1;
      else kayit.bekleyen += 1;
      denetimler.set(id, kayit);
    });
    const bekleyenler = outbox.filter(item => BEKLEYEN.includes(durumuOf(item)) || ['conflict', 'forbidden'].includes(durumuOf(item)));
    const enEski = bekleyenler.map(item => item.created_at).filter(Boolean).sort()[0] || null;
    const sonHata = [...outbox].reverse().map(item => item.last_error_message).find(Boolean) || '';
    const satir = {
      cihaz_id: kes(girdi.cihazId, 80),
      uygulama_surumu: kes(girdi.surum, 40),
      cevrimici: !!girdi.cevrimici,
      bekleyen_islem: outbox.length,
      cakisma: sayi('conflict'),
      yetki_bekleyen: sayi('forbidden'),
      yeniden_deneme: sayi('retry'),
      bekleyen_fotograf: Math.max(0, Number(girdi.bekleyenFotograf) || 0),
      en_eski_bekleyen_at: enEski,
      son_hata: kes(sonHata, 300) || null,
      denetimler: [...denetimler.values()].slice(0, 50),
    };
    // İmza: durum değişmedikçe sık sık yeniden bildirilmesin
    const imza = [satir.bekleyen_islem, satir.cakisma, satir.yetki_bekleyen, satir.yeniden_deneme,
      satir.bekleyen_fotograf, satir.cevrimici ? 1 : 0, satir.denetimler.map(d => `${d.id}:${d.bekleyen}/${d.cakisma}/${d.yetki}`).join(',')].join('|');
    return { satir, imza };
  }

  const SAAT = 3600 * 1000;

  // satir: sunucudan gelen kayıt. Dönüş: { seviye, nedenler[], bekleSaat }
  //   sorunlu = çakışma / yetki incelemesi var · sessiz = bekleyen iş var ama cihaz 24 saattir haber vermiyor
  //   bekliyor = bekleyen iş var · temiz = bekleyen yok
  function durum(satir, simdiMs) {
    const nedenler = [];
    const yas = simdiMs - Date.parse(satir.bildirildi_at || 0);
    const isVar = (satir.bekleyen_islem || 0) > 0 || (satir.bekleyen_fotograf || 0) > 0;
    const bekle = satir.en_eski_bekleyen_at ? (simdiMs - Date.parse(satir.en_eski_bekleyen_at)) / SAAT : 0;
    if ((satir.cakisma || 0) > 0) nedenler.push(`${satir.cakisma} çakışma`);
    if ((satir.yetki_bekleyen || 0) > 0) nedenler.push(`${satir.yetki_bekleyen} yetki incelemesi`);
    const normal = (satir.bekleyen_islem || 0) - (satir.cakisma || 0) - (satir.yetki_bekleyen || 0);
    if (normal > 0) nedenler.push(`${normal} işlem bekliyor`);
    if ((satir.bekleyen_fotograf || 0) > 0) nedenler.push(`${satir.bekleyen_fotograf} fotoğraf bekliyor`);
    let seviye = 'temiz';
    if ((satir.cakisma || 0) > 0 || (satir.yetki_bekleyen || 0) > 0) seviye = 'sorunlu';
    else if (isVar && yas > 24 * SAAT) seviye = 'sessiz';
    else if (isVar) seviye = 'bekliyor';
    if (seviye === 'sessiz') nedenler.push('cihaz 24 saatten uzun süredir haber vermedi');
    return { seviye, nedenler, bekleSaat: Math.round(bekle * 10) / 10 };
  }

  const SIRA = { sorunlu: 0, sessiz: 1, bekliyor: 2, temiz: 3 };
  function sirala(satirlar, simdiMs) {
    return satirlar.map(satir => ({ satir, ...durum(satir, simdiMs) }))
      .sort((a, b) => (SIRA[a.seviye] - SIRA[b.seviye])
        || (b.bekleSaat - a.bekleSaat)
        || String(b.satir.bildirildi_at).localeCompare(String(a.satir.bildirildi_at)));
  }

  function gecenSure(bildirildiAt, simdiMs) {
    const dk = Math.max(0, Math.round((simdiMs - Date.parse(bildirildiAt)) / 60000));
    if (dk < 1) return 'şimdi';
    if (dk < 60) return `${dk} dk önce`;
    if (dk < 48 * 60) return `${Math.round(dk / 60)} sa önce`;
    return `${Math.round(dk / 1440)} gün önce`;
  }

  root.AVES_CIHAZ_DURUMU = Object.freeze({ olustur, durum, sirala, gecenSure, UUID });
})(globalThis);
