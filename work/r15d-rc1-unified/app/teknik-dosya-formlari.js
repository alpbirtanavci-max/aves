// ÜB.FR.65 / ÜB.RP.14 kontrollü dokümanlarından türetilen saha kayıt şeması.
// Bu şema saha notlarını yapılandırır; uygunluk veya belgelendirme kararı üretmez.
(function (root) {
  'use strict';

  const FR65 = {
    code: 'ÜB.FR.65',
    revision: '00',
    title: 'Teknik Dosya–Saha Eşleşme Formu',
    sections: [
      {
        key: 'kimlik', title: 'Asansör, proje ve genel beyan bilgileri', fields: [
          ['asansor_tipi', 'Asansör tipi / elektrikli–hidrolik'],
          ['dosya_no', 'Dosya / rapor numarası'],
          ['montaj_adresi', 'Montaj adresi'],
          ['asansor_sinifi', 'Asansör sınıfı'],
          ['montaj_yili', 'Montaj yılı'],
          ['ana_tip', 'Ana tip'],
          ['tip_varyant_kodu', 'Tip / varyant kodu'],
          ['beyan_yuku', 'Beyan edilen yük (kg)'],
          ['kapasite', 'Beyan edilen kişi kapasitesi'],
          ['beyan_hizi', 'Beyan edilen hız (m/s)'],
          ['durak_kat_sayisi', 'Durak / kat sayısı'],
          ['seyir_mesafesi', 'Seyir mesafesi'],
          ['kuyu_yuksekligi', 'Kuyu yüksekliği'],
        ],
      },
      {
        key: 'guvenlik_bilesenleri', title: 'Güvenlik bileşenleri ve ekipman kimliği', fields: [
          ['kat_kapisi_kilitleri', 'Kat kapısı kilitleri (üretici, tip, seri, CE/ON bilgisi)'],
          ['parasut_freni', 'Paraşüt fren / güvenlik tertibatı (üretici, tip, seri, CE/ON bilgisi)'],
          ['kabin_tamponu', 'Kabin tamponu (üretici, tip, seri, CE/ON bilgisi)'],
          ['karsi_agirlik_tamponu', 'Karşı ağırlık tamponu (üretici, tip, seri, CE/ON bilgisi)'],
          ['regulator', 'Hız regülatörü (üretici, tip, seri, CE/ON bilgisi)'],
          ['ucm', 'İstenmeyen kabin hareketi tertibatı / UCM (algılama, kontrol, makine freni)'],
          ['yukari_hiz_koruma', 'Yukarı yönde aşırı hız koruma tertibatı'],
          ['hareketli_tampon', 'Varsa hareketli tampon ve kumanda tertibatı'],
          ['hidrolik_boru_kirilma', 'Varsa hidrolik boru kırılma / akış kısıtlama valfi'],
          ['guvenlik_bileseni_diger', 'Diğer güvenlik bileşenleri ve ekipman etiketleri'],
        ],
      },
      {
        key: 'elektrikli_tahrik', title: 'Elektrikli tahrik ve askı', traction: 'Elektrikli', fields: [
          ['elektrikli_tahrik_yontemi', 'Tahrik yöntemi (asenkron/redüktörlü, senkron vb.)'],
          ['makine_konumu', 'Makine / motor konumu'],
          ['makine_guc', 'Makine / motor gücü'],
          ['makine_uretici_tip_seri', 'Makine / motor üretici, tip ve seri numarası'],
          ['halat_tipi', 'Halat tipi, kol sayısı ve çapı'],
          ['aski_duzeni', 'Askı oranı / askı düzeni'],
          ['kasnak_caplari', 'Tahrik ve saptırma kasnağı çapları'],
          ['verim_sarma_acisi', 'Dosyada beyan edilen verim / halat sarım açısı ve sahadaki doğrulama gözlemi'],
        ],
      },
      {
        key: 'kabin_kapilar', title: 'Kabin, girişler ve kapılar', fields: [
          ['kabin_genislik', 'Kabin iç genişliği'],
          ['kabin_derinlik', 'Kabin iç derinliği'],
          ['kabin_yukseklik', 'Kabin iç yüksekliği'],
          ['kabin_giris_sayisi_yeri', 'Kabin giriş sayısı ve konumları'],
          ['kabin_kapi_acikligi', 'Kabin kapısı net açıklığı (genişlik × yükseklik)'],
          ['kat_kapisi_acikligi', 'Kat kapısı net açıklığı (genişlik × yükseklik)'],
          ['kapi_yangin_dayanimi', 'Varsa kapı yangına dayanım sınıfı'],
          ['kilavuz_pabucu_araligi', 'Kabin kılavuz pabuçları düşey aralığı'],
          ['kapi_yon_tip_panel', 'Kapı açılma yönü, tipi ve panel sayısı'],
        ],
      },
      {
        key: 'raylar', title: 'Kılavuz raylar ve bağlantılar', fields: [
          ['kabin_ray_tip_olcu', 'Kabin rayı tipi ve ölçüsü'],
          ['karsi_agirlik_ray_tip_olcu', 'Karşı ağırlık rayı tipi ve ölçüsü'],
          ['ray_konum_aski', 'Rayların konumu ve askı düzeni'],
          ['ray_toplam_boy', 'Toplam ray boyu'],
          ['ray_konsol_araligi', 'Ray konsolu / bağlantı aralığı'],
        ],
      },
      {
        key: 'kuyu', title: 'Kuyu, boşluklar, tamponlar ve karşı ağırlık', fields: [
          ['kuyu_genislik_derinlik', 'Kuyu genişliği ve derinliği'],
          ['kuyu_dibi', 'Kuyu dibi derinliği'],
          ['ust_bosluk', 'Üst kat / kuyu üst boşluğu'],
          ['toplam_kuyu_olcusu', 'Toplam kuyu ölçüsü ve seyir mesafesi'],
          ['raylar_arasi_mesafe', 'Kabin ve karşı ağırlık rayları arası mesafe'],
          ['ray_kapi_mesafesi', 'Ray–kapı mesafeleri'],
          ['karsi_agirlik_adet_olcu', 'Karşı ağırlık adedi ve ölçüleri'],
          ['kismen_kapali_kuyu', 'Kısmen çevrili kuyu bilgisi'],
          ['kuyu_alti_kullanim_yuk', 'Kuyu altında kullanılabilir alan / yük bulunan hacim bilgisi'],
          ['tampon_strok_konum', 'Tampon tipi, stroku ve konumu'],
          ['ust_alt_guvenli_bosluk', 'Kuyu üstü ve altı güvenli çalışma boşlukları'],
        ],
      },
      {
        key: 'hidrolik', title: 'Hidrolik tahrik', traction: 'Hidrolik', fields: [
          ['hidrolik_unite_konumu', 'Güç ünitesi konumu'],
          ['hidrolik_motor', 'Motor gücü, üretici, tip ve seri numarası'],
          ['hidrolik_halat', 'Varsa halat tipi, adedi, çapı ve askı düzeni'],
          ['piston_makara_cap', 'Piston / üst makara çapları'],
          ['piston_cap_adet_konum', 'Piston çapı, adedi ve konumu'],
          ['hidrolik_kapi', 'Kapı düzeni ve açıklık bilgileri'],
          ['hidrolik_valfler', 'Hidrolik valf ve boru kırılma tertibatı kimliği'],
        ],
      },
    ],
  };

  const RP14 = {
    code: 'ÜB.RP.14',
    revision: '01',
    title: 'AB Tip İnceleme Raporu',
    applicability: 'Modül B',
    reviewSections: [
      {
        key: 'kosullar', title: 'A. İnceleme koşulları ve başvuru kapsamı', items: [
          ['inceleme_kapsami', 'İncelenen model, tip ve varyant kapsamı'],
          ['inceleme_kosullari', 'İnceleme koşulları ve ortam bilgileri'],
          ['inceleme_sinirlari', 'İncelenemeyen / kısıtlı kalan hususlar için kayıt'],
          ['basvuru_kayitlari', 'Başvuru ve ilgili liste kayıtları (örn. ÜB.LS.23)'],
          ['tasarim_faaliyeti', 'Tasarım faaliyeti ve teknik dosya sürüm bilgisi'],
        ],
      },
      {
        key: 'dosya_kapsami', title: 'B. Teknik dosya kapsamı — model ve varyantlar', items: [
          ['temel_ozellikler', 'Asansörün temel özellikleri ve genel yerleşim bilgileri'],
          ['cizimler_sema', 'Çizimler, elektrik / hidrolik şemalar ve ilgili revizyonlar'],
          ['dayanim_hesaplari', 'Dayanım / tasarım hesapları ve kullanılan girdiler'],
          ['kapak_icerik_tutarliligi', 'Kapak, içerik listesi ve dosya içeriğinin tutarlılığı'],
          ['aciklamalar_ozel_cozumler', 'Açıklamalar, özel veya kısmi çözümler ve dayanakları'],
          ['temel_saglik_guvenlik', 'Temel sağlık ve güvenlik gereklerinin dosyada ele alınışı'],
          ['uyumlastirilmis_standartlar', 'Uygulanan standartlar / alternatif teknik çözümler kaydı'],
          ['guvenlik_bileseni_belgeleri', 'Güvenlik bileşenlerine ait sertifika / beyan kayıtları'],
          ['bilesen_testleri', 'Bileşen testleri ve sonuç kayıtları'],
          ['kullanim_bakim_talimati', 'Kullanım ve bakım talimatları (Ek I, 6.2 referansı)'],
          ['montaj_talimati', 'Montaj yöntemi ve kurulum talimatları'],
        ],
      },
    ],
    characteristics: [
      ['ana_tip_varyant', 'Ana tip ve varyant kodu'],
      ['yuk_kapasite', 'Beyan yükü ve kişi kapasitesi'],
      ['hiz_seyir', 'Hız ve seyir mesafesi'],
      ['duraklar', 'Durak sayısı'],
      ['aski', 'Askı tipi / düzeni'],
      ['makine_konumu', 'Tahrik makinesi konumu'],
      ['girisler', 'Kabin giriş sayısı ve konumları'],
    ],
    instruments: [
      ['kumpas', 'Kumpas'],
      ['takometre', 'Takometre'],
      ['pens_ampermetre', 'Pens ampermetre'],
      ['guc_olcer', 'Güç ölçer'],
      ['luxmetre', 'Lüksmetre'],
      ['yalitim_test_cihazi', 'Yalıtım test cihazı'],
      ['ses_olcer', 'Ses ölçer'],
      ['serit_metre', 'Şerit metre'],
      ['kacak_akim_test_cihazi', 'Kaçak akım test cihazı'],
      ['manometre', 'Manometre'],
    ],
    safetyComponents: [
      ['kapi_kilitleri', 'Kapı kilitleri'],
      ['parasut_freni', 'Paraşüt fren / güvenlik tertibatı'],
      ['hiz_regulatoru', 'Hız regülatörü'],
      ['tamponlar', 'Kabin / karşı ağırlık tamponları (hareketli tampon dâhil)'],
      ['ucm', 'UCM algılama / kontrol / makine freni'],
      ['yukari_hiz_koruma', 'Yukarı yönde aşırı hız koruması'],
      ['hidrolik_valf', 'Hidrolik boru kırılma / akış kısıtlama valfi'],
    ],
    otherComponents: [
      ['tahrik_makinesi', 'Tahrik motoru / makinesi'],
      ['raylar', 'Kabin ve karşı ağırlık rayları'],
      ['halatlar', 'Halatlar'],
      ['kumanda', 'Kumanda sistemi'],
      ['kapi_panelleri', 'Kapı panelleri'],
    ],
  };

  function visibleFr65Sections(tractionType) {
    return FR65.sections.filter(section => !section.traction || !tractionType || section.traction === tractionType);
  }

  function emptyRecord() {
    return { schema_version: 1, updated_at: null, fr65: { values: {}, updated_at: null }, rp14: { checks: {}, characteristics: {}, instruments: {}, safety_components: {}, other_components: {}, deviations: '' } };
  }

  function normalize(value) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const fresh = emptyRecord();
    const fr65 = source.fr65 && typeof source.fr65 === 'object' ? source.fr65 : {};
    const rp14 = source.rp14 && typeof source.rp14 === 'object' ? source.rp14 : {};
    return {
      ...fresh,
      ...source,
      schema_version: 1,
      fr65: { ...fresh.fr65, ...fr65, values: { ...fresh.fr65.values, ...(fr65.values || {}) } },
      rp14: {
        ...fresh.rp14, ...rp14,
        checks: { ...fresh.rp14.checks, ...(rp14.checks || {}) },
        characteristics: { ...fresh.rp14.characteristics, ...(rp14.characteristics || {}) },
        instruments: { ...fresh.rp14.instruments, ...(rp14.instruments || {}) },
        safety_components: { ...fresh.rp14.safety_components, ...(rp14.safety_components || {}) },
        other_components: { ...fresh.rp14.other_components, ...(rp14.other_components || {}) },
        deviations: typeof rp14.deviations === 'string' ? rp14.deviations : '',
      },
    };
  }

  function countFr65(record, tractionType) {
    const normalized = normalize(record);
    const fields = visibleFr65Sections(tractionType).flatMap(section => section.fields);
    const recorded = fields.filter(([key]) => {
      const value = normalized.fr65.values[key];
      return value && ['Eşleşti', 'Fark var', 'Uygulanmaz'].includes(value.status);
    }).length;
    return { recorded, total: fields.length };
  }

  root.AVES_TEKNIK_DOSYA_FORM = Object.freeze({ FR65, RP14, visibleFr65Sections, emptyRecord, normalize, countFr65 });
})(globalThis);
