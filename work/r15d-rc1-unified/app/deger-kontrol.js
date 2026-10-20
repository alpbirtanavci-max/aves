// Saha ölçü girişinde yanlış birim / olağandışı değer uyarısı.
// Yalnız uyarır: değeri değiştirmez, kaydı engellemez, uygunluk yorumu yapmaz.
(function expose(root) {
  'use strict';

  // [en küçük, en büyük] olağan aralık; birim alan adındaki son ek ya da etikete göre (cm, kg, m/s, adet).
  const ARALIK = {
    yuk: [100, 6000, 'kg'],
    kapasite: [2, 40, 'kişi'],
    hiz: [0.1, 4, 'm/s'],
    durak_sayisi: [2, 80, ''],
    kat_sayisi: [2, 80, ''],
    bina_asansor_sayisi: [1, 30, ''],
    seyir_mesafesi_cm: [100, 15000, 'cm'],
    kuyu_yuksekligi_cm: [200, 16000, 'cm'],
    tahrik_kasnak_capi_cm: [10, 120, 'cm'],
    saptirma_kasnak_capi_cm: [10, 120, 'cm'],
    halat_sarma_acisi: [90, 360, '°'],
    kabin_genislik_cm: [60, 450, 'cm'],
    kabin_derinlik_cm: [60, 450, 'cm'],
    kabin_yukseklik_cm: [150, 350, 'cm'],
    kabin_kat_kapi_genislik_cm: [50, 250, 'cm'],
    kabin_kat_kapi_yukseklik_cm: [150, 300, 'cm'],
    kilavuz_pabucu_araligi_cm: [30, 400, 'cm'],
    ray_toplam_boy_cm: [200, 16000, 'cm'],
    kuyu_genislik_cm: [80, 600, 'cm'],
    kuyu_derinlik_cm: [80, 600, 'cm'],
    kuyu_dibi_cm: [40, 400, 'cm'],
    son_kat_yuksekligi_cm: [200, 700, 'cm'],
    kabin_raylar_arasi_cm: [40, 400, 'cm'],
    karsi_agirlik_raylar_arasi_cm: [30, 400, 'cm'],
    ray_kapi_mesafesi_cm: [0, 150, 'cm'],
    ana_ray_karsi_agirlik_ray_mesafesi_cm: [10, 400, 'cm'],
    karsi_agirlik_genislik_cm: [30, 300, 'cm'],
    karsi_agirlik_derinlik_cm: [5, 100, 'cm'],
    karsi_agirlik_yukseklik_cm: [40, 400, 'cm'],
    kabin_tampon_kaide_yuksekligi_cm: [0, 150, 'cm'],
    kabin_tampon_yuksekligi_cm: [3, 150, 'cm'],
    kabin_tampon_stroku_cm: [2, 120, 'cm'],
    karsi_agirlik_tampon_kaide_yuksekligi_cm: [0, 150, 'cm'],
    karsi_agirlik_tampon_yuksekligi_cm: [3, 150, 'cm'],
    karsi_agirlik_tampon_stroku_cm: [2, 120, 'cm'],
    hidrolik_piston_capi_cm: [2, 40, 'cm'],
    hidrolik_makara_capi_cm: [10, 120, 'cm'],
    hidrolik_piston_adedi: [1, 4, ''],
  };

  const bicim = n => String(Math.round(n * 100) / 100).replace('.', ',');

  // value: kullanıcının girdiği metin ya da sayı. null → uyarı yok.
  function kontrol(key, value) {
    const aralik = ARALIK[key];
    const metin = String(value == null ? '' : value).trim().replace(',', '.');
    if (!aralik || !metin) return null;
    const n = Number(metin);
    if (!Number.isFinite(n)) return null;
    const [en, buyuk, birim] = aralik;
    if (n >= en && n <= buyuk) return null;
    const bas = `${bicim(n)}${birim ? ' ' + birim : ''} olağan aralığın dışında (${bicim(en)}–${bicim(buyuk)}${birim ? ' ' + birim : ''}).`;
    if (birim === 'cm') {
      if (n > 0 && n * 100 >= en && n * 100 <= buyuk) return { tur: 'metre', mesaj: `${bas} Metre olarak mı girdiniz? ${bicim(n)} m = ${bicim(n * 100)} cm.` };
      if (n * 0.1 >= en && n * 0.1 <= buyuk) return { tur: 'mm', mesaj: `${bas} Milimetre olarak mı girdiniz? ${bicim(n)} mm = ${bicim(n / 10)} cm.` };
    }
    if (key === 'hiz' && n >= 10 && n / 100 >= en && n / 100 <= buyuk) {
      return { tur: 'cm_sn', mesaj: `${bas} cm/s olarak mı girdiniz? ${bicim(n)} cm/s = ${bicim(n / 100)} m/s.` };
    }
    if (n < 0) return { tur: 'negatif', mesaj: `${bas} Negatif değer girilemez.` };
    return { tur: 'aralik', mesaj: `${bas} Değer doğruysa devam edebilirsiniz.` };
  }

  root.AVES_DEGER_KONTROL = Object.freeze({ kontrol, ARALIK });
})(globalThis);
