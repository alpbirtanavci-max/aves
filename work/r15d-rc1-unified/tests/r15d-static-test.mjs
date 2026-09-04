import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(testDir, '..');
const appDir = path.join(root, 'app');
const dataDir = path.join(root, 'data');
const databaseDir = path.join(root, 'database');

const app = fs.readFileSync(path.join(appDir, 'app.js'), 'utf8');
const sw = fs.readFileSync(path.join(appDir, 'sw.js'), 'utf8');
const manifest = fs.readFileSync(path.join(appDir, 'manifest.json'), 'utf8');
const index = fs.readFileSync(path.join(appDir, 'index.html'), 'utf8');
const headers = fs.readFileSync(path.join(appDir, '_headers'), 'utf8');
const updateHtml = fs.readFileSync(path.join(appDir, 'update.html'), 'utf8');
const updateJs = fs.readFileSync(path.join(appDir, 'update.js'), 'utf8');
const sectionMappingJs = fs.readFileSync(path.join(appDir, 'section-mapping.js'), 'utf8');
const formOutput = fs.readFileSync(path.join(appDir, 'form-output.js'), 'utf8');
const formManifest = JSON.parse(fs.readFileSync(path.join(appDir, 'form-assets', 'form-output-manifest.json'), 'utf8'));
const migration = fs.readFileSync(path.join(databaseDir, '21_r15d_guvenli_gecis.sql'), 'utf8');
const rc2Migration = fs.readFileSync(path.join(databaseDir, '22_r15d_rc2_saha_akisi_ve_kuyu_dibi.sql'), 'utf8');
const rc3NullableMigration = fs.readFileSync(path.join(databaseDir, '23_r15d_rc3_saha_kontrol_nullable_kaynak_alanlari.sql'), 'utf8');
const rc3PolicyMigration = fs.readFileSync(path.join(databaseDir, '24_r15d_rc3_rls_policy_isim_temizligi.sql'), 'utf8');
const rc3GerekceMigration = fs.readFileSync(path.join(databaseDir, '25_r15d_rc3_otomatik_gerekce_sutunu.sql'), 'utf8');
const rc32Migration = fs.readFileSync(path.join(databaseDir, '28_r15d_rc32_snapshot_inceleme_yetki.sql'), 'utf8');
const rc34SerialMigration = fs.readFileSync(path.join(databaseDir, '40_r15d_rc34_ekipman_seri_numaralari.sql'), 'utf8');
const rc35SectionMigration = fs.readFileSync(path.join(databaseDir, '41_r15d_rc35_81_71_81_73_fiziksel_bolum_esleme.sql'), 'utf8');
const rc37WorkflowMigration = fs.readFileSync(path.join(databaseDir, '42_r15d_rc37_yetki_takip_duzeltme.sql'), 'utf8');
const rc38TechnicalManagerMigration = fs.readFileSync(path.join(databaseDir, '43_r15d_rc38_teknik_mudur_denetim_olusturma.sql'), 'utf8');
const rc39FormOutputMigration = fs.readFileSync(path.join(databaseDir, '44_r15d_rc39_form_cikti_snapshot.sql'), 'utf8');
const rc39NamedMeasurementsMigration = fs.readFileSync(path.join(databaseDir, '45_r15d_rc39_form_adlandirilmis_olculer.sql'), 'utf8');
const rc393CorrectionSyncMigration = fs.readFileSync(path.join(databaseDir, '46_r15d_rc393_duzeltme_oturumu_senkronu.sql'), 'utf8');
const rc394FeedbackMigration = fs.readFileSync(path.join(databaseDir, '47_r15d_rc394_saha_geri_bildirimi_icerik.sql'), 'utf8');
const rc398ModulBMigration = fs.readFileSync(path.join(databaseDir, '64_r15d_rc398_modul_b_ab_tip_incelemesi.sql'), 'utf8');
const rc399ModulBTakipMigration = fs.readFileSync(path.join(databaseDir, '65_r15d_rc399_modul_b_takip_muayenesi.sql'), 'utf8');
const rc3910EkStandartlarMigration = fs.readFileSync(path.join(databaseDir, '66_r15d_rc3910_ek_standartlar_81_21_22_28_77.sql'), 'utf8');
const rc3920PhotoCategoryMigration = fs.readFileSync(path.join(databaseDir, '72_r15d_rc3920_fotograf_kategori_sekmesi.sql'), 'utf8');
const rc3921PhotoCompatibilityMigration = fs.readFileSync(path.join(databaseDir, '73_r15d_rc3921_fotograf_gecis_uyumlulugu.sql'), 'utf8');
const rc3922PhotoScopeMigration = fs.readFileSync(path.join(databaseDir, '74_r15d_rc3922_fotograf_kategori_kapsami.sql'), 'utf8');
const rc3928PhotoArchiveMigration = fs.readFileSync(path.join(databaseDir, '75_r15d_rc3928_fotograf_arsiv_temizleme_yetkisi.sql'), 'utf8');
const rc3935PhotoArchiveStatusMigration = fs.readFileSync(path.join(databaseDir, '76_r15d_rc3935_fotograf_arsiv_durumu.sql'), 'utf8');
const rc3936HandoverMigration = fs.readFileSync(path.join(databaseDir, '77_r15d_rc3936_denetim_devir_teslim.sql'), 'utf8');
const rc3937FollowupAssignmentMigration = fs.readFileSync(path.join(databaseDir, '78_r15d_rc3937_takip_muhendisi_atama.sql'), 'utf8');
const rc3940FollowupAuthMigration = fs.readFileSync(path.join(databaseDir, '79_r15d_rc3940_takip_atanan_yetki.sql'), 'utf8');
const rc3941AnonRevokeMigration = fs.readFileSync(path.join(databaseDir, '80_r15d_rc3941_anon_execute_revoke.sql'), 'utf8');
const rls79Scenario = fs.readFileSync(path.join(testDir, 'rls', '79_takip_atama.sql'), 'utf8');
const rls79Bootstrap = fs.readFileSync(path.join(testDir, 'rls', '79_local_bootstrap.sql'), 'utf8');
const rls79Runner = fs.readFileSync(path.join(testDir, 'rls', 'run-79-local.ps1'), 'utf8');
const rc394GuardDeviceMigration = fs.readFileSync(path.join(databaseDir, '48_r15d_rc394_koruyucu_aygit_uygulanmaz_duzeltme.sql'), 'utf8');
const rc394SectionFixMigration = fs.readFileSync(path.join(databaseDir, '49_r15d_rc394_bolum_yanlis_yerlesim_duzeltme.sql'), 'utf8');
const rc394DuplicateMergeMigration = fs.readFileSync(path.join(databaseDir, '50_r15d_rc394_yalitim_direnci_mukerrer_birlestirme.sql'), 'utf8');
const rc394TitleFixMigration = fs.readFileSync(path.join(databaseDir, '51_r15d_rc394_kapi_kuyu_duvarlari_baslik_ozellestir.sql'), 'utf8');
const rc394KategoriMigration = fs.readFileSync(path.join(databaseDir, '52_r15d_rc394_kategori1_kategori2_netlestirme.sql'), 'utf8');
const rc394FragmanMigration = fs.readFileSync(path.join(databaseDir, '53_r15d_rc394_icerik_netlestirme_ub_fr_38.sql'), 'utf8');
const rc394ErisilebilirlikMigration = fs.readFileSync(path.join(databaseDir, '54_r15d_rc394_ub_fr_43_erisilebilirlik_netlestirme.sql'), 'utf8');
const rc394KapMigration = fs.readFileSync(path.join(databaseDir, '55_r15d_rc394_kap01_kap02_pasiflestirme.sql'), 'utf8');
const rc394KabinTipiMigration = fs.readFileSync(path.join(databaseDir, '56_r15d_rc394_kabin_tipi_tek_secim.sql'), 'utf8');
const rc394SenkronMigration = fs.readFileSync(path.join(databaseDir, '57_r15d_rc394_kutuphane_senkron_dosyadan_canliya.sql'), 'utf8');
const rc395ToparlamaMigration = fs.readFileSync(path.join(databaseDir, '58_r15d_rc395_saha_geri_bildirimi_toparlama.sql'), 'utf8');
const rc397Migration59 = fs.readFileSync(path.join(databaseDir, '59_r15d_rc397_ekran_fotografi_denetimi_1.sql'), 'utf8');
const rc397Migration60 = fs.readFileSync(path.join(databaseDir, '60_r15d_rc397_saha_geri_bildirimi_2.sql'), 'utf8');
const rc397Migration61 = fs.readFileSync(path.join(databaseDir, '61_r15d_rc397_kuyu_dibi_rehber_temizligi.sql'), 'utf8');
const rc397Migration62 = fs.readFileSync(path.join(databaseDir, '62_r15d_rc397_saha_geri_bildirimi_dogrulama.sql'), 'utf8');
const library = JSON.parse(fs.readFileSync(path.join(dataDir, 'madde_kutuphanesi.json'), 'utf8'));
const libraryCsv = fs.readFileSync(path.join(dataDir, 'madde_kutuphanesi.csv'), 'utf8');
const byId = new Map(library.map(row => [row.madde_id, row]));
const sectionMappingContext = {};
vm.createContext(sectionMappingContext);
vm.runInContext(sectionMappingJs, sectionMappingContext);

const checks = [];
const test = (name, condition) => checks.push({ name, ok: !!condition });

test('index R15D rc3.9.44 kaldığı yere dönüş sürümü', index.includes('R15D-RC3.9.44</b>'));
test('app R15D rc3.9.44 kaldığı yere dönüş sürümü', app.includes("const APP_VERSION = 'R15D-rc3.9.44'"));
test('service worker rc3.9.44 cache', sw.includes("aves-saha-r15d-rc3944'"));
test('uygulama manifesti rc3.9.44 sürümüyle tutarlı', manifest.includes('"version": "R15D-rc3.9.44"'));
test('showDenetim en son açılan denetimi kv last_inspection olarak yazar',
  app.includes("DB.kvSet('last_inspection', { id, at:") &&
  app.includes("DB.kvGet('last_inspection')"));
test('liste ekranında "Kaldığın yerden devam et" kartı: görünür + tamamlanmamış denetim',
  app.includes("resume.className = 'resume-card'") &&
  app.includes('Kaldığın yerden devam et') &&
  app.includes("denetimler.find(d => d.id === sonKayit.id && d.denetim_durumu !== 'Çalışma Tamamlandı')") &&
  index.includes('.resume-card{'));
test('showDenetim kayıtlı maddeye scrollIntoView yapar (kaldığı satır)',
  app.includes('const positionValid = savedPosition && rows.some(r => r.id === savedPosition.item_id') &&
  app.includes('.madde[data-id="') &&
  app.includes("el.scrollIntoView({ block: 'center' })"));
test('başlangıçta navigator.storage.persist() çağrılır ve sonucu kv storage_persist olarak yazılır',
  app.includes('async function ensurePersistentStorage()') &&
  app.includes('navigator.storage.persist()') &&
  app.includes('navigator.storage.persisted') &&
  app.includes("DB.kvSet('storage_persist'") &&
  app.includes('try { await ensurePersistentStorage(); } catch {}'));
test('hazırlık kontrolü kalıcı depolama iznini advisory (hazırlığı engellemeyen) satır olarak gösterir',
  app.includes("add('Kalıcı depolama izni',") &&
  app.includes("DB.kvGet('storage_persist')") &&
  app.includes('const ready = checks.every(check => check.ok || check.advisory);') &&
  app.includes('advisory: !!advisory'));
test('senkron uyarısı kilidi kırılır: reviewWarning + kvDel(sync_warning) + export',
  app.includes('async function reviewWarning()') &&
  app.includes("DB.kvDel('sync_warning')") &&
  app.includes('reviewWarning,') &&
  app.includes('async function korunanKalemler()') &&
  app.includes("KORUNAN_DURUMLAR = ['conflict', 'forbidden']"));
test('manual() gerçek outbox durumuna bakar, yalnız KV değil',
  app.includes('const korunan = await korunanKalemler();') &&
  app.includes('if (warning || korunan.length) { await reviewWarning(); return; }'));
test('çakışma (409) kayıtları körlemesine yeniden gönderilmez; yalnız 403 retry edilir',
  app.includes("const yetkiKalemleri = korunan.filter(it => it.sync_status === 'forbidden')") &&
  app.includes('for (const it of yetkiKalemleri) {') &&
  app.includes("it.sync_status = 'retry'") &&
  app.includes("const kalanCakisma = (await DB.outboxAll()).filter(x => x.sync_status === 'conflict')") &&
  !/for \(const it of korunan\) \{\s*\n\s*it\.sync_status = 'retry'/.test(app));
test('kapanış öncesi özet sonuç, fotoğraf ve aktarım durumunu gösterir',
  app.includes('Kapanış öncesi denetim özeti') && app.includes('Fotoğraf ve aktarım durumu') && app.includes('kapanisOzetiniGoster') && app.includes('kapanisOzetiOnaylandi'));
test('tamamlanmış denetim özeti fotoğraf arşiv ve takip durumunu gösterir',
  app.includes('Tamamlanmış Denetim Özeti') && app.includes('Fotoğraf arşiv durumu') && app.includes('fotograf_arsiv_temizlendi_at') && app.includes('tamamlanmisDenetimOzetiniGoster'));
test('tamamlanmış denetimde devir teslim kaydı oluşturulabilir',
  app.includes('Devir Teslim') && app.includes('denetimDevirTesliminiGoster') && app.includes('devir_edilen_ad') && rc3936HandoverMigration.includes('devir_edilen_email'));
test('takip mühendisi yönetim tarafından atanır ve atanan kişiye görünür',
  app.includes('Takip Mühendisi Ata') && app.includes('takipMuehendisiniAta') && app.includes('takip_atanan_email') && rc3937FollowupAssignmentMigration.includes('takip atanan saha guncelleme'));
test('takip için kısa çıktı yalnız önceki uygunsuzlukları içerir',
  app.includes('Takip Çıktısı') && app.includes('takipKisaCiktiYazdir') && app.includes('takip_onceki_durum === \'Olumsuz bulgu\'') && app.includes('oncekiEtiketi') && !app.includes('takip_onceki_denetim_id || \'\')}'));
test('Takip Ata düğmesi gerçek olay bağlayıcısına sahip',
  app.includes('id="btnTakipAta"') && app.includes('btnTakipAta.onclick = () => takipMuehendisiniAta(d)'));
test('migration 79 atanan mühendisi okuma politikalarına ekler',
  rc3940FollowupAuthMigration.includes('drop policy if exists "denetimleri okuma"') &&
  rc3940FollowupAuthMigration.includes('drop policy if exists "saha okuma"') &&
  rc3940FollowupAuthMigration.includes('drop policy if exists "gecmis okuma"') &&
  rc3940FollowupAuthMigration.includes('drop policy if exists "gecmis ekleme"') &&
  rc3940FollowupAuthMigration.includes('denetim fotograflari okuma') &&
  rc3940FollowupAuthMigration.includes('denetim fotograf nesnesi okuma') &&
  (rc3940FollowupAuthMigration.match(/takip_atanan_email/g) || []).length >= 11);
test('migration 79 denetimler UPDATE USING/WITH CHECK asimetrik (takibi kapatabilir, tamamlanmışı açamaz)',
  /using \([^;]*denetim_durumu in \('Devam Ediyor','Gözden Geçirme'\)\s*\)\s*with check \([^;]*'Çalışma Tamamlandı'\)/s.test(rc3940FollowupAuthMigration));
test('migration 79 fotoğraf/storage yazma politikaları tamamlanmış denetimi dışlar',
  (rc3940FollowupAuthMigration.match(/denetim_durumu <> 'Çalışma Tamamlandı'/g) || []).length >= 6);
test('migration 79 üst bilgi kilidi izin-listesi mantığı + OLD yetki kullanır',
  rc3940FollowupAuthMigration.includes('aves_takip_atanan_alan_kilidi') &&
  rc3940FollowupAuthMigration.includes('to_jsonb(NEW) - v_izinli') &&
  rc3940FollowupAuthMigration.includes('to_jsonb(OLD) - v_izinli') &&
  rc3940FollowupAuthMigration.includes('OLD.takip_atanan_email') &&
  rc3940FollowupAuthMigration.includes("'son_degistiren_email','son_degistiren_ad','son_degistiren_rol','son_degistiren_at'") &&
  !rc3940FollowupAuthMigration.includes('NEW.takip_atanan_email'));
test('migration 79 alan kilidi bakım rollerini dışlar ve SECURITY INVOKER çalışır',
  rc3940FollowupAuthMigration.includes("if current_user in ('postgres','service_role','supabase_admin') then") &&
  (() => {
    const fn = rc3940FollowupAuthMigration.slice(
      rc3940FollowupAuthMigration.indexOf('function public.aves_takip_atanan_alan_kilidi'),
      rc3940FollowupAuthMigration.indexOf('drop trigger if exists trg_aves_takip_atanan_alan_kilidi'));
    return !/security\s+definer/i.test(fn) && fn.includes("v_email <> ''");
  })());
test('migration 79 trigger denetimler üzerinde BEFORE UPDATE olarak kurulur',
  rc3940FollowupAuthMigration.includes('drop trigger if exists trg_aves_takip_atanan_alan_kilidi on public.denetimler') &&
  rc3940FollowupAuthMigration.includes('before update on public.denetimler'));
test('migration 79 fotoğraf/storage DELETE politikalarına dokunmaz (karar D2)',
  !rc3940FollowupAuthMigration.includes('for delete') && !/fotograflari silme|nesnesi silme/.test(rc3940FollowupAuthMigration));
test('migration 80 anon EXECUTE yetkisini aves_* fonksiyonlarından kaldırır, authenticated korur',
  /revoke execute on function[\s\S]*?from public, anon;/.test(rc3941AnonRevokeMigration) &&
  rc3941AnonRevokeMigration.includes('grant execute on function') &&
  rc3941AnonRevokeMigration.includes('to authenticated;') &&
  rc3941AnonRevokeMigration.includes('aves_satir_kimligini_dogrula()') &&
  rc3941AnonRevokeMigration.includes('aves_denetim_gorebilir_mi(text)') &&
  !/from [^;]*service_role|from [^;]*postgres/.test(rc3941AnonRevokeMigration) &&
  rc3941AnonRevokeMigration.includes("has_function_privilege('anon'"));
test('migration 79 dört-persona RLS harness dosyaları hata yayılımını tanımlar',
  rls79Scenario.includes('raise exception') &&
  !rls79Scenario.includes('EKSİK (branch') &&
  rls79Scenario.includes('3.6b') && rls79Scenario.includes('3.15b') &&
  rls79Bootstrap.includes('create table storage.objects') &&
  rls79Runner.includes('ON_ERROR_STOP=1') && rls79Runner.includes('docker rm -f $container'));
test('atanan takip mühendisi fotoğraf silme düğmesini görmez; ekleme açık, teknik müdür korunur (karar D2)',
  app.includes('const fotoSilebilir = currentCanEdit && (denetimSahibiMi(denetim) || Profile.canSeeAllInspections || Profile.canArchivePhotos)') &&
  app.includes('${fotoSilebilir ? `<button class="photo-remove"') &&
  !app.includes('${currentCanEdit ? `<button class="photo-remove"'));
test('fotoğraf arşiv durumu migrationı mevcut kayıt silmeden ek alanlar açar',
  rc3935PhotoArchiveStatusMigration.includes('fotograf_arsiv_son_indirme_at') && rc3935PhotoArchiveStatusMigration.includes('fotograf_arsiv_temizlendi_at') && !/\b(delete|truncate)\b/i.test(rc3935PhotoArchiveStatusMigration));
test('seri no tekrarında yalnız görünür kayıtlar, devam eden kayıt ve 365 gün kuralı var; takip akışı etkilenmiyor',
  app.includes('denetimGorunebilirMi(item) && normSeriNo(item.asansor_seri_no) === seriAnahtari') && app.includes("denetim_durumu !== 'Çalışma Tamamlandı'") && app.includes('365 * 24 * 60 * 60 * 1000') && app.includes('Yeni bağımsız denetim 365 gün sonra açılabilir') && app.includes('Takip denetimi'));
test('fotoğrafsız uygunsuzluk listesi ve tamamlanmış denetim sonuç özeti var',
  app.includes('Uygunsuzluk Listesi') && app.includes('fotoğraf içermez') && app.includes('Sonuç özeti'));
test('fotoğraf ZIP adı seri no ve tarih içeriyor', app.includes('arsivKimligi') && app.includes('_fotograflar.zip'));
test('takipte uygun hale gelen uygunsuzluk kapanış bilgisi gösteriliyor', app.includes('TAKİPTE KAPATILAN UYGUNSUZLUKLAR'));
test('fotoğraf kategorilerinde kalıcı saha notu alanı var',
  app.includes('data-photo-note') && app.includes('Fotoğraf kategori notu kaydedildi'));
test('inceleme sonucu hedef madde kayıtlı konumdan salt okunur açılıyor',
  app.includes('await showDenetim(denetimId, true);') &&
  app.includes('await rememberPosition(hedef.bolum, hedef.id);') &&
  app.includes('await DB.kvSet(`review_position_${currentDenetimId}`') &&
  !app.includes('DB.kvPut'));
test('fotoğraf storage yüklemesi upsert ile yeniden denemeye toleranslıdır', app.includes("'x-upsert': 'true'"));
test('bekleyen fotoğraf sayısı senkron durumuna yansıyor', app.includes('fotografBekleyenSayisi') && app.includes('waitingSync || fotografBekleyenSayisi'));
test('AVES kurumsal arayüz tasarım sistemi', index.includes('--radius-sm:6px') && index.includes('--shadow-card:') && index.includes('AVES KURUMSAL ARAYUZ'));
test('kurumsal arayüz klavye odak görünürlüğünü koruyor', index.includes('button:focus-visible') && index.includes('outline:3px solid rgba(234,0,72,.18)'));
test('Inter ve Montserrat çevrimdışı paketleniyor',
  index.includes("font-family:'Inter'") && index.includes("font-family:'Montserrat'") &&
  ['Inter-latin-ext.woff2','Inter-latin.woff2','Montserrat-latin-ext.woff2','Montserrat-latin.woff2'].every(name =>
    fs.existsSync(path.join(appDir, 'fonts', name)) && sw.includes(`'./fonts/${name}'`)));
test('giriş ekranında kutulu logo yerine AVES kurumsal başlığı var', app.includes('<div class="login-kicker">AVES Saha Denetim</div>') && !app.includes('<img src="logo.png" alt="AVES" style="height:34px'));
test('denetim geri dönüşü belirgin gezinme çubuğunda', app.includes('<div class="inspection-toolbar">') && index.includes('.inspection-toolbar .backlink'));
test('madde sonuçları tek segmentli kontrol olarak stilleniyor', index.includes('.mstates{display:grid;grid-template-columns:1fr 1fr 1fr auto'));
test('tarayıcı favicon isteği mevcut uygulama ikonuna yönleniyor', index.includes('rel="icon"') && index.includes('href="icon-192.png"'));
test('fiziksel bölüm eşlemesi uygulamadan önce yükleniyor',
  index.indexOf('section-mapping.js') < index.indexOf('app.js') && sw.includes("'./section-mapping.js'"));
test('eksik veya bozuk fiziksel bölüm eşlemesi uygulamayı sessizce başlatmıyor',
  app.includes("Object.keys(AVES_FIZIKSEL_BOLUM_ESLEMESI).length !== 70") &&
  app.includes('AVES fiziksel bölüm eşlemesi yüklenemedi'));
test('uygulama paketinde statik kütüphane yok', !fs.existsSync(path.join(appDir, 'madde_kutuphanesi.json')));
test('service worker statik kütüphane cachelemiyor', !sw.includes('madde_kutuphanesi.json'));
test('Cloudflare güvenlik başlıkları var', headers.includes('Content-Security-Policy') && headers.includes('X-Content-Type-Options: nosniff'));

test('yalnız üç ana sonuç', app.includes("const DURUMLAR = ['Kontrol tamamlandı','Olumsuz bulgu','Uygulanmaz'];"));
test('teknik müdür rolü', app.includes("'teknik_mudur'") && migration.includes("'teknik_mudur'"));
test('gözden geçirme akışı', app.includes("'Gözden Geçirme'") && migration.includes("'Gözden Geçirme'"));
test('çalışma tamamlandı akışı', app.includes("'Çalışma Tamamlandı'") && migration.includes("'Çalışma Tamamlandı'"));
test('sayfalı Supabase çekimi', app.includes('async function selectPaged'));
test('kalıcı Denetimi Bitir düğmesi', app.includes('id="btnBitirGlobal"') && app.includes("'Denetimi Bitir'"));
test('Denetimi Bitir ilk açık maddeye gider', app.includes('const firstPending = latestRows.find(r => !isFlowComplete(r))'));
test('bölüm sonunda otomatik sonraki bölüm açılıyor', app.includes('const sonrakiBolum = order[bolumIndex + 1]') && app.includes('openBolums.add(sonrakiBolum)'));
test('bölgesel fotoğraf hatırlatmasından sonra akış devam ediyor', app.includes('Fotoğraf hatırlatması') && app.includes('Tamam, devam et'));
test('fotoğraf işaretleme listesi kullanıcı arayüzünden kaldırıldı', !app.includes('data-photo=') && !app.includes('Fotoğraf kontrol listeleri'));
test('geçici iç işaret kullanıcı arayüzünden kaldırıldı', !app.includes('Geçici iç işaret') && !app.includes('data-review-reason'));
test('ilerlemek için üçlü nihai sonuç gerekli', app.includes('const canAdvanceFromItem = (r) => isComplete(r)'));
test('gözden geçirme alanları migration içinde', migration.includes('gozden_gecirme_nedeni text') && migration.includes('gozden_gecirme_notu text'));
test('geçici işaret kapanış listesinden kaldırıldı', !app.includes('GÖZDEN GEÇİRMEYE BIRAKILDI'));
test('salt okunur inceleme modu', app.includes('İnceleme Modu') && app.includes('inspectionReadOnly'));
test('salt okunur sonuç ve bulgu butonları dokunmatik ekranda görsel olarak pasif',
  index.includes('.madde.readonly .mst:disabled,.madde.readonly .bopt:disabled') &&
  index.includes('.madde.readonly .mst[class*="on-"]:disabled,.madde.readonly .bopt.on:disabled'));
test('kompakt tüm maddeler inceleme listesi', app.includes('Tüm maddeler (${rows.length})') && app.includes('compactRows'));
test('inceleme modu maddeleri denetim bölümleri altında grupluyor',
  app.includes('const compactBolumler = []') && app.includes('class="compact-section"') &&
  app.includes('compact-section-count') && index.includes('.compact-section>summary'));
test('inceleme modunda madde araması', app.includes('compact-search') && app.includes('haystack.includes(query)'));
test('inceleme araması eşleşen bölümleri otomatik açıyor', app.includes('if (query && visibleCount) section.open = true'));
test('inceleme modu son seçilen madde konumunu cihazda hatırlıyor',
  app.includes('review_position_${currentDenetimId}') && app.includes('reviewPositionRow'));
test('inceleme modu tekrar açıldığında son bölümü açıp maddeye kaydırıyor',
  app.includes('reviewPositionRow || rows.find') && app.includes("rememberedButton.classList.add('review-return')") &&
  app.includes("rememberedButton.scrollIntoView({ block: 'center' })") && index.includes('.compact-row.review-return'));
test('kompakt liste durum ve not/ölçüm filtreleri', app.includes('data-compact-filter="note"') && app.includes('data-compact-filter="measurement"'));
test('Sahaya Hazırla bütünlük kontrolü', app.includes('async function sahayaHazirla') && app.includes('Madde kimlikleri eksiksiz ve benzersiz'));
test('Sahaya Hazırla item-set hash kaydı', app.includes('expected_item_set_hash = itemSetHash'));
test('Sahaya Hazırla kütüphane manifestini doğruluyor', app.includes('manifest.count === library.length'));
test('Sahaya Hazırla yerel yazma testi yapıyor', app.includes('offline_probe_'));
test('Sahaya Hazırla uygulama kabuğunu cache içinde doğruluyor', app.includes('OFFLINE_CORE_ASSETS') && app.includes('caches.match'));
test('Sahaya Hazırla kurumsal fontları ve AVES logosunu da doğruluyor',
  ['aves-logo-white.png','Inter-latin-ext.woff2','Inter-latin.woff2','Montserrat-latin-ext.woff2','Montserrat-latin.woff2']
    .every(name => app.includes(name)));
test('Sahaya Hazırla kullanıcı yetkisi doğrulamasını arıyor', app.includes('profile_verified_at'));
test('çevrimdışı hazırlık durumu açıkça görünür', app.includes('Çevrimdışı çalışmaya hazır') && app.includes('Çevrimdışı çalışmaya hazır değil'));
test('çevrimdışı hazırlık cihaz bazında tutuluyor', app.includes('offline_ready_${d.id}') && app.includes('marker.device_id !== await getDeviceId()'));
test('uygulama sürümü değişince cihaz yeniden doğrulanıyor', app.includes('marker.app_build_id !== APP_VERSION'));
test('hazırlık madde kümesi hashini cihazda yeniden doğruluyor', app.includes('itemSetHash !== marker.item_set_hash'));
test('başarısız yeni kontrol eski hazır işaretine güvenmiyor', app.includes('Yeni kontrol tamamlanana kadar önceki cihaz işaretine güvenilmez'));
test('offline hazırlık alanları migration içinde', migration.includes('offline_hazir_at timestamptz') && migration.includes('expected_item_set_hash text'));
test('denetim bazında cihaz/sunucu durumu gösteriliyor', app.includes('✓ Cihaza kaydedildi') && app.includes('işlem sunucu aktarımı bekliyor'));
test('kapanış ekranı yerel kopyanın korunduğunu gösteriyor', app.includes('Tüm yanıtlar cihazda'));
test('yerel yazımdan sonra denetim sayacı anında güncelleniyor', app.includes('await UI.refreshSyncState()') && app.includes('async function refreshSyncState()'));
test('son açık madde cihazda hatırlanıyor', app.includes('async function rememberPosition') && app.includes('last_position_'));
test('denetim yeniden açıldığında son konum yükleniyor', app.includes('const savedPosition = await DB.kvGet'));

test('IndexedDB v6 geçmiş ve fotoğraf depoları', app.includes('const DB_VERSION = 6') && app.includes("createObjectStore('gecmis'") && app.includes("createObjectStore('fotograflar'"));
test('fotoğraflar madde değil sabit saha kategorisine bağlı (Seri No ile aynı desen)', app.includes('FOTOGRAF_KATEGORILERI') &&
  ['genel_kimlik','kuyu_dibi','kuyu_boyunca','durak_kapilari','kabin_kabin_ustu','makine_sase','hidrolik_grubu','kumanda_grubu','ozel_sistemler'].every(k => app.includes(`'${k}'`)) &&
  !app.includes('KRITIK_FOTOGRAF_MADDELERI'));
test('her fotoğraf kategorisinde Modül G esaslı yönlendirme metni var',
  app.includes("'kuyu_dibi', 'Kuyu Dibi', 'Kuyu dibinin yerleşimini") &&
  app.includes("'makine_sase', 'Makine, Şase ve Üst Donanım'") && app.includes('capture="environment" multiple'));
test('fotoğraf yönergesi denetçinin ilave kare ve muhakeme serbestisini koruyor',
  app.includes('Bu yönergeler sınırlayıcı bir liste değil') && app.includes('kuşkulu durumları ve uygunsuzlukları ayrıca kaydedin'));
test('paraşüt fren izi kuyu boyunca fotoğraf yönergesinde',
  app.includes('Paraşüt fren testi tamamlandıktan sonra frenin ray üzerinde oluşturduğu izi de fotoğraflayın'));
test('alarm ve iki yönlü haberleşme özel değil her asansörde aranıyor',
  app.includes('Her asansörde aranan alarm ve iki yönlü haberleşme tertibatını') &&
  !app.slice(app.indexOf("'ozel_sistemler'"), app.indexOf('];', app.indexOf("'ozel_sistemler'"))).includes('alarm/iki yönlü haberleşme'));
test('işlev testi videoları ayrı kurumsal aktarım ve arşive yönlendiriliyor',
  app.includes('UCM testi, paraşüt fren testi, motor freni tek çene testi') &&
  app.includes('kurumun belirlediği ayrı aktarım ve arşiv yöntemiyle iletin'));
test('fotoğraflar yükleme öncesi küçültülüyor', app.includes('1600 / Math.max(bitmap.width, bitmap.height)') && app.includes("'image/jpeg', .82"));
test('fotoğraflar sekmesi kategori bazlı grid ve tam görünüm sunuyor', app.includes('function fotografSekmesi') && app.includes('photo-kategori') && app.includes('photo-grid') && app.includes("window.open(url, '_blank')"));
test('fotoğraf kartı tarih ve yükleyen kullanıcı bilgisini gösteriyor',
  app.includes("new Date(foto.created_at).toLocaleString('tr-TR')") && app.includes("foto.created_by || 'Kullanıcı bilgisi yok'"));
test('denetim fotoğrafları kategori klasörleriyle toplu ZIP indiriliyor',
  app.includes('photo-download-all') && app.includes('const zip = new JSZip()') &&
  app.includes("zip.folder(foto.kategori || 'diger')") && app.includes('_fotograflar.zip'));
test('arşiv temizliği yalnız özel profil yetkisiyle iki ayrı onay istiyor',
  app.includes('Profile.canArchivePhotos && confirm') &&
  app.includes('İndirilen fotoğraf arşivini güvenli bir yerde depoladınız mı?') &&
  app.includes('Bu işlem geri alınamaz. Emin misiniz?'));
test('arşiv temizliği başarısız kayıtları cihazda koruyup sayısını bildiriyor',
  app.includes('basarisiz += 1') && app.includes('kayıt korundu'));
test('fotoğraflar sekmesi denetim ayrıntısında Seri No yanında açılıyor', app.includes("id=\"btnFotograflar\"") && app.includes("btnFotograflar').onclick = fotografSekmesi"));
test('eski cihaz fotoğrafları kategoriye dönüştürülüyor', app.includes('LEGACY_FOTOGRAF_KATEGORISI') &&
  app.includes('LEGACY_FOTOGRAF_KATEGORISI[foto.madde_id]') &&
  app.includes('foto.kategori = LEGACY_FOTOGRAF_KATEGORISI[foto.madde_id]'));
test('kategori migrationı sunucu fotoğraflarını silmiyor ve eski alanları koruyor',
  !/delete\s+from\s+public\.denetim_fotograflari/i.test(rc3920PhotoCategoryMigration) &&
  !/drop\s+column\s+(if\s+exists\s+)?(saha_kontrol_id|madde_id)/i.test(rc3920PhotoCategoryMigration));
test('kategori migrationı eski kritik maddeleri kayıpsız eşliyor',
  ['MAD-0006','MAD-0072','MAD-0110','MAD-0111','MAD-0162','MAD-0364','MAD-0366','MAD-0368','MAD-0369']
    .every(id => rc3920PhotoCategoryMigration.includes(`'${id}'`)) &&
  rc3920PhotoCategoryMigration.includes('Kategoriye eşlenemeyen eski fotoğraf var'));
test('düzeltme migrationı eski ve yeni uygulama sürümlerini birlikte destekliyor',
  rc3921PhotoCompatibilityMigration.includes('add column if not exists saha_kontrol_id uuid') &&
  rc3921PhotoCompatibilityMigration.includes('add column if not exists madde_id text') &&
  rc3921PhotoCompatibilityMigration.includes('denetim_fotografi_legacy_kategori_ata') &&
  !/delete\s+from\s+public\.denetim_fotograflari/i.test(rc3921PhotoCompatibilityMigration));
test('Modül G fotoğraf kapsamı migrationı dokuz kategoriyi veri silmeden açıyor',
  ['genel_kimlik','kuyu_dibi','kuyu_boyunca','durak_kapilari','kabin_kabin_ustu','makine_sase','hidrolik_grubu','kumanda_grubu','ozel_sistemler']
    .every(k => rc3922PhotoScopeMigration.includes(`'${k}'`)) &&
  !/delete\s+from\s+public\.denetim_fotograflari/i.test(rc3922PhotoScopeMigration));
test('fotoğraf arşiv temizliği kişi bazlı yetki ve tamamlanmış kayıt RLS desteği içeriyor',
  rc3928PhotoArchiveMigration.includes('fotograf_arsiv_temizleme_yetkisi boolean not null default false') &&
  rc3928PhotoArchiveMigration.includes("lower(trim(ad_soyad)) = lower('Alpbirtan Avcı')") &&
  rc3928PhotoArchiveMigration.includes("lower(trim(ad_soyad)) like 'emine %'") &&
  rc3928PhotoArchiveMigration.includes('p.fotograf_arsiv_temizleme_yetkisi') &&
  rc3928PhotoArchiveMigration.includes('alp_sayisi <> 1 or emine_sayisi <> 1'));
test('DB yükseltmesi mevcut storeları yeniden oluşturmuyor', app.includes("objectStoreNames.contains('outbox')"));
test('atomik yerel cevap, geçmiş ve outbox', app.includes('putAllWithOutbox') && app.includes("[store, 'outbox', 'gecmis']"));
test('kütüphane ve manifest atomik yenileniyor', app.includes('replaceAllWithMeta') && app.includes("db.transaction([store, 'kv'], 'readwrite')"));
test('denetim listesi atomik yenileniyor', app.includes("DB.replaceAll('denetimler'"));
test('saha denetimi atomik yenileniyor', app.includes("DB.replaceByIndex('saha', 'byDenetim'"));
test('sunucu eksik liste döndürürse yerel denetimler korunuyor', app.includes("const localRows = await DB.all('denetimler')") && app.includes('!merged.has(row.id)'));
test('sunucu eksik sayfa döndürürse yerel checklist korunuyor', app.includes("const localRows = await DB.allByIndex('saha', 'byDenetim', denetimId)") && app.includes('const merged = new Map(localRows.map'));
test('kütüphane kimlik bütünlüğü kontrolü', app.includes('new Set(ids).size !== ids.length'));
test('kütüphane içerik hash kaydı', app.includes('content_hash: contentHash'));
const localWrite = app.slice(app.indexOf('async function localWrite'), app.indexOf('/* ================= UI ================= */'));
test('localWrite atomik metodu kullanıyor', localWrite.includes('DB.putAllWithOutbox'));
test('localWrite tam sync çağırmıyor', !localWrite.includes('Sync.full()'));
test('outbox operation kimliği', localWrite.includes('operation_id: operationId'));
test('outbox kullanıcı ve cihaz kimliği', localWrite.includes('user_id:') && localWrite.includes('device_id:'));
test('outbox deneme sayacı', localWrite.includes('attempt_count: 0'));

const forbiddenBlock = app.slice(app.indexOf('if (e.status === 403)'), app.indexOf("console.warn('Senkron duraksadı:"));
test('403 outbox kaydını silmiyor', !forbiddenBlock.includes('outboxDel'));
test('403 yerel kaydı incelemeye alıyor', forbiddenBlock.includes("sync_status = 'forbidden'"));
test('409 çakışan yerel kaydı silmiyor', app.includes("e.status === 409") && app.includes("sync_status = 'conflict'") && app.includes("kind: 'conflict'"));
test('retry hatası outbox üzerinde tutuluyor', app.includes("sync_status = 'retry'"));
test('yarıda kalan sending işlemleri yeniden deneniyor', app.includes("['pending', 'retry', 'sending']"));
test('korunan outbox varken senkron tamamlandı sayılmıyor', app.includes("allSent && (await DB.outboxCount()) === 0"));
test('forbidden kayıt sık yeniden deneme döngüsüne girmiyor', app.includes('const retryableItems = (await DB.outboxAll()).filter'));
test('manuel senkron gerçek tamamlanma sonucunu gösteriyor', app.includes("completed ? 'Senkron tamamlandı'"));
test('senkron sonrası denetim içi durum güvenli olduğunda yeniden hesaplanıyor', app.includes('UI.canRefreshSafely()') && app.includes("currentView === 'inspection' && currentDenetimId"));
test('aktif form alanı arka plan senkronuyla yeniden çizilmiyor',
  app.includes('UI.canRefreshSafely()') && app.includes("active.matches('input,textarea,select')"));
test('bulgu, madde notu ve ölçüm yazarken taslak cihazda gecikmeli saklanıyor',
  app.includes("matches('[data-diger],[data-aciklama],[data-olcum-id]')") &&
  app.includes('scheduleEditorDraft(e.target)') && app.includes('}, 700);'));
test('denetim tamamlanmadan bekleyen alan yazımları bitiriliyor',
  app.includes('async function flushEditorWrites()') && app.includes('await flushEditorWrites();'));
test('eşzamanlı push tamamlandı sayılmıyor', app.includes('if (pushRunning) return false'));
test('yeniden deneme artan bekleme kullanıyor', app.includes('const backoff = Math.min(60000'));
test('senkron sonrası yalnız açık denetim listesi yenileniyor', app.includes("else if (currentView === 'list') showList()"));
test('arka plan senkronu yeni denetim formunu kapatmıyor', app.includes("currentView = 'new-inspection'") && app.includes("else if (currentView === 'list') showList()"));
test('müşteri ünvanı alanı erişilebilir ve normal input', app.includes('label for="fMusteri"') && app.includes('id="fMusteri" autocomplete="organization"'));
test('seri numaralarına denetim alt çubuğundan her zaman erişiliyor', app.includes('id="btnSeriler"') && app.includes('seriNumaralariGoster'));
test('seri numaraları bölge bazında yapılandırılıyor', ['kabin_tamponlari','karsi_agirlik_tamponlari','parasut_frenleri','kat_kapilari','kumanda_kartlari'].every(key => app.includes(key)));
test('MRL seri alanları yalnız MRL denetiminde gösteriliyor', app.includes("d.makine_dairesi_tipi !== 'MRL'") && app.includes('regulatorler') && app.includes('motorlar'));
test('kat kapıları kat ve giriş bazında tekrarlanabiliyor', app.includes('placeholder="Kat / durak"') && app.includes('placeholder="Giriş (A/B)"') && app.includes('data-serial-add'));
test('seri numaraları local-first denetim kaydına yazılıyor', app.includes("await localWrite('denetimler', d, 'denetimler')") && app.includes('d.seri_numaralari = next'));
test('ekranda görünmeyen koşullu seri kayıtları korunuyor', app.includes('const result = seriNumaralariNormalize(data)') && app.includes("result[group.dataset.serialGroup] = []"));
test('yerel seri kaydı başarısızsa pencere açık kalıyor', app.includes('Seri numaraları cihazda kaydedilemedi; ekran açık bırakıldı'));
test('seri numaraları değişiklik geçmişine dahil', app.includes("'butunluk_hash', 'seri_numaralari'"));
test('seri numaraları kapanış bütünlük hashine dahil', app.includes('seri_numaralari: seriNumaralariNormalize(d.seri_numaralari)'));
test('eksik seri grupları denetim kapanışını engelliyor', app.includes('const eksikSeriler = seriEksikleri(d)') && app.includes('Seri numarası kayıtlarında'));
test('seri numarası migration mevcut kayıtları silmiyor', rc34SerialMigration.includes('add column if not exists seri_numaralari jsonb') && !/delete\s+from/i.test(rc34SerialMigration));
test('seri numarası migration JSON nesnesini doğruluyor', rc34SerialMigration.includes("jsonb_typeof(seri_numaralari) = 'object'") && rc34SerialMigration.includes('set not null'));

const installBlock = sw.slice(sw.indexOf("self.addEventListener('install'"), sw.indexOf("self.addEventListener('message'"));
test('service worker kullanıcı onayından önce etkinleşmiyor', !installBlock.includes('self.skipWaiting'));
test('service worker kontrollü güncelleme mesajı', sw.includes("type === 'SKIP_WAITING'"));
test('yeni sürüm kullanıcı onayıyla etkinleşiyor', app.includes('registerServiceWorkerWithUpdateChoice') && app.includes('Şimdi güncelle') && app.includes("worker.postMessage({ type: 'SKIP_WAITING' })"));
test('service worker değişimi yalnız kullanıcı isterse sayfayı yeniliyor', app.includes('if (reloadRequested) location.reload()'));
test('service worker HTTP önbelleğini kullanmadan doğrulanıyor', app.includes("updateViaCache: 'none'") && app.includes('registration.update()'));
test('ana belge ağ öncelikli ve çevrimdışı geri dönüşlü', sw.includes("e.request.mode === 'navigate'") && sw.includes("caches.match('./index.html')"));
test('ana belge ve service worker no-cache yayınlanıyor', headers.includes('/sw.js') && headers.includes('/index.html') && headers.includes('no-store, no-cache, must-revalidate'));
test('yerel veritabanı hatası boş ekran bırakmıyor', app.includes('Uygulama yerel veritabanını açamadı'));
test('güvenli cache kurtarma sayfası pakette', updateHtml.includes('AVES Saha güvenli güncelleme') && sw.includes("'./update.html', './update.js'"));
test('kurtarma yeni sürümü silmeden önce doğruluyor', updateJs.includes("EXPECTED_BUILD = 'R15D'") && updateJs.indexOf('indexText.includes') < updateJs.indexOf('registration.unregister'));
test('kurtarma yalnız AVES cache ve service worker kaydını kaldırıyor', updateJs.includes("name.startsWith('aves-saha-')") && updateJs.includes('registration.unregister()'));
test('kurtarma IndexedDB ve oturum verisini silmiyor', !updateJs.includes('deleteDatabase') && !updateJs.includes('localStorage.clear') && !updateJs.includes('sessionStorage.clear'));
test('Tip 3/Tip 4 merdiven görseli pakette', fs.existsSync(path.join(appDir, 'referans-gorseller', 'G-PIT-LADDER-TYPE3-4-TR.svg')) && sw.includes('G-PIT-LADDER-TYPE3-4-TR.svg'));
test('sığınma alanında kaynak PNG kullanılıyor', app.includes("'G-PIT-REFUGE-TABLE4': ['G-8120-C4.png']"));
test('mevcut denetim snapshot metni güncel kütüphaneyle ezilmiyor', app.includes("typeof merged[field] === 'undefined'") && !app.includes('merged[field] = latest[field] ?? null; }'));
test('pasifleşen satır tarihsel denetimden düşürülmüyor', app.includes("if (!latest) return { ...row, kutuphane_pasif: true }"));
test('rc2 migration cevapları değiştirmiyor', !/update\s+public\.saha_kontrol/i.test(rc2Migration) && !/delete\s+from/i.test(rc2Migration));
test('rc2 kuyu dibi içerik hedefleri var', ['MAD-0021','MAD-0036','MAD-0037','MAD-0041','MAD-0057','MAD-0060','MAD-0076','MAD-0077','MAD-0080'].every(id => rc2Migration.includes(id)));
test('uygulanmaz koşulu rehberden ayrılıyor', app.includes('function rehberMetni') && app.includes('function uygulanmazKosuluMetni'));
test('ölçüm eşik önerisi sonucu otomatik değiştirmiyor', app.includes('async function esikOnerisiGoster') && app.includes('Bu yalnızca bir öneridir'));
test('ölçüm eşik önerisinde iki açık karar var', app.includes('Uygun Değil işaretle') && app.includes('id="thresholdIgnore"'));
test('çoklu ölçümlerde belirsiz eşik tahmini yapılmıyor', app.includes("Array.isArray(row.olcum_tanimlari) && row.olcum_tanimlari.length"));
test('birebir tekrar eden saha rehberleri temizleniyor', rc2Migration.includes("btrim(regexp_replace(denetci_yonlendirmesi"));
test('kontrol olmayan form satırları pasifleştiriliyor', ['MAD-0809','MAD-0817','MAD-0825','MAD-0888','MAD-1004'].every(id => rc2Migration.includes(id)));
test('MAD-0824 kaynak dalı rc2 içinde geri açılıyor', /set\s+aktif\s*=\s*true[\s\S]*where\s+madde_id\s*=\s*'MAD-0824'/i.test(rc2Migration));

test('kütüphane toplamı 1083', library.length === 1083);
test('MAD-0561 başlığı Testler', byId.get('MAD-0561')?.kontrol_basligi === 'Testler');
const hydraulicIds = library
  .filter(row => row.madde_id >= 'MAD-0562' && row.madde_id <= 'MAD-0613' && !['MAD-0570','MAD-0611'].includes(row.madde_id))
  .map(row => row.madde_id);
test('50 genel hidrolik başlık hedefi var', hydraulicIds.length === 50);
test('hidrolik başlıkların tamamı düzeltildi', hydraulicIds.every(id => byId.get(id)?.kontrol_basligi === 'Hidrolik Kontrol ve Testleri'));
test('MAD-0570 yanlış hidrolik başlığından ve tahrik koşulundan ayrıldı',
  byId.get('MAD-0570')?.kontrol_basligi === 'Kabin en üst konumunda kılavuz ray ilave hareket seyri' &&
  byId.get('MAD-0570')?.tahrik_kosulu == null);
test('MAD-0611 özgül başlığını koruyor', byId.get('MAD-0611')?.kontrol_basligi === 'Hidrolik devre kapama vanası');
test('dört MR koşulu düzeltildi', ['MAD-0460','MAD-0467','MAD-0486','MAD-0492'].every(id => byId.get(id)?.md_kosulu === 'MR'));
test('MAD-0824 kaynak doğrulaması sonrası temel veri paketinde aktif', byId.get('MAD-0824')?.aktif === true);
test('form açıklaması olan altı satır temel veri paketinde pasif',
  ['MAD-0499','MAD-0517','MAD-0682','MAD-0712','MAD-0946','MAD-1004']
    .every(id => byId.get(id)?.aktif === false));
test('MAD-0814 aktif', byId.get('MAD-0814')?.aktif === true);

test('migration canlı saha satırı silmiyor', !/delete\s+from\s+public\.saha_kontrol/i.test(migration));
test('migration ana kütüphane satırı silmiyor', !/delete\s+from\s+public\.madde_kutuphanesi/i.test(migration));
test('eski iş akışı constrainti veri dönüşümünden önce kaldırılıyor', migration.indexOf('drop constraint if exists denetimler_denetim_durumu_check') < migration.indexOf("set denetim_durumu = 'Çalışma Tamamlandı'"));
test('MAD-1010 pasifleştiriliyor', /set\s+aktif\s*=\s*false\s+where\s+madde_id\s*=\s*'MAD-1010'/i.test(migration));
test('eski sonuç ayrıca korunuyor', migration.includes('gecis_oncesi_durum'));
test('snapshot hazır seçenekleri topluca değiştirilmiyor', !migration.includes('update public.saha_kontrol s\nset hazir_secenekler'));
test('checklist satırı DELETE yetkisi kaldırılıyor', migration.includes('revoke all on public.saha_kontrol from anon, authenticated') && migration.includes('grant select, insert, update on public.saha_kontrol to authenticated'));
test('checklist DELETE politikası oluşturulmuyor', !migration.includes('create policy "R15C saha silme"'));
test('canlı R11 silme politikaları geçişte kaldırılıyor', migration.includes('drop policy if exists "R11 denetim silme"') && migration.includes('drop policy if exists "R11 saha silme"'));
test('52 başlık ön koşulu ilk ve ikinci çalıştırmayı ayırıyor', migration.includes('title_target_count = 52') && migration.includes('title_final_count = 52'));
test('4 MR ön koşulu ilk ve ikinci çalıştırmayı ayırıyor', migration.includes('mr_target_count = 4') && migration.includes('mr_final_count = 4'));
test('mükerrer ön koşulu', migration.includes('MAD-0814 / MAD-0824'));
test('cevaplar denetim ve madde bazında benzersiz', migration.includes('saha_kontrol_denetim_madde_uidx'));
test('benzersizlik öncesi mükerrer varsa migration duruyor', migration.includes("having count(*) > 1"));
test('anon kütüphane ve profil erişimi açıkça kaldırılıyor', migration.includes('revoke all on public.madde_kutuphanesi from anon') && migration.includes('revoke all on public.kullanici_profilleri from anon'));
test('anon tüm saha tablolarından kaldırılıyor', migration.includes('revoke all on public.denetimler from anon, authenticated') && migration.includes('revoke all on public.saha_kontrol from anon, authenticated'));
test('authenticated fazla tablo yetkileri temizleniyor', migration.includes('revoke all on public.kutuphane_bolum_surumleri from anon, authenticated') && migration.includes('grant select on public.kutuphane_bolum_surumleri to authenticated'));
test('istemci profil ve kütüphane yazamıyor', migration.includes('revoke all on public.kullanici_profilleri from anon, authenticated') && migration.includes('revoke all on public.madde_kutuphanesi from anon, authenticated'));

// rc3: hazir_secenekler/kaynak_turu NOT NULL uyuşmazlığı düzeltmesi
test('rc3 hazir_secenekler NOT NULL kısıtını kaldırıyor', /alter\s+table\s+public\.saha_kontrol\s+alter\s+column\s+hazir_secenekler\s+drop\s+not\s+null/i.test(rc3NullableMigration));
test('rc3 kaynak_turu NOT NULL kısıtını kaldırıyor', /alter\s+table\s+public\.saha_kontrol\s+alter\s+column\s+kaynak_turu\s+drop\s+not\s+null/i.test(rc3NullableMigration));
test('rc3 nullable migration fail-fast kontrolü içeriyor', /count\(\*\)\s+from\s+public\.saha_kontrol\)\s*<>\s*0/i.test(rc3NullableMigration));

// rc3: RLS policy isim temizliği (mantık değil yalnız isim)
test('rc3 RLS politika isimleri eski R15C/R13 önekinden temizleniyor', rc3PolicyMigration.includes('rename to "denetim silme"') && rc3PolicyMigration.includes('rename to "saha guncelleme"'));

// rc3: otomatik Uygulanmaz gerekçesi artık kaydediliyor ve gösteriliyor
test('rc3 saha_kontrol.otomatik_gerekce sütunu ekleniyor', /alter\s+table\s+public\.saha_kontrol\s+add\s+column\s+if\s+not\s+exists\s+otomatik_gerekce\s+text/i.test(rc3GerekceMigration));
test('otoSebep artık satıra yazılıyor', /otomatik_gerekce:\s*otoSebep/.test(app));
test('otomatik Uygulanmaz gerekçesi ekranda gösteriliyor', app.includes('Otomatik Uygulanmaz gerekçesi'));
test('manuel durum değişiminde eski otomatik gerekçe temizleniyor', /row\.otomatik_uygulanmaz\s*=\s*false;\s*\n\s*row\.otomatik_gerekce\s*=\s*null;/.test(app));

// 81-71/81-73 her denetimde zorunlu, 81-72 (itfaiyeci) ayrı ve açık seçim
test('81-71 her zaman secili standart grubunda', /gruplar\s*=\s*new Set\(\[[^\]]*'81-71'/.test(app));
test('81-73 her zaman secili standart grubunda', /gruplar\s*=\s*new Set\(\[[^\]]*'81-73'/.test(app));
const active8171 = library.filter(row => row.aktif && row.standart_grubu === '81-71');
const active8173 = library.filter(row => row.aktif && row.standart_grubu === '81-73');
const forbiddenSpecialSections = new Set([
  '08 - TS EN 81-71 Tahribata Dayanıklı',
  '09 - TS EN 81-73 Yangın Davranışı',
]);
test('81-71 aktif madde sayısı 39 olarak korunuyor', active8171.length === 39);
test('81-73 aktif madde sayısı 31 olarak korunuyor', active8173.length === 31);
test('81-71 ve 81-73 özel bölümlerinde aktif madde kalmıyor',
  [...active8171, ...active8173].every(row => !forbiddenSpecialSections.has(row.bolum)));

const simulatedOldLiveLibrary = [...active8171, ...active8173].map(row => ({
  ...row,
  bolum: row.standart_grubu === '81-71'
    ? '08 - TS EN 81-71 Tahribata Dayanıklı'
    : '09 - TS EN 81-73 Yangın Davranışı',
}));
const clientMappedLibrary = simulatedOldLiveLibrary.map(sectionMappingContext.avesFizikselBolumUygula);
test('istemci eski canlı Supabase bölüm verisini 70 madde için düzeltiyor',
  Object.keys(sectionMappingContext.AVES_FIZIKSEL_BOLUM_ESLEMESI).length === 70 &&
  clientMappedLibrary.every(row =>
    !forbiddenSpecialSections.has(row.bolum) && row.bolum === byId.get(row.madde_id)?.bolum
  ));
test('kütüphane yenileme ve yeni denetim eski canlı veriye karşı korunuyor',
  app.includes('.map(avesFizikselBolumUygula)') &&
  app.includes("const KUTUPHANE_VER = 10") &&
  app.includes("const lib = (await DB.all('kutuphane')).map(avesFizikselBolumUygula)"));
test('81-71 fiziksel bölüm dağılımı doğru',
  active8171.filter(row => row.bolum === '01 - Kuyu Dibi').length === 1 &&
  active8171.filter(row => row.bolum === '02 - Kuyu Boyunca').length === 17 &&
  active8171.filter(row => row.bolum === '03 - Kabin ve Kabin Üstü').length === 14 &&
  active8171.filter(row => row.bolum === '04 - Makine ve Şase').length === 1 &&
  active8171.filter(row => row.bolum === '05 - Elektrik ve Test').length === 6);
test('81-73 fiziksel bölüm dağılımı doğru',
  active8173.filter(row => row.bolum === '00 - Ön Kontrol').length === 1 &&
  active8173.filter(row => row.bolum === '02 - Kuyu Boyunca').length === 8 &&
  active8173.filter(row => row.bolum === '03 - Kabin ve Kabin Üstü').length === 1 &&
  active8173.filter(row => row.bolum === '05 - Elektrik ve Test').length === 21);
test('rc3.5 bölüm migration 70 eşleme için fail-fast doğrulama içeriyor',
  rc35SectionMigration.includes('if v_mapping_count <> 70') && rc35SectionMigration.includes('if v_library_count <> 70'));
test('rc3.5 bölüm migration başlamış denetim snapshotlarını değiştirmiyor',
  !/update\s+public\.saha_kontrol/i.test(rc35SectionMigration) && !/delete\s+from/i.test(rc35SectionMigration));
test('itfaiyeci asansoru arayuzu formda var', app.includes('İtfaiyeci Asansörü') && app.includes('sItfaiyeci'));
test('ekStandartlar artik sabit bos dizi degil', !/ekStandartlar:\s*\[\],/.test(app));
test('itfaiyeci evet secilince 81-72 ek_standartlar\'a giriyor', /sItfaiyeci\s*===\s*'evet'\s*\?\s*\['81-72'\]/.test(app));

// rc3.2: tarihsel snapshot, kimlik görünürlüğü ve kesin rol ayrımı
test('denetim başlangıcında seçili içerik hashleniyor', app.includes('snapshot_madde_hash = await sha256Hex') && app.includes('snapshot_content_hash'));
test('kapanış bütünlük özeti ve hash üretiyor', app.includes('async function butunlukOzetiHesapla') && app.includes('d.butunluk_hash = integrity.hash'));
test('değişiklik geçmişi cihazda ve sunucuda tutuluyor', app.includes("'denetim_degisim_gecmisi'") && rc32Migration.includes('create table if not exists public.denetim_degisim_gecmisi'));
test('geçmiş kimliği oturum profilinden zorlanıyor', rc32Migration.includes('aves_gecmis_kimligini_dogrula') && rc32Migration.includes('new.degistiren_email := v_email'));
test('teknik müdür istemcide yönetim yetkilisi değil', app.includes("get canManage() { return !!current && current.rol === 'yonetici'; }"));
test('teknik müdür istemcide kendi denetimini oluşturabilir', app.includes("['yonetici','teknik_mudur','muhendis'].includes(current.rol)") && app.includes('Profile.canCreate'));
test('mühendis yalnız kendi denetimini görür', rc37WorkflowMigration.includes('drop policy if exists "denetim okuma"') && rc37WorkflowMigration.includes('aves_denetim_gorebilir_mi(olusturan_email)') && rc37WorkflowMigration.includes("lower(coalesce(p_olusturan_email,'')) = public.aves_oturum_emaili()"));
test('teknik müdür ve yönetici tüm denetimleri görür', rc37WorkflowMigration.includes("kp.rol in ('yonetici','teknik_mudur')") && rc37WorkflowMigration.includes('aves_tum_denetimleri_gorebilir_mi'));
test('teknik müdür sunucuda yalnız kendi adına denetim oluşturabilir',
  rc38TechnicalManagerMigration.includes("kp.rol in ('muhendis','teknik_mudur')") &&
  rc38TechnicalManagerMigration.includes("lower(coalesce(p_olusturan_email,'')) = public.aves_oturum_emaili()") &&
  !/^\s*(delete|update|truncate)\s+/mi.test(rc38TechnicalManagerMigration));
test('teknik müdür iz bırakan düzeltme yapabilir', rc37WorkflowMigration.includes("kp.rol in ('yonetici','teknik_mudur')") && app.includes('duzeltmeNedeniSec'));
test('tamamlanmış denetim iki modla açılıyor', app.includes('showTamamlananDenetimSecimi') && app.includes('Takip Denetimi') && app.includes('İnceleme'));
test('Modül G takibi açık, Modül B takibi koşullu ve bağımsız denetim kaydıdır',
  app.includes('if (profil === KONTROL_PROFILLERI.TAM) return true;') &&
  app.includes('takipDenetimiOlustur') &&
  app.includes("profil === KONTROL_PROFILLERI.MODUL_B && Array.isArray(rows)"));
test('takip zinciri ve önceki sonuçlar korunuyor', rc37WorkflowMigration.includes('takip_ana_denetim_id') && rc37WorkflowMigration.includes('takip_kaynak_saha_kontrol_id') && app.includes('takip_onceki_durum'));
test('düzeltme nedeni geçmiş olayına yazılıyor', app.includes('duzeltme_oturumu_id: context') && app.includes('duzeltme_nedeni: context') && rc37WorkflowMigration.includes('duzeltme_nedeni text'));
test('düzeltme kimliği ve nedeni sunucuda doğrulanıyor', rc37WorkflowMigration.includes('new.duzeltme_oturumu_id := v_duzeltme_id') && rc37WorkflowMigration.includes('new.duzeltme_baslatan_email := v_email'));
test('tamamlanmış denetim gerekçesiz düzeltmeye açılamıyor', rc37WorkflowMigration.includes('Tamamlanmış denetim yalnız gerekçeli düzeltme oturumuyla açılabilir'));
test('düzeltme tamamlanırken sunucu kimliği ve zamanı korunuyor',
  rc393CorrectionSyncMigration.includes('new.duzeltme_baslatildi_at := old.duzeltme_baslatildi_at') &&
  rc393CorrectionSyncMigration.includes('new.duzeltme_baslatan_email := old.duzeltme_baslatan_email') &&
  rc393CorrectionSyncMigration.includes('new.duzeltme_baslatan_ad := old.duzeltme_baslatan_ad'));
test('düzeltme oturumu kimliği ve gerekçesi değiştirilemiyor',
  rc393CorrectionSyncMigration.includes('new.duzeltme_oturumu_id is distinct from old.duzeltme_oturumu_id') &&
  rc393CorrectionSyncMigration.includes('new.duzeltme_nedeni is distinct from old.duzeltme_nedeni'));
test('rc3.9.3 migration veri ve RLS yapısını yıkıcı değiştirmiyor',
  !/^\s*(delete|update|truncate|drop policy|create policy)\s+/mi.test(rc393CorrectionSyncMigration));
test('takip zinciri olan ana denetim yanlışlıkla silinmiyor', rc37WorkflowMigration.includes('on delete restrict') && app.includes('zincirin ana kaydı silinemez'));
test('rc3.7 migration canlı kayıt silmiyor veya toplu değiştirmiyor', !/^\s*(delete|update|truncate)\s+/mi.test(rc37WorkflowMigration));
test('denetim listesinde tarih ve metin araması var', app.includes('id="listSearch"') && app.includes('id="listDate"') && app.includes('card.dataset.search'));
test('denetim silme kimliği sunucu tetikleyicisinden yazılıyor', rc32Migration.includes('aves_denetim_silme_gecmisi') && rc32Migration.includes("before delete on public.denetimler"));
test('snapshot alanları veritabanı tetikleyicisiyle kilitli', rc32Migration.includes('aves_snapshot_degisimini_engelle') && rc32Migration.includes('Denetim madde snapshot içeriği kilitlidir'));
test('geçmiş satırları güncellenemiyor ve silinemiyor', rc32Migration.includes('grant select, insert on public.denetim_degisim_gecmisi'));

// rc3.3: hazir_secenekler boşsa ''.split('|') hayalet boş seçenek üretmemeli —
// bu, Uygun Değil'de anlamsız bir bulgu butonu ve açıklama kutusunun yalnız
// "Diğer bulgu" tıklanınca açılması hatasına yol açıyordu.
test('boş hazir_secenekler hayalet bulgu seçeneği üretmiyor', app.includes(".split('|').map(o => o.trim()).filter(Boolean)"));

test('tamamlanmış denetimde Yazdır düğmesi var', app.includes('id="btnYazdir"') && app.includes("tamamlandi ? '<button class=\"delbtn\" id=\"btnYazdir\""));
test('Yazdır çevrimdışı kullanılamaz ve yerel kaydı koruduğunu açıklar', app.includes('Bu özellik yalnız çevrimiçiyken kullanılabilir. Denetim kaydınız cihazda korunuyor.'));
test('Yazdır PDF ve Word seçenekleri sunuyor', app.includes('data-print="pdf"') && app.includes('data-print="docx"'));
test('form revizyonu yeni denetimde kilitleniyor', app.includes('form_cikti_snapshot: await FormOutput.createSnapshot(f.anaStandart)'));
test('takip denetimi ana kaydın kilitli form revizyonunu koruyor', app.includes('form_cikti_snapshot: kaynak.form_cikti_snapshot || await FormOutput.createSnapshot(kaynak.ana_standart)'));
test('form snapshot migration veri silmiyor ve RLS değiştirmiyor', rc39FormOutputMigration.includes('form_cikti_snapshot jsonb') && !/^\s*(delete|truncate|drop policy|create policy)\s+/mi.test(rc39FormOutputMigration));
test('mevcut denetimler form revizyonuna bir kez bağlanıyor', rc39FormOutputMigration.includes("where ana_standart='81-20' and form_cikti_snapshot='{}'::jsonb") && rc39FormOutputMigration.includes("where ana_standart='81-1/2+A3' and form_cikti_snapshot='{}'::jsonb"));
test('form snapshot backfill kimlik tetikleyicisini transaction içinde geri açıyor', rc39FormOutputMigration.includes('disable trigger trg_aves_denetim_kimligi') && rc39FormOutputMigration.includes('enable trigger trg_aves_denetim_kimligi') && rc39FormOutputMigration.indexOf('disable trigger trg_aves_denetim_kimligi') < rc39FormOutputMigration.indexOf('enable trigger trg_aves_denetim_kimligi'));
test('kilitli resmî form snapshotı istemciden değiştirilemiyor', rc39FormOutputMigration.includes('trg_aves_form_cikti_snapshot_kilidi') && rc39FormOutputMigration.includes('Denetimin resmî form revizyonu kilitlidir'));
test('resmî şablonlar SHA-256 ile doğrulanıyor', formOutput.includes('Resmî form şablonu bütünlük kontrolünden geçmedi') && formOutput.includes('crypto.subtle.digest'));
test('geçmiş denetim yalnız aynı kilitli şablon ve eşlemeyle yazdırılıyor', formOutput.includes('current.mapping_sha256 !== item.mapping_sha256') && formOutput.includes('kilitli form revizyonu'));
test('FR38 bütün satırlar Word ve PDF üzerinde eşlendi', formManifest.forms.UB_FR_38_R04.validation.expected === 451 && formManifest.forms.UB_FR_38_R04.validation.docx_mapped === 451 && formManifest.forms.UB_FR_38_R04.validation.pdf_mapped === 451);
test('FR39 bütün satırlar Word ve PDF üzerinde eşlendi', formManifest.forms.UB_FR_39_R02.validation.expected === 208 && formManifest.forms.UB_FR_39_R02.validation.docx_mapped === 208 && formManifest.forms.UB_FR_39_R02.validation.pdf_mapped === 208);
test('form çıktısında iç kontrol notu kullanılmıyor', !formOutput.includes('ic_kontrol_notu'));
test('PDF/DOCX kitaplıkları uygulama paketinden yerel yükleniyor', index.includes('vendor/jszip.min.js') && index.includes('vendor/pdf-lib.min.js') && index.includes('vendor/fontkit.umd.min.js'));
test('resmî temel kuyu tablosunun eksik dört alanı artık sahada tutuluyor',
  ['kabin_tampon_yuksekligi','kuyu_dibi_yuksekligi'].every(id => byId.get('MAD-0008A').olcum_tanimlari.some(field => field.id === id)) &&
  ['kabin_genisligi','kabin_derinligi'].every(id => byId.get('MAD-0008D').olcum_tanimlari.some(field => field.id === id)));
test('adlandırılmış ölçü migration mevcut saha cevaplarını değiştirmiyor',
  rc39NamedMeasurementsMigration.includes("where madde_id='MAD-0008A'") && rc39NamedMeasurementsMigration.includes("where madde_id='MAD-0008D'") &&
  !/public\.saha_kontrol/i.test(rc39NamedMeasurementsMigration) && !/^\s*(delete|truncate)\s+/mi.test(rc39NamedMeasurementsMigration));
test('temel kuyu ölçüleri PDF ve Word hücrelerine aktarılıyor', formOutput.includes('measurementValues(rows,formKey)') && formOutput.includes('fields.shaft.fields') && formOutput.includes('l.shaft'));
test('uygunsuzluk açıklaması PDF ve Word not hücrelerine aktarılıyor',
  formOutput.includes('const otherFinding = value(row && row.diger_bulgu)') &&
  (formOutput.match(/rowNotes\(row\)/g) || []).length >= 5);
test('hazır bulgu, uygunsuzluk açıklaması ve madde notu kayıpsız birleştiriliyor',
  formOutput.includes("selectedFinding !== 'Diğer bulgu'") &&
  formOutput.includes('parts.push(otherFinding)') &&
  formOutput.includes('parts.push(itemNote)'));
test('PDF seri numaralari sigdiriliyor ve sessizce kesilemiyor',
  formOutput.includes('const serialPdfOptions = { size:6, minSize:1.8, mustFit:true }') &&
  formOutput.includes('options.mustFit && lines.length > max'));

test('çalışma tamamlanınca denetim listesine dönülüyor', app.includes("if (yeniDurum === 'Çalışma Tamamlandı') showList();"));
test('bitirirken eksik madde varsa doğrudan ilk eksik madde gösteriliyor',
  app.includes('const firstPending = latestRows.find(r => !isFlowComplete(r));') &&
  app.includes('openBolums = new Set([firstPending.bolum]);') &&
  app.includes('await rememberPosition(firstPending.bolum, firstPending.id);'));
test('inceleme modunda düzenlenebilir denetimde belirgin geri dön butonu var', app.includes('id="btnDenetimeDon"') && app.includes("inspectionReadOnly && normaldeDuzenleyebilir"));
test('seri no sayacı grup bazlı, kat kapısı durak sayısına bağlı değil', app.includes("['kat_kapilari', 'Kat kapısı', 1]") && app.includes('seriGereksinimleri(d).filter(([key]) => data[key].some(item => item.seri_no.trim())).length'));
test('kabin koruma eteği maddelerinden açı ölçümü kaldırıldı', rc394FeedbackMigration.includes("'kabin_etegi_alt_pah_acisi'") && rc394FeedbackMigration.includes("'kabin_etegi_cikinti_pah_acisi'") && !byId.get('MAD-0082').olcum_tanimlari.some(f => f.id === 'kabin_etegi_alt_pah_acisi') && !byId.get('MAD-0083').olcum_tanimlari.some(f => f.id === 'kabin_etegi_cikinti_pah_acisi'));
test('konsol/paten ölçülerinde zorunlu mm birimi kaldırıldı', byId.get('MAD-0008C').olcum_tanimlari.filter(f => ['kabin_konsol_en_buyuk_aralik','karsi_agirlik_konsol_en_buyuk_aralik','kabin_patenleri_dusey_aralik','karsi_agirlik_patenleri_dusey_aralik'].includes(f.id)).every(f => !f.birim));
test('rc3.9.4 saha geri bildirimi migration veri silmiyor', !/^\s*(delete|update\s+public\.saha_kontrol|truncate)\s+/mi.test(rc394FeedbackMigration));

test('kapı koruyucu aygıtı maddelerinde yanıltıcı Uygulanmaz muafiyeti kaldırıldı',
  !byId.get('MAD-0293').aranmaz_kosulu && !byId.get('MAD-0294').aranmaz_kosulu &&
  /25 ila 1600 mm/.test(byId.get('MAD-0293').resmi_madde_metni || '') &&
  /asgari 50 mm/.test(byId.get('MAD-0294').resmi_madde_metni || '') &&
  !byId.get('MAD-0293').denetci_yonlendirmesi && !byId.get('MAD-0294').denetci_yonlendirmesi);
test('rc3.9.4 koruyucu aygıt migration veri silmiyor', !/^\s*(delete|update\s+public\.saha_kontrol|truncate)\s+/mi.test(rc394GuardDeviceMigration));

test('kapı/kuyu maddeleri Elektrik ve Test bölümünden Kuyu Boyunca\'ya taşındı',
  ['MAD-0649','MAD-0652','MAD-0655','MAD-0656','MAD-0659'].every(id => byId.get(id).bolum === '02 - Kuyu Boyunca'));
test('rc3.9.4 bölüm düzeltme migration veri silmiyor', !/^\s*(delete|update\s+public\.saha_kontrol|truncate)\s+/mi.test(rc394SectionFixMigration));
test('yalıtım direnci maddeleri ikisi de aktif kalıyor (resmi PDF ayrı kutular)',
  byId.get('MAD-0548').aktif === true && byId.get('MAD-0549').aktif === true &&
  byId.get('MAD-0548').olcu1_birimi === 'MΩ' && byId.get('MAD-0548').esik_deger === 0.5);
test('rc3.9.4 mükerrer birleştirme migration veri silmiyor ve pasifleştirmiyor',
  !/^\s*(delete|update\s+public\.saha_kontrol|truncate)\s+/mi.test(rc394DuplicateMergeMigration) &&
  !/aktif\s*=\s*false/i.test(rc394DuplicateMergeMigration));

test('"Kapı ve kuyu duvarları" kalıtsal başlığı artık hiçbir aktif maddede kalmadı',
  library.filter(r => r.aktif && (r.kontrol_basligi || '').trim() === 'Kapı ve kuyu duvarları').length === 0);
test('rc3.9.4 başlık düzeltme migration veri silmiyor', !/^\s*(delete|update\s+public\.saha_kontrol|truncate)\s+/mi.test(rc394TitleFixMigration));

// Kategori 1 / Kategori 2 (TS EN 81-71) karşılıklı dışlayıcı maddelerinde
// denetçiye hangi kategoriye özgü olduğu ve karşı kategoride "Uygulanmaz"
// olacağı açıkça anlatılıyor mu (saha geri bildirimi: içerik belirsizdi).
const kategoriK1Only = ['MAD-0872', 'MAD-0878'];
const kategoriK2Only = ['MAD-0855', 'MAD-0859', 'MAD-0863', 'MAD-0864', 'MAD-0865', 'MAD-0866', 'MAD-0873', 'MAD-0876', 'MAD-0877', 'MAD-0879', 'MAD-0881'];
test('Kategori 1/2 tanımlayıcı maddeleri (MAD-0847/MAD-0848) kategori belirleme talimatı içeriyor',
  /kuyu mahfaza tipini belirleyin/.test(byId.get('MAD-0847').denetci_yonlendirmesi || '') &&
  /kuyu mahfaza tipini belirleyin/.test(byId.get('MAD-0848').denetci_yonlendirmesi || ''));
test('Kategori 1 maddelerinde Kategori 2 için Uygulanmaz gerekçesi tanımlı',
  kategoriK1Only.every(id => /Kategori 2/.test(byId.get(id).aranmaz_kosulu || '')));
test('Kategori 2 maddelerinde Kategori 1 için Uygulanmaz gerekçesi tanımlı',
  kategoriK2Only.every(id => /Kategori 1/.test(byId.get(id).aranmaz_kosulu || '')));
test('rc3.9.4 Kategori 1/2 netleştirme migration veri silmiyor', !/^\s*(delete|update\s+public\.saha_kontrol|truncate)\s+/mi.test(rc394KategoriMigration));

// ÜB.FR.38 kaynaklı fragman/parça halindeki resmi_madde_metni alanları tam
// cümleye tamamlandı (saha geri bildirimi #5, #24, #25, #28, #29, #30).
test('kilit açılma bölgesi maddesi artık açıklanıyor', /kilidinin açılabildiği düşey aralık/.test(byId.get('MAD-0179').denetci_yonlendirmesi || ''));
test('devre şemaları/kayıt defteri maddeleri tam cümle', byId.get('MAD-0401').resmi_madde_metni.endsWith('bulunmalıdır.') && byId.get('MAD-0473').resmi_madde_metni.endsWith('bulunmalıdır.'));
test('kasnak kanalları maddesi artık tam cümle', byId.get('MAD-0560').resmi_madde_metni.startsWith('Tahrik kasnağı kanallarının durumu kontrol edilmelidir'));
test('makine/makara dairesi kapı ölçüleri maddeleri (5.2.3.2 a-d) aynı bölümde', ['MAD-0376','MAD-0635','MAD-0637','MAD-0638'].every(id => byId.get(id).bolum === '04 - Makine ve Şase'));
test('rc3.9.4 fragman netleştirme migration veri silmiyor', !/^\s*(delete|update\s+public\.saha_kontrol|truncate)\s+/mi.test(rc394FragmanMigration));

// ÜB.FR.43 (TS EN 81-70 erişilebilirlik) maddeleri artık açıklamalı
// (saha geri bildirimi #16, #17, #20, #21, #22).
test('kapı açma/kapama butonu sembolleri resmi madde metninde, mükerrer rehber yok',
  /ISO 7000-2864/.test(byId.get('MAD-0978').resmi_madde_metni || '') &&
  /ISO 7000-2863/.test(byId.get('MAD-0979').resmi_madde_metni || '') &&
  !byId.get('MAD-0978').denetci_yonlendirmesi && !byId.get('MAD-0979').denetci_yonlendirmesi);
test('dokunmatik ekran/erişilebilirlik butonu/büyük boy tuş takımı maddeleri opsiyonel bileşen olarak açıklanıp Uygulanmaz gerekçesi kazandı',
  ['MAD-1001', 'MAD-1002', 'MAD-1003'].every(id => byId.get(id).aranmaz_kosulu && byId.get(id).kontrol_basligi !== 'Diğer Kontroller'));
test('rc3.9.4 erişilebilirlik netleştirme migration veri silmiyor', !/^\s*(delete|update\s+public\.saha_kontrol|truncate)\s+/mi.test(rc394ErisilebilirlikMigration));

// KAP-01/KAP-02 (saha geri bildirimi #42): uygulamanın kendi eksik-madde
// takibiyle mükerrer, kendine referanslı kapanış maddeleri pasifleştirildi.
test('KAP-01/KAP-02 gereksiz kapanış maddeleri pasifleştirildi', !byId.get('MAD-1005').aktif && !byId.get('MAD-1006').aktif);
test('diğer saha kapanışı maddeleri (KAP-03/04/05) aktif kalıyor', byId.get('MAD-1007').aktif && byId.get('MAD-1008').aktif && byId.get('MAD-1009').aktif);
test('rc3.9.4 KAP-01/02 migration veri silmiyor', !/^\s*(delete|update\s+public\.saha_kontrol|truncate)\s+/mi.test(rc394KapMigration));

// Kabin tipi seçimi (saha geri bildirimi #14, #15, #19): tek seçim noktası
// kabin bölümünün başında (MAD-0923), diğer tip-özel maddeler otomatik bağlı.
test('app.js kural motoru metinsel icerir/icermez operatörlerini destekliyor', app.includes("rule.operator === 'icerir'") && app.includes("rule.operator === 'icermez'"));
test('MAD-0923 gerçek bir kabin tipi seçici içeriyor', byId.get('MAD-0923').olcum_tanimlari.some(d => d.id === 'kabin_tipi_secimi' && d.tur === 'secim' && d.secenekler.length === 5));
test('Tip 1-5 asgari boyut maddeleri kabin tipi seçimine otomatik bağlı', ['MAD-0924','MAD-0925','MAD-0926','MAD-0927','MAD-0928'].every((id, i) => {
  const rule = byId.get(id).otomatik_aranmaz_kurali;
  return rule && rule.paylasimli_anahtar === 'kabin_tipi_secimi' && rule.operator === 'icermez' && rule.deger === `Tip ${i + 1}`;
}));
test('MAD-0929/MAD-0997 artık kendi başlarına kabin tipi sormuyor, MAD-0923e yönlendiriyor', !byId.get('MAD-0929').olcu1_adi && byId.get('MAD-0929').olcum_tanimlari.length === 0 && /Kabin tipi seçimi/.test(byId.get('MAD-0929').denetci_yonlendirmesi) && !byId.get('MAD-0997').olcu1_adi && byId.get('MAD-0997').olcum_tanimlari.length === 0 && /Kabin tipi seçimi/.test(byId.get('MAD-0997').denetci_yonlendirmesi));
test('rc3.9.4 kabin tipi migration veri silmiyor', !/^\s*(delete|update\s+public\.saha_kontrol|truncate)\s+/mi.test(rc394KabinTipiMigration));

// Dosya/canlı senkron raporu (kullanıcı onayıyla, ekleme-esaslı).
test('kütüphanede MAD-1010 (KAP-06) canlıdan çekildi', byId.has('MAD-1010') && byId.get('MAD-1010').standart_madde_no === 'KAP-06' && byId.get('MAD-1010').aktif === false);
test('rc3.9.4 senkron migration veri silmiyor', !/^\s*(delete|update\s+public\.saha_kontrol|truncate)\s+/mi.test(rc394SenkronMigration));
test('kalın başlık her zaman kısa, resmi metin her zaman normal punto (font düzeltmesi)',
  app.includes('const gosterilenBaslik = baslik;') && app.includes('const gosterilenResmiMetin = resmiMetin;') &&
  !app.includes('GENEL_KONTROL_BASLIKLARI') && !app.includes('genelKontrolBasligiMi') &&
  index.includes('.mrequirement{font-size:13.5px;font-weight:400;'));

// rc3.9.5: gerçek saha denetiminde kalan içerik ve seri numarası açıkları.
const yanginGeriCagirmaIds = ['MAD-0891','MAD-0897','MAD-0907','MAD-0911','MAD-0914','MAD-0915','MAD-0916','MAD-0917','MAD-0920'];
test('kuyu boyunca uzun düşey ölçülerin tamamı metre cinsinden tutuluyor',
  byId.get('MAD-0008F').olcum_tanimlari.length === 4 &&
  byId.get('MAD-0008F').olcum_tanimlari.every(field => field.birim === 'm'));
test('kabin eteği rehberi denetçiden açı ölçümü istemiyor',
  /yalnız alt pahın yatay izdüşümünü ölçün/.test(byId.get('MAD-0082').denetci_yonlendirmesi || '') &&
  /Açı sahada ölçüm alanı olarak kaydedilmez/.test(byId.get('MAD-0082').denetci_yonlendirmesi || ''));
test('yangında asansörü kullanmayınız maddesinin başlığı ve resmi şartı birbirini tekrar etmiyor',
  byId.get('MAD-0209').kontrol_basligi !== byId.get('MAD-0209').resmi_madde_metni &&
  /uyarı işareti bulunmalıdır\.$/.test(byId.get('MAD-0209').resmi_madde_metni || ''));
test('EN 81-73 yangın maddelerinde belirlenmiş sahanlık denetçiye açıklanıyor',
  yanginGeriCagirmaIds.every(id => /projede önceden tanımlanmış yangın geri çağırma katıdır/.test(byId.get(id).denetci_yonlendirmesi || '')));
test('hidrolik asansörde valf grubu ve boru kırılma valfi seri numarası isteniyor',
  app.includes("['hidrolik_valf_grubu', 'Hidrolik valf grubu', 1]") &&
  app.includes("['boru_kirilma_valfleri', 'Boru kırılma valfi', 1]") &&
  app.includes("d.tahrik_tipi === 'Hidrolik'"));
test('rc3.9.5 migration denetim cevaplarına, RLS politikalarına ve veri silme işlemlerine dokunmuyor',
  !/public\.saha_kontrol/i.test(rc395ToparlamaMigration) &&
  !/^\s*(delete|truncate|drop\s+policy|create\s+policy)\s+/mi.test(rc395ToparlamaMigration));
test('rc3.9.5 migration ölçüm kimliklerini koruyarak metre birimini güncelliyor',
  ['seyir_mesafesi','toplam_kuyu_yuksekligi','son_kat_yuksekligi','toplam_kuyu_ray_boyu'].every(id => rc395ToparlamaMigration.includes(`'${id}'`)) &&
  rc395ToparlamaMigration.includes("jsonb_set(item.value, '{birim}', '\"m\"'::jsonb, true)"));

// rc3.9.7 doğrulaması: testler canlı migration sonucuyla aynı kaynak kütüphaneyi okur.
test('rc3.9.7 migrationları geçmiş denetim cevaplarını ve RLS politikalarını değiştirmiyor',
  [rc397Migration59, rc397Migration60, rc397Migration61, rc397Migration62].every(sql =>
    !/public\.saha_kontrol/i.test(sql) &&
    !/^\s*(delete|truncate|drop\s+policy|create\s+policy)\s+/mi.test(sql)));
test('İnceleme Modu düğmesi dokunmatik hover durumunda kırmızıya dönmüyor',
  !index.includes('.btn-new:hover,.btn-ozet:hover') &&
  index.includes('@media (hover:hover) and (pointer:fine)') &&
  index.includes('.btn-ozet:hover{background:#F5F6FA'));
test('halat sarım açısı sahada ölçüm alanı değil',
  !byId.get('MAD-0008H').olcum_tanimlari.some(field => field.id === 'halat_sarim_acisi') &&
  /yalnız onaylı teknik dosya veya yerleşim çizimi üzerinden kontrol edin/.test(byId.get('MAD-0008H').denetci_yonlendirmesi || ''));
test('MAD-0018 otomatik Uygulanmaz kararı görünür gerekçesini koruyor',
  byId.get('MAD-0018').otomatik_aranmaz_kurali?.paylasimli_anahtar === 'kuyu_dibi_derinligi' &&
  /otomatik olarak Uygulanmaz işaretlenir/.test(byId.get('MAD-0018').aranmaz_kosulu || ''));
test('TS EN 81-70 rehberleri eksikliği açıklamaya yazdırıyor, sahada tutulmayan ölçüyü kaydetmeyi istemiyor',
  ['MAD-1000','MAD-1001','MAD-1002','MAD-1003'].every(id => {
    const guide = byId.get(id).denetci_yonlendirmesi || '';
    return /Kontrol edin; eksiklik varsa madde açıklamasına yazın\.$/i.test(guide) &&
      !/Bu ölçüleri ölçüp kaydedin/i.test(guide);
  }));
test('81-70 ve 81-71 açıklama çizelgeleri temel çevrimdışı pakette',
  ['G-8170-KABIN-TIPLERI-TR.svg','G-8171-KATEGORI-TR.svg'].every(name =>
    fs.existsSync(path.join(appDir, 'referans-gorseller', name)) && sw.includes(`'./referans-gorseller/${name}'`)));
test('rc3.9.7 kaynak kütüphanesi migration 59-62 sonuçlarıyla eşleşiyor',
  !byId.get('MAD-0909').denetci_yonlendirmesi &&
  !byId.get('MAD-0910').denetci_yonlendirmesi &&
  byId.get('MAD-0961').olcum_tanimlari.some(field => field.id === 'kumanda_paneli_bulundugu_taraf') &&
  byId.get('MAD-0570').tahrik_kosulu == null &&
  !byId.get('MAD-0028').denetci_yonlendirmesi && !byId.get('MAD-0028').aranmaz_kosulu);
test('JSON ve CSV rc3.9.7 doğrulama düzeltmelerini birlikte taşıyor',
  !libraryCsv.includes('halat_sarim_acisi') &&
  libraryCsv.includes('Kuyu dibi derinliği 2500 mm’den fazlaysa bu madde otomatik olarak Uygulanmaz işaretlenir.') &&
  libraryCsv.includes('Eksiklik varsa madde açıklamasına yazın.'));

test('Modül B denetim türü ve kontrol profili tanımlı',
  app.includes("MODUL_B: 'Modül B - AB Tip İncelemesi'") &&
  app.includes("MODUL_B: 'modul_b_tip_inceleme'"));
test('Modül B madde profili TAM gibi davranıyor (yeni madde eklenmedi)',
  /if \(profil === KONTROL_PROFILLERI\.TAM \|\| profil === KONTROL_PROFILLERI\.MODUL_B\) return true;/.test(app));
test('Modül B için takip denetimi açık',
  app.includes('if (profil === KONTROL_PROFILLERI.TAM) return true;') &&
  app.includes('profil === KONTROL_PROFILLERI.MODUL_B && Array.isArray(rows)') &&
  rc398ModulBMigration.includes("kontrol_profili in ('modul_g_tam','modul_b_tip_inceleme')"));
test('Modül B takip muayenesi yalnız önceki uygunsuzluklar varsa açılıyor',
  app.includes("rows.some(row => effectiveDurum(row) === 'Olumsuz bulgu')") &&
  rc399ModulBTakipMigration.includes("kaynak_madde.durum = 'Olumsuz bulgu'") &&
  rc399ModulBTakipMigration.includes("onceki.kontrol_profili,'') = 'modul_b_tip_inceleme'"));
test('Modül B takip muayenesi ÜB.FR.53 kapsamındaki uygunsuzluk satırlarıyla sınırlı',
  app.includes("kaynakRows.filter(row => effectiveDurum(row) === 'Olumsuz bulgu')") &&
  app.includes('ÜB.FR.53 kapsamındaki'));
test('Modül B açıklaması ana form ile uygulanabilir ek standartları ayırıyor',
  app.includes('Modül B ana saha kontrolü TS EN 81-20 üzerinden yürür.') &&
  app.includes('ilgili ek standart maddeleri ayrıca uygulanır'));
test('Modül B formu ana tip / tip varyant kodu alanlarını zorunlu tutuyor',
  app.includes('id="fAnaTip"') && app.includes('id="fTipVaryantKodu"') &&
  app.includes("if (modulB && (!anaTip || !tipVaryantKodu)) { toast('Ana Tip ve Tip Varyant Kodu zorunlu'); return; }"));
test('rc3.9.8 Modül B migration madde verisini değiştirmiyor, yalnız denetimler şemasını genişletiyor',
  !/delete\s+from/i.test(rc398ModulBMigration) &&
  !/update\s+public\.madde_kutuphanesi/i.test(rc398ModulBMigration) &&
  rc398ModulBMigration.includes('modul_b_tip_inceleme') &&
  rc398ModulBMigration.includes('add column if not exists ana_tip') &&
  rc398ModulBMigration.includes('add column if not exists tip_varyant_kodu'));

test('rc3.9.10 ek standart migrationı 64 yeni madde ekliyor, mevcut satırlara dokunmuyor',
  !/delete\s+from/i.test(rc3910EkStandartlarMigration) &&
  !/update\s+public\.madde_kutuphanesi/i.test(rc3910EkStandartlarMigration) &&
  (rc3910EkStandartlarMigration.match(/^\s*\('MAD-10\d\d',/gm) || []).length === 64 &&
  ['81-21','81-22','81-28','81-77'].every(sg => rc3910EkStandartlarMigration.includes(`'${sg}'`)));
test('81-21/22/28/77 checklist e otomatik eklenmiyor (rc3.9.18 geri alma — yalnız 81-71/73/70)',
  app.includes("const gruplar = new Set(['Genel', anaStandart, '81-71', '81-73', ...(ekStandartlar || [])]);") &&
  !app.includes('ekStandartlarCard') && !app.includes('sEkStandartlar'));
test('denetim onay ekranı yalnız gerçekten zorunlu 81-71/81-73 standartlarını gösteriyor',
  app.includes("satir('Zorunlu ek standartlar', 'TS EN 81-71 + TS EN 81-73')") &&
  !app.includes("satir('Zorunlu ek standartlar', 'TS EN 81-71 + TS EN 81-73 + TS EN 81-21"));

test('durak sayısı yeni denetim formunda zorunlu',
  app.includes('<label>Durak sayısı *</label>') &&
  app.includes("if (!durak || durak < 1) { toast('Durak sayısını girin'); return; }"));
test('asansör kimlik no alanı opsiyonel olarak formda ve kayıtta var',
  app.includes('id="fKimlikNo"') && !app.includes('for="fKimlikNo">Asansör kimlik no *') &&
  app.includes('asansor_kimlik_no: f.kimlikNo') &&
  app.includes('asansor_kimlik_no: kaynak.asansor_kimlik_no || null'));
test('durak sayısı başlangıç onay ekranında gösteriliyor',
  app.includes("satir('Durak sayısı', f.durak)"));
test('asansör kimlik no denetim liste kartında gösteriliyor',
  app.includes('<b>Kimlik no:</b> ${esc(d.asansor_kimlik_no)}'));

const failed = checks.filter(check => !check.ok);
for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'}  ${check.name}`);
console.log(`\n${checks.length - failed.length}/${checks.length} kontrol geçti.`);
if (failed.length) process.exit(1);
