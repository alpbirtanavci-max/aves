// Kapanış öncesi güven satırları, uygulama ve sentetik smoke fixture'ı için ortak tutulur.
// Bu modül uygunluk veya belgelendirme kararı üretmez; yalnız cihazdaki kayıt durumunu gösterir.
(function (root) {
  'use strict';

  function kartlar(input) {
    const seriKayitSayisi = Number(input.seriKayitSayisi || 0);
    const seriBeklenenSayi = Number(input.seriBeklenenSayi || 0);
    const bekleyenIslemler = Number(input.bekleyenIslemler || 0);
    const korunanIslemler = Number(input.korunanIslemler || 0);
    const fotografSayisi = Number(input.fotografSayisi || 0);
    const bekleyenFotograflar = Number(input.bekleyenFotograflar || 0);
    return [
      {
        durum: seriKayitSayisi >= seriBeklenenSayi ? 'ok' : 'pending',
        baslik: seriKayitSayisi >= seriBeklenenSayi ? '✓ Ekipman seri kayıtları tamam' : 'Ekipman seri kayıtları eksik',
        detay: `${seriKayitSayisi}/${seriBeklenenSayi} zorunlu ekipman grubu kaydedildi`,
      },
      {
        durum: input.offlineReady ? 'ok' : 'pending',
        baslik: input.offlineReady ? '✓ Bu cihaz çevrimdışı kullanıma hazır' : 'Bu cihaz çevrimdışı kullanıma hazır değil',
        detay: input.offlineDetail || 'Hazırlık durumu henüz doğrulanmadı.',
      },
      {
        durum: korunanIslemler ? 'error' : (bekleyenIslemler ? 'pending' : 'ok'),
        baslik: korunanIslemler ? 'Aktarım inceleme gerektiriyor' : (bekleyenIslemler ? 'Kayıt aktarımı bekliyor' : '✓ Cihaz ve sunucu kayıtları eşit'),
        detay: `${bekleyenIslemler ? `${bekleyenIslemler} kayıt aktarım bekliyor` : 'Kayıt aktarımı tamam'}${korunanIslemler ? ` · ${korunanIslemler} kayıt inceleme gerektiriyor` : ''}`,
      },
      {
        durum: bekleyenFotograflar ? 'pending' : 'ok',
        baslik: bekleyenFotograflar ? 'Fotoğraf aktarımı bekliyor' : '✓ Fotoğraf aktarımı tamam',
        detay: `${fotografSayisi} fotoğraf${bekleyenFotograflar ? ` · ${bekleyenFotograflar} fotoğraf aktarım bekliyor` : ''}`,
      },
    ];
  }

  root.AVES_KAPANIS_GUVEN_OZETI = Object.freeze({ kartlar });
})(globalThis);
