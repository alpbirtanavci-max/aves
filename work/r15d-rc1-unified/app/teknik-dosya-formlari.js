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
          ['seyir_mesafesi', 'Seyir mesafesi (m)', 'number'],
          ['kuyu_yuksekligi', 'Kuyu yüksekliği (m)', 'number'],
          ['makine_dairesi', 'Makine dairesi (MR / MRL)', 'readonly'],
          ['kabin_giris_sayisi_yeri', 'Kabin giriş sayısı ve konumu'],
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
          ['gsm_modulu', 'GSM modülü (varsa)', 'optional_gsm'],
        ],
      },
      {
        key: 'elektrikli_tahrik', tab: 'Elektrikli', group: 'olcu', title: 'Elektrikli tahrik ve askı ölçüleri', traction: 'Elektrikli', fields: [
          ['elektrikli_tahrik_yontemi', 'Sahada görülen tahrik yöntemi', 'select'],
          ['makine_konumu', 'Makine / motor konumu', 'select'],
          ['makine_guc', 'Makine / motor gücü (kW)'],
          ['halat_tipi', 'Halat tipi, kol sayısı ve çapı'],
          ['aski_duzeni', 'Askı oranı / askı düzeni', 'select'],
          ['kasnak_caplari', 'Tahrik ve saptırma kasnağı çapları'],
          ['halat_sarma_acisi', 'Halat sarım açısı (°)', 'number'],
        ],
      },
      {
        key: 'kabin_kapilar', tab: 'Kabin', group: 'olcu', title: 'Kabin ve kapı ölçüleri', fields: [
          ['kabin_genislik', 'Kabin iç genişliği (mm)', 'number'],
          ['kabin_derinlik', 'Kabin iç derinliği (mm)', 'number'],
          ['kabin_yukseklik', 'Kabin iç yüksekliği (mm)', 'number'],
          ['kabin_kapi_genislik', 'Kabin kapısı net genişliği (mm)', 'number'],
          ['kabin_kapi_yukseklik', 'Kabin kapısı net yüksekliği (mm)', 'number'],
          ['kat_kapisi_genislik', 'Kat kapısı net genişliği (mm)', 'number'],
          ['kat_kapisi_yukseklik', 'Kat kapısı net yüksekliği (mm)', 'number'],
          ['kilavuz_pabucu_araligi', 'Kabin kılavuz pabuçları düşey aralığı'],
          ['kapi_yon_tip_panel', 'Mevcut kapıların yönü, tipi ve panel sayısı'],
          ['ikinci_kapi_var', 'İkinci kabin kapısı var mı?', 'select'],
          ['ikinci_kapi_yon', 'İkinci kapının yönü', 'select'],
          ['ikinci_kapi_tip', 'İkinci kapının tipi', 'select'],
          ['ikinci_kapi_panel_sayisi', 'İkinci kapının panel sayısı', 'number'],
        ],
      },
      {
        key: 'raylar', tab: 'Raylar', group: 'olcu', title: 'Kılavuz ray bilgileri', fields: [
          ['kabin_ray_tip_olcu', 'Kabin kılavuz rayı profili', 'select'],
          ['karsi_agirlik_ray_tip_olcu', 'Karşı ağırlık kılavuz rayı profili', 'select'],
          ['ray_konum_aski', 'Rayların konumu ve askı düzeni'],
          ['ray_toplam_boy', 'Toplam ray boyu'],
        ],
      },
      {
        key: 'kuyu', tab: 'Kuyu', group: 'olcu', title: 'Kuyu, boşluklar ve karşı ağırlık ölçüleri', fields: [
          ['kuyu_genislik', 'Kuyu genişliği (cm)', 'number'],
          ['kuyu_derinlik', 'Kuyu derinliği (cm)', 'number'],
          ['kuyu_dibi', 'Kuyu dibi derinliği (cm)', 'number'],
          ['ust_bosluk', 'Üst kat / kuyu üst boşluğu'],
          ['toplam_kuyu_olcusu', 'Toplam kuyu ölçüsü ve seyir mesafesi'],
          ['kabin_raylar_arasi', 'Kabin ana rayları arası (mm)', 'number'],
          ['karsi_agirlik_raylar_arasi', 'Karşı ağırlık rayları arası (mm)', 'number'],
          ['ray_kapi_mesafesi', 'Ray–kapı mesafeleri'],
          ['karsi_agirlik_adet_olcu', 'Karşı ağırlık adedi ve ölçüleri'],
          ['kismen_kapali_kuyu', 'Kuyu kısmen çevrili mi?', 'select'],
          ['kismen_kapali_kuyu_detay', 'Kısmen çevrili kuyu açıklaması'],
          ['kuyu_alti_kullanim_yuk', 'Kuyu altında kullanılabilir alan / yük bulunan hacim var mı?', 'select'],
          ['kuyu_alti_kullanim_yuk_detay', 'Kuyu altındaki kullanılabilir alan / yük bilgisi'],
          ['tampon_strok_konum', 'Tampon tipi, stroku ve konumu'],
          ['ust_alt_guvenli_bosluk', 'Kuyu üstü ve altı güvenli çalışma boşlukları'],
        ],
      },
      {
        key: 'hidrolik', tab: 'Hidrolik', group: 'olcu', title: 'Hidrolik tahrik ölçüleri', traction: 'Hidrolik', fields: [
          ['hidrolik_unite_konumu', 'Güç ünitesi konumu'],
          ['hidrolik_motor_guc', 'Motor gücü (kW)'],
          ['hidrolik_halat', 'Varsa halat tipi, adedi, çapı ve askı düzeni'],
          ['piston_makara_cap', 'Piston / üst makara çapları'],
          ['piston_cap_adet_konum', 'Piston çapı, adedi ve konumu'],
          ['hidrolik_kapi', 'Kapı düzeni ve açıklık bilgileri'],
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
    ikinci_kapi_yon: ['Karşılıklı', 'Bitişik yan duvarda', 'Diğer'],
    ikinci_kapi_tip: ['Teleskopik', 'Merkezi açılır', 'Diğer'],
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
    if (fieldType === 'select') return !!String(value.field_value || '').trim();
    if (fieldType === 'optional_serial') {
      if (value.var_mi === 'Yok') return true;
      return value.var_mi === 'Var' && ['marka', 'tip', 'seri_no'].every(prop => String(value[prop] || '').trim());
    }
    if (fieldType === 'optional_gsm') {
      if (value.var_mi === 'Yok') return true;
      return value.var_mi === 'Var' && ['marka', 'tip', 'imei'].every(prop => String(value[prop] || '').trim());
    }
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
