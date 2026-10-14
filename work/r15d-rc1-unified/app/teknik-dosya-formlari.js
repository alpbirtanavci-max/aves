// FR.65 referanslı saha veri toplama alanları ve eski RP.14 kayıt şeması.
// Yeni B/E/H1 akışı yalnız sahada görülen/ölçülen veriyi kaydeder; dosya karşılaştırması,
// uygunluk veya belgelendirme kararı üretmez.
(function (root) {
  'use strict';

  const FR65 = {
    code: 'ÜB.FR.65',
    revision: '00',
    title: 'FR.65 Saha Veri Toplama',
    sections: [
      {
        key: 'genel', tab: 'Genel', group: 'genel', title: 'Asansör genel bilgileri', fields: [
          ['tahrik_tipi', 'Tahrik tipi', 'readonly'],
          ['yuk', 'Sahada görülen anma yükü (kg)', 'number'],
          ['kapasite', 'Sahada görülen kişi kapasitesi', 'number'],
          ['hiz', 'Sahada görülen hız (m/s)', 'number'],
          ['durak_sayisi', 'Durak sayısı', 'number'],
          ['kat_sayisi', 'Kat sayısı', 'number'],
          ['bina_asansor_sayisi', 'Binadaki toplam asansör sayısı', 'number'],
          ['seyir_mesafesi_cm', 'Seyir mesafesi (cm)', 'number'],
          ['kuyu_yuksekligi_cm', 'Kuyu yüksekliği (cm)', 'number'],
          ['makine_dairesi', 'Makine dairesi (MR / MRL)', 'readonly'],
          ['kabin_giris_sayisi', 'Kabin giriş sayısı', 'number'],
        ],
      },
      {
        key: 'seri_numaralari', tab: 'Seri no', group: 'seri', title: 'Bileşen seri numaraları', kind: 'serial', fields: [
          ['kat_kapisi_kilitleri', 'Kat kapısı kilidi'],
          ['parasut_freni', 'Paraşüt fren / güvenlik tertibatı'],
          ['kabin_tamponu', 'Kabin tamponu'],
          ['kabin_ek_tampon', 'Kabin ek / ikinci veya hareketli tampon (varsa)', 'optional_serial'],
          ['karsi_agirlik_tamponu', 'Karşı ağırlık tamponu'],
          ['karsi_agirlik_ek_tampon', 'Karşı ağırlık ek / ikinci veya hareketli tampon (varsa)', 'optional_serial'],
          ['regulator', 'Hız regülatörü'],
          ['ucm', 'UCM tertibatı'],
          ['yukari_hiz_koruma', 'Yukarı yönde aşırı hız koruma tertibatı'],
          ['elektrikli_makine', 'Elektrikli makine / motor', 'electric'],
          ['gsm_modulu', 'GSM modülü', 'gsm'],
        ],
      },
      {
        key: 'elektrikli_tahrik', tab: 'Elektrikli', group: 'olcu', title: 'Elektrikli tahrik ve askı ölçüleri', traction: 'Elektrikli', fields: [
          ['elektrikli_tahrik_yontemi', 'Sahada görülen tahrik yöntemi', 'select'],
          ['makine_konumu', 'Makine / motor konumu', 'select'],
          ['makine_guc', 'Makine / motor gücü (kW)'],
          ['halat_sayisi', 'Halat sayısı', 'select'],
          ['halat_capi_mm', 'Halat çapı (mm)', 'select'],
          ['aski_duzeni', 'Askı oranı / askı düzeni', 'select'],
          ['tahrik_kasnak_capi_cm', 'Tahrik kasnağı çapı (cm)', 'number'],
          ['saptirma_kasnak_capi_cm', 'Saptırma kasnağı çapı (cm)', 'number'],
          ['halat_sarma_acisi', 'Halat sarım açısı (°)', 'number'],
        ],
      },
      {
        key: 'kabin_kapilar', tab: 'Kabin', group: 'olcu', title: 'Kabin ve kabin/kat kapısı ölçüleri', fields: [
          ['kabin_genislik_cm', 'Kabin iç genişliği (cm)', 'number'],
          ['kabin_derinlik_cm', 'Kabin iç derinliği (cm)', 'number'],
          ['kabin_yukseklik_cm', 'Kabin iç yüksekliği (cm)', 'number'],
          ['kabin_kat_kapi_genislik_cm', 'Kabin ve kat kapısı net genişliği (cm)', 'number'],
          ['kabin_kat_kapi_yukseklik_cm', 'Kabin ve kat kapısı net yüksekliği (cm)', 'number'],
          ['kilavuz_pabucu_araligi_cm', 'Kabin kılavuz pabuçları düşey aralığı (cm)', 'number'],
          ['kabin_kat_kapi_yonu', 'Kabin ve kat kapılarının açılma yönü', 'select'],
          ['kabin_kat_kapi_tipi', 'Kabin ve kat kapılarının tipi', 'select'],
          ['kabin_kat_kapi_panel_sayisi', 'Kabin ve kat kapılarının panel sayısı', 'select'],
          ['ikinci_kapi_var', 'İkinci kabin ve kat kapısı var mı?', 'select'],
          ['ikinci_kapi_yon', 'İkinci kabin ve kat kapılarının yönü', 'select'],
          ['ikinci_kapi_tip', 'İkinci kabin ve kat kapılarının tipi', 'select'],
          ['ikinci_kapi_panel_sayisi', 'İkinci kabin ve kat kapılarının panel sayısı', 'select'],
        ],
      },
      {
        key: 'raylar', tab: 'Raylar', group: 'olcu', title: 'Kılavuz ray bilgileri', fields: [
          ['kabin_ray_tip_olcu', 'Kabin kılavuz rayı profili', 'select'],
          ['karsi_agirlik_ray_tip_olcu', 'Karşı ağırlık kılavuz rayı profili', 'select'],
          ['ray_konum_aski', 'Rayların konumu ve askı düzeni'],
          ['ray_toplam_boy_cm', 'Toplam ray boyu (cm)', 'number'],
        ],
      },
      {
        key: 'kuyu', tab: 'Kuyu', group: 'olcu', title: 'Kuyu, boşluklar ve karşı ağırlık ölçüleri', fields: [
          ['kuyu_genislik_cm', 'Kuyu genişliği (cm)', 'number'],
          ['kuyu_derinlik_cm', 'Kuyu derinliği (cm)', 'number'],
          ['kuyu_dibi_cm', 'Kuyu dibi derinliği (cm)', 'number'],
          ['son_kat_yuksekligi_cm', 'Son kat yüksekliği (cm)', 'number'],
          ['kabin_raylar_arasi_cm', 'Kabin ana rayları arası (cm)', 'number'],
          ['karsi_agirlik_raylar_arasi_cm', 'Karşı ağırlık rayları arası (cm)', 'number'],
          ['ray_kapi_mesafesi_cm', 'Ray–kapı mesafesi (cm)', 'number'],
          ['ana_ray_karsi_agirlik_ray_mesafesi_cm', 'Ana ray ile karşı ağırlık rayı arası mesafe (cm)', 'number'],
          ['karsi_agirlik_parca_sayisi', 'Karşı ağırlık parça sayısı', 'number'],
          ['karsi_agirlik_genislik_cm', 'Karşı ağırlık genişliği (cm)', 'number'],
          ['karsi_agirlik_derinlik_cm', 'Karşı ağırlık derinliği (cm)', 'number'],
          ['karsi_agirlik_yukseklik_cm', 'Karşı ağırlık yüksekliği (cm)', 'number'],
          ['kismen_kapali_kuyu', 'Kuyu kısmen çevrili mi?', 'select'],
          ['kismen_kapali_kuyu_detay', 'Kısmen çevrili kuyu açıklaması'],
          ['kuyu_alti_kullanim_yuk', 'Kuyu altında kullanılabilir alan / yük bulunan hacim var mı?', 'select'],
          ['kuyu_alti_kullanim_yuk_detay', 'Kuyu altındaki kullanılabilir alan / yük bilgisi'],
          ['kabin_tampon_tipi', 'Kabin tamponu tipi', 'select'],
          ['kabin_tampon_stroku_cm', 'Kabin tamponu stroku (cm)', 'number'],
          ['karsi_agirlik_tampon_tipi', 'Karşı ağırlık tamponu tipi', 'select'],
          ['karsi_agirlik_tampon_stroku_cm', 'Karşı ağırlık tamponu stroku (cm)', 'number'],
        ],
      },
      {
        key: 'hidrolik', tab: 'Hidrolik', group: 'olcu', title: 'Hidrolik tahrik ölçüleri', traction: 'Hidrolik', fields: [
          ['hidrolik_unite_konumu', 'Güç ünitesi konumu'],
          ['hidrolik_motor_guc', 'Motor gücü (kW)'],
          ['hidrolik_halat_sayisi', 'Hidrolik asansör halat sayısı (varsa)', 'optional_select'],
          ['hidrolik_halat_capi_mm', 'Hidrolik asansör halat çapı (mm; varsa)', 'optional_select'],
          ['hidrolik_piston_capi_cm', 'Piston çapı (cm)', 'number'],
          ['hidrolik_makara_capi_cm', 'Üst makara çapı (cm)', 'number'],
          ['hidrolik_piston_adedi', 'Piston adedi', 'number'],
          ['hidrolik_piston_konumu', 'Piston konumu'],
          ['hidrolik_valfler', 'Hidrolik valf ve boru kırılma tertibatı saha bilgisi'],
          ['hidrolik_motor', 'Hidrolik güç ünitesi / motor', 'serial'],
          ['hidrolik_boru_kirilma', 'Hidrolik valf / boru kırılma tertibatı', 'serial'],
        ],
      },
    ],
  };

  const FR65_FIELD_OPTIONS = Object.freeze({
    elektrikli_tahrik_yontemi: ['Dişli (redüktörlü)', 'Dişlisiz (gearless)', 'Diğer'],
    makine_konumu: ['Makine dairesi', 'Kuyu içi'],
    aski_duzeni: ['1:1', '2:1', '4:1', 'Diğer'],
    ikinci_kapi_var: ['Yok', 'Var'],
    ikinci_kapi_yon: ['Sağ', 'Sol', 'Merkezi'],
    ikinci_kapi_tip: ['Teleskopik', 'Merkezi'],
    ikinci_kapi_panel_sayisi: ['1', '2', '3', '4', '5', '6', '7', '8'],
    halat_sayisi: ['1', '2', '3', '4', '5', '6', '7', '8'],
    halat_capi_mm: ['6', '6.5', '8', '10', '12'],
    hidrolik_halat_sayisi: ['1', '2', '3', '4', '5', '6', '7', '8'],
    hidrolik_halat_capi_mm: ['6', '6.5', '8', '10', '12'],
    kabin_kat_kapi_yonu: ['Sağ', 'Sol', 'Merkezi'],
    kabin_kat_kapi_tipi: ['Teleskopik', 'Merkezi'],
    kabin_kat_kapi_panel_sayisi: ['1', '2', '3', '4', '5', '6', '7', '8'],
    kabin_tampon_tipi: ['Hidrolik', 'Poliüretan'],
    karsi_agirlik_tampon_tipi: ['Hidrolik', 'Poliüretan'],
    kismen_kapali_kuyu: ['Yok', 'Var'],
    kuyu_alti_kullanim_yuk: ['Yok', 'Var'],
    kabin_ray_tip_olcu: ['T50', 'T70', 'T89', 'T90', 'T125', 'T140', 'Diğer / açıklama'],
    karsi_agirlik_ray_tip_olcu: ['T50', 'T70', 'T89', 'T90', 'T125', 'T140', 'Diğer / açıklama'],
  });

  const FR65_FIELD_HELP = Object.freeze({
    elektrikli_tahrik_yontemi: "Sahada görülen tipi seçin; 'Diğer' ise açıklama notu ekleyin.",
    aski_duzeni: "Sahada görülen askı oranını seçin; listede yoksa 'Diğer' seçip not ekleyin.",
    halat_sarma_acisi: 'Rehber: 180° sahada sık görülen bir değerdir; gerçek düzeni ölçerek kaydedin. Bu değer tek başına uygunluk ölçütü değildir.',
    kabin_ray_tip_olcu: "Sahada görülen T profilini seçin; farklı profil varsa 'Diğer / açıklama' seçip not ekleyin.",
    karsi_agirlik_ray_tip_olcu: "Sahada görülen T profilini seçin; farklı profil varsa 'Diğer / açıklama' seçip not ekleyin.",
  });

  const FR65_FLOW_ORDER = Object.freeze([
    'kuyu', 'genel', 'kabin_kapilar', 'raylar', 'elektrikli_tahrik', 'seri_numaralari', 'hidrolik',
  ]);

  const FR65_FIELD_CONDITIONS = Object.freeze({
    ikinci_kapi_yon: { key: 'ikinci_kapi_var', value: 'Var' },
    ikinci_kapi_tip: { key: 'ikinci_kapi_var', value: 'Var' },
    ikinci_kapi_panel_sayisi: { key: 'ikinci_kapi_var', value: 'Var' },
    kismen_kapali_kuyu_detay: { key: 'kismen_kapali_kuyu', value: 'Var' },
    kuyu_alti_kullanim_yuk_detay: { key: 'kuyu_alti_kullanim_yuk', value: 'Var' },
  });

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
    const tractionKey = tractionType === 'Elektrikli' ? 'electric' : tractionType === 'Hidrolik' ? 'hydraulic' : null;
    return FR65.sections
      .filter(section => !section.traction || !tractionType || section.traction === tractionType)
      .map(section => section.key === 'seri_numaralari' && tractionKey
        ? { ...section, fields: section.fields.filter(([, , fieldType]) => !['electric', 'hydraulic'].includes(fieldType) || fieldType === tractionKey) }
        : section)
      .sort((left, right) => FR65_FLOW_ORDER.indexOf(left.key) - FR65_FLOW_ORDER.indexOf(right.key));
  }

  function fr65CaptureFieldActive(field, values = {}) {
    const condition = FR65_FIELD_CONDITIONS[field[0]];
    return !condition || String(values[condition.key]?.field_value || '') === condition.value;
  }

  function fr65CaptureFieldRecorded(field, value) {
    if (!value || typeof value !== 'object') return false;
    const fieldType = field[2];
    if (fieldType === 'select' || fieldType === 'optional_select') return !!String(value.field_value || '').trim();
    if (fieldType === 'optional_serial') {
      if (value.var_mi === 'Yok') return true;
      return value.var_mi === 'Var' && ['marka', 'tip', 'seri_no'].every(prop => String(value[prop] || '').trim());
    }
    if (fieldType === 'gsm') return ['marka', 'tip', 'imei'].every(prop => String(value[prop] || '').trim());
    if (fieldType === 'serial' || field[0] === 'elektrikli_makine' ||
        (FR65.sections.find(section => section.key === 'seri_numaralari')?.fields.some(([key]) => key === field[0]))) {
      return ['marka', 'tip', 'seri_no'].some(prop => String(value[prop] || '').trim());
    }
    return ['field_value', 'note'].some(prop => String(value[prop] || '').trim());
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

  function emptyFr65Capture(updatedAt = null) {
    return {
      schema_version: 2,
      saha_veri_akisi: 'fr65_saha_v1',
      source_form: 'ÜB.FR.65',
      source_revision: FR65.revision,
      updated_at: updatedAt,
      forms: { FR65: { values: {} } },
    };
  }

  function countFr65Capture(record, tractionType, sectionKey = null) {
    const source = record && typeof record === 'object' && !Array.isArray(record) ? record : {};
    const forms = source.forms && typeof source.forms === 'object' ? source.forms : {};
    const capture = forms.FR65 && typeof forms.FR65 === 'object'
      ? forms.FR65
      : (source.fr65 && typeof source.fr65 === 'object' ? source.fr65 : {});
    const values = capture.values && typeof capture.values === 'object' ? capture.values : {};
    const fields = visibleFr65Sections(tractionType)
      .filter(section => !sectionKey || section.key === sectionKey)
      .flatMap(section => section.fields)
      .filter(field => fr65CaptureFieldActive(field, values))
      .filter(field => {
        if (field[2] !== 'optional_serial') return true;
        const value = values[field[0]];
        return value?.var_mi === 'Var' || ['marka', 'tip', 'seri_no'].some(prop => String(value?.[prop] || '').trim());
      })
      .filter(field => {
        if (field[2] !== 'optional_select') return true;
        return !!String(values[field[0]]?.field_value || '').trim();
      });
    const recorded = fields.filter(field => {
      const [key] = field;
      const value = values[key];
      return fr65CaptureFieldRecorded(field, value);
    }).length;
    return { recorded, total: fields.length };
  }

  root.AVES_TEKNIK_DOSYA_FORM = Object.freeze({
    FR65, RP14, FR65_FIELD_OPTIONS, FR65_FIELD_HELP, FR65_FIELD_CONDITIONS, FR65_FLOW_ORDER,
    visibleFr65Sections, fr65CaptureFieldActive, emptyRecord, normalize, countFr65, emptyFr65Capture, countFr65Capture,
  });
})(globalThis);
