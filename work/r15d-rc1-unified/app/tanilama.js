// Tanılama raporu: sahadaki bir cihazın durumunu destek ekibiyle paylaşmak için.
// Saha cevabı, firma adı, adres, parola veya oturum anahtarı İÇERMEZ; yalnız teknik durum ve kısa kimlikler.
(function expose(root) {
  'use strict';

  const kisa = value => String(value || '').slice(0, 8);
  const kes = (value, n = 180) => String(value == null ? '' : value).replace(/\s+/g, ' ').slice(0, n);
  const say = (liste, anahtar) => liste.reduce((acc, item) => { const k = anahtar(item) || 'bilinmiyor'; acc[k] = (acc[k] || 0) + 1; return acc; }, {});

  // girdi: uygulamanın topladığı ham durum (bkz. app.js tanilamaGirdisiTopla)
  function olustur(girdi) {
    const outbox = Array.isArray(girdi.outbox) ? girdi.outbox : [];
    const denetimler = Array.isArray(girdi.denetimler) ? girdi.denetimler : [];
    return {
      format: 'aves-tanilama', surum: 1,
      olusturuldu: girdi.simdi,
      uygulama: girdi.uygulama,
      kullanici: { e_posta: girdi.eposta || null, rol: girdi.rol || null },
      cihaz: {
        id: kisa(girdi.cihazId),
        tarayici: kes(girdi.userAgent, 240),
        cevrimici: !!girdi.cevrimici,
        kurulu_uygulama: !!girdi.kuruluUygulama,
        service_worker: girdi.serviceWorker || 'bilinmiyor',
        kalici_depolama: girdi.kaliciDepolama || 'bilinmiyor',
        bos_alan_mb: Number.isFinite(girdi.bosAlanMb) ? girdi.bosAlanMb : null,
      },
      senkron: {
        bekleyen_islem: outbox.length,
        duruma_gore: say(outbox, item => item.sync_status || 'pending'),
        bekleyen_fotograf: girdi.bekleyenFotograf || 0,
        uyari: girdi.senkronUyarisi ? { tur: girdi.senkronUyarisi.kind || null, mesaj: kes(girdi.senkronUyarisi.message), zaman: girdi.senkronUyarisi.ts || null } : null,
        islemler: outbox.slice(0, 40).map(item => ({
          tablo: item.table || null,
          islem: item.op || item.operation_type || null,
          denetim: kisa(item.inspection_id),
          durum: item.sync_status || 'pending',
          deneme: item.attempt_count || 0,
          hata_kodu: item.last_error_code || null,
          hata: kes(item.last_error_message),
          olusturuldu: item.created_at || null,
        })),
      },
      denetimler: {
        toplam: denetimler.length,
        kayitlar: denetimler.slice(0, 60).map(d => ({
          id: kisa(d.id), modul: d.modul || null, durum: d.denetim_durumu || null,
          guncellendi: d.updated_at || null, calisma_hazir: !!(girdi.hazirIdler && girdi.hazirIdler.includes(d.id)),
        })),
      },
      son_hatalar: (Array.isArray(girdi.hatalar) ? girdi.hatalar : []).slice(-20).map(h => ({ zaman: h.t || null, tur: h.tur || null, mesaj: kes(h.mesaj), kaynak: kes(h.kaynak, 120) })),
    };
  }

  // WhatsApp / e-posta gövdesi için kısa okunabilir özet
  function ozetMetni(rapor) {
    const s = rapor.senkron;
    const durum = Object.entries(s.duruma_gore).map(([k, v]) => `${k}: ${v}`).join(', ') || 'yok';
    return [
      `AVES tanılama — ${rapor.uygulama}`,
      `Kullanıcı: ${rapor.kullanici.e_posta || '-'} (${rapor.kullanici.rol || '-'})`,
      `Cihaz: ${rapor.cihaz.id} · ${rapor.cihaz.cevrimici ? 'çevrimiçi' : 'ÇEVRİMDIŞI'} · kurulu uygulama: ${rapor.cihaz.kurulu_uygulama ? 'evet' : 'hayır'}`,
      `Bekleyen işlem: ${s.bekleyen_islem} (${durum}) · bekleyen fotoğraf: ${s.bekleyen_fotograf}`,
      s.uyari ? `Uyarı: ${s.uyari.mesaj}` : 'Uyarı: yok',
      `Denetim: ${rapor.denetimler.toplam} · son hata sayısı: ${rapor.son_hatalar.length}`,
      'Ayrıntı ekteki dosyada.',
    ].join('\n');
  }

  root.AVES_TANILAMA = Object.freeze({ olustur, ozetMetni });
})(globalThis);
