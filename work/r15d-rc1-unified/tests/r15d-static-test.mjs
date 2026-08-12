import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(testDir, '..');
const appDir = path.join(root, 'app');
const dataDir = path.join(root, 'data');
const databaseDir = path.join(root, 'database');

const app = fs.readFileSync(path.join(appDir, 'app.js'), 'utf8');
const sw = fs.readFileSync(path.join(appDir, 'sw.js'), 'utf8');
const index = fs.readFileSync(path.join(appDir, 'index.html'), 'utf8');
const headers = fs.readFileSync(path.join(appDir, '_headers'), 'utf8');
const updateHtml = fs.readFileSync(path.join(appDir, 'update.html'), 'utf8');
const updateJs = fs.readFileSync(path.join(appDir, 'update.js'), 'utf8');
const migration = fs.readFileSync(path.join(databaseDir, '21_r15d_guvenli_gecis.sql'), 'utf8');
const rc2Migration = fs.readFileSync(path.join(databaseDir, '22_r15d_rc2_saha_akisi_ve_kuyu_dibi.sql'), 'utf8');
const rc3NullableMigration = fs.readFileSync(path.join(databaseDir, '23_r15d_rc3_saha_kontrol_nullable_kaynak_alanlari.sql'), 'utf8');
const rc3PolicyMigration = fs.readFileSync(path.join(databaseDir, '24_r15d_rc3_rls_policy_isim_temizligi.sql'), 'utf8');
const rc3GerekceMigration = fs.readFileSync(path.join(databaseDir, '25_r15d_rc3_otomatik_gerekce_sutunu.sql'), 'utf8');
const rc32Migration = fs.readFileSync(path.join(databaseDir, '28_r15d_rc32_snapshot_inceleme_yetki.sql'), 'utf8');
const library = JSON.parse(fs.readFileSync(path.join(dataDir, 'madde_kutuphanesi.json'), 'utf8'));
const byId = new Map(library.map(row => [row.madde_id, row]));

const checks = [];
const test = (name, condition) => checks.push({ name, ok: !!condition });

test('index R15D-rc3.2', index.includes('R15D-rc3.2'));
test('app R15D-rc3.2', app.includes("const APP_VERSION = 'R15D-rc3.2'"));
test('service worker R15D-rc3.2 cache', sw.includes("aves-saha-r15d-rc3-2"));
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
test('fotoğraf kontrolünden sonra akış devam ediyor', app.includes('Kaydet ve devam et'));
test('geçici iç işaret kullanıcı arayüzünden kaldırıldı', !app.includes('Geçici iç işaret') && !app.includes('data-review-reason'));
test('ilerlemek için üçlü nihai sonuç gerekli', app.includes('const canAdvanceFromItem = (r) => isComplete(r)'));
test('gözden geçirme alanları migration içinde', migration.includes('gozden_gecirme_nedeni text') && migration.includes('gozden_gecirme_notu text'));
test('geçici işaret kapanış listesinden kaldırıldı', !app.includes('GÖZDEN GEÇİRMEYE BIRAKILDI'));
test('salt okunur inceleme modu', app.includes('İnceleme Modu') && app.includes('inspectionReadOnly'));
test('kompakt tüm maddeler inceleme listesi', app.includes('Tüm maddeler (${rows.length})') && app.includes('compactRows'));
test('inceleme modunda madde araması', app.includes('compact-search') && app.includes('haystack.includes(query)'));
test('kompakt liste durum ve not/ölçüm filtreleri', app.includes('data-compact-filter="note"') && app.includes('data-compact-filter="measurement"'));
test('Sahaya Hazırla bütünlük kontrolü', app.includes('async function sahayaHazirla') && app.includes('Madde kimlikleri eksiksiz ve benzersiz'));
test('Sahaya Hazırla item-set hash kaydı', app.includes('expected_item_set_hash = itemSetHash'));
test('Sahaya Hazırla kütüphane manifestini doğruluyor', app.includes('manifest.count === library.length'));
test('Sahaya Hazırla yerel yazma testi yapıyor', app.includes('offline_probe_'));
test('Sahaya Hazırla uygulama kabuğunu cache içinde doğruluyor', app.includes('OFFLINE_CORE_ASSETS') && app.includes('caches.match'));
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

test('IndexedDB v3 ve geçmiş deposu', app.includes('const DB_VERSION = 3') && app.includes("createObjectStore('gecmis'"));
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
test('senkron sonrası denetim içi durum yeniden hesaplanıyor', app.includes("if (typeof UI !== 'undefined' && UI.refresh) UI.refresh()") && app.includes("currentView === 'inspection' && currentDenetimId"));
test('eşzamanlı push tamamlandı sayılmıyor', app.includes('if (pushRunning) return false'));
test('yeniden deneme artan bekleme kullanıyor', app.includes('const backoff = Math.min(60000'));
test('senkron sonrası yalnız açık denetim listesi yenileniyor', app.includes("else if (currentView === 'list') showList()"));
test('arka plan senkronu yeni denetim formunu kapatmıyor', app.includes("currentView = 'new-inspection'") && app.includes("else if (currentView === 'list') showList()"));
test('müşteri ünvanı alanı erişilebilir ve normal input', app.includes('label for="fMusteri"') && app.includes('id="fMusteri" autocomplete="organization"'));

const installBlock = sw.slice(sw.indexOf("self.addEventListener('install'"), sw.indexOf("self.addEventListener('message'"));
test('yeni worker kurulumda hemen etkinleşmiyor, kullanıcı onayını bekliyor', !installBlock.includes('self.skipWaiting'));
test('service worker kontrollü güncelleme mesajı', sw.includes("type === 'SKIP_WAITING'"));
test('yeni sürüm kullanıcı onayıyla etkinleşiyor', app.includes('registerServiceWorkerWithUpdateChoice') && app.includes('Şimdi güncelle') && app.includes("worker.postMessage({ type: 'SKIP_WAITING' })"));
test('service worker değişimi yalnız kullanıcı isterse sayfayı yeniliyor', app.includes('if (reloadRequested) location.reload()'));
test('service worker HTTP önbelleğini kullanmadan doğrulanıyor', app.includes("updateViaCache: 'none'") && app.includes('registration.update()'));
test('ana belge ağ öncelikli ve çevrimdışı geri dönüşlü', sw.includes("e.request.mode === 'navigate'") && sw.includes("caches.match('./index.html')"));
test('ana belge ve service worker no-cache yayınlanıyor', headers.includes('/sw.js') && headers.includes('/index.html') && headers.includes('no-store, no-cache, must-revalidate'));
test('yerel veritabanı hatası boş ekran bırakmıyor', app.includes('Uygulama yerel veritabanını açamadı'));
test('güvenli cache kurtarma sayfası pakette', updateHtml.includes('AVES Saha güvenli güncelleme') && sw.includes("'./update.html', './update.js'"));
test('kurtarma yeni sürümü silmeden önce doğruluyor', updateJs.includes("EXPECTED_BUILD = 'R15D-rc3.2'") && updateJs.indexOf('indexText.includes') < updateJs.indexOf('registration.unregister'));
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

test('kütüphane toplamı 1018', library.length === 1018);
test('MAD-0561 başlığı Testler', byId.get('MAD-0561')?.kontrol_basligi === 'Testler');
const hydraulicIds = library
  .filter(row => row.madde_id >= 'MAD-0562' && row.madde_id <= 'MAD-0613' && row.madde_id !== 'MAD-0611')
  .map(row => row.madde_id);
test('51 hidrolik başlık hedefi var', hydraulicIds.length === 51);
test('hidrolik başlıkların tamamı düzeltildi', hydraulicIds.every(id => byId.get(id)?.kontrol_basligi === 'Hidrolik Kontrol ve Testleri'));
test('MAD-0611 özgül başlığını koruyor', byId.get('MAD-0611')?.kontrol_basligi === 'Hidrolik devre kapama vanası');
test('dört MR koşulu düzeltildi', ['MAD-0460','MAD-0467','MAD-0486','MAD-0492'].every(id => byId.get(id)?.md_kosulu === 'MR'));
test('MAD-0824 temel veri paketinde önceki kararla pasif', byId.get('MAD-0824')?.aktif === false);
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
test('itfaiyeci asansoru arayuzu formda var', app.includes('İtfaiyeci Asansörü') && app.includes('sItfaiyeci'));
test('ekStandartlar artik sabit bos dizi degil', !/ekStandartlar:\s*\[\],/.test(app));
test('itfaiyeci evet secilince 81-72 ek_standartlar\'a giriyor', /sItfaiyeci\s*===\s*'evet'\s*\?\s*\['81-72'\]/.test(app));

// rc3.2: tarihsel snapshot, kimlik görünürlüğü ve kesin rol ayrımı
test('denetim başlangıcında seçili içerik hashleniyor', app.includes('snapshot_madde_hash = await sha256Hex') && app.includes('snapshot_content_hash'));
test('kapanış bütünlük özeti ve hash üretiyor', app.includes('async function butunlukOzetiHesapla') && app.includes('d.butunluk_hash = integrity.hash'));
test('değişiklik geçmişi cihazda ve sunucuda tutuluyor', app.includes("'denetim_degisim_gecmisi'") && rc32Migration.includes('create table if not exists public.denetim_degisim_gecmisi'));
test('geçmiş kimliği oturum profilinden zorlanıyor', rc32Migration.includes('aves_gecmis_kimligini_dogrula') && rc32Migration.includes('new.degistiren_email := v_email'));
test('teknik müdür istemcide yönetim yetkilisi değil', app.includes("get canManage() { return !!current && current.rol === 'yonetici'; }"));
test('teknik müdür yeni denetim oluşturamıyor', app.includes("current.rol !== 'teknik_mudur'") && app.includes('Profile.canCreate'));
test('teknik müdür veritabanında yalnız silme rolünde', rc32Migration.includes("kp.rol in ('yonetici','teknik_mudur')") && rc32Migration.includes("kp.rol = 'muhendis'"));
test('denetim silme kimliği sunucu tetikleyicisinden yazılıyor', rc32Migration.includes('aves_denetim_silme_gecmisi') && rc32Migration.includes("before delete on public.denetimler"));
test('snapshot alanları veritabanı tetikleyicisiyle kilitli', rc32Migration.includes('aves_snapshot_degisimini_engelle') && rc32Migration.includes('Denetim madde snapshot içeriği kilitlidir'));
test('geçmiş satırları güncellenemiyor ve silinemiyor', rc32Migration.includes('grant select, insert on public.denetim_degisim_gecmisi'));

const failed = checks.filter(check => !check.ok);
for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'}  ${check.name}`);
console.log(`\n${checks.length - failed.length}/${checks.length} kontrol geçti.`);
if (failed.length) process.exit(1);
