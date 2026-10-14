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
const closureSummaryJs = fs.readFileSync(path.join(appDir, 'kapanis-guven-ozeti.js'), 'utf8');
const technicalDocsJs = fs.readFileSync(path.join(appDir, 'teknik-dosya-formlari.js'), 'utf8');
const denetimFormSetsJs = fs.readFileSync(path.join(appDir, 'denetim-form-setleri.js'), 'utf8');
const formDraftJournalJs = fs.readFileSync(path.join(appDir, 'form-draft-journal.js'), 'utf8');
const technicalDocsContext = {};
vm.runInNewContext(technicalDocsJs, technicalDocsContext, { filename: 'teknik-dosya-formlari.js' });
const technicalDocs = technicalDocsContext.AVES_TEKNIK_DOSYA_FORM;
const denetimFormSetsContext = {};
vm.runInNewContext(denetimFormSetsJs, denetimFormSetsContext, { filename: 'denetim-form-setleri.js' });
const denetimFormSets = denetimFormSetsContext.AVES_DENETIM_FORM_SETI;
const formDraftJournalContext = {};
vm.runInNewContext(formDraftJournalJs, formDraftJournalContext, { filename: 'form-draft-journal.js' });
const formDraftJournal = formDraftJournalContext.AVES_FORM_DRAFT_JOURNAL;
const closureSummaryFixture = JSON.parse(fs.readFileSync(path.join(testDir, 'kapanis-guven-ozeti-fixture.json'), 'utf8'));
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
const rc3946OutputRecordMigration = fs.readFileSync(path.join(databaseDir, '81_r15d_rc3946_resmi_cikti_kaydi.sql'), 'utf8');
const rc3953ArchiveStatusMigration = fs.readFileSync(path.join(databaseDir, '82_r15d_rc3953_arsiv_durumu.sql'), 'utf8');
const rc3968TechnicalDocsMigration = fs.readFileSync(path.join(databaseDir, '83_r15d_rc3968_teknik_dosya_kayitlari.sql'), 'utf8');
const rc3969InspectionFormsMigration = fs.readFileSync(path.join(databaseDir, '84_r15d_rc3969_denetim_form_kayitlari.sql'), 'utf8');
const rc3972ModuleRulesMigration = fs.readFileSync(path.join(databaseDir, '85_r15d_rc3972_modul_b_optional_a3_only_g.sql'), 'utf8');
const rc3972ModuleRulesScenario = fs.readFileSync(path.join(testDir, 'database', '85_module_rules.sql'), 'utf8');
const rc3978FirmAddressMigration = fs.readFileSync(path.join(databaseDir, '86_r15d_rc3978_firma_adresi.sql'), 'utf8');
const rc3978FirmAddressScenario = fs.readFileSync(path.join(testDir, 'database', '86_firma_adresi.sql'), 'utf8');
const rls79Scenario = fs.readFileSync(path.join(testDir, 'rls', '79_takip_atama.sql'), 'utf8');
const archiveRlsScenario = fs.readFileSync(path.join(testDir, 'rls', '82_arsiv_durumu.sql'), 'utf8');
const ci = fs.readFileSync(path.resolve(root, '..', '..', '.github', 'workflows', 'ci.yml'), 'utf8');
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
const closureSummaryContext = {};
vm.createContext(closureSummaryContext);
vm.runInContext(closureSummaryJs, closureSummaryContext);
const closureSummaryCards = closureSummaryContext.AVES_KAPANIS_GUVEN_OZETI.kartlar(closureSummaryFixture.girdi);

const checks = [];
const test = (name, condition) => checks.push({ name, ok: !!condition });

test('index R15D rc3.9.88 sürümü', index.includes('R15D-RC3.9.88</b>'));
test('app R15D rc3.9.88 sürümü', app.includes("const APP_VERSION = 'R15D-rc3.9.88'"));
test('service worker rc3.9.88 cache', sw.includes("aves-saha-r15d-rc3988'"));
test('uygulama manifesti rc3.9.88 sürümüyle tutarlı', manifest.includes('"version": "R15D-rc3.9.88"'));
test('migration 81 resmî çıktı için 3 nullable kolon ekler, RLS/trigger/veri değiştirmez',
  rc3946OutputRecordMigration.includes('add column if not exists resmi_cikti_uretildi_at timestamptz') &&
  rc3946OutputRecordMigration.includes('add column if not exists resmi_cikti_snapshot_ozeti text') &&
  rc3946OutputRecordMigration.includes('add column if not exists resmi_cikti_hash text') &&
  !/create policy|drop policy|create trigger|alter policy|update public\.|delete from/i.test(rc3946OutputRecordMigration));
test('btnYazdir resmî çıktı üretimini kaydeder (yerel + sync): tarih + belge SHA + snapshot özeti',
  app.includes('async function sha256HexBytes(bytes)') &&
  formOutput.includes('return { filename, bytes, form: chosen };') &&
  app.includes('guncel.resmi_cikti_uretildi_at = now;') &&
  app.includes('guncel.resmi_cikti_hash = await sha256HexBytes(bytes);') &&
  app.includes('resmi_cikti_snapshot_ozeti') &&
  app.includes("'resmi_cikti_uretildi_at', 'resmi_cikti_snapshot_ozeti', 'resmi_cikti_hash'"));
test('tamamlanmış denetim özeti resmî çıktı durumunu gösterir',
  app.includes('<b>Resmî çıktı</b>') &&
  app.includes('d.resmi_cikti_uretildi_at ?') &&
  app.includes('resmî PDF/Word henüz üretilmedi'));
test('liste ekranında toplu Sahaya Hazırlık rozeti: N/M hazır + tümünü doğrula',
  app.includes('const hazirlikAktif = [];') &&
  app.includes('if (modulG && !tamamlandi && canEdit) hazirlikAktif.push({ d, ready: offlineState.ready });') &&
  app.includes("badge.className = `prep-badge") &&
  app.includes('Sahaya Hazırlık · ${hazirSayi}/${hazirlikAktif.length}') &&
  app.includes("id=\"prepVerifyAll\"") &&
  app.includes('await sahayaHazirla(eksik[i].d, rowsBy[eksik[i].d.id] || [])') &&
  index.includes('.prep-badge{'));
test('showDenetim en son açılan denetimi kv last_inspection olarak yazar',
  app.includes("DB.kvSet('last_inspection', { id, at:") &&
  app.includes("DB.kvGet('last_inspection')"));
test('liste ekranında "Kaldığın yerden devam et" kartı: görünür + tamamlanmamış denetim',
  app.includes("resume.className = 'resume-card'") &&
  app.includes('Kaldığın yerden devam et') &&
  app.includes("denetimler.find(d => d.id === sonKayit.id && d.denetim_durumu !== 'Çalışma Tamamlandı' && (sahaUygulamaModuluGMi(d) || fr65SahaKaydiMi(d)))") &&
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
test('hazırlık kontrolü ana ekrana eklenmemiş tarayıcı sekmesini advisory uyarır (soğuk çevrimdışı başlangıç riski)',
  app.includes("add('Ana ekrana eklenmiş uygulama olarak açık',") &&
  app.includes("window.matchMedia('(display-mode: standalone)').matches") &&
  app.includes('window.navigator.standalone === true'));
test('ana ekrana ekleme uyarısı platforma göre doğru menüyü gösterir (Safari Paylaş vs Chrome/Android ⋮)',
  app.includes('/iPhone|iPad|iPod/.test(navigator.userAgent') &&
  app.includes('Paylaş simgesi → Ana Ekrana Ekle') &&
  app.includes('Tarayıcı menüsü (⋮) → Ana ekrana ekle / Uygulamayı yükle'));
test('hazırlık sonucu ekranı sahaya inmeden önce uygulamayı açık tutma uyarısı verir (kurulum garanti değildir)',
  app.includes('Sinyalsiz bölgeye girmeden önce uygulamayı açın ve kapatmayın.') &&
  app.includes('ana ekrana eklenmiş olsa bile — garanti değildir') &&
  !app.includes('Bu denetim bu cihazda internet olmadan açılıp tamamlanabilir'));
test('hazırlık sonucu ekranı, uygulama hiç açılmazsa kâğıt yedek prosedürüne yönlendiriyor',
  app.includes('Uygulama hiç açılmazsa:') && app.includes('Kurumun kâğıt yedek prosedürünü izleyin'));
test('native kabuk (Capacitor) farkındalığı: Service Worker kaydedilmiyor, hazırlık kontrolleri yanlış "hazır değil" göstermiyor',
  app.includes('function isNativeApp()') &&
  app.includes("window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()") &&
  app.includes('if (isNativeApp()) return;') &&
  app.includes('const kuruluUygulama = isNativeApp()') &&
  app.includes("isNativeApp() ? 'Native uygulama olarak çalışıyor — en güvenilir mod'") &&
  app.includes("isNativeApp() ? 'Native uygulama — varlıklar pakette, ayrıca önbelleğe alınmasına gerek yok'"));
test('sayfa arka plana alınırken/kapanırken odaktaki alan hemen kaydedilir (700ms debounce beklenmez)',
  app.includes('flushPendingEdits: flushEditorWrites') &&
  app.includes("document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushOnHide(); })") &&
  app.includes("window.addEventListener('pagehide', flushOnHide)") &&
  app.includes("active.matches('[data-diger],[data-aciklama],[data-olcum-id],[data-bolumnot]')"));
test('Codex incelemesi #1: her tuş vuruşu senkron localStorage taslak günlüğüne (kimlik damgalı) yazılır',
  app.includes('function taslakYaz(target, ts = Date.now())') &&
  app.includes("all[key] = { value: target.value, ts, ownerEmail: normEmail(API.email) };") &&
  app.includes("if (e.target.matches('[data-diger],[data-aciklama],[data-olcum-id],[data-bolumnot]')) taslakYaz(e.target, ts);") &&
  app.includes('function taslakAnahtari(target)') &&
  app.includes("if (target.matches('[data-bolumnot]')) return `bolum:${target.dataset.bolumnot}`;"));
test('Codex incelemesi #2 (P1): başarısız kurtarma taslağı silmiyor — yalnız BAŞARILI anahtar günlükten çıkar',
  app.includes('async function taslaklariKurtar(denetimId, ownerEmail)') &&
  app.includes('if (basarili) { delete all[key]; degisti = true; }') &&
  app.includes("console.warn('Taslak kurtarma başarısız — cihazda korunuyor, sonraki açılışta yeniden denenecek', key, error);") &&
  !app.includes("localStorage.removeItem(`aves_taslak_${denetimId}`); } catch {} return 0; }"));
test('Codex incelemesi #3 (P1): 700ms yazım biterken yalnız KENDİ zaman damgasıyla eşleşen taslak silinir (yeni tuş vuruşunu silmez)',
  app.includes('function taslakSilEger(target, ts)') &&
  app.includes('if (all[key] && all[key].ts <= ts) { delete all[key];') &&
  app.includes('taslakSilEger(target, snapshot.ts);') &&
  app.includes('function scheduleEditorDraft(target, ts = Date.now())') &&
  /const ts = Date\.now\(\);\s*if \(e\.target\.matches\('\[data-diger\],\[data-aciklama\],\[data-olcum-id\],\[data-bolumnot\]'\)\) taslakYaz\(e\.target, ts\);/.test(app));
test('Codex incelemesi #4 (P1): kurtarma yalnız oturum yüklendikten sonra ve yalnız eşleşen kullanıcı kimliğiyle çalışır',
  app.includes('async function taslaklariTaraVeKurtar(ownerEmail)') &&
  app.includes("if (!normEmail(ownerEmail)) return; // oturum yüklenmeden kurtarma çalıştırılmaz") &&
  app.includes('if (normEmail(entry.ownerEmail) !== normOwner) continue;') &&
  app.includes('try { await UI.recoverDrafts(API.email); } catch {}') &&
  app.includes('if (API.loggedIn) {') &&
  app.indexOf('await Profile.load();') < app.indexOf('try { await UI.recoverDrafts(API.email); } catch {}') &&
  app.indexOf('try { await UI.recoverDrafts(API.email); } catch {}') < app.indexOf('try { await Sync.pullKutuphane(); } catch (e)'));
test('form taslak günlüğü senkron yazar, hesap kimliğini normalize eder ve madde taslaklarını koruyarak temizlenir', (() => {
  const values = new Map();
  const storage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    key: index => [...values.keys()][index] || null,
    get length() { return values.size; },
  };
  storage.setItem('aves_taslak_form-test', JSON.stringify({ 'saha:MAD-1:aciklama': { value: 'önceki madde taslağı', ts: 1, ownerEmail: 'a@aves.test' } }));
  const payload = { forms: { FR65: { values: { beyan_yuku: '630 kg' } } } };
  const wrote = formDraftJournal.writeForm(storage, 'form-test', payload, ' Denetci@Aves.Test ', 123, 'v1');
  const entry = formDraftJournal.readForm(storage, 'form-test', 'denetci@aves.test');
  const foreignWrite = formDraftJournal.writeForm(storage, 'form-test', { forms: { FR65: { values: { beyan_yuku: 'YABANCI DEĞER' } } } }, 'diger@aves.test', 124, 'v1');
  const preservedAfterForeignWrite = formDraftJournal.readForm(storage, 'form-test', 'denetci@aves.test');
  const foreignEntry = formDraftJournal.readForm(storage, 'form-test', 'diger@aves.test');
  const staleRewrite = formDraftJournal.writeForm(storage, 'form-test', { forms: { FR65: { values: { beyan_yuku: 'ESKİ TASLAĞI EZ' } } } }, 'denetci@aves.test', 125, 'v2');
  const preservedAfterStaleRewrite = formDraftJournal.readForm(storage, 'form-test', 'denetci@aves.test');
  const capturePayload = { saha_veri_akisi: 'fr65_saha_v1', forms: { FR65: { values: { beyan_yuku: { field_value: '630 kg' } } } } };
  const captureWrote = formDraftJournal.writeFr65Capture(storage, 'form-test', capturePayload, 'denetci@aves.test', 126, 'v1', 'writer-a');
  const captureEntry = formDraftJournal.readFr65Capture(storage, 'form-test', 'DENETCI@AVES.TEST', 'writer-a');
  const secondTabWrite = formDraftJournal.writeFr65Capture(storage, 'form-test', capturePayload, 'denetci@aves.test', 127, 'v1', 'writer-b');
  const preservedAfterSecondTabWrite = formDraftJournal.readFr65Capture(storage, 'form-test', 'denetci@aves.test', 'writer-a');
  const secondTabDraft = formDraftJournal.readFr65Capture(storage, 'form-test', 'denetci@aves.test', 'writer-b');
  const legacyEntrySurvivesCaptureWrite = formDraftJournal.readForm(storage, 'form-test', 'denetci@aves.test');
  const captureConflict = formDraftJournal.inspectFr65Capture({}, captureEntry, 'v2');
  const captureRecover = formDraftJournal.inspectFr65Capture({}, captureEntry, 'v1');
  const captureSame = formDraftJournal.inspectFr65Capture(capturePayload.forms.FR65.values, captureEntry, 'v2');
  const unknownWriterRebase = formDraftJournal.rebaseFr65Capture(storage, 'form-test', 'denetci@aves.test', 'v1', 'v1.4', 'writer-c');
  const captureRebased = formDraftJournal.rebaseFr65Capture(storage, 'form-test', 'denetci@aves.test', 'v1', 'v1.5', 'writer-a');
  const rebasedCapture = formDraftJournal.readFr65Capture(storage, 'form-test', 'denetci@aves.test', 'writer-a');
  const foreignDraftAfterRebase = formDraftJournal.readFr65Capture(storage, 'form-test', 'denetci@aves.test', 'writer-b');
  const staleRebase = formDraftJournal.rebaseFr65Capture(storage, 'form-test', 'denetci@aves.test', 'v1', 'v3', 'writer-a');
  const unrelatedDraft = formDraftJournal.inspectFr65Capture({}, { payload: { forms: { FR65: { values: { beyan_yuku: 'eski form' } } } } }, 'v1');
  const wrongCaptureClear = formDraftJournal.clearFr65CaptureIfOwner(storage, 'form-test', 'ucuncu@aves.test');
  const wrongWriterClear = formDraftJournal.clearFr65CaptureIfOwner(storage, 'form-test', 'denetci@aves.test', rebasedCapture.ts, 'writer-b');
  const wrongTimestampClear = formDraftJournal.clearFr65CaptureIfOwner(storage, 'form-test', 'denetci@aves.test', rebasedCapture.ts - 1, 'writer-a');
  const captureOwnerClear = formDraftJournal.clearFr65CaptureIfOwner(storage, 'form-test', 'denetci@aves.test', rebasedCapture.ts, 'writer-a');
  const foreignDraftAfterClear = formDraftJournal.readFr65Capture(storage, 'form-test', 'denetci@aves.test', 'writer-b');
  const foreignDraftClear = formDraftJournal.clearFr65CaptureIfOwner(storage, 'form-test', 'denetci@aves.test', foreignDraftAfterClear.ts, 'writer-b');
  const legacyCaptureSeed = formDraftJournal.writeFr65Capture(storage, 'legacy-test', capturePayload, 'denetci@aves.test', 201, 'legacy-v1');
  const legacyCaptureRead = formDraftJournal.readFr65Capture(storage, 'legacy-test', 'denetci@aves.test', 'writer-new');
  const legacyCaptureMigrated = formDraftJournal.writeFr65Capture(storage, 'legacy-test', capturePayload, 'denetci@aves.test', 202, 'legacy-v1', 'writer-new');
  const migratedCaptureRead = formDraftJournal.readFr65Capture(storage, 'legacy-test', 'denetci@aves.test', 'writer-new');
  const legacyCaptureEnvelope = JSON.parse(storage.getItem('aves_taslak_legacy-test') || '{}');
  const legacySurvivesCaptureClear = formDraftJournal.readForm(storage, 'form-test', 'denetci@aves.test');
  const beforeClear = JSON.parse(storage.getItem('aves_taslak_form-test'));
  const wrongOwnerClear = formDraftJournal.clearFormIfOwner(storage, 'form-test', 'ucuncu@aves.test');
  const preservedAfterWrongOwner = !!formDraftJournal.readForm(storage, 'form-test');
  const ownerClear = formDraftJournal.clearFormIfOwner(storage, 'form-test', 'DENETCI@AVES.TEST');
  const cleared = formDraftJournal.clearForm(storage, 'form-test');
  const afterClear = JSON.parse(storage.getItem('aves_taslak_form-test'));
  const failingStorage = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
  return wrote && entry.ts === 123 && entry.ownerEmail === 'denetci@aves.test' &&
    entry.payload.forms.FR65.values.beyan_yuku === '630 kg' &&
    foreignWrite && preservedAfterForeignWrite.payload.forms.FR65.values.beyan_yuku === '630 kg' &&
    foreignEntry.payload.forms.FR65.values.beyan_yuku === 'YABANCI DEĞER' && !staleRewrite &&
    preservedAfterStaleRewrite.payload.forms.FR65.values.beyan_yuku === '630 kg' &&
    captureWrote && captureEntry.payload.forms.FR65.values.beyan_yuku.field_value === '630 kg' &&
    secondTabWrite && preservedAfterSecondTabWrite.writerId === 'writer-a' && preservedAfterSecondTabWrite.ts === 126 &&
    secondTabDraft.writerId === 'writer-b' && secondTabDraft.ts === 127 &&
    legacyEntrySurvivesCaptureWrite.payload.forms.FR65.values.beyan_yuku === '630 kg' &&
    captureConflict.kind === 'conflict' && captureRecover.kind === 'recover' && captureSame.kind === 'same' &&
    !unknownWriterRebase && captureRebased && rebasedCapture.baseUpdatedAt === 'v1.5' && rebasedCapture.ts === captureEntry.ts &&
    foreignDraftAfterRebase.baseUpdatedAt === 'v1' &&
    rebasedCapture.payload.forms.FR65.values.beyan_yuku.field_value === '630 kg' && !staleRebase &&
    unrelatedDraft.kind === 'none' && !wrongCaptureClear && !wrongWriterClear && !wrongTimestampClear && captureOwnerClear &&
    foreignDraftAfterClear.ts === 127 && foreignDraftClear &&
    legacyCaptureSeed && legacyCaptureRead.ts === 201 && legacyCaptureRead.payload.saha_veri_akisi === 'fr65_saha_v1' &&
    legacyCaptureMigrated && migratedCaptureRead.writerId === 'writer-new' && migratedCaptureRead.ts === 202 &&
    !Object.keys(legacyCaptureEnvelope).some(key => key.startsWith('form:fr65-saha')) &&
    legacySurvivesCaptureClear.payload.forms.FR65.values.beyan_yuku === '630 kg' &&
    !!beforeClear['saha:MAD-1:aciklama'] && !wrongOwnerClear && preservedAfterWrongOwner && ownerClear && cleared &&
    !Object.keys(afterClear).some(key => key === 'form:record' || key.startsWith('form:record:')) &&
    !!afterClear['saha:MAD-1:aciklama'] && !formDraftJournal.writeForm(failingStorage, 'x', payload, 'a@aves.test', 1);
})());
test('Modül form girişleri her input/değişimde senkron yerel günlüğe alınır, oturum sonrası kurtarılır ve başarılı kayıtta/terk onayında temizlenir',
  app.includes("const formDraftFields = '[data-tech-prop],[data-tech-characteristic],[data-form-field],[data-form-rating],[data-form-item-status],[data-form-item-reference],[data-form-item-note],[data-form-row-field]'") &&
  app.includes("ov.addEventListener('input', event => { if (event.target.matches(formDraftFields)) writeFormDraft(); });") &&
  app.includes("ov.addEventListener('change', event => { if (event.target.matches(formDraftFields)) writeFormDraft(); });") &&
  app.includes('const isFormDraft = key === formDraftKey || key.startsWith(`${formDraftKey}:`);') &&
  app.includes('entry.baseUpdatedAt') && app.includes('Taslak otomatik uygulanmadı; formu açıp karşılaştırın.') &&
  app.includes('AVES_FORM_DRAFT_JOURNAL.writeForm(localStorage, denetimId, next, API.email, Date.now(), originalInspectionUpdatedAt)') &&
  app.includes('Bu cihazda eski bir form taslağı korunuyor') &&
  app.includes('if (canEdit) AVES_FORM_DRAFT_JOURNAL.clearFormIfOwner(localStorage, denetimId, API.email);') &&
  app.includes('AVES_FORM_DRAFT_JOURNAL.clearFormIfOwner(localStorage, denetimId, API.email);') &&
  app.includes('if (!formDraftConflict) AVES_FORM_DRAFT_JOURNAL.clearFormIfOwner(localStorage, denetimId, API.email);') &&
  !app.includes('AVES_FORM_DRAFT_JOURNAL.clearForm(localStorage, denetimId)') &&
  app.includes('Acil form taslağı cihaza yazılamadı'));
test('iOS ana ekrana ekleme meta etiketleri + apple-touch-icon index.html\'de',
  index.includes('name="apple-mobile-web-app-capable" content="yes"') &&
  index.includes('name="apple-mobile-web-app-status-bar-style"') &&
  index.includes('rel="apple-touch-icon" href="icon-192.png"'));
test('senkron merkezi: syncCenter + sync_warning kilidi kırılır + export',
  app.includes('async function syncCenter()') &&
  app.includes("DB.kvDel('sync_warning')") &&
  app.includes('syncCenter,') && app.includes('reviewWarning,') &&
  app.includes('async function reviewWarning() { await syncCenter(); }') &&
  app.includes('async function korunanKalemler()') &&
  app.includes("KORUNAN_DURUMLAR = ['conflict', 'forbidden']"));
test('manual() gerçek outbox + bekleyen fotoğraf durumuna bakar, Senkron Merkezi açar',
  app.includes('const outboxVar = (await DB.outboxCount()) > 0;') &&
  app.includes('const fotoVar = !warning && !outboxVar && (await bekleyenFotoOzeti()).size > 0;') &&
  app.includes('if (warning || outboxVar || fotoVar) { await syncCenter(); return; }'));
test('Senkron Merkezi bekleyen fotoğrafları denetime göre özetler ve "Şimdi senkronize et" onları da gönderir',
  app.includes('async function bekleyenFotoOzeti()') &&
  app.includes("f.sync_status !== 'pending' || !f.blob") &&
  app.includes('const tumIdler = new Set([...grup.keys(), ...fotoByDenetim.keys()]);') &&
  app.includes('if (foto) parts.push(`${foto} fotoğraf`);') &&
  app.includes('UI.bekleyenFotograflariYukle()') &&
  app.includes('showLogin, afterLogin, showList, bekleyenFotograflariYukle,'));
test('çakışma (409) kayıtları körlemesine yeniden gönderilmez; yalnız 403 retry edilir',
  app.includes("const yetkiKalemleri = items.filter(it => it.sync_status === 'forbidden')") &&
  app.includes('for (const it of yetkiKalemleri) {') &&
  app.includes("it.sync_status = 'retry'") &&
  app.includes("const kalanCakisma = (await DB.outboxAll()).filter(x => x.sync_status === 'conflict')") &&
  !/for \(const it of items\) \{\s*\n\s*it\.sync_status = 'retry'/.test(app));
test('4 kopyalanmış inspectionOutbox filtresi tek Sync.denetimSyncOzeti yardımcısına indirildi',
  (app.match(/Sync\.denetimSyncOzeti\(currentDenetimId\)/g) || []).length === 4 &&
  app.includes('function outboxOzeti(items)') &&
  app.includes('async function denetimSyncOzeti(denetimId)') &&
  !app.includes("(await DB.outboxAll()).filter(item => item.inspection_id === currentDenetimId)"));
test('Senkron Merkezi denetime göre gruplar + "Şimdi senkronize et" + çakışma açıklaması',
  app.includes('<h3>Senkron Merkezi</h3>') &&
  app.includes("id=\"syncCenterNow\"") &&
  app.includes('Çakışma kayıtları otomatik gönderilmez'));
test('kapanış öncesi özet veri güvenini ayrı satırlarda gösterir: seri kaydı, çevrimdışı hazırlık, aktarım ve fotoğraf',
  app.includes('Kapanış öncesi denetim özeti') &&
  app.includes('AVES_KAPANIS_GUVEN_OZETI.kartlar') && index.includes('src="kapanis-guven-ozeti.js"') &&
  app.includes('cevrimdisiHazirlikDurumu(d, rows)') &&
  closureSummaryJs.includes('Bu cihaz çevrimdışı kullanıma hazır') &&
  closureSummaryJs.includes('Cihaz ve sunucu kayıtları eşit') &&
  closureSummaryJs.includes('Fotoğraf aktarımı tamam') &&
  app.includes('kapanisOzetiniGoster') && app.includes('kapanisOzetiOnaylandi'));
test('kapanıştaki korunan aktarım uyarısı error integrity-card stiliyle görünür',
  index.includes('.integrity-card.error{background:#fff0f0;color:#9b2525;}'));
test('8 maddelik yerel kapanış smoke fixture’ı seri, çevrimdışı, eşit senkron ve bekleyen fotoğrafı doğru gösterir',
  closureSummaryFixture.girdi.seriKayitSayisi === 7 &&
  closureSummaryFixture.girdi.seriBeklenenSayi === 7 &&
  closureSummaryCards[0].baslik === closureSummaryFixture.beklenen.seriBaslik &&
  closureSummaryCards[1].baslik === closureSummaryFixture.beklenen.offlineBaslik &&
  closureSummaryCards[2].baslik === closureSummaryFixture.beklenen.senkronBaslik &&
  closureSummaryCards[3].baslik === closureSummaryFixture.beklenen.fotoBaslik &&
  closureSummaryCards[3].durum === closureSummaryFixture.beklenen.fotoDurum);
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
test('seri no tekrarında yalnız görünür kayıtlar, devam eden kayıt ve 365 gün kuralı var; boş eşleşme yeni denetimi engellemez',
  app.includes('if (!kayitlar.length) return \'\';') && app.includes('denetimGorunebilirMi(item) && normSeriNo(item.asansor_seri_no) === seriAnahtari') && app.includes("denetim_durumu !== 'Çalışma Tamamlandı'") && app.includes('365 * 24 * 60 * 60 * 1000') && app.includes('Yeni bağımsız denetim 365 gün sonra açılabilir') && app.includes('Takip denetimi'));
test('seri no sunucu sorgusu hatasında yanıltıcı bağlantı mesajı yerine gerçek istemci nedeni gösterilir; kayıt fail-closed kalır', (() => {
  const start = app.indexOf('async function yeniDenetimSeriNoUygunMu(');
  const end = app.indexOf('\n  function showFr65OnayEkrani(', start);
  const flow = app.slice(start, end);
  return flow.includes('catch (error)') &&
    flow.includes("console.error('[AVES] Seri no kontrol hatası', error)") &&
    flow.includes('detail.replace(/\\s+/g, \' \').slice(0, 120)') &&
    flow.includes('Kayıt açılmadı.`, 10000)') &&
    flow.includes('return false;') &&
    !flow.includes('bağlantıyı kontrol edin');
})());
test('seri no sunucu sonuçlarını birleştiren Map aynı tanımlı değişken adıyla okunur', (() => {
  const start = app.indexOf('async function yeniDenetimSeriNoUygunMu(');
  const end = app.indexOf('\n  function showFr65OnayEkrani(', start);
  const flow = app.slice(start, end);
  return flow.includes('const birlesikKayitlar = new Map(') &&
    flow.includes('ayniSeriKayitlari = [...birlesikKayitlar.values()]') &&
    !flow.includes('birlesikKayitlari');
})());
test('fotoğrafsız uygunsuzluk listesi ve tamamlanmış denetim sonuç özeti var',
  app.includes('Uygunsuzluk Listesi') && app.includes('fotoğraf içermez') && app.includes('Sonuç özeti'));
test('fotoğraf ZIP adı seri no ve tarih içeriyor', app.includes('arsivKimligi') && app.includes('_fotograflar.zip'));
test('takipte uygun hale gelen uygunsuzluk kapanış bilgisi gösteriliyor', app.includes('TAKİPTE KAPATILAN UYGUNSUZLUKLAR'));
test('fotoğraf kategori notu alanı kaldırıldı (amaca hizmet etmiyordu)',
  !app.includes('data-photo-note') && !app.includes('Kategori notu (opsiyonel)') &&
  !app.includes('Fotoğraf kategori notu kaydedildi') &&
  app.includes("!k.startsWith('Fotoğraf: ')"));
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
test('AVES logosu sabit başlıkta erişilebilir denetim listesi düğmesidir',
  index.includes('position:-webkit-sticky;position:sticky;top:0') &&
  index.includes('id="brandHome" disabled') &&
  app.includes("button.setAttribute('aria-label', enabled ? 'Denetimler listesine dön' : 'AVES Saha Denetim')") &&
  app.includes('setBrandHomeEnabled(true);'));
test('logo yalnız açık denetimde listeye döner ve çıkmadan önce kayıtları tamamlar',
  app.includes("if (currentView !== 'inspection' || !currentDenetimId) return;") &&
  app.includes('try { await flushEditorWrites(); }') &&
  app.includes('if (firstError) throw firstError'));
test('denetim değişiklik olayları izlenir ve çıkış sırasında kullanıcı etkileşimi kilitlenir',
  app.includes('trackEditorEvent') && app.includes('Promise.allSettled([...pendingEditorWrites])') &&
  app.includes("app.style.pointerEvents = 'none'") &&
  app.includes('denetim ekranında kaldınız. Tekrar deneyin.'));
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
  app.includes("'kuyu_dibi', 'Kuyu Dibi', 'Kuyu dibinin ilk kattan") &&
  app.includes("'makine_sase', 'Makine, Şase ve Üst Donanım'") && app.includes('photo-add-camera'));
test('kullanıcı saha notları kontrollü taslak olarak kanıt planına bağlanıyor',
  app.includes('const SAHA_KANIT_PLANI = {') &&
  app.includes('kontrollü taslak (revizyon/onay doğrulanacak)') &&
  app.includes('SAHA_KANIT_PLANI.guvenlik') &&
  app.includes('SAHA_KANIT_PLANI.videolar'));
test('saha ölçüm eşleştirmesi Modül G akışından kaldırıldı; yoğun ölçü/seri no kapsamı B/E/H1 için ayrı tutuluyor',
  !app.includes('btnOlcumRehberi') &&
  !app.includes('olcumEslemeRehberiGoster') &&
  !app.includes('Proje–saha ölçüm eşleştirmesi') &&
  !app.includes('SAHA_KANIT_PLANI.olcum') &&
  app.includes('Yoğun ölçü/seri no eşleştirmesi Modül B/E/H1 için'));
test('birleşik denetim formu ortak formları ve modül bazlı form setlerini uygular', (() => {
  const codes = (module, standard) => denetimFormSets.formsFor(module, standard).map(item => item.key);
  const common = ['FR16', 'FR30', 'FR32', 'LS14', 'RP06', 'RP07'];
  const b = codes('B', '81-20');
  const g20 = codes('G', '81-20');
  const gLegacy = codes('G', '81-1/2+A3');
  const e = codes('E', '81-20');
  const h1 = codes('H1', '81-20');
  return [b, g20, gLegacy, e, h1].every(list => common.every(code => list.includes(code))) &&
    ['FR34','FR65','FR35','FR50','FR47','FR48','FR37','RP14'].every(code => b.includes(code)) && !b.includes('FR38') &&
    ['FR34','FR65','FR35','FR50','FR38','FR47','FR48','FR37'].every(code => g20.includes(code)) &&
    gLegacy.includes('FR39') && gLegacy.includes('FR51') && !gLegacy.includes('FR38') &&
    ['B','E','H1'].every(module => !codes(module, '81-1/2+A3').includes('FR39')) &&
    e.includes('FR65') && !e.includes('FR38') && !e.includes('RP14') &&
    h1.includes('FR65') && !h1.includes('FR38') && !h1.includes('RP14');
})());
test('elektrikli/hidrolik denetimde yalnız ilgili FR.47 veya FR.48 tasarım formu gösterilir', (() => {
  const electric = denetimFormSets.formsFor('B', '81-20', 'Elektrikli').map(item => item.key);
  const hydraulic = denetimFormSets.formsFor('B', '81-20', 'Hidrolik').map(item => item.key);
  return electric.includes('FR47') && !electric.includes('FR48') && hydraulic.includes('FR48') && !hydraulic.includes('FR47');
})());
test('FR.65 Rev.00 saha veri şeması genel bilgi, seri no ve ölçüm sekmelerini içeriyor',
  technicalDocs.FR65.code === 'ÜB.FR.65' && technicalDocs.FR65.revision === '00' &&
  technicalDocs.FR65.sections.length >= 7 &&
  technicalDocs.FR65.sections.flatMap(section => section.fields).length >= 55 &&
  technicalDocs.FR65.title === 'FR.65 Saha Veri Toplama' &&
  ['yuk','hiz','durak_sayisi','hidrolik_valfler','kat_kapisi_kilitleri','kabin_ray_tip_olcu'].every(key =>
    technicalDocs.FR65.sections.flatMap(section => section.fields).some(([fieldKey]) => fieldKey === key)) &&
  !technicalDocs.FR65.sections.flatMap(section => section.fields).some(([fieldKey]) => fieldKey === 'ray_konsol_araligi'));
test('FR.65 kuyu genişliği, derinliği ve kuyu dibi tekil cm sayılarıdır; eski mm/değerler yeniden yorumlanmadan korunur', (() => {
  const well = technicalDocs.FR65.sections.find(section => section.key === 'kuyu');
  const widthIndex = well.fields.findIndex(([key]) => key === 'kuyu_genislik_cm');
  const values = {
    kuyu_genislik_cm: { field_value: '220' },
    kuyu_derinlik_cm: { field_value: '180' },
    kuyu_dibi_cm: { field_value: '150' },
  };
  const count = technicalDocs.countFr65Capture({ forms: { FR65: { values } } }, 'Elektrikli', 'kuyu');
  const oldValues = {
    kuyu_genislik: { field_value: '2200' },
    kuyu_derinlik: { field_value: '1800' },
    kuyu_dibi: { field_value: '1500' },
  };
  const oldCount = technicalDocs.countFr65Capture({ forms: { FR65: { values: oldValues } } }, 'Elektrikli', 'kuyu');
  const flowStart = app.indexOf('async function renderFr65SahaKaydi(');
  const flowEnd = app.indexOf('async function showDenetim(', flowStart);
  const flow = app.slice(flowStart, flowEnd);
  return widthIndex >= 0 && well.fields[widthIndex][2] === 'number' && well.fields[widthIndex][1].includes('(cm)') &&
    well.fields[widthIndex + 1]?.[0] === 'kuyu_derinlik_cm' && well.fields[widthIndex + 1][2] === 'number' &&
    well.fields.find(([key]) => key === 'kuyu_dibi_cm')?.[2] === 'number' &&
    !well.fields.some(([key]) => ['kuyu_genislik', 'kuyu_derinlik', 'kuyu_dibi'].includes(key)) &&
    count.recorded === 3 && oldCount.recorded === 0 && flow.includes('Her değeri ayrı kutuya, cm olarak girin.') &&
    flow.includes("['kuyu_genislik_derinlik', 'Önceki birleşik kuyu ölçüsü']") &&
    flow.includes("['kuyu_genislik', 'Kuyu genişliği (önceki mm)']") &&
    flow.includes("['kuyu_dibi', 'Önceki kuyu dibi derinliği']") &&
    flow.includes('legacyMeasurementKeys') && flow.includes('Önceki ölçü ve saha kayıtları korunuyor') &&
    flow.includes('Eski değerler dönüştürülmeden korunur. Yeni alanlarda etiketteki birimi kullanın; “artık ölçülmüyor” olarak belirtilen kalemler yalnızca geçmiş bilgidir.');
})());
test('FR.65 kabin ve karşı ağırlık ray aralıkları ayrı sayısal alanlardır; eski birleşik kayıt korunur', (() => {
  const well = technicalDocs.FR65.sections.find(section => section.key === 'kuyu');
  const values = {
    kabin_raylar_arasi_cm: { field_value: '150' },
    karsi_agirlik_raylar_arasi_cm: { field_value: '90' },
  };
  const count = technicalDocs.countFr65Capture({ forms: { FR65: { values } } }, 'Elektrikli', 'kuyu');
  const flowStart = app.indexOf('async function renderFr65SahaKaydi(');
  const flowEnd = app.indexOf('async function showDenetim(', flowStart);
  const flow = app.slice(flowStart, flowEnd);
  return well.fields.some(([key, label, type]) => key === 'kabin_raylar_arasi_cm' && label.includes('(cm)') && type === 'number') &&
    well.fields.some(([key, label, type]) => key === 'karsi_agirlik_raylar_arasi_cm' && label.includes('(cm)') && type === 'number') &&
    !well.fields.some(([key]) => key === 'raylar_arasi_mesafe') && count.recorded === 2 &&
    flow.includes('normalized.forms.FR65?.values?.raylar_arasi_mesafe') && flow.includes('Önceki birleşik ray aralığı kaydı korunuyor');
})());
test('FR.65 bütün doğrusal ölçüler cm; yalnız halat çapları mm seçeneklidir', (() => {
  const fields = technicalDocs.FR65.sections.flatMap(section => section.fields);
  const linear = fields.filter(([, label]) => /(seyir mesafesi|kuyu yüksekliği|genişliği|derinliği|yüksekliği|çapı|boyu|aralığı|boşluğu|stroku|ölçüleri|mesafeleri)/i.test(label) && !label.includes('(m/s)'));
  const convertedKeys = [
    'seyir_mesafesi_cm','kuyu_yuksekligi_cm','tahrik_kasnak_capi_cm','saptirma_kasnak_capi_cm',
    'kabin_genislik_cm','kabin_derinlik_cm','kabin_yukseklik_cm','kabin_kat_kapi_genislik_cm',
    'kabin_kat_kapi_yukseklik_cm',
    'kilavuz_pabucu_araligi_cm','ray_toplam_boy_cm','kuyu_genislik_cm','kuyu_derinlik_cm',
    'kuyu_dibi_cm','son_kat_yuksekligi_cm','kabin_raylar_arasi_cm','karsi_agirlik_raylar_arasi_cm',
    'karsi_agirlik_genislik_cm','karsi_agirlik_derinlik_cm','karsi_agirlik_yukseklik_cm',
    'kabin_tampon_stroku_cm','karsi_agirlik_tampon_stroku_cm','ana_ray_karsi_agirlik_ray_mesafesi_cm',
    'hidrolik_piston_capi_cm','hidrolik_makara_capi_cm',
  ];
  const mmFields = fields.filter(([, label]) => label.includes('(mm'));
  return convertedKeys.every(key => fields.some(([fieldKey, label, type]) =>
    fieldKey === key && label.includes('(cm)') && type === 'number')) &&
    linear.every(([, label]) => label.includes('(cm') || label.includes('(mm')) &&
    mmFields.map(([key]) => key).sort().join(',') === 'halat_capi_mm,hidrolik_halat_capi_mm' &&
    fields.some(([key, label, type]) => key === 'ray_kapi_mesafesi_cm' && label === 'Ray–kapı mesafesi (cm)' && type === 'number') &&
    !fields.some(([key]) => key === 'ray_kapi_mesafe_noktalari_cm') &&
    !fields.some(([key]) => ['ust_guvenli_bosluk_cm','alt_guvenli_bosluk_cm'].includes(key));
})());
test('FR.65 ray-kapı mesafesi tek cm alanıdır; eski kat satırları korunur, ana ray-karşı ağırlık ölçüsü hemen sonrasındadır', (() => {
  const well = technicalDocs.FR65.sections.find(section => section.key === 'kuyu');
  const fields = well.fields;
  const key = 'ray_kapi_mesafesi_cm';
  const index = fields.findIndex(([fieldKey]) => fieldKey === key);
  const values = { [key]: { field_value: '16.5' } };
  const incomplete = { [key]: { field_value: '' } };
  const count = technicalDocs.countFr65Capture({ forms: { FR65: { values } } }, 'Elektrikli', 'kuyu');
  const incompleteCount = technicalDocs.countFr65Capture({ forms: { FR65: { values: incomplete } } }, 'Elektrikli', 'kuyu');
  const previous = { ray_kapi_mesafe_noktalari_cm: { points: [{ position: '1. kat', distance_cm: '16' }, { position: '2. kat', distance_cm: '17' }] } };
  const oldCount = technicalDocs.countFr65Capture({ forms: { FR65: { values: previous } } }, 'Elektrikli', 'kuyu');
  const start = app.indexOf('async function renderFr65SahaKaydi(');
  const end = app.indexOf('async function showDenetim(', start);
  const flow = app.slice(start, end);
  return index >= 0 && fields[index][2] === 'number' && fields[index][1] === 'Ray–kapı mesafesi (cm)' &&
    fields[index + 1]?.[0] === 'ana_ray_karsi_agirlik_ray_mesafesi_cm' &&
    fields[index + 1]?.[2] === 'number' && fields[index + 1]?.[1].includes('(cm)') &&
    count.recorded === 1 && incompleteCount.recorded === 0 && oldCount.recorded === 0 &&
    previous.ray_kapi_mesafe_noktalari_cm.points.length === 2 &&
    flow.includes("['ray_kapi_mesafe_noktalari_cm', 'Önceki ray–kapı ölçüm satırları']") &&
    flow.includes('Array.isArray(oldValue?.points)') && flow.includes('distance ? `${distance} cm` :') &&
    flow.includes("event.target.matches('[data-fr65-capture-prop]')") &&
    flow.includes("const values = JSON.parse(JSON.stringify(normalized.forms.FR65?.values || {}))") &&
    !flow.includes('data-fr65-measurement-prop') && !flow.includes('data-fr65-add-measurement') &&
    !flow.includes('positioned_measurements');
})());
test('FR.65 denetim kartında silme eylemi yalnız silme yetkili kullanıcıya gösterilir ve arama/tarih filtresi kartla birlikte çalışır',
  app.includes("if (fr65Capture && canDeleteDenetim(d))") &&
  app.includes("deleteButton.className = 'inspection-card-delete'") &&
  app.includes("deleteButton.textContent = '🗑 Denetimi sil'") &&
  app.includes('fr65SahaKaydiniSil(d, deleteButton)') &&
  app.includes("dl.querySelectorAll('.inspection-card-row')") &&
  app.includes("row.classList.toggle('hidden', !show)"));
test('FR.65 silme sunucuda doğrulanır; yetki, çevrimiçi durum, senkron, takip zinciri ve fotoğraflar korunma kapısıdır', (() => {
  const start = app.indexOf('async function fr65SahaKaydiniSil(');
  const end = app.indexOf('async function cevrimdisiHazirlikDurumu', start);
  const remove = app.slice(start, end);
  return remove.includes('!canDeleteDenetim(denetim) || !fr65SahaKaydiMi(denetim)') &&
    remove.includes('!navigator.onLine || !API.loggedIn') &&
    remove.includes('await Sync.full()') &&
    remove.includes('pendingAfterSync.items.length') &&
    remove.includes('linkedFollowups.length') &&
    remove.includes('localPhotos.length || remotePhotos.length') &&
    remove.includes('updated_at=eq.${encodeURIComponent(serverRows[0].updated_at)}') &&
    remove.includes('const remaining = await API.select') &&
    remove.includes('Bu işlem geri alınamaz');
})());
test('FR.65 yerel silme atomiktir; saha ve fotoğraf satırları da temizlenir, değiştirilemez geçmiş korunur', (() => {
  const start = app.indexOf('deleteInspectionLocal: (id) =>');
  const end = app.indexOf('clear: (store)', start);
  const remove = app.slice(start, end);
  return remove.includes("db.transaction(['denetimler', 'saha', 'fotograflar', 'kv'], 'readwrite')") &&
    remove.includes("removeIndexedRows('saha')") &&
    remove.includes("removeIndexedRows('fotograflar')") &&
    !remove.includes("t.objectStore('gecmis')");
})());
test('FR.65 kabin giriş sayısı sayısal ve konum sorusu olmadan; önceki birleşik kayıt korunur', (() => {
  const general = technicalDocs.FR65.sections.find(section => section.key === 'genel');
  const field = general.fields.find(([key]) => key === 'kabin_giris_sayisi');
  const start = app.indexOf('async function renderFr65SahaKaydi(');
  const end = app.indexOf('async function showDenetim(', start);
  const flow = app.slice(start, end);
  return field?.[2] === 'number' && !field[1].includes('konum') &&
    flow.includes("key === 'kabin_giris_sayisi'") && flow.includes("['kabin_giris_sayisi_yeri', 'Önceki kabin giriş sayısı/konumu kaydı']");
})());
test('FR.65 kabin ve kat kapısı ölçüleri ortak çift; kapı ayrıntıları ortak etiket ve seçeneklerle tutulur', (() => {
  const section = technicalDocs.FR65.sections.find(item => item.key === 'kabin_kapilar');
  const fields = section.fields;
  const field = key => fields.find(([fieldKey]) => fieldKey === key);
  const options = technicalDocs.FR65_FIELD_OPTIONS;
  const panels = ['1','2','3','4','5','6','7','8'];
  const values = { ikinci_kapi_var: { field_value: 'Yok' } };
  const count = technicalDocs.countFr65Capture({ forms: { FR65: { values } } }, 'Elektrikli', 'kabin_kapilar');
  const withSecondDoor = technicalDocs.countFr65Capture({ forms: { FR65: { values: { ikinci_kapi_var: { field_value: 'Var' } } } } }, 'Elektrikli', 'kabin_kapilar');
  const flowStart = app.indexOf('async function renderFr65SahaKaydi(');
  const flowEnd = app.indexOf('async function showDenetim(', flowStart);
  const flow = app.slice(flowStart, flowEnd);
  return ['kabin_kat_kapi_genislik_cm','kabin_kat_kapi_yukseklik_cm']
      .every(key => field(key)?.[2] === 'number' && field(key)?.[1].includes('(cm)')) &&
    ['kabin_kat_kapi_yonu','ikinci_kapi_yon'].every(key => JSON.stringify(options[key]) === JSON.stringify(['Sağ','Sol','Merkezi'])) &&
    ['kabin_kat_kapi_tipi','ikinci_kapi_tip'].every(key => JSON.stringify(options[key]) === JSON.stringify(['Teleskopik','Merkezi'])) &&
    ['kabin_kat_kapi_panel_sayisi','ikinci_kapi_panel_sayisi'].every(key =>
      field(key)?.[2] === 'select' && JSON.stringify(options[key]) === JSON.stringify(panels)) &&
    !fields.some(([key]) => ['kabin_kapi_genislik_cm','kabin_kapi_yukseklik_cm','kat_kapisi_genislik_cm','kat_kapisi_yukseklik_cm','kabin_kapi_yonu','kat_kapisi_yonu','kabin_kapi_tipi','kat_kapisi_tipi','kabin_kapi_panel_sayisi','kat_kapisi_panel_sayisi'].includes(key)) &&
    fields.findIndex(([key]) => key === 'kabin_kat_kapi_genislik_cm') < fields.findIndex(([key]) => key === 'kabin_kat_kapi_yukseklik_cm') &&
    count.total === 10 && withSecondDoor.total === 13 &&
    flow.includes("'Kabin ve kat kapısı ölçüleri'") && flow.includes('Önceki kat kapısı genişliği (cm)');
})());
test('FR.65 tamponlar kabin/karşı ağırlık bazında tür ve cm strokla; belirsiz konum alanı kaldırıldı', (() => {
  const fields = technicalDocs.FR65.sections.find(section => section.key === 'kuyu').fields;
  const typeOptions = ['Hidrolik','Poliüretan'];
  const field = key => fields.find(([fieldKey]) => fieldKey === key);
  return ['kabin_tampon_tipi','karsi_agirlik_tampon_tipi'].every(key =>
      field(key)?.[2] === 'select' && JSON.stringify(technicalDocs.FR65_FIELD_OPTIONS[key]) === JSON.stringify(typeOptions)) &&
    ['kabin_tampon_stroku_cm','karsi_agirlik_tampon_stroku_cm'].every(key =>
      field(key)?.[2] === 'number' && field(key)?.[1].includes('(cm)')) &&
    !fields.some(([key]) => key === 'tampon_strok_konum');
})());
test('FR.65 halat sayısı 1–8, çapı verilen mm listesinden seçilir; kol sayısı istenmez', (() => {
  const fields = technicalDocs.FR65.sections.flatMap(section => section.fields);
  const electric = technicalDocs.FR65.sections.find(section => section.key === 'elektrikli_tahrik').fields;
  const hydraulic = technicalDocs.FR65.sections.find(section => section.key === 'hidrolik').fields;
  const options = technicalDocs.FR65_FIELD_OPTIONS;
  const emptyHydraulic = technicalDocs.countFr65Capture({ forms: { FR65: { values: {} } } }, 'Hidrolik', 'hidrolik');
  const hydraulicRope = technicalDocs.countFr65Capture({ forms: { FR65: { values: { hidrolik_halat_sayisi: { field_value: '2' } } } } }, 'Hidrolik', 'hidrolik');
  return ['halat_sayisi','hidrolik_halat_sayisi'].every(key => JSON.stringify(options[key]) === JSON.stringify(['1','2','3','4','5','6','7','8'])) &&
    ['halat_capi_mm','hidrolik_halat_capi_mm'].every(key => JSON.stringify(options[key]) === JSON.stringify(['6','6.5','8','10','12'])) &&
    electric.find(([key]) => key === 'halat_sayisi')?.[2] === 'select' && electric.find(([key]) => key === 'halat_capi_mm')?.[2] === 'select' &&
    hydraulic.find(([key]) => key === 'hidrolik_halat_sayisi')?.[2] === 'optional_select' && hydraulic.find(([key]) => key === 'hidrolik_halat_capi_mm')?.[2] === 'optional_select' &&
    emptyHydraulic.total + 1 === hydraulicRope.total &&
    !fields.some(([key, label]) => key === 'halat_tipi' || label.toLowerCase().includes('kol sayısı')) &&
    ['tahrik_kasnak_capi_cm','saptirma_kasnak_capi_cm'].every(key => electric.some(([fieldKey, label, type]) => fieldKey === key && type === 'number' && label.includes('(cm)')));
})());
test('FR.65 ölçü bölümleri daha sıkı aralık kullanır; tek satırlı ölçüler ve kısa açıklama akışı sunar',
  app.includes("class=\"${compactMeasure ? 'fr65-compact-measure-input' : ''}\" rows=\"${compactMeasure ? '1' : '2'}\"") &&
  index.includes('.fr65-capture .tech-section-body>.tech-field{gap:4px;padding:5px 0;}') &&
  index.includes('.fr65-measure-note{padding:0;border:0;background:transparent;}'));
test('FR.65 saha düzeni: başlangıç ölçüsü kaldırıldı, ek tamponlar açılır ve GSM kimlik alanları daima görünür', (() => {
  const allSections = technicalDocs.FR65.sections;
  const serials = allSections.find(section => section.key === 'seri_numaralari').fields;
  const hydraulic = allSections.find(section => section.key === 'hidrolik');
  return technicalDocs.visibleFr65Sections('Elektrikli')[0].key === 'kuyu' &&
    technicalDocs.visibleFr65Sections('Hidrolik').at(-1).key === 'hidrolik' &&
    serials.some(([key, , type]) => key === 'kabin_ek_tampon' && type === 'optional_serial') &&
    serials.some(([key, , type]) => key === 'karsi_agirlik_ek_tampon' && type === 'optional_serial') &&
    serials.some(([key, , type]) => key === 'gsm_modulu' && type === 'gsm') &&
    !serials.some(([key]) => ['hareketli_tampon','hidrolik_motor','hidrolik_boru_kirilma'].includes(key)) &&
    hydraulic.fields.slice(-2).every(([, , type]) => type === 'serial') &&
    ['seyir_mesafesi_cm','kuyu_yuksekligi_cm'].every(key => allSections.flatMap(section => section.fields).some(([fieldKey]) => fieldKey === key));
})());
test('FR.65 ek tampon kutuları isteğe bağlı açılır; boş tampon alanı var/yok seçimi gerektirmez', (() => {
  const flowStart = app.indexOf("if (section.kind === 'serial' && fieldType === 'optional_serial') {");
  const flowEnd = app.indexOf("if (section.kind === 'serial' && fieldType === 'gsm')", flowStart);
  const optionalUi = app.slice(flowStart, flowEnd);
  const values = {
    ikinci_kapi_var: { field_value: 'Yok' },
    ikinci_kapi_yon: { field_value: 'Karşılıklı' },
    kabin_ek_tampon: { var_mi: 'Yok' },
    gsm_modulu: { marka: 'X', tip: 'Y', imei: '123456789012345' },
  };
  const door = technicalDocs.countFr65Capture({ forms: { FR65: { values } } }, 'Elektrikli', 'kabin_kapilar');
  const serial = technicalDocs.countFr65Capture({ forms: { FR65: { values } } }, 'Elektrikli', 'seri_numaralari');
  const emptySerial = technicalDocs.countFr65Capture({ forms: { FR65: { values: {} } } }, 'Elektrikli', 'seri_numaralari');
  const extraBufferValues = { kabin_ek_tampon: { var_mi: 'Var', marka: 'X' } };
  const extraBuffer = technicalDocs.countFr65Capture({ forms: { FR65: { values: extraBufferValues } } }, 'Elektrikli', 'seri_numaralari');
  const legacyNoBufferValues = { kabin_ek_tampon: { var_mi: 'Yok' } };
  const legacyNoBuffer = technicalDocs.countFr65Capture({ forms: { FR65: { values: legacyNoBufferValues } } }, 'Elektrikli', 'seri_numaralari');
  const legacyBufferValues = { kabin_ek_tampon: { var_mi: 'Var' } };
  const legacyBuffer = technicalDocs.countFr65Capture({ forms: { FR65: { values: legacyBufferValues } } }, 'Elektrikli', 'seri_numaralari');
  return door.recorded === 1 && door.total === 10 && serial.recorded === 1 &&
    !technicalDocs.fr65CaptureFieldActive(['ikinci_kapi_yon'], values) &&
    optionalUi.includes('<details class="fr65-extra-serial-fields"') && optionalUi.includes("'Varsa bilgilerini ekle'") &&
    optionalUi.includes("value.var_mi === 'Yok' ? 'Önceki kayıt: Yok'") &&
    optionalUi.includes("value.var_mi === 'Var' ? 'Önceki ek tampon kaydı'") &&
    !optionalUi.includes('<select') && !optionalUi.includes('Bu konumda ek tampon durumu') &&
    serial.total === emptySerial.total && extraBuffer.total === emptySerial.total + 1 && extraBuffer.recorded === 0 &&
    legacyNoBuffer.total === emptySerial.total && legacyBuffer.total === emptySerial.total + 1 && legacyBuffer.recorded === 0 &&
    app.includes("if (hasSerialData) value.var_mi = 'Var'") && !app.includes("else if (value.var_mi === 'Var') delete value.var_mi");
})());
test('FR.65 GSM modülü her kayıtta yer alır; Var/Yok seçimi yok, marka/tip/IMEI zorunlu', (() => {
  const serials = technicalDocs.FR65.sections.find(section => section.key === 'seri_numaralari').fields;
  const gsm = serials.find(([key]) => key === 'gsm_modulu');
  const flowStart = app.indexOf("if (section.kind === 'serial' && fieldType === 'gsm') {");
  const flowEnd = app.indexOf("if (section.kind === 'serial' || fieldType === 'serial')", flowStart);
  const gsmUi = app.slice(flowStart, flowEnd);
  const complete = { marka: 'X', tip: 'Y', imei: '123456789012345' };
  const empty = {};
  const completeCount = technicalDocs.countFr65Capture({ forms: { FR65: { values: { gsm_modulu: complete } } } }, 'Elektrikli', 'seri_numaralari');
  const emptyCount = technicalDocs.countFr65Capture({ forms: { FR65: { values: { gsm_modulu: empty } } } }, 'Elektrikli', 'seri_numaralari');
  return gsm?.[2] === 'gsm' && !gsm?.[1].includes('(varsa)') &&
    completeCount.recorded === 1 && emptyCount.recorded === 0 &&
    completeCount.total === emptyCount.total && emptyCount.total > 0 &&
    gsmUi.includes('fr65-gsm-row') && gsmUi.includes("renderSerialInputs(value, disabled, 'IMEI', 'imei')") &&
    gsmUi.includes('Önceki kayıtta GSM için') && !gsmUi.includes('<select') &&
    !gsmUi.includes('data-fr65-capture-prop="var_mi"') && !app.includes('optional_gsm');
})());
test('FR.65 kaydı GSM marka/tip/IMEI tamamlanmadan kapanmaz ve eksik alana yönlendirir', (() => {
  const flowStart = app.indexOf('async function renderFr65SahaKaydi(');
  const flowEnd = app.indexOf('async function showDenetim(', flowStart);
  const flow = app.slice(flowStart, flowEnd);
  const guard = flow.indexOf("const gsmMissing = ['marka', 'tip', 'imei']");
  const confirm = flow.indexOf('if (!confirm(', guard);
  return guard >= 0 && confirm > guard &&
    flow.includes('if (gsmMissing.length)') &&
    flow.includes('Kaydı kapatmak için GSM modülünün marka, tip ve IMEI bilgilerini tamamlayın') &&
    flow.includes("rememberCaptureSection('seri_numaralari')") &&
    flow.includes('gsmRow?.scrollIntoView({ behavior: \'smooth\', block: \'center\' })');
})());
test('FR.65 ray profilleri istenen T serisi seçenekleriyle sınırlı; eski A/B ve konsol aralığı alanı yok', (() => {
  const expected = ['T50','T70','T89','T90','T125','T140','Diğer / açıklama'];
  const fields = technicalDocs.FR65.sections.flatMap(section => section.fields);
  return JSON.stringify(technicalDocs.FR65_FIELD_OPTIONS.kabin_ray_tip_olcu) === JSON.stringify(expected) &&
    JSON.stringify(technicalDocs.FR65_FIELD_OPTIONS.karsi_agirlik_ray_tip_olcu) === JSON.stringify(expected) &&
    !fields.some(([key]) => key === 'ray_konsol_araligi') &&
    !fields.some(([, label]) => /\bA\s*\/\s*B\b/.test(label));
})());
test('FR.65 kuyu seçeneklerinde açıklama yalnız Var seçilince açılır; iki alanın kapsamı ayrı tutulur', (() => {
  const fields = technicalDocs.FR65.sections.find(section => section.key === 'kuyu').fields;
  const find = key => fields.find(([fieldKey]) => fieldKey === key);
  const values = {
    kismen_kapali_kuyu: { field_value: 'Yok' },
    kuyu_alti_kullanim_yuk: { field_value: 'Var' },
  };
  return find('kismen_kapali_kuyu')[2] === 'select' &&
    find('kuyu_alti_kullanim_yuk')[2] === 'select' &&
    technicalDocs.FR65_FIELD_OPTIONS.kismen_kapali_kuyu.join(',') === 'Yok,Var' &&
    technicalDocs.FR65_FIELD_OPTIONS.kuyu_alti_kullanim_yuk.join(',') === 'Yok,Var' &&
    !technicalDocs.fr65CaptureFieldActive(find('kismen_kapali_kuyu_detay'), values) &&
    technicalDocs.fr65CaptureFieldActive(find('kuyu_alti_kullanim_yuk_detay'), values) &&
    app.includes('inheritedLegacyDetail');
})());
test('FR.65 Var/Yok alanı yalnız seçim yapıldığında tamamlanır; not tek başına yeterli sayılmaz', (() => {
  const fields = technicalDocs.FR65.sections.find(section => section.key === 'kuyu').fields;
  const selectField = fields.find(([key]) => key === 'kismen_kapali_kuyu');
  const emptyWithNote = { kismen_kapali_kuyu: { field_value: '', note: 'Daha sonra bakılacak' } };
  const selectedNo = { kismen_kapali_kuyu: { field_value: 'Yok', note: '' } };
  const emptyCount = technicalDocs.countFr65Capture({ forms: { FR65: { values: emptyWithNote } } }, 'Elektrikli', 'kuyu');
  const selectedCount = technicalDocs.countFr65Capture({ forms: { FR65: { values: selectedNo } } }, 'Elektrikli', 'kuyu');
  return selectField[2] === 'select' && emptyCount.recorded === 0 && selectedCount.recorded === 1;
})());
test('FR.65 sayı alanlarındaki okunamayan eski değerler yeni değer girilene veya açıkça silinene kadar korunur', (() => {
  const flowStart = app.indexOf('async function renderFr65SahaKaydi(');
  const flowEnd = app.indexOf('async function showDenetim(', flowStart);
  const flow = app.slice(flowStart, flowEnd);
  return flow.includes('data-fr65-preserve-legacy=') &&
    flow.includes("input.dataset.fr65PreserveLegacy === 'true' && input.dataset.fr65LegacyTouched !== 'true'") &&
    flow.includes("event.target.dataset.fr65PreserveLegacy === 'true' && event.target.value.trim()") &&
    flow.includes("event.target.dataset.fr65LegacyTouched = 'true'") &&
    flow.includes('data-fr65-clear-legacy=') &&
    flow.includes('input.dispatchEvent(new Event(\'input\', { bubbles: true }))');
})());
test('FR.65 eski hareketli tampon kaydı silinmeden görünür ve doğru ek tampon alanına aktarılabilir', (() => {
  const flowStart = app.indexOf('async function renderFr65SahaKaydi(');
  const flowEnd = app.indexOf('async function showDenetim(', flowStart);
  const flow = app.slice(flowStart, flowEnd);
  return !technicalDocs.FR65.sections.flatMap(section => section.fields).some(([key]) => key === 'hareketli_tampon') &&
    flow.includes('normalized.forms.FR65?.values?.hareketli_tampon') &&
    flow.includes('Önceki hareketli tampon kaydı korunuyor') &&
    flow.includes('bilgiyi yukarıdaki doğru ek tampon alanına aktarın');
})());
test('FR.65 traksiyon tipine göre alanları ayırıyor ve gizlenen önceki değerler normalize kayıtta korunuyor',
  technicalDocs.visibleFr65Sections('Elektrikli').some(section => section.key === 'elektrikli_tahrik') &&
  !technicalDocs.visibleFr65Sections('Elektrikli').some(section => section.key === 'hidrolik') &&
  !technicalDocs.visibleFr65Sections('Elektrikli').find(section => section.key === 'seri_numaralari').fields.some(([key]) => key === 'hidrolik_motor') &&
  technicalDocs.visibleFr65Sections('Hidrolik').some(section => section.key === 'hidrolik') &&
  !technicalDocs.visibleFr65Sections('Hidrolik').find(section => section.key === 'seri_numaralari').fields.some(([key]) => key === 'elektrikli_makine') &&
  technicalDocs.visibleFr65Sections('').some(section => section.key === 'hidrolik'));
test('FR.65 saha veri sayacı evrak karşılaştırmasını saymaz; gözlem ve bileşen kimliğini sayar', (() => {
  const capture = technicalDocs.emptyFr65Capture('2026-10-12T00:00:00.000Z');
  const values = capture.forms.FR65.values;
  values.kuyu_dibi_cm = { file_value: '240 cm', field_value: '238.5', note: 'Kuyu ölçüsü fotoğrafı' };
  values.kat_kapisi_kilitleri = { marka: 'AVES', tip: 'K-1', seri_no: 'SN-01' };
  values.ray_konum_aski = { file_value: 'yalnız evrak değeri' };
  const count = technicalDocs.countFr65Capture(capture, 'Elektrikli');
  return capture.saha_veri_akisi === 'fr65_saha_v1' && capture.source_form === 'ÜB.FR.65' &&
    capture.source_revision === '00' && count.recorded === 2 && count.total > 1 &&
    !Object.values(values.kuyu_dibi_cm).some(value => ['Uygun','Uygun Değil','Eşleşti','Fark var'].includes(value));
})());
test('FR.65 veri sayacı tahrik tipine göre kapsamı daraltır, boş alanı saymaz', (() => {
  const capture = { forms: { FR65: { values: {
    makine_guc: { file_value: '', field_value: '', note: '' },
    hidrolik_unite_konumu: { file_value: 'Makine dairesi', field_value: 'Alt kat', note: '' },
  } } } };
  const electric = technicalDocs.countFr65Capture(capture, 'Elektrikli');
  const hydraulic = technicalDocs.countFr65Capture(capture, 'Hidrolik');
  return electric.recorded === 0 && hydraulic.recorded === 1 && hydraulic.total > 0;
})());
test('FR.65 sayaç yalnız denetçinin seçtiği kayıt durumlarını sayıyor', (() => {
  const record = technicalDocs.emptyRecord();
  record.fr65.values.yuk = { status: 'Eşleşti' };
  record.fr65.values.kapasite = { status: 'Fark var' };
  const count = technicalDocs.countFr65(record, 'Elektrikli');
  return count.recorded === 2 && count.total > count.recorded;
})());
test('RP.14 Rev.01 Modül B kayıtları teknik dosya, ölçü cihazı, varyant ve bileşen başlıklarını kapsıyor',
  technicalDocs.RP14.code === 'ÜB.RP.14' && technicalDocs.RP14.revision === '01' &&
  technicalDocs.RP14.applicability === 'Modül B' && technicalDocs.RP14.instruments.length === 10 &&
  technicalDocs.RP14.reviewSections.reduce((sum, section) => sum + section.items.length, 0) >= 15 &&
  technicalDocs.RP14.safetyComponents.length >= 7 && technicalDocs.RP14.otherComponents.length >= 5 &&
  !technicalDocsJs.includes('belge verilmez'));
test('form seti şeması ortak/modül formlarını ayırıyor; FR.38/39 yalnız G ana checklistinde kalıyor', (() => {
  const codes = ['FR16','FR30','FR32','LS14','FR34','FR35','FR37','FR38','FR39','FR47','FR48','FR50','FR65','FR51','RP06','RP07','RP14'];
  const nonG = ['B','E','H1'].flatMap(module => denetimFormSets.formsFor(module, '81-20'));
  return codes.every(code => !!denetimFormSets.FORMS[code]) &&
    denetimFormSets.FORMS.FR38.special === 'mainChecklist' && denetimFormSets.FORMS.FR39.special === 'mainChecklist' &&
    denetimFormSets.formsFor('G', '81-20').some(form => form.key === 'FR38') &&
    nonG.every(form => form.key !== 'FR38' && form.key !== 'FR39') &&
    denetimFormSets.FORMS.FR16.ratings.length >= 10 && denetimFormSets.FORMS.FR30.repeaters.length > 0 &&
    denetimFormSets.FORMS.FR32.repeaters.length > 0 && denetimFormSets.FORMS.FR47.checklistSections.length > 0 &&
    denetimFormSets.FORMS.RP06.repeaters.length > 0 && denetimFormSets.FORMS.RP07.repeaters.length > 0;
})());
test('birleşik form normalizasyonu eski FR.65/RP.14 verisini kayıpsız içeri alıyor', (() => {
  const old = {
    fr65: { values: { beyan_yuku: { file_value: '630 kg', field_value: '630 kg', status: 'Eşleşti' } } },
    rp14: { checks: { inceleme_kapsami: { status: 'İncelendi', evidence: 'A-1' } }, characteristics: { ana_tip_varyant: 'T1' }, deviations: 'not' },
  };
  const record = denetimFormSets.normalize(null, old);
  return record.forms.FR65.values.beyan_yuku.file_value === '630 kg' &&
    record.forms.RP14.checks.inceleme_kapsami.evidence === 'A-1' &&
    record.forms.RP14.characteristics.ana_tip_varyant === 'T1' && record.forms.RP14.deviations === 'not';
})());
test('birleşik form normalizasyonu iç içe verileri kopyalar; değişiklik karşılaştırması kaynağı mutasyona uğratmaz', (() => {
  const source = { forms: { FR30: { fields: { client_representative: 'İlk değer' } } } };
  const normalized = denetimFormSets.normalize(source);
  normalized.forms.FR30.fields.client_representative = 'Düzenlendi';
  return source.forms.FR30.fields.client_representative === 'İlk değer';
})());
test('tekrarlı form tablolarındaki alanlar doğru data-form-row-field kimliğiyle kaydedilir',
  app.includes('data-form-row-field="${esc(field.key)}"') &&
  app.includes("card.querySelectorAll('[data-form-row-field]')") &&
  app.includes('input.dataset.formRowField'));
test('form kayıt sayacı veri varlığını gösterir, uygunluk/tamamlanma sonucu veya kapanış şartı üretmez', (() => {
  const record = denetimFormSets.emptyRecord();
  record.forms.FR30 = { fields: { client_representative: 'Test' } };
  const count = denetimFormSets.countForms(record, 'B', '81-20');
  const closeFlow = app.slice(app.indexOf('async function denetimDurumuDegistir'), app.indexOf('async function showOzet'));
  return count.started === 1 && count.total > count.started &&
    app.includes('denetim_form_kayitlari: AVES_DENETIM_FORM_SETI.normalize') &&
    !closeFlow.includes('denetimFormDurumu') &&
    app.includes('uygunluk / belgelendirme kararının yerine geçmez') && app.includes('uygulama otomatik hesap ya da karar üretmez');
})());
test('birleşik form local-first kaydolur ve kapanış bütünlük özetinde normalize veri olarak bulunur',
  app.includes('d.denetim_form_kayitlari = next;') &&
  app.includes('d.teknik_dosya_kayitlari = { schema_version: 1, updated_at: now, fr65: next.forms.FR65, rp14: next.forms.RP14 }') &&
  app.includes('await localWrite(\'denetimler\', d, \'denetimler\')') &&
  app.includes('Kayıt cihazda tamamlanamadı; ekran açık bırakıldı') &&
  app.includes('denetim_form_kayitlari: AVES_DENETIM_FORM_SETI.normalize'));
test('seri numarası talimatı seri numarası ekranında ekipman etiketlerini yönlendiriyor',
  app.includes('const SERI_NUMARASI_YARDIMI =') &&
  app.includes('Fotoğraflar > Genel Yerleşim ve Kimlik kategorisine ekleyin') &&
  app.includes('${esc(SERI_NUMARASI_YARDIMI)} Bilgiler fotoğraflardan bağımsızdır'));
test('işlev testi video planı Fotoğraflar alanında açılır ve AVES fotoğraf yüklemesinden ayrı tutulur',
  app.includes('<details class="photo-video-plan">') &&
  app.includes('SAHA_KANIT_PLANI.videolar.map') &&
  app.includes('Videolar bu AVES fotoğraf alanına yüklenmez') &&
  app.includes('1,25 katı yükle fren testi') &&
  app.includes('PTC, KRC, seviyeleme ve UPS testleri') &&
  app.includes('UCM testi') && index.includes('.photo-video-plan summary'));
test('saha güvenliği hatırlatması denetim başladıktan sonra aktif denetim ekranında görünür ve prosedürün yerini almaz',
  app.includes('currentCanEdit && !tamamlandi ? `<aside class="saha-guvenlik"') &&
  app.includes('SAHA_KANIT_PLANI.guvenlik.map') &&
  app.includes('şirketin onaylı risk analizi ve güvenli çalışma prosedürünün yerini almaz') &&
  index.includes('.saha-guvenlik{'));
test('saha güvenilirliği: fotoğraf çekimi native kameraya değil uygulama içi kameraya (getUserMedia) yönleniyor',
  app.includes('const kameraIleFotografCek = async (kat) => {') &&
  app.includes('navigator.mediaDevices.getUserMedia({') &&
  app.includes("facingMode: { ideal: 'environment' }") &&
  !app.includes('capture="environment"') &&
  app.includes("btn.onclick = () => kameraIleFotografCek(btn.dataset.kat);") &&
  app.includes('🖼 Galeriden ekle'));
test('uygulama içi kamera çekimi de aynı sıkıştırma/kayıt/yükleme akışını (fotografKaydet) kullanıyor',
  app.includes('const fotografKaydet = async (kat, blob) => {') &&
  app.includes('await fotografKaydet(kat, blob);') &&
  app.includes('for (const file of files) await fotografKaydet(kat, file);'));
test('fotoğraf silme: Storage DELETE prefixes gövdesiyle gönderiliyor (tekli silme + arşiv temizliği)',
  app.includes('async function fotografDepodanSil(objectPath)') &&
  app.includes("API.authFetch('/storage/v1/object/denetim-fotograflari', {") &&
  /method:\s*'DELETE',\s*body:\s*JSON\.stringify\(\{\s*prefixes:\s*\[objectPath\]\s*\}\),/.test(app) &&
  (app.match(/await fotografDepodanSil\(foto\.object_path\);/g) || []).length === 2 &&
  !app.includes("API.authFetch(`/storage/v1/object/denetim-fotograflari/${foto.object_path}`, { method: 'DELETE' }") &&
  app.includes('console.error(\'Fotoğraf kaldırılamadı\', error);') &&
  app.includes('Storage silme hatası (${response.status})'));
test('fotoğraf silme: çevrimdışı uyarısı ve hata toastı korunuyor',
  app.includes("if (foto.sync_status !== 'pending' && !navigator.onLine) {") &&
  app.includes("toast('Bu fotoğraf zaten sunucuya yüklenmiş — silmek için internet gerekiyor, bağlantı gelince tekrar deneyin');") &&
  app.includes("toast('Fotoğraf kaldırılamadı: ' + (error && error.message"));
test('fotoğraf yönergesi denetçinin ilave kare ve muhakeme serbestisini koruyor',
  app.includes('Bu yönergeler sınırlayıcı bir liste değil') && app.includes('kuşkulu durumları ve uygunsuzlukları ayrıca kaydedin'));
test('paraşüt fren izi kuyu boyunca fotoğraf yönergesinde',
  app.includes('Paraşüt fren testi tamamlandıktan sonra her iki raydaki frenleme izini'));
test('alarm ve iki yönlü haberleşme özel değil her asansörde aranıyor',
  app.includes('Her asansörde aranan alarm ve iki yönlü haberleşme tertibatını') &&
  !app.slice(app.indexOf("'ozel_sistemler'"), app.indexOf('];', app.indexOf("'ozel_sistemler'"))).includes('alarm/iki yönlü haberleşme'));
test('işlev testi videoları ayrı kurumsal aktarım ve arşive yönlendiriliyor',
  app.includes('Kurumun belirlediği ayrı aktarım ve arşiv yöntemiyle saklayın') &&
  app.includes('photo-video-plan'));
test('fotoğraflar yükleme öncesi küçültülüyor', app.includes('1600 / Math.max(bitmap.width, bitmap.height)') && app.includes("'image/jpeg', .82"));
test('fotoğraflar sekmesi kategori bazlı grid ve tam görünüm sunuyor', app.includes('function fotografSekmesi') && app.includes('photo-kategori') && app.includes('photo-grid') && app.includes("window.open(url, '_blank')"));
test('fotoğraf penceresinde başlık ve kapatma düğmesi içerik kayarken görünür kalıyor',
  app.includes('photo-modal-head') && index.includes('.photo-modal-head{position:sticky') && app.includes('aria-label="Kapat"'));
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
  app.includes('scheduleEditorDraft(e.target, ts)') && app.includes('}, 700);'));
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
test('takip denetimi yalnız Modül G için açık, B/E/H1 kayıtları yeni takip başlatamaz',
  app.includes('takipDenetimiOlustur') &&
  app.includes('return sahaUygulamaModuluGMi(d) && kontrolProfili(d) === KONTROL_PROFILLERI.TAM') &&
  app.includes('if (!sahaUygulamaModuluGMi(kaynak))'));
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
test('Ek Mühendislik maddelerinde Uygun Değil seçenek listesi yok, açıklama alanı açılıyor',
  app.includes('const avesMuhendislik = tasarim;') &&
  app.includes('const showBulguOpts = uygunDegil && !avesMuhendislik && ozelOpts.length > 0;') &&
  app.includes('const showUygDegilAciklama = uygunDegil && (avesMuhendislik ||') &&
  app.includes("row.durum !== 'Olumsuz bulgu' || row.kaynak_turu === 'Ek Mühendislik'"));

test('tamamlanmış G checklist denetiminde Yazdır düğmesi var; form odaklı B/E/H1 için yanlış FR.38/39 çıktısı sunulmaz',
  app.includes('id="btnYazdir"') && app.includes("tamamlandi && !formOnly ? '<button class=\"delbtn\" id=\"btnYazdir\""));
test('10b: Yazdır çevrimdışı da çalışır — navigator.onLine engeli kalktı, tamamlanmış denetim şartı korundu',
  !formOutput.includes('yalnız çevrimiçiyken kullanılabilir') &&
  !/btnYazdir\.onclick = async \(\) => \{\s*\n\s*if \(!navigator\.onLine\)/.test(app) &&
  formOutput.includes("inspection.denetim_durumu!=='Çalışma Tamamlandı'") &&
  app.includes('Çevrimdışıyken de üretebilirsiniz'));
test('10b: form şablonları + manifest + yazı tipi çevrimdışı önbellekte (sw ASSETS + OFFLINE_CORE_ASSETS)',
  sw.includes("'./form-assets/UB_FR_38_R04.pdf'") && sw.includes("'./form-assets/UB_FR_39_R02.docx'") &&
  app.includes("'./form-assets/UB_FR_38_R04.docx', './form-assets/UB_FR_38_R04.pdf'") &&
  app.includes("'./form-assets/form-output-manifest.json', './form-assets/DejaVuSans.ttf'"));
test('Yazdır PDF ve Word seçenekleri sunuyor', app.includes('data-print="pdf"') && app.includes('data-print="docx"'));
test('form revizyonu yeni denetimde modül bilgisiyle kilitleniyor', app.includes('form_cikti_snapshot: await FormOutput.createSnapshot(f.anaStandart, f.modul)'));
test('takip denetimi ana kaydın kilitli form revizyonunu modül bilgisiyle koruyor', app.includes('form_cikti_snapshot: kaynak.form_cikti_snapshot || await FormOutput.createSnapshot(kaynak.ana_standart, kaynak.modul)'));
test('FR.39/A3 snapshotı ve çıktısı Modül G dışındaki denetimlere kapalı',
  formOutput.includes("standard === '81-1/2+A3' && !isModuleG(modul)") &&
  formOutput.includes("locked.some(item => item.key === 'UB_FR_39_R02' || item.standard === '81-1/2+A3')") &&
  formOutput.includes('if (!modulG && a3Selected) return []'));
test('yeni B/E/H1 denetimleri G’ye ait FR.38 snapshotını da almaz ve modülsüz eski G kayıtları korunur',
  formOutput.includes('function isExplicitNonG(inspectionOrModule)') &&
  formOutput.includes('if (isExplicitNonG(modul)) return { schema_version: 1') &&
  formOutput.includes('if (isExplicitNonG(inspection)) return []'));
test('form snapshot migration veri silmiyor ve RLS değiştirmiyor', rc39FormOutputMigration.includes('form_cikti_snapshot jsonb') && !/^\s*(delete|truncate|drop policy|create policy)\s+/mi.test(rc39FormOutputMigration));
test('mevcut denetimler form revizyonuna bir kez bağlanıyor', rc39FormOutputMigration.includes("where ana_standart='81-20' and form_cikti_snapshot='{}'::jsonb") && rc39FormOutputMigration.includes("where ana_standart='81-1/2+A3' and form_cikti_snapshot='{}'::jsonb"));
test('form snapshot backfill kimlik tetikleyicisini transaction içinde geri açıyor', rc39FormOutputMigration.includes('disable trigger trg_aves_denetim_kimligi') && rc39FormOutputMigration.includes('enable trigger trg_aves_denetim_kimligi') && rc39FormOutputMigration.indexOf('disable trigger trg_aves_denetim_kimligi') < rc39FormOutputMigration.indexOf('enable trigger trg_aves_denetim_kimligi'));
test('kilitli resmî form snapshotı istemciden değiştirilemiyor', rc39FormOutputMigration.includes('trg_aves_form_cikti_snapshot_kilidi') && rc39FormOutputMigration.includes('Denetimin resmî form revizyonu kilitlidir'));
test('resmî şablonlar SHA-256 ile doğrulanıyor', formOutput.includes('Resmî form şablonu bütünlük kontrolünden geçmedi') && formOutput.includes('crypto.subtle.digest'));
test('10c belge künyesi: her PDF/Word sonunda kaynak revizyon + kütüphane/bütünlük hash + üretim zamanı',
  formOutput.includes('function kunyeMetni(form, d, formatEtiketi)') &&
  formOutput.includes("'AVES resmî çıktı'") &&
  formOutput.includes('kütüphane ${String(d.kutuphane_content_hash).slice(0, 12)}') &&
  formOutput.includes('bütünlük ${String(d.butunluk_hash).slice(0, 12)}') &&
  formOutput.includes('üretim ${new Date().toISOString()}'));
test('10c künye PDF her sayfaya, Word body sonuna (sectPr öncesi) eklenir',
  formOutput.includes('pdfKunyeEkle(pages, font, form, d, ') &&
  formOutput.includes("page.drawText(metin, { x: 18, y: 6, size: 5,") &&
  formOutput.includes('docxKunyeEkle(xml, form, d, ') &&
  formOutput.includes('if (sectPr) body.insertBefore(p, sectPr)'));
test('10d migration 82: 2 nullable kolon, RLS politikası ve veri değişikliği yok',
  rc3953ArchiveStatusMigration.includes('add column if not exists arsive_aktarildi_at timestamptz') &&
  rc3953ArchiveStatusMigration.includes('add column if not exists arsive_aktaran_email text') &&
  !/^\s*(create policy|drop policy|update public\.|delete from|truncate)/mi.test(rc3953ArchiveStatusMigration));
test('rc3.9.68 migration 83 teknik dosya JSONB alanını nullable ekler; RLS, trigger ve mevcut veriyi değiştirmez',
  rc3968TechnicalDocsMigration.includes('add column if not exists teknik_dosya_kayitlari jsonb') &&
  rc3968TechnicalDocsMigration.includes("teknik_dosya_kayitlari is null or jsonb_typeof(teknik_dosya_kayitlari) = 'object'") &&
  !/^\s*(create policy|drop policy|create trigger|drop trigger|update public\.|delete from|truncate)/mi.test(rc3968TechnicalDocsMigration));
test('rc3.9.69 migration 84 birleşik form JSONB alanını nullable ekler; RLS, trigger ve veriyi değiştirmez',
  rc3969InspectionFormsMigration.includes('add column if not exists denetim_form_kayitlari jsonb') &&
  rc3969InspectionFormsMigration.includes("denetim_form_kayitlari is null or jsonb_typeof(denetim_form_kayitlari) = 'object'") &&
  rc3969InspectionFormsMigration.includes('add column if not exists teknik_dosya_kayitlari jsonb') &&
  !/^\s*(create policy|drop policy|create trigger|drop trigger|update public\.|delete from|truncate)/mi.test(rc3969InspectionFormsMigration));
test('rc3.9.72 migration 85 makes B type fields optional and DB-enforces A3 only for G without rewriting rows',
  rc3972ModuleRulesMigration.includes('begin;') && rc3972ModuleRulesMigration.includes('commit;') &&
  rc3972ModuleRulesMigration.includes('drop constraint if exists denetimler_modul_b_kimlik_check') &&
  rc3972ModuleRulesMigration.includes('denetimler_a3_only_module_g_check') &&
  rc3972ModuleRulesMigration.includes("kontrol_profili = 'modul_g_tam'") &&
  rc3972ModuleRulesMigration.includes("ana_standart <> '81-1/2+A3'") &&
  rc3972ModuleRulesMigration.includes('validate constraint denetimler_a3_only_module_g_check') &&
  !/^\s*(create policy|drop policy|create trigger|drop trigger|update public\.|delete from|truncate)/mi.test(rc3972ModuleRulesMigration));
test('rc3.9.78 migration 86 adds nullable firm address without rewriting data or changing RLS',
  rc3978FirmAddressMigration.includes('begin;') && rc3978FirmAddressMigration.includes('commit;') &&
  rc3978FirmAddressMigration.includes('add column if not exists firma_adresi text') &&
  rc3978FirmAddressScenario.includes('firma_adresi') && rc3978FirmAddressScenario.includes('denetim_adresi') &&
  ci.includes('Migration 86 uygula (firma adresi)') && ci.includes('tests/database/86_firma_adresi.sql') &&
  !/^\s*(create policy|drop policy|create trigger|drop trigger|update public\.|delete from|truncate)/mi.test(rc3978FirmAddressMigration));
test('migration 83-85 and live-rule behavioral SQL are part of the CI Postgres 17 job',
  ci.includes('Migration 83 uygula') && ci.includes('Migration 84 uygula') &&
  ci.includes('Migration 85 uygula') && ci.includes('tests/database/85_module_rules.sql') &&
  rc3972ModuleRulesScenario.includes("'Modül B', 'Modül B - AB Tip İncelemesi', 'modul_b_tip_inceleme', null, null") &&
  rc3972ModuleRulesScenario.includes("'Modül G', 'Modül G - Birim Doğrulaması', 'modul_g_tam'") &&
  rc3972ModuleRulesScenario.includes('Modül B, TS EN 81-1/2+A3 ile kaydedildi') &&
  rc3972ModuleRulesScenario.includes('Modül E, TS EN 81-1/2+A3 ile kaydedildi') &&
  rc3972ModuleRulesScenario.includes('Modül H1, TS EN 81-1/2+A3 ile kaydedildi'));
test('birleşik denetim formu scripti çevrimdışı paket ve HTML yükleme sırasına dahil',
  index.includes('<script src="teknik-dosya-formlari.js"></script>') &&
  index.includes('<script src="denetim-form-setleri.js"></script>') &&
  index.includes('<script src="form-draft-journal.js"></script>') &&
  index.indexOf('denetim-form-setleri.js') < index.indexOf('app.js') &&
  app.includes("'./denetim-form-setleri.js'") && sw.includes("'./denetim-form-setleri.js'") &&
  app.includes("'./form-draft-journal.js'") && sw.includes("'./form-draft-journal.js'") &&
  app.includes("'denetim_form_kayitlari'") && app.includes("'teknik_dosya_kayitlari'"));
test('10d migration 82: BEFORE UPDATE trigger arşiv alanlarını sunucu tarafında koruyor',
  rc3953ArchiveStatusMigration.includes('before update on public.denetimler') &&
  rc3953ArchiveStatusMigration.includes('trg_aves_arsiv_durumu_kilidi') &&
  rc3953ArchiveStatusMigration.includes('public.aves_tum_denetimleri_gorebilir_mi()') &&
  rc3953ArchiveStatusMigration.includes('yalnız yönetici veya teknik müdür') &&
  rc3953ArchiveStatusMigration.includes("new.denetim_durumu <> 'Çalışma Tamamlandı'") &&
  rc3953ArchiveStatusMigration.includes('new.arsive_aktarildi_at := now()') &&
  rc3953ArchiveStatusMigration.includes('new.arsive_aktaran_email := v_email') &&
  rc3953ArchiveStatusMigration.includes("current_user in ('postgres','service_role','supabase_admin')"));
test('10d RLS senaryosu: sahip/ilgisiz reddi + yönetici/teknik müdür başarısı + sunucu yazımı',
  archiveRlsScenario.includes('A sahip arşiv alanını değiştirebildi') &&
  archiveRlsScenario.includes('C ilgisiz muhendis arşiv alanını değiştirebildi') &&
  archiveRlsScenario.includes('B yönetici devam eden denetimi arşive aktarabildi') &&
  archiveRlsScenario.includes("'{\"role\":\"authenticated\",\"email\":\"t.mudur@test.local\"}'") &&
  archiveRlsScenario.includes('arsive_aktaran_email istemciden alındı, oturumdan değil') &&
  archiveRlsScenario.includes('işaret kaldırılınca alanlar NULL olmadı'));
test('10d RLS senaryosu CI zincirinde migration 82 sonrası çalışıyor',
  ci.includes('82_r15d_rc3953_arsiv_durumu.sql') && ci.includes('tests/rls/82_arsiv_durumu.sql'));
test('10d arşiv durum kolonları geçmiş alanları listesinde',
  app.includes("'arsive_aktarildi_at', 'arsive_aktaran_email',"));
test('10d tamamlanmış denetim özetinde arşiv durum kartı + işaret düğmesi yalnız yönetime',
  app.includes("d.arsive_aktarildi_at ? '✓ Kurumsal arşive aktarıldı' : 'Kurumsal arşive aktarılmadı'") &&
  app.includes('Profile.canSeeAllInspections ? `<button class="btn btn-ghost" id="arsivToggle"') &&
  app.includes("await localWrite('denetimler', guncel, 'denetimler')"));
test('10d liste kartında arşiv rozeti tamamlanmış + işaretli denetimde',
  app.includes("tamamlandi && d.arsive_aktarildi_at ? '<span class=\"pill ok\">📁 arşivde</span>' : ''"));
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

test('eski B/E/H1 profil tanımları tarihsel kayıt uyumluluğu için korunuyor',
  app.includes("MODUL_B: 'Modül B - AB Tip İncelemesi'") &&
  app.includes("MODUL_B: 'modul_b_tip_inceleme'") &&
  app.includes("SAHA_TEYIDI_E: 'saha_teyidi_e'") &&
  app.includes("SAHA_TEYIDI_H1: 'saha_teyidi_h1'"));
test('yeni denetim ekranı G checklistini korur; B/E/H1 için yalnız FR.65 saha kaydı açar', (() => {
  const start = app.indexOf('function showYeniForm()');
  const end = app.indexOf('function showOnayEkrani(f, tahmini)', start);
  const flow = app.slice(start, end);
  return flow.includes("${seg('sModul', ['G','B','E','H1'])}") &&
    flow.includes("if (single.module !== 'G')") &&
    flow.includes("akış: 'fr65_saha_v1'") &&
    flow.includes('modul: \'Modül G\'') &&
    flow.includes('const kontrolProfil = KONTROL_PROFILLERI.TAM') &&
    !flow.includes("seg('sDenetimTuru'") && !flow.includes('id="fAnaTip"') &&
    !flow.includes('id="fTipVaryantKodu"') &&
    flow.includes('data-v="81-1/2+A3"');
})());
test('Modül G kapısı B/E/H1 ve bilinmeyen profilleri reddeder; eski etiketsiz G kayıtlarını korur', (() => {
  const start = app.indexOf('function sahaUygulamaModuluGMi(d)');
  const end = app.indexOf('function denetimTuruOzeti(d)', start);
  const context = { KONTROL_PROFILLERI: { TAM: 'modul_g_tam' } };
  vm.runInNewContext(`${app.slice(start, end)}; globalThis.checkModule = sahaUygulamaModuluGMi;`, context);
  const check = context.checkModule;
  return check({ modul: 'Modül G', kontrol_profili: 'modul_g_tam' }) &&
    check({ denetim_turu: 'İlk Muayene' }) &&
    !check({ modul: 'Modül B', kontrol_profili: 'modul_b_tip_inceleme' }) &&
    !check({ denetim_turu: 'Modül E - Gözetim Saha Teyidi', kontrol_profili: 'saha_teyidi_e' }) &&
    !check({ modul: 'Modül G', denetim_turu: 'Modül B - AB Tip İncelemesi', kontrol_profili: 'modul_g_tam' }) &&
    !check({ modul: 'Modül H1' }) &&
    !check({ kontrol_profili: 'beklenmeyen_profil' }) && !check(null);
})());
test('B/E/H1 erişimi yalnız yeni FR.65 akış işareti bulunan doğru modül kaydında açılır', (() => {
  const start = app.indexOf('function fr65SahaKaydiMi(denetim)');
  const end = app.indexOf('function formOdakliDenetimMi(', start);
  const context = {
    DENETIM_TURLERI: {
      MODUL_B: 'Modül B - AB Tip İncelemesi',
      MODUL_E: 'Modül E - Gözetim Saha Teyidi',
      MODUL_H1: 'Modül H1 - Gözetim Saha Teyidi',
    },
    KONTROL_PROFILLERI: {
      MODUL_B: 'modul_b_tip_inceleme',
      SAHA_TEYIDI_E: 'saha_teyidi_e',
      SAHA_TEYIDI_H1: 'saha_teyidi_h1',
    },
    denetimFormModulu: record => ({
      modul_b_tip_inceleme: 'B', saha_teyidi_e: 'E', saha_teyidi_h1: 'H1', modul_g_tam: 'G',
    })[record?.kontrol_profili] || null,
  };
  vm.runInNewContext(`${app.slice(start, end)}; globalThis.checkCapture = fr65SahaKaydiMi;`, context);
  const check = context.checkCapture;
  const marked = (module, type, profile) => ({ modul: module, denetim_turu: type, kontrol_profili: profile, denetim_form_kayitlari: { saha_veri_akisi: 'fr65_saha_v1' } });
  return check(marked('Modül B','Modül B - AB Tip İncelemesi','modul_b_tip_inceleme')) &&
    check(marked('Modül E','Modül E - Gözetim Saha Teyidi','saha_teyidi_e')) &&
    check(marked('Modül H1','Modül H1 - Gözetim Saha Teyidi','saha_teyidi_h1')) &&
    !check({ kontrol_profili: 'modul_b_tip_inceleme', denetim_form_kayitlari: { forms: { FR65: {} } } }) &&
    !check(marked('Modül E','Modül B - AB Tip İncelemesi','saha_teyidi_e'));
})());
test('yeni FR.65 kaydı B/E/H1 profilini doğrular, G checklisti veya resmî çıktı snapshotı oluşturmaz', (() => {
  const start = app.indexOf('async function olusturFr65Kaydi(f)');
  const end = app.indexOf('function showYeniForm()', start);
  const flow = app.slice(start, end);
  return ['Modül B','Modül E','Modül H1'].every(module => flow.includes(`'${module}':`)) &&
    flow.includes('emptyFr65Capture(now)') && flow.includes("ana_standart: '81-20'") &&
    flow.includes('firma_adresi: f.firmaAdresi') && flow.includes('denetim_adresi: f.adres') &&
    flow.includes('beyan_yuku_kg: sayisalAlanlar.yuk') && flow.includes('beyan_hizi_ms: sayisalAlanlar.hiz') &&
    flow.includes('kapasite_kisi: sayisalAlanlar.kapasite') && flow.includes('durak_sayisi: sayisalAlanlar.durak') &&
    flow.includes('bina_asansor_sayisi: sayisalAlanlar.binaAsansorSayisi') &&
    flow.includes('A3 hiçbir B/E/H1 kaydına yazılmaz') &&
    flow.includes("await localWrite('denetimler', d, 'denetimler', { insert_only: true })") &&
    !flow.includes('saha_kontrol') && !flow.includes('FormOutput');
})());
test('yeni Modül G ve B/E/H1 formu firma adresi ile asansör adresini ayrı ve zorunlu alır', (() => {
  const start = app.indexOf('function showYeniForm()');
  const end = app.indexOf('function showOnayEkrani(f, tahmini)', start);
  const flow = app.slice(start, end);
  const followupStart = app.indexOf('async function takipDenetimiOlustur(kaynak)');
  const followupEnd = app.indexOf('function duzeltmeNedeniSec', followupStart);
  const followup = app.slice(followupStart, followupEnd);
  return flow.includes('id="fFirmaAdres"') && flow.includes('id="fAdres"') &&
    flow.includes('Firma adresi ve asansörün bulunduğu adres zorunlu') &&
    app.includes('firma_adresi: f.firmaAdresi') && app.includes('denetim_adresi: f.adres') &&
    followup.includes('firma_adresi: kaynak.firma_adresi || null') &&
    app.includes('takipKaynak.firma_adresi = window.prompt') && app.includes('takipKaynak.denetim_adresi = window.prompt');
})());
test('B/E/H1 FR.65 saha ekranında dosya değeri yok; sade bileşen kimliği ve sabit ölçü sekmeleri var', (() => {
  const start = app.indexOf('async function renderFr65SahaKaydi(');
  const end = app.indexOf('async function showDenetim(', start);
  const flow = app.slice(start, end);
  return flow.includes('data-fr65-jump=') && flow.includes('fr65-quick-nav') &&
    flow.includes('data-fr65-next=') && flow.includes('fr65-section-footer') && flow.includes('fr65-capture-note') &&
    flow.includes('target.scrollIntoView') && flow.includes('data-fr65-capture-prop="field_value"') &&
    flow.includes('data-fr65-capture-prop="marka"') && flow.includes('data-fr65-capture-prop="tip"') &&
    flow.includes('${thirdProp}') &&
    !flow.includes('data-fr65-capture-prop="file_value"') && !flow.includes('Teknik dosya') &&
    !flow.includes('dosyadaki beyan') && !flow.includes('Eşleşti') && !flow.includes('Fark var') &&
    index.includes('.fr65-quick-nav{position:sticky') && index.includes('.fr65-capture .tech-section>summary{position:static');
})());
test('FR.65 son açık bölümü denetim bazında saklar ve yeniden açıldığında aynı bölüme döner', (() => {
  const start = app.indexOf('async function renderFr65SahaKaydi(');
  const end = app.indexOf('async function showDenetim(', start);
  const flow = app.slice(start, end);
  return flow.includes('aves_fr65_active_section_v1_') &&
    flow.includes('localStorage.getItem(captureSectionStorageKey)') &&
    flow.includes('sectionExists(savedSectionKey)') &&
    flow.includes("section.key === activeSectionKey ? 'open' : ''") &&
    flow.includes("sectionElement.querySelector(':scope > summary')?.addEventListener('click'") &&
    flow.includes("sectionElement.addEventListener('toggle'") &&
    flow.includes('rememberCaptureSection(button.dataset.fr65Jump)') &&
    flow.includes('rememberCaptureSection(nextKey)') &&
    !flow.includes("app.querySelector('[data-fr65-section-id][open]')");
})());
test('FR.65 sayfadan ayrılıp dönünce son kaydırma konumunu cihazda saklar ve geri yükler', (() => {
  const start = app.indexOf('async function renderFr65SahaKaydi(');
  const end = app.indexOf('async function showDenetim(', start);
  const flow = app.slice(start, end);
  return flow.includes('aves_fr65_scroll_v1_') &&
    flow.includes('window.scrollY || window.pageYOffset') &&
    flow.includes('localStorage.setItem(captureScrollStorageKey') &&
    flow.includes('requestAnimationFrame(() => requestAnimationFrame(() =>') &&
    flow.includes('window.scrollTo(0, Math.min(savedScrollY, maxScrollY))') &&
    app.includes('UI.preserveFr65Position();') && app.includes("window.addEventListener('pagehide', flushOnHide)");
})());
test('FR.65 yeni kayıtta MR/MRL zorunlu ve sayısal veriler kesilmeden doğrulanır', (() => {
  const start = app.indexOf('function denetimSayisiOku(alan)');
  const end = app.indexOf('function showYeniForm()', start);
  const createStart = app.indexOf('async function olusturFr65Kaydi(f)');
  const createEnd = app.indexOf('function showYeniForm()', createStart);
  const createFlow = app.slice(createStart, createEnd);
  const context = { Number };
  vm.runInNewContext(`${app.slice(start, end)}; globalThis.readNumber = denetimSayisiOku; globalThis.validCapture = fr65SahaSayisalAlanlariGecerliMi; globalThis.validGeneral = genelDenetimSayisalAlanlariGecerliMi;`, context);
  const speed = context.readNumber({ value: '1.6', valueAsNumber: 1.6 });
  const capture = { yuk: 1000, kapasite: 8, hiz: speed, durak: 5, kat: 6, binaAsansorSayisi: 2, seyirMesafesi: 18.35, kuyuYuksekligi: null };
  const general = { yuk: 1000, hiz: speed, kapasite: 8, durak: 5, binaAsansorSayisi: 2 };
  const withoutStartMeasurements = { ...capture, seyirMesafesi: null, kuyuYuksekligi: null };
  const startForm = app.slice(app.indexOf('function showYeniForm()'), app.indexOf('function showOnayEkrani(f, tahmini)'));
  return speed === 1.6 && context.validCapture(capture) && context.validCapture(withoutStartMeasurements) && context.validGeneral(general) &&
    !context.validCapture({ ...capture, yuk: 1000.5 }) &&
    !context.validCapture({ ...capture, kat: 6.5 }) &&
    !context.validGeneral({ ...general, kapasite: 8.5 }) &&
    app.includes('Makine dairesi tipi *</label>') &&
    app.includes("if (!single.sCaptureMD) { toast('Makine dairesi tipini (MR/MRL) seçin'); return; }") &&
    !startForm.includes('id="fCaptureSeyir"') && !startForm.includes('id="fCaptureKuyu"') &&
    createFlow.includes("!['MR','MRL'].includes(f.md)") &&
    createFlow.includes('!fr65SahaSayisalAlanlariGecerliMi(sayisalAlanlar)');
})());
test('FR.65 alanları cihaz günlüğüne anında, IndexedDB/outbox’a debounce ve çıkışta flush ile yazılır', (() => {
  const start = app.indexOf('async function renderFr65SahaKaydi(');
  const end = app.indexOf('async function showDenetim(', start);
  const flow = app.slice(start, end);
  return flow.includes('AVES_FORM_DRAFT_JOURNAL.writeFr65Capture(localStorage') &&
    flow.includes('AVES_FORM_DRAFT_JOURNAL.readFr65Capture(localStorage, d.id, API.email, captureWriterId)') &&
    flow.includes('setTimeout(() =>') && flow.includes('650') &&
    flow.includes("await localWrite('denetimler', latest, 'denetimler', {") &&
    flow.includes("data-fr65-capture-prop=\"field_value\"") &&
    flow.includes("data-fr65-capture-prop=\"note\"") &&
    flow.includes("latest.bina_asansor_sayisi = sayisalAlan('bina_asansor_sayisi')") &&
    flow.includes('activeFr65Flush = flushCapture') &&
    flow.includes('uygunluk veya belgelendirme kararı üretilmez');
})());
test('FR.65 yerel taslağı aynı kayıt sürümünde kurtarılır; çakışma ezilmeden korunur ve yalnız açık onayla geri yüklenir', (() => {
  const start = app.indexOf('async function renderFr65SahaKaydi(');
  const end = app.indexOf('async function showDenetim(', start);
  const flow = app.slice(start, end);
  return flow.includes('inspectFr65Capture(originalValues, ownCaptureDraft, d.updated_at)') &&
    flow.includes("const captureDraftConflict = captureDraft.kind === 'conflict'") &&
    flow.includes('fr65TaslakYazari(d.id)') &&
    app.includes("navigator.locks.request(lockName, { ifAvailable: true }") &&
    app.includes('if (!writerLockClaimed) {') &&
    app.includes('Without an exclusive') &&
    flow.includes('ownCaptureDraft.writerId !== captureWriterId') &&
    flow.includes('freshDraft.writerId !== ownCaptureDraft?.writerId') &&
    flow.includes('Çakışan FR.65 taslağı korunuyor') &&
    flow.includes('Bu taslak başka bir sekme veya önceki uygulama oturumu tarafından yazılmış') &&
    flow.includes('Korunan cihaz taslağını geri yükle') &&
    flow.includes('if (!confirm(\'Bu cihazdaki FR.65 taslağı') &&
    flow.includes('String(latest.updated_at || \'\') !== String(d.updated_at || \'\')') &&
    flow.includes('clearFr65CaptureIfOwner(localStorage, d.id, API.email, freshDraft.ts, freshDraft.writerId || null)');
})());
test('FR.65 çevrimdışı güncellemeleri sunucuda updated_at karşılaştırmalı PATCH kullanır; çakışmada outbox korunur',
  app.includes("method: 'PATCH'") &&
  app.includes("id=eq.${encodeURIComponent(id)}&updated_at=eq.${encodeURIComponent(expectedUpdatedAt)}") &&
  app.includes("headers: { 'Prefer': 'return=representation' }") &&
  app.includes('rows.length !== 1') &&
  app.includes('const confirmApplied = async () =>') &&
  app.includes('await confirmApplied()') &&
  app.includes('sonucu doğrulanamadı ve cihazdaki veri korundu') &&
  app.includes('stableStringify(current[0][field] ?? null) === stableStringify(patch[field] ?? null)') &&
  app.includes("else if (item.conditional_update)") &&
  app.includes("condition.expected_updated_at") &&
  app.includes("item.sync_status = 'conflict'") &&
  app.includes("await DB.outboxPut(item)") &&
  app.includes("item.table !== 'denetimler'") &&
  app.includes("rows[0].denetim_form_kayitlari.saha_veri_akisi !== 'fr65_saha_v1'"));
test('FR.65 oluşturma tekrarları mevcut satırı ezmez; tüm güncellemeler beklenen kayıt sürümüne bağlıdır', (() => {
  const start = app.indexOf('async function renderFr65SahaKaydi(');
  const end = app.indexOf('async function showDenetim(', start);
  const flow = app.slice(start, end);
  const createStart = app.indexOf('async function olusturFr65Kaydi(f)');
  const createEnd = app.indexOf('function showYeniForm()', createStart);
  const createFlow = app.slice(createStart, createEnd);
  const correctionStart = app.indexOf('function duzeltmeNedeniSec(d)');
  const correctionEnd = app.indexOf('async function takipDenetimiOlustur', correctionStart);
  const correctionFlow = app.slice(correctionStart, correctionEnd);
  return flow.includes('expected_updated_at: baseUpdatedAt') &&
    flow.includes("expected_updated_at: expectedUpdatedAt") &&
    flow.includes("fields: ['denetim_form_kayitlari', 'teknik_dosya_kayitlari', 'updated_at']") &&
    flow.includes("fields: ['denetim_durumu', 'calisma_tamamlandi_at', 'updated_at']") &&
    correctionFlow.includes('const fr65Capture = fr65SahaKaydiMi(d)') &&
    correctionFlow.includes('expected_updated_at: expectedUpdatedAt') &&
    createFlow.includes('insert_only: true') &&
    app.includes("else if (item.insert_only)") &&
    app.includes('async function insertIgnoreDuplicates(table, rows)') &&
    app.includes('if (options.conditional_update) outboxItem.conditional_update = options.conditional_update');
})());
test('FR.65 hızlı ardışık yazımda tamamlanan eski snapshot baselineı ilerletir, yeni taslağı temizlemeden sürümünü yeniler', (() => {
  const start = app.indexOf('async function renderFr65SahaKaydi(');
  const end = app.indexOf('async function showDenetim(', start);
  const flow = app.slice(start, end);
  const baseline = flow.indexOf('baseUpdatedAt = latest.updated_at;');
  const versionCheck = flow.indexOf('if (version === editVersion)', baseline);
  return baseline >= 0 && versionCheck > baseline &&
    flow.includes('baseFr65 = stableStringify(next.forms.FR65);') &&
    flow.includes('Object.assign(originalValues, values);') &&
    /rebaseFr65Capture\(\s*localStorage, d\.id, API\.email, committedBaseUpdatedAt, baseUpdatedAt, captureWriterId\)/.test(flow) &&
    flow.includes('clearFr65CaptureIfOwner(localStorage, d.id, API.email, draftTs, captureWriterId)');
})());
test('eski B/E/H1 kayıtları kilitli; yalnız yeni işaretli FR.65 kaydı açılır, takip G ile sınırlı',
  app.includes("function fr65SahaKaydiMi(denetim)") &&
  app.includes("kayit.saha_veri_akisi === 'fr65_saha_v1'") &&
  app.includes('const supported = modulG || fr65Capture') &&
  app.includes('card.disabled = !supported') &&
  app.includes('Eski kayıt korundu; bu uygulamada açılmaz') &&
  app.includes('if (!sahaUygulamaModuluGMi(denetim))') &&
  app.includes('return sahaUygulamaModuluGMi(d) && kontrolProfili(d) === KONTROL_PROFILLERI.TAM') &&
  app.includes('if (!sahaUygulamaModuluGMi(kaynak))'));
test('Denetim Formu girişi kaldırıldı; tarihsel form verisi saklanır, G checklisti ve resmî çıktısı kalır',
  app.includes('function denetimFormIstatistikleri(denetim)') &&
  app.includes('// Form verileri tarihsel olarak saklanır; bu uygulamada yeni form girişi yoktur.') &&
  app.includes('function formOdakliDenetimMi(denetim, rows = [])') &&
  app.includes('// Form seti girişi ayrı Form Doldurucu uygulamasına taşındı.') &&
  app.includes('Denetim Formu özelliği bu uygulamadan kaldırıldı') &&
  app.includes('denetim_form_kayitlari: null') && app.includes('sahaRows = lib') &&
  app.includes('id="btnYazdir"'));
test('Modül G takip akışı kalır; Modül B takip verisi tarihsel migration ile korunur',
  app.includes('return sahaUygulamaModuluGMi(d) && kontrolProfili(d) === KONTROL_PROFILLERI.TAM') &&
  !app.includes('const modulBTakip =') &&
  rc398ModulBMigration.includes("kontrol_profili in ('modul_g_tam','modul_b_tip_inceleme')") &&
  rc399ModulBTakipMigration.includes("onceki.kontrol_profili,'') = 'modul_b_tip_inceleme'"));
test('Modül B ana tip / tip varyant alanları üretim ekranından kaldırıldı; tarihsel DB alanları korunuyor',
  !app.includes('id="fAnaTip"') && !app.includes('id="fTipVaryantKodu"') &&
  rc398ModulBMigration.includes('add column if not exists ana_tip') &&
  rc398ModulBMigration.includes('add column if not exists tip_varyant_kodu'));
test('TS EN 81-1/2+A3 yeni denetim akışında yalnız Modül G ile mümkündür', (() => {
  const start = app.indexOf('function showYeniForm()');
  const end = app.indexOf('function showOnayEkrani(f, tahmini)', start);
  const flow = app.slice(start, end);
  return flow.includes('data-v="81-1/2+A3"') &&
    flow.includes('const kontrolProfil = KONTROL_PROFILLERI.TAM') &&
    flow.includes("single.module !== 'G'") &&
    app.includes("ana_standart: '81-20'") &&
    app.includes("A3 hiçbir B/E/H1 kaydına yazılmaz") &&
    app.includes("f.modul !== 'Modül G' || f.kontrolProfili !== KONTROL_PROFILLERI.TAM");
})());
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
  app.includes('Number.isInteger(f.durak) && f.durak > 0'));
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
