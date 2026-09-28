// ÜB.TB.05 R.02 modül seti + ekrandaki AVES formlarından türetilen tek saha veri kaydı.
// Bu şema veri toplar; uygunluk, sertifika veya belgelendirme kararı üretmez.
(function (root) {
  'use strict';

  const STATUS_OPTIONS = ['', 'Uygun', 'Uygun Değil', 'İlgili Değil'];
  const FORM_STATUS_OPTIONS = ['', 'Kaydedildi', 'Eksik / açıklama gerekli', 'Uygulanmaz'];
  const COMMON = ['FR16', 'FR30', 'FR32', 'LS14', 'RP06', 'RP07'];
  const MODULE_SETS = {
    B: ['FR34', 'FR65', 'FR35', 'FR50', 'FR47', 'FR48', 'FR37', 'RP14'],
    G20: ['FR34', 'FR65', 'FR35', 'FR50', 'FR38', 'FR47', 'FR48', 'FR37'],
    G_LEGACY: ['FR34', 'FR65', 'FR35', 'FR50', 'FR39', 'FR48', 'FR51', 'FR37'],
    E_SURVEILLANCE: ['FR37'],
    H1_SURVEILLANCE: ['FR34', 'FR65', 'FR35', 'FR50', 'FR47', 'FR48', 'FR37'],
  };

  const f = (key, label, type = 'text', placeholder = '', options = []) => ({ key, label, type, placeholder, options });
  const item = (key, label) => ({ key, label });
  const form = (key, title, description, config = {}) => ({ key, title, description, ...config });

  const FORMS = {
    FR16: form('FR16', 'Müşteri memnuniyet anketi', 'Formdaki hizmet değerlendirme puanları ve serbest görüşler.', {
      fields: [
        f('information_source', 'AVES’i nasıl öğrendi?', 'text'),
        f('service_frequency', 'Hizmetten yararlanma sıklığı', 'text'),
        f('company_or_person', 'Firma / ilgili kişi', 'text'),
        f('address', 'Adres', 'textarea'),
        f('phone', 'Telefon', 'tel'),
        f('email', 'E-posta', 'email'),
      ],
      ratings: [
        ['service_overall', 'Belgelendirme hizmetinden genel memnuniyet'],
        ['application_information', 'Başvuru ve sözleşme bilgilendirmesi'],
        ['documents_clarity', 'Yazılı/dijital dokümanların açıklığı'],
        ['technical_competence', 'Denetçi/teknik uzman yetkinliği'],
        ['impartiality', 'Tarafsızlık ve bağımsızlık algısı'],
        ['communication', 'Denetçi yaklaşımı ve iletişim'],
        ['report_clarity', 'Denetim raporunun açıklığı ve doğruluğu'],
        ['response_speed', 'Telefon/e-posta/portal iletişimi'],
        ['planning', 'Planlama ve tarih bilgilendirmesi'],
        ['answers', 'Sorulara verilen yanıtların yeterliliği'],
        ['decision_transparency', 'Karar süreci hakkında bilgilendirme'],
        ['confidentiality', 'Gizlilik ilkesine uyum'],
        ['price_clarity', 'Hizmet bedelinin açıklığı'],
        ['recommendation', 'AVES’i başkasına tavsiye etme'],
        ['work_again', 'Gelecekte tekrar çalışma düşüncesi'],
      ],
      fieldsAfterRatings: [
        f('positive_feedback', 'Olumlu bulunan yönler', 'textarea'),
        f('improvement_feedback', 'İyileştirme önerileri', 'textarea'),
        f('other_feedback', 'Diğer görüşler', 'textarea'),
        f('survey_reference', 'Anket kayıt / dosya referansı'),
      ],
    }),

    FR30: form('FR30', 'Tetkik ekibi atama planı ve çevrim programı', 'Denetim kapsamı, tarih/süre, müşteri temsilcisi, ekip ve günlük faaliyet akışı.', {
      fields: [
        f('plan_revision', 'Plan revizyonu / referansı'),
        f('work_file_no', 'İş dosyası numarası'),
        f('client_address', 'Müşteri adresi', 'textarea'),
        f('inspection_address', 'Denetim / saha adresi', 'textarea'),
        f('client_representative', 'Müşteri temsilcisi'),
        f('scope_module_type', 'Kapsam / modül / denetim türü'),
        f('product_description', 'Ürün / sistem tanımı'),
        f('planned_dates', 'Planlanan denetim tarihleri', 'textarea'),
        f('duration_man_days', 'Toplam süre (adam/gün)', 'number'),
        f('plan_objection_or_change', 'Plan itirazı / değişiklik önerisi ve gerekçesi', 'textarea'),
        f('planning_responsible', 'Planlama sorumlusu'),
        f('technical_reviewer', 'Planı kontrol eden teknik düzenleme sorumlusu'),
        f('client_approval_reference', 'Müşteri plan onay / imza kayıt referansı'),
        f('notes', 'Ek notlar', 'textarea'),
      ],
      repeaters: [{ key: 'agenda', title: 'Denetim çevrim programı', fields: [
        f('start', 'Başlangıç', 'time'), f('end', 'Bitiş', 'time'), f('activity', 'Faaliyet'),
        f('auditor', 'Denetçi / sorumlu'), f('required_personnel', 'Gerekli firma/personel'),
      ] }],
    }),

    FR32: form('FR32', 'Personel atama / beyan formu', 'Atanan personel, rolü ve tarafsızlık-gizlilik beyanının alınma durumu.', {
      fields: [
        f('client_name', 'Müşteri unvanı'),
        f('client_address', 'Müşteri adresi', 'textarea'),
        f('inspection_address', 'Denetim adresi', 'textarea'),
        f('scope', 'Kapsam'), f('audit_type', 'Modül / denetim türü'),
        f('product_description', 'Ürün / sistem tanımı'),
        f('client_contact', 'Müşteri yetkilisi'),
        f('declaration_date', 'Beyan tarihi', 'date'),
        f('appointing_responsible', 'Atamayı yapan'),
        f('appointment_reference', 'Atama / imzalı beyan dosya referansı'),
      ],
      repeaters: [{ key: 'assigned_personnel', title: 'Atanan personel', fields: [
        f('name', 'Adı soyadı'),
        f('role', 'Görevi', 'select', '', ['Teknik Uzman', 'Baş Denetçi', 'Denetçi', 'Aday teknik uzman/denetçi', 'Gözlemci', 'Diğer']),
        f('role_other', 'Diğer görev (varsa)'),
        f('impartiality_declaration', 'Tarafsızlık / gizlilik beyanı', 'select', '', ['', 'Alındı', 'Bekleniyor', 'Risk / açıklama var']),
        f('conflict_note', 'Potansiyel çıkar çatışması / açıklama', 'textarea'),
        f('signed_record_reference', 'İmzalı beyan kayıt referansı'),
      ] }],
    }),

    LS14: form('LS14', 'Denetim katılımcıları ve açılış-kapanış listesi', 'Katılımcılar, toplantı saatleri, kapsam, gündem ve kapanışta bildirilen hususlar.', {
      fields: [
        f('opening_time', 'Açılış toplantısı tarih / saat', 'datetime-local'),
        f('closing_time', 'Kapanış toplantısı tarih / saat', 'datetime-local'),
        f('opening_scope', 'Açılışta teyit edilen amaç, kapsam ve kriterler', 'textarea'),
        f('opening_agenda', 'Açılış gündemi / iş sağlığı ve güvenliği bilgilendirmesi', 'textarea'),
        f('access_and_resources', 'Erişim, saha eşliği ve gerekli kaynaklar', 'textarea'),
        f('closing_summary', 'Kapanışta aktarılan bulgu ve gözlem özeti', 'textarea'),
        f('client_comments', 'Firma görüşü / itirazı', 'textarea'),
        f('next_steps', 'İzlenecek sonraki adımlar ve tarihler', 'textarea'),
        f('report_delivery_reference', 'Rapor teslim / toplantı kayıt referansı'),
      ],
      repeaters: [{ key: 'participants', title: 'Katılımcılar', fields: [
        f('name', 'Adı soyadı'), f('organization', 'Firma / kuruluş'), f('role', 'Görevi'),
        f('meeting', 'Katıldığı bölüm', 'select', '', ['Açılış', 'Kapanış', 'Her ikisi', 'Diğer']),
        f('signature_reference', 'İmza / katılım kayıt referansı'),
      ] }],
    }),

    FR34: form('FR34', 'Teknik dosya değerlendirme formu', 'Teknik dosyada incelenen dokümanlar, referanslar ve denetçi notları.', {
      checklistSections: [{ key: 'documents', title: 'Teknik dosya dokümanları', items: [
        item('general_description', 'Asansörün genel tarifi ve temel özellikleri'),
        item('eu_declaration', 'Asansöre ait AB uygunluk beyanı'),
        item('installation_instructions', 'Montaj talimatı / prosedürü'),
        item('drawings_schematics', 'Tasarım ve imalat çizimleri/şemaları ile açıklamalar'),
        item('essential_requirements', 'Temel sağlık ve güvenlik gerekleri listesi'),
        item('harmonized_standards', 'Uyumlaştırılmış standartların listesi'),
        item('alternative_solutions_risk', 'Standart dışı/kısmi çözümler ve risk değerlendirmesi referansı'),
        item('design_calculations', 'Montajcının tasarım hesapları (FR.47 / FR.48 / ilgili hesap formu)'),
        item('safety_component_records', 'Güvenlik aksamları listesi, sertifika ve beyan kopyaları (FR.37)'),
        item('representative_model_variants', 'Temsili model ve izin verilen varyantlar (modül setinde aranıyorsa)'),
        item('component_test_reports', 'Varsa güvenlik bileşeni deney/test raporları'),
        item('series_production_measures', 'Seri imalat uygunluk tedbirleri (uygulanabilir modül setinde)'),
        item('operation_maintenance_rescue', 'Kullanım, bakım, muayene, tamir ve kurtarma dokümanı'),
        item('specific_en81_tests', 'Varsa halat/zincir, cam, kapı veya dayanım test belgeleri'),
        item('logbook', 'Tamir ve periyodik kontrol kayıt defteri / seyir defteri'),
      ] }],
    }),

    FR35: form('FR35', 'Asansör tasarım hesapları kontrol formu', 'Hesap başlıklarının incelenme durumu, dayanak dokümanı ve teknik not.', {
      checklistSections: [{ key: 'calculations', title: 'Tasarım hesabı başlıkları', items: [
        item('input_data', 'Ana tasarım giriş verileri'),
        item('motor_power', 'Motor gücü hesabı'),
        item('rope_wrap', 'Halat sarılma açısı hesabı'),
        item('guide_rail_forces', 'Kılavuz ray kuvvetleri / hesabı'),
        item('suspension_rope', 'Askı halatı hesabı'),
        item('buffers', 'Tampon hesabı'),
        item('car_frame_floor', 'Kabin kirişi, iskeleti ve döşeme hesapları'),
        item('accessible_pit', 'Erişilebilir kuyu altı varsa ilgili zemin ve karşı ağırlık güvenlik hesabı'),
        item('hydraulic_rupture', 'Hidrolik sistemde boru kırılma hesabı'),
        item('hydraulic_piston_cylinder', 'Hidrolik piston ve silindir hesabı'),
      ] }],
      fields: [
        f('design_project_reference', 'Uygulama projesi / hesap dosyası referansı'),
        f('reviewer', 'Değerlendirmeyi yapan teknik uzman'),
        f('review_date', 'Değerlendirme tarihi', 'date'),
        f('summary_note', 'Hesaplara ilişkin genel açıklama', 'textarea'),
      ],
    }),

    FR37: form('FR37', 'AB uygunluk beyanları ve tip sertifikaları kontrolü', 'Güvenlik aksamı kimliği, beyan/sertifika kapsamı ve belge referansları.', {
      repeaters: [{ key: 'safety_components', title: 'Güvenlik aksamı kayıtları', fields: [
        f('component', 'Güvenlik aksamı', 'select', '', ['Durak kapısı kilitleme tertibatı', 'Serbest düşme / kontrolsüz hareket tertibatı', 'Aşırı hız sınırlayıcı', 'Kabin tamponu', 'Karşı ağırlık tamponu', 'Elektrikli güvenlik devresi/şalteri', 'Dişlisiz makine elektromekanik freni', 'Hidrolik güvenlik tertibatı', 'Diğer']),
        f('manufacturer', 'İmalatçı / marka'), f('type_series', 'Tip / seri bilgisi'), f('serial_no', 'Seri numarası'),
        f('eu_declaration_ref', 'AB uygunluk beyanı referansı'), f('type_certificate_ref', 'Tip inceleme sertifika referansı'),
        f('notified_body', 'Onaylanmış kuruluş / kimlik no'),
        f('review_status', 'Belge inceleme durumu', 'select', '', STATUS_OPTIONS),
        f('note', 'Açıklama / varyant ve dosya referansı', 'textarea'),
      ] }],
      checklistSections: [
        { key: 'safety_parts', title: 'Kontrol edilen güvenlik aksamı grupları', items: [
          item('door_locks', 'Durak kapılarını kilitleme tertibatları'),
          item('uncontrolled_movement', 'Serbest düşme / kontrolsüz hareketi önleyen tertibatlar'),
          item('overspeed_governor', 'Aşırı hız sınırlayıcı tertibatlar'),
          item('car_buffers', 'Kabin tamponları'), item('counterweight_buffers', 'Karşı ağırlık tamponları'),
          item('electrical_safety', 'Elektrikli güvenlik tertibatları'), item('machine_brake', 'Dişlisiz makinede elektromekanik fren'),
          item('hydraulic_safety', 'Hidrolik devre güvenlik tertibatları'),
        ] },
        { key: 'declaration_content', title: 'AB uygunluk beyanı içerik kontrolü', items: [
          item('manufacturer_identity', 'İmalatçı ve varsa yetkili temsilci bilgileri'),
          item('component_identity', 'Aksamın tanımı, tip/seri ve tanımlama bilgisi'),
          item('safety_function', 'Güvenlik işlevi ve üretim tarihi'),
          item('regulatory_references', 'Uygulanan mevzuat hükümleri ve standart atıfları'),
          item('type_exam_body', 'Varsa tip inceleme kuruluşu ve sertifika referansı'),
          item('production_control_body', 'Varsa üretim kalite/uygunluk kuruluşu bilgisi'),
          item('authorized_signer', 'İmza yetkilisi, yer ve tarih bilgileri'),
        ] },
        { key: 'certificate_content', title: 'Tip inceleme sertifikası / tip kontrol belgesi içerik kontrolü', items: [
          item('issuer', 'Belgeyi düzenleyen kuruluş'), item('certificate_number', 'Belge / tip inceleme numarası'),
          item('type_manufacturer', 'Tip ve imalatçı/marka bilgisi'), item('holder', 'Sertifika sahibi bilgisi'),
          item('sample_date', 'Numune teslim bilgisi'), item('test_lab_report', 'Deney laboratuvarı ve rapor bilgisi'),
          item('examination_date', 'Tip inceleme / kontrol tarihi'), item('annexes', 'Ekler ve ek bilgi referansları'),
          item('place_date_signature', 'Düzenleme yeri, tarih ve imza bilgisi'),
        ] },
      ],
      fields: [f('applied_standard', 'Uygulanan ana standart(lar)'), f('market_route', 'Varsa beyan edilen piyasaya arz / uygunluk değerlendirme yöntemi')],
    }),

    FR38: form('FR38', 'TS EN 81-20 test kontrol formu', 'Sonuçlar uygulamanın ana kontrol listesinde kaydedilir; bu bölüm ikinci bir sonuç listesi oluşturmaz.', { special: 'mainChecklist' }),
    FR39: form('FR39', 'TS EN 81-1/2+A3 test kontrol formu', 'Sonuçlar uygulamanın ana kontrol listesinde kaydedilir; bu bölüm ikinci bir sonuç listesi oluşturmaz.', { special: 'mainChecklist' }),

    FR47: form('FR47', 'Elektrikli asansör tasarım doğrulama', 'Hesap dosyası girdileri, temel değerler, kontrol başlıkları ve kanıt referansları. Uygulama hesap sonucu üretmez.', {
      fields: [
        f('calculation_reference', 'Hesap dosyası / revizyon referansı'), f('reviewer', 'İnceleyen teknik uzman'),
        f('capacity', 'Beyan yükü (kg)', 'number'), f('passenger_capacity', 'Kişi kapasitesi', 'number'),
        f('speed', 'Beyan hızı (m/s)', 'number'), f('stops', 'Durak sayısı', 'number'),
        f('travel', 'Seyir mesafesi (m)', 'number'), f('car_dimensions', 'Kabin ölçüleri (G×D×Y)', 'text'),
        f('shaft_dimensions', 'Kuyu genişlik / derinlik / kuyu dibi / üst boşluk', 'textarea'),
        f('drive_machine', 'Tahrik makinesi: marka, tip, güç, verim'),
        f('suspension_and_ropes', 'Askı düzeni, halat adedi/çapı ve sarım bilgisi'),
        f('rails_and_brackets', 'Ray tipi/ölçüsü ve konsol aralığı'),
        f('calculation_summary', 'Hesap özeti / teknik not', 'textarea'),
      ],
      checklistSections: [{ key: 'checks', title: 'Elektrikli tasarım doğrulama başlıkları', items: [
        item('design_inputs', 'Proje giriş değerleri ile hesap girdilerinin tutarlılığı'),
        item('motor_selection', 'Gerekli ve seçilen motor gücü kaydı'),
        item('ropes_sheaves', 'Askı halatı / kasnak ve çekiş hesabı'),
        item('guide_rails', 'Kılavuz ray kuvvet, gerilme ve bağlantı hesabı'),
        item('car_frame', 'Kabin iskeleti, kiriş ve döşeme dayanım hesabı'),
        item('buffers', 'Tampon özellikleri ve çalışma koşulu hesabı'),
        item('machine_support', 'Makine şasesi / makine dairesine aktarılan yükler'),
        item('clearances', 'Kuyu, üst/alt boşluk ve güvenlik hacmi girdileri'),
      ] }],
    }),

    FR48: form('FR48', 'Hidrolik asansör tasarım doğrulama', 'Hidrolik proje girdileri, piston/silindir, pompa, tahrik ve ray hesap başlıkları. Uygulama hesap sonucu üretmez.', {
      fields: [
        f('calculation_reference', 'Hesap dosyası / revizyon referansı'), f('reviewer', 'İnceleyen teknik uzman'),
        f('capacity', 'Beyan yükü (kg)', 'number'), f('passenger_capacity', 'Kişi kapasitesi', 'number'),
        f('speed', 'Beyan hızı (m/s)', 'number'), f('stops', 'Durak sayısı', 'number'),
        f('travel', 'Seyir mesafesi (m)', 'number'), f('car_dimensions', 'Kabin ölçüleri (G×D×Y)'),
        f('shaft_dimensions', 'Kuyu genişlik / derinlik / kuyu dibi / üst boşluk', 'textarea'),
        f('piston_data', 'Piston adedi, çapı, tipi/malzemesi ve yerleşimi', 'textarea'),
        f('cylinder_data', 'Silindir ölçüsü/tipi ve tasarım referansı', 'textarea'),
        f('power_unit', 'Hidrolik ünite, pompa, debi ve basınç bilgileri', 'textarea'),
        f('motor_data', 'Motor marka/tip, güç ve verim bilgileri', 'textarea'),
        f('ropes_and_pulleys', 'Varsa halat, piston üstü makara ve mil bilgileri', 'textarea'),
        f('rupture_valve', 'Boru kırılma / akış sınırlama valfi referansı'),
        f('calculation_summary', 'Hesap özeti / teknik not', 'textarea'),
      ],
      checklistSections: [{ key: 'checks', title: 'Hidrolik tasarım doğrulama başlıkları', items: [
        item('design_inputs', 'Proje giriş değerleri ve hesap girdileri'),
        item('piston_buckling', 'Piston burkulma / eğilme kontrol kaydı'),
        item('pressure_strength', 'Piston ve silindir statik basınç dayanımı'),
        item('pump_flow_speed', 'Pompa seçimi, debi ve hız kontrolü'),
        item('motor_power', 'Motor gücü ve seçilen motor karşılaştırması'),
        item('guide_rails', 'Ray seçimi, eğilme ve burkulma hesabı'),
        item('ropes', 'Endirekt tahrik varsa halat emniyet hesabı'),
        item('pulley_shaft', 'Piston üstü makara ve mil kontrolü'),
        item('rupture_valve_test', 'Boru kırılma valfi bilgisi / deney referansı'),
      ] }],
    }),

    FR50: form('FR50', 'Asansör Yönetmeliği Ek-I temel sağlık ve güvenlik gerekleri', 'Her satır için durumu ve gerekiyorsa standart / açıklama referansını denetçi kaydeder.', {
      fields: [
        f('client_name', 'Müşteri unvanı'), f('work_file_no', 'İş dosyası numarası'),
        f('installation_address', 'Montaj adresi', 'textarea'), f('capacity_load', 'Beyan yükü / kişi sayısı'),
        f('serial_no', 'Asansör seri numarası'), f('stops', 'Kat / durak sayısı'),
        f('speed', 'Beyan hızı (m/s)'), f('travel', 'Seyir mesafesi'),
        f('suspension', 'Askı tipi'), f('installation_year', 'Montaj yılı', 'number'),
        f('drive_type', 'Tahrik sistemi tipi / konumu'),
      ],
      checklistSections: [{ key: 'requirements', title: 'Ek-I gereklilik kayıtları', items: [
        item('1.1', 'Makine emniyeti mevzuatının ilgili tehlikelerde uygulanması'),
        item('1.2', 'Taşıyıcı/kabin, beyan yükü ve kullanım amacı'),
        item('1.3', 'Asılma/destek düzeni ve bağlantıların güvenliği'),
        item('1.4.1', 'Aşırı yükte normal çalışmanın önlenmesi'),
        item('1.4.2', 'Aşırı hız sınırlama tertibatı'), item('1.4.3', 'Hızlı asansörlerde hız izleme/sınırlama'),
        item('1.4.4', 'Sürtünmeli tahrikte halat çekişinin korunması'),
        item('1.5.1', 'Tahrik makinesi düzeni'), item('1.5.2', 'Makine ve ilgili bölgelere güvenli erişim'),
        item('1.6.1', 'Erişilebilir kullanım için kumanda yerleşimi'), item('1.6.2', 'Kumanda işlevlerinin anlaşılabilirliği'),
        item('1.6.3', 'Grup kumanda devreleri (uygulanabildiğinde)'), item('1.6.4', 'Elektrik donanımı ve güvenlik devreleri'),
        item('2.1', 'Kuyuya erişimin ve bakım erişiminin güvenliği'), item('2.2', 'Uç konumlarda ezilme riskine karşı güvenlik hacmi'),
        item('2.3', 'Kat/kabin kapıları ve kilitleme işlevleri'),
        item('3.1', 'Kabin çevresi, tavan/taban ve kapı güvenliği'), item('3.2', 'Serbest düşme veya kontrolsüz hareketin önlenmesi'),
        item('3.3', 'Tampon düzeni ve ilgili boşluklar'), item('3.4', 'Güvenlik tertibatı devre dışıyken hareketin önlenmesi'),
        item('4.1', 'Motorlu kapılarda çarpma/sıkışma riskinin azaltılması'), item('4.2', 'Gerektiğinde kat kapılarının yangın dayanımı'),
        item('4.3', 'Karşı ağırlık düşmesi/çarpışması riskinin önlenmesi'), item('4.4', 'Kabin içindeki kişilerin kurtarılması/tahliyesi'),
        item('4.5', 'Çift yönlü haberleşme ve alarm'), item('4.6', 'Makine sıcaklığı sınırlarında çalışma davranışı'),
        item('4.7', 'Kabin havalandırması'), item('4.8', 'Normal ve acil durum aydınlatması'),
        item('4.9', 'Haberleşme ve acil aydınlatma için normal güçten bağımsız çalışma'),
        item('4.10', 'İtfaiyeci asansöründe özel kumanda davranışı (varsa)'),
        item('5.1', 'Kabin içindeki beyan yükü ve kişi kapasitesi işaretlemesi'),
        item('5.2', 'Kabin içinden kurtulma talimatı (tasarımda varsa)'),
        item('6.1', 'Montaj/bağlantı/ayar/bakım talimatı ve dil kaydı'),
        item('6.2', 'Asansörle birlikte verilen kullanıcı ve teknik belgeler'),
      ] }],
    }),

    FR65: form('FR65', 'Teknik dosya–saha eşleşme formu', 'FR.65 alanları eski yerel kayıtla uyumlu tutulur.', { special: 'legacyFR65' }),
    FR51: form('FR51', 'TS EN 81-1+A3 tasarım doğrulama', 'Eski standart setinde ana checklist ve hidrolik tasarım verileriyle birlikte kaydedilir.', {
      fields: [f('calculation_reference', 'Tasarım hesap dosyası / revizyon referansı'), f('reviewer', 'İnceleyen teknik uzman'), f('summary', 'Teknik not', 'textarea')],
      checklistSections: [{ key: 'checks', title: 'Tasarım doğrulama başlıkları', items: [
        item('input_data', 'Ana tasarım giriş verileri'), item('mechanical_strength', 'Taşıyıcı ve askı sistemi hesapları'),
        item('hydraulic_system', 'Hidrolik piston/silindir ve basınç hesapları'), item('drive_selection', 'Tahrik seçimi ve güç hesabı'),
        item('rails_buffers', 'Raylar ve tampon hesapları'),
      ] }],
    }),

    RP06: form('RP06', 'Uygunsuzluk raporu', 'Bulgu, standart maddesi, sınıfı, firma yanıtı ve takip gereksinimi.', {
      repeaters: [{ key: 'findings', title: 'Bulgu kayıtları', fields: [
        f('finding_no', 'Bulgu no'), f('date', 'Denetim tarihi', 'date'), f('standard_clause', 'Bulguya konu standart / madde'),
        f('classification', 'Sınıf', 'select', '', ['Majör', 'Minör', 'Gözlem', 'Diğer']),
        f('description', 'Uygunsuzluk açıklaması', 'textarea'),
        f('followup_required', 'Takip denetimi gerekli mi?', 'select', '', ['Evet', 'Hayır']),
        f('auditor', 'Denetçi / teknik uzman'), f('client_representative', 'Firma yetkilisi'),
        f('root_cause', 'Firma kök neden analizi', 'textarea'),
        f('correction_plan', 'Düzeltme / düzeltici faaliyet planı', 'textarea'),
        f('plan_review', 'Planın gözden geçirilme / kabul notu', 'textarea'),
        f('target_date', 'Hedef tarih', 'date'), f('evidence_reference', 'Kanıt / dosya referansı'),
      ] }],
    }),

    RP07: form('RP07', 'Uygunsuzluk kapatma bilgi raporu', 'RP.06 bulgusuna bağlı takip, yöntem ve kanıt kaydı.', {
      repeaters: [{ key: 'closures', title: 'Kapatma / takip kayıtları', fields: [
        f('finding_no', 'Bağlı uygunsuzluk no'),
        f('closure_method', 'Kapatma / doğrulama yöntemi', 'textarea'),
        f('evidence_type', 'Fotoğraf / video / doküman / saha kanıtı'),
        f('evidence_reference', 'Kanıt kayıt referansı'),
        f('verification_result', 'Doğrulama kaydı', 'select', '', ['Kanıt görülerek doğrulandı', 'Plan kabul edildi; sonraki denetimde doğrulanacak', 'Kapatılmadı / ek bilgi gerekli']),
        f('reviewer', 'Denetçi / teknik uzman'), f('review_date', 'İnceleme tarihi', 'date'),
        f('closure_date', 'Kapatma tarihi', 'date'), f('note', 'Açıklama', 'textarea'),
      ] }],
    }),

    RP14: form('RP14', 'AB tip inceleme raporu', 'Sadece ÜB.TB.05 kapsamındaki Modül B için açılır; teknik inceleme kaydıdır, sonuç kararı üretmez.', { special: 'legacyRP14' }),
  };

  function auditKey(module, standard) {
    if (module === 'G') return standard === '81-20' ? 'G20' : 'G_LEGACY';
    if (module === 'E') return 'E_SURVEILLANCE';
    if (module === 'H1') return 'H1_SURVEILLANCE';
    return module;
  }

  function formsFor(module, standard, tractionType = '') {
    const key = auditKey(module, standard);
    const moduleForms = MODULE_SETS[key] || [];
    const codes = [...new Set([...COMMON, ...moduleForms])];
    if (module === 'E') codes.push('FR65'); // Kullanıcının önceki açık tercihi: E'de isteğe bağlı saha desteği.
    return codes.map(code => FORMS[code]).filter(Boolean).filter(definition => {
      if (tractionType === 'Elektrikli' && definition.key === 'FR48') return false;
      if (tractionType === 'Hidrolik' && definition.key === 'FR47') return false;
      return true;
    });
  }

  function emptyRecord() {
    return { schema_version: 2, updated_at: null, forms: {} };
  }

  function object(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  function clone(value) {
    if (Array.isArray(value)) return value.map(clone);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, clone(entry)]));
    }
    return value;
  }

  function normalize(value, legacyValue = null) {
    const source = object(value);
    const legacy = object(legacyValue);
    const oldInSource = { ...legacy, ...object(source.legacy_technical), ...source };
    const rawForms = object(source.forms);
    const forms = {};
    Object.entries(rawForms).forEach(([code, entry]) => { forms[code] = clone(object(entry)); });

    // Önceki yerel FR.65/RP.14 ekranının verilerini kayıpsız biçimde yeni birleşik forma taşır.
    const legacyFr65 = object(oldInSource.fr65);
    const currentFr65 = object(forms.FR65);
    forms.FR65 = {
      ...legacyFr65, ...currentFr65,
      values: { ...object(legacyFr65.values), ...object(currentFr65.values) },
    };
    const legacyRp14 = object(oldInSource.rp14);
    const currentRp14 = object(forms.RP14);
    forms.RP14 = {
      ...legacyRp14, ...currentRp14,
      checks: { ...object(legacyRp14.checks), ...object(currentRp14.checks) },
      characteristics: { ...object(legacyRp14.characteristics), ...object(currentRp14.characteristics) },
      instruments: { ...object(legacyRp14.instruments), ...object(currentRp14.instruments) },
      safety_components: { ...object(legacyRp14.safety_components), ...object(currentRp14.safety_components) },
      other_components: { ...object(legacyRp14.other_components), ...object(currentRp14.other_components) },
      deviations: typeof currentRp14.deviations === 'string' ? currentRp14.deviations : (legacyRp14.deviations || ''),
    };
    Object.keys(forms).forEach(code => {
      if (code === 'FR65' || code === 'RP14') return;
      const entry = forms[code];
      forms[code] = {
        ...entry,
        fields: object(entry.fields), items: object(entry.items), ratings: object(entry.ratings), rows: object(entry.rows),
      };
    });
    return { ...emptyRecord(), ...source, schema_version: 2, forms };
  }

  function hasValue(value) {
    if (value == null || value === false || value === '') return false;
    if (typeof value === 'number') return Number.isFinite(value);
    if (Array.isArray(value)) return value.some(hasValue);
    if (typeof value === 'object') return Object.entries(value).some(([key, entry]) =>
      !['updated_at', 'schema_version'].includes(key) && hasValue(entry));
    return true;
  }

  function formHasData(record, code) {
    const normalized = normalize(record);
    return hasValue(normalized.forms[code]);
  }

  function countForms(record, module, standard, tractionType = '') {
    const normalized = normalize(record);
    const list = formsFor(module, standard, tractionType);
    return { started: list.filter(entry => hasValue(normalized.forms[entry.key])).length, total: list.length, codes: list.map(entry => entry.key) };
  }

  root.AVES_DENETIM_FORM_SETI = Object.freeze({
    revision: 'ÜB.TB.05 /02 · 31.03.2026',
    referenceWarning: 'ÜB.LS.01 ana doküman listesinde ÜB.TB.05 hâlâ R.01 görünüyor; R.02 kapsamı canlı kullanım öncesi kontrollü revizyonla teyit edilmelidir.',
    STATUS_OPTIONS, FORM_STATUS_OPTIONS, COMMON, MODULE_SETS, FORMS,
    formsFor, emptyRecord, normalize, formHasData, countForms, hasValue,
  });
})(globalThis);
