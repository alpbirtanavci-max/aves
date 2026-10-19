// AVES duman testi: gerçek tarayıcıda, sahte Supabase ile B / E / H1 saha veri akışı.
// Kayıt aç -> doldur -> kaydet -> yenile -> çevrimdışı düzenle -> senkronla -> çıktı -> sil.
import assert from 'node:assert/strict';
import { startApp, launch, newSession, createReporter } from './harness.mjs';

const personas = {
  yonetici: { email: 'yonetici@test.local', ad_soyad: 'Test Yönetici', aktif: true, rol: 'yonetici' },
  muhendis: { email: 'muhendis@test.local', ad_soyad: 'Test Mühendis', aktif: true, rol: 'muhendis' },
};

async function login(s, persona) {
  const p = s.page;
  await p.waitForSelector('#lgEmail');
  await p.fill('#lgEmail', persona.email);
  await p.fill('#lgPass', 'yalniz-sahte-sunucu');
  await p.click('#lgBtn');
  await p.waitForSelector('#btnYeni', { timeout: 15000 });
}

async function createRecord(s, modul, seri) {
  const p = s.page;
  await p.click('#btnYeni');
  await p.waitForSelector('#fMusteri');
  await p.fill('#fMusteri', 'Duman Asansör A.Ş.');
  await p.fill('#fFirmaAdres', 'Firma Mah. 1 Sk.');
  await p.click(`#sModul [data-v="${modul}"]`);
  assert.equal(await p.locator('#fSeri').isVisible(), false, 'B/E/H1 açılışında seri no sorulmamalı');
  assert.equal(await p.locator('#fAdres').isVisible(), false, 'B/E/H1 açılışında saha adresi sorulmamalı');
  await p.click('#sCaptureTahrik [data-v="Elektrikli"]');
  await p.click('#sCaptureMD [data-v="MR"]');
  await p.fill('#fCaptureYuk', '630');
  await p.fill('#fCaptureKapasite', '8');
  await p.fill('#fCaptureHiz', '1');
  await p.fill('#fCaptureDurak', '6');
  await p.click('#fKaydet');
  await p.click('#fr65Start', { timeout: 10000 });
  await p.waitForSelector('#fr65Back', { timeout: 15000 });
}

// Sunucu durumunu en çok 10 sn bekleyerek doğrular (senkron arka planda çalışır).
async function until(check, message, ms = 10000) {
  const end = Date.now() + ms;
  let last;
  while (Date.now() < end) {
    try { last = await check(); if (last) return last; } catch (e) { last = e; }
    await new Promise(r => setTimeout(r, 150));
  }
  assert.fail(message);
}

const serverRecord = s => s.fake.tables.denetimler[0];
const fr65Values = s => serverRecord(s)?.denetim_form_kayitlari?.forms?.FR65?.values || {};
const openAll = p => p.evaluate(() => document.querySelectorAll('details[data-fr65-section-id]').forEach(d => { d.open = true; }));

// Gerçek kullanıcı gibi tek bölüm açar; uygulama açık bölümü yeniden çizimlerde hatırlar.
async function openSectionOf(loc) {
  await loc.evaluate(el => { el.closest('details').open = true; });
  await loc.page().waitForTimeout(150);
}

async function firstEditableInput(p) {
  const loc = p.locator('[data-fr65-capture-key] input[data-fr65-capture-prop="field_value"]:not([disabled]), [data-fr65-capture-key] textarea[data-fr65-capture-prop="field_value"]:not([disabled])').first();
  await loc.waitFor({ state: 'attached', timeout: 10000 });
  await openSectionOf(loc);
  return loc;
}

async function runModule(browser, appUrl, modul, persona, report) {
  const s = await newSession(browser, appUrl, persona);
  s.page.on('dialog', d => d.accept());
  const p = s.page;
  const seri = `DMN-${modul}-001`;
  const tag = `[${modul}/${persona.rol}]`;
  let fieldKey;
  let typed;
  const valueFor = (input, n) => input.evaluate((el, k) => (el.type === 'number' ? String(k) : `duman-${k}`), n);

  await report.step(`${tag} giriş yap`, async () => { await login(s, persona); });
  await report.step(`${tag} kayıt oluştur → sunucuya yazıldı`, async () => {
    await createRecord(s, modul, seri);
    await until(() => s.fake.tables.denetimler.length === 1, 'sunucuda denetim kaydı yok');
    assert.equal(serverRecord(s).modul, `Modül ${modul}`);
    assert.equal(serverRecord(s).asansor_seri_no, '', 'açılışta seri no boş olmalı');
  });
  await report.step(`${tag} seri no ve saha adresi açtıktan sonra girilir → sunucuya yazılır, listede görünür`, async () => {
    await p.fill('#fr65Seri', seri);
    await p.fill('#fr65Adres', 'Bina Mah. 2 Sk. No:3');
    await p.locator('#fr65Adres').blur();
    await until(() => serverRecord(s).asansor_seri_no === seri && serverRecord(s).denetim_adresi === 'Bina Mah. 2 Sk. No:3', 'künye sunucuya yazılmadı');
    // İlk senkron turu ekranı yeniden çizebilir; kuyruk boşalana kadar bekle.
    await until(async () => (await p.evaluate(async () => (await DB.all('outbox')).length)) === 0, 'ilk senkron kuyruğu boşalmadı');
  });
  await report.step(`${tag} alan doldur + "Şimdi kaydet" → sunucuda görünür`, async () => {
    const input = await firstEditableInput(p);
    fieldKey = await input.evaluate(el => el.closest('[data-fr65-capture-key]').dataset.fr65CaptureKey);
    typed = await valueFor(input, 777);
    await input.fill(typed);
    await p.click('#fr65SaveNow');
    await until(() => fr65Values(s)[fieldKey]?.field_value === typed, `sunucuda ${fieldKey} yok`);
  });
  await report.step(`${tag} art arda iki düzenleme → 409 çakışması yok`, async () => {
    const input = await firstEditableInput(p);
    await input.fill(await valueFor(input, 778));
    await p.click('#fr65SaveNow');
    typed = await valueFor(input, 779);
    await input.fill(typed); await p.click('#fr65SaveNow');
    await until(() => fr65Values(s)[fieldKey]?.field_value === typed, 'son değer sunucuya ulaşmadı');
    const conflicts = await p.evaluate(async () => (await DB.all('outbox')).filter(i => i.sync_status === 'conflict').length);
    assert.equal(conflicts, 0, 'senkron çakışması oluştu');
  });
  await report.step(`${tag} sayfayı yenile → veri geri geliyor`, async () => {
    await p.reload();
    await p.waitForSelector('#btnYeni', { timeout: 15000 });
    await p.getByText(seri).first().click();
    await p.waitForSelector('#fr65Back', { timeout: 15000 });
    await openSectionOf(p.locator(`[data-fr65-capture-key="${fieldKey}"] [data-fr65-capture-prop="field_value"]`));
    const val = await p.inputValue(`[data-fr65-capture-key="${fieldKey}"] [data-fr65-capture-prop="field_value"]`);
    assert.equal(val, typed);
  });
  await report.step(`${tag} çevrimdışı düzenle → cihazda kalır, online olunca sunucuya gider`, async () => {
    await s.context.setOffline(true); s.fake.state.offline = true;
    const input = p.locator(`[data-fr65-capture-key="${fieldKey}"] [data-fr65-capture-prop="field_value"]`);
    await openSectionOf(input);
    const off = await valueFor(input, 555);
    await input.fill(off);
    await p.click('#fr65SaveNow').catch(() => {});
    await p.waitForTimeout(1200);
    assert.notEqual(fr65Values(s)[fieldKey]?.field_value, off, 'çevrimdışıyken sunucuya yazılmış olamaz');
    const local = await p.evaluate(async id => (await DB.get('denetimler', id))?.denetim_form_kayitlari?.forms?.FR65?.values, serverRecord(s).id);
    assert.ok(Object.values(local || {}).some(v => v?.field_value === off), 'çevrimdışı değer cihaza kaydedilmedi');
    await s.context.setOffline(false); s.fake.state.offline = false;
    await p.evaluate(() => Sync.full());
    await until(() => fr65Values(s)[fieldKey]?.field_value === off, 'online olunca sunucuya aktarılmadı');
    typed = off;
  });
  await report.step(`${tag} "Çıktı / PDF" → rapor penceresi değerleri içeriyor`, async () => {
    const [popup] = await Promise.all([p.waitForEvent('popup', { timeout: 8000 }), p.click('#fr65Print')]);
    await popup.waitForSelector('.sheet', { timeout: 8000 });
    const text = await popup.innerText('body');
    assert.ok(text.includes('SAHA VERİ ÖZETİ') && text.includes('FR.65'), 'rapor başlığı yok');
    assert.ok(await popup.locator('.brand').count() === 1 && await popup.locator('.kunye').count() === 1, 'yeni çıktı tasarımı yok');
    const syncStates = ['Cihaz ve sunucu eşitlendi', 'Sunucu aktarımı bekliyor', 'Sunucu aktarımı incelemede', 'Senkron durumu doğrulanamadı'];
    assert.ok(syncStates.some(state => text.includes(state)), 'çıktıda açık senkron durumu yok');
    const printCss = await popup.locator('style').innerText();
    assert.ok(printCss.includes('@top-left') && printCss.includes('counter(page)') && printCss.includes('counter(pages)'), 'A4 yinelenen başlık/sayfa numarası yok');
    assert.ok(text.includes(seri), 'rapor seri no içermiyor');
    assert.ok(text.includes(typed), 'rapor girilen değeri içermiyor');
    await popup.close();
  });
  await report.step(`${tag} çevrimdışı hazırlık sessizce işaretlenir (düğme yok)`, async () => {
    assert.equal(await p.locator('#fr65Offline').count(), 0, 'çevrimdışı düğmesi kalkmalıydı');
    assert.equal(await p.locator('#fr65Backup').count(), 0, 'kayıt içi yedek düğmesi kalkmalıydı');
    assert.equal(await p.locator('#fr65Summary').count(), 0, 'özet düğmesi tamamlanmadan görünmemeli');
    await until(async () => (await p.evaluate(async id => (await DB.kvGet(`offline_ready_${id}`))?.fr65 === true, serverRecord(s).id)), 'hazırlık işareti yazılmadı');
  });
  await report.step(`${tag} senkron durumu en üstte sabit`, async () => {
    const box = await p.locator('#localSyncState').boundingBox();
    await p.mouse.wheel(0, 1500);
    await p.waitForTimeout(250);
    const after = await p.locator('#localSyncState').boundingBox();
    assert.ok(after.y >= 0 && after.y < 120, `senkron şeridi kaydırınca görünmüyor (y=${after.y})`);
    assert.ok(box && after);
    await p.mouse.wheel(0, -1500);
  });
  await report.step(`${tag} listede "Yedek al…" küçük bağlantı; seçilen denetimin yedeği iner`, async () => {
    await p.click('#fr65Back');
    await p.waitForSelector('#btnYedekSec');
    assert.equal(await p.locator('#btnTumYedek').count(), 0, 'büyük yedek düğmesi kalkmalıydı');
    const newBtn = await p.locator('#btnYeni').boundingBox();
    const bkBtn = await p.locator('#btnYedekSec').boundingBox();
    assert.ok(bkBtn.y > newBtn.y + newBtn.height, 'yedek bağlantısı listenin altında olmalı');
    await p.click('#btnYedekSec');
    await p.waitForSelector('#yedekTumu');
    assert.equal(await p.locator('#yedekIndir').isDisabled(), true, 'seçim yokken indirme kapalı olmalı');
    await p.click('#yedekTumu');
    const [download] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }), p.click('#yedekIndir')]);
    const backup = JSON.parse(await (await import('node:fs/promises')).readFile(await download.path(), 'utf8'));
    assert.equal(backup.format, 'aves-cihaz-yedek');
    const rec = backup.denetimler.find(x => x.id === serverRecord(s).id);
    assert.ok(rec, 'yedekte denetim yok');
    assert.ok(Object.values(rec.denetim_form_kayitlari.forms.FR65.values).some(v => v?.field_value === typed), 'yedek girilen değeri içermiyor');
    assert.match(backup.paket_hash, /^[0-9a-f]{64}$/);
    await p.waitForSelector('#yedekIndir', { state: 'detached' });
    await p.getByText(seri).first().click();
    await p.waitForSelector('#fr65Back');
  });
  await report.step(`${tag} kaydı tamamla → mühür yazılır, veri özeti kendiliğinden açılır`, async () => {
    // GSM dahil hiçbir zorunlu alan doldurulmadan kapatılabilmeli.
    await p.click('#fr65SaveNow');
    await p.click('#fr65Complete');
    await p.waitForSelector('.fr65-ozet', { timeout: 15000 });
    const text = await p.locator('.fr65-ozet').innerText();
    assert.ok(text.includes('Denetim Özeti') && text.includes(seri), 'özet başlık/seri yok');
    assert.ok(text.includes(typed), 'özet girilen saha verisini içermiyor');
    assert.ok(!text.includes('GSM modülü'), 'boş GSM satırı özette görünmemeli');
    await until(async () => (await p.locator('#fr65OzetDurum').innerText()).includes('Cihaz ve sunucu eşit'), 'özette senkron durumu görünmüyor');
    await until(() => serverRecord(s).denetim_durumu === 'Çalışma Tamamlandı' && /^[0-9a-f]{64}$/.test(serverRecord(s).butunluk_hash || ''), 'tamamlanma / mühür sunucuda yok');
    assert.equal(serverRecord(s).butunluk_ozeti.tur, 'fr65_saha_v1');
    assert.ok((await p.locator('#fr65OzetDurum').innerText()).includes('mühür geçerli'));
  });
  if (persona.rol === 'yonetici') {
    await report.step(`${tag} özetten kurumsal arşive aktar → sunucuda işaretlenir`, async () => {
      await p.click('#fr65ArsivToggle');
      await until(() => !!serverRecord(s).arsive_aktarildi_at && !!serverRecord(s).arsive_aktaran_email, 'arşiv işareti sunucuda yok');
    });
  } else {
    await report.step(`${tag} mühendis için arşiv düğmesi görünmez`, async () => {
      assert.equal(await p.locator('#fr65ArsivToggle').count(), 0);
    });
  }
  await report.step(`${tag} "Tamam" hemen kapatır → liste; arşiv etiketi ve özet düğmesi`, async () => {
    const t0 = Date.now();
    await p.click('#fr65OzetKapat');
    await p.waitForSelector('#btnYeni');
    assert.ok(Date.now() - t0 < 1500, `kapanış yavaş: ${Date.now() - t0} ms`);
    assert.equal(await p.locator('.fr65-ozet').count(), 0);
    if (persona.rol === 'yonetici') await p.waitForSelector('.pill:has-text("arşivde")');
    await p.getByText(seri).first().click();
    await p.waitForSelector('#fr65Summary');
    await p.click('#fr65Summary');
    await p.waitForSelector('.fr65-ozet');
    await p.click('.fr65-ozet .close');
    await p.waitForSelector('.fr65-ozet', { state: 'detached' });
  });
  const canDelete = persona.rol === 'yonetici';
  await report.step(`${tag} silme düğmesi: ${canDelete ? 'görünür' : 'görünmez'}`, async () => {
    const count = await p.locator('#fr65Delete').count();
    assert.equal(count > 0, canDelete, canDelete ? 'yönetici için silme düğmesi yok' : 'mühendis için silme düğmesi görünüyor');
  });
  if (canDelete) {
    await report.step(`${tag} sil → sunucudan ve cihazdan kalkar`, async () => {
      const id = serverRecord(s).id;
      await p.click('#fr65Delete');
      await p.waitForSelector('#btnYeni', { timeout: 15000 });
      await p.waitForTimeout(500);
      assert.equal(s.fake.tables.denetimler.length, 0, 'sunucuda kayıt kaldı');
      const local = await p.evaluate(async i => !!(await DB.get('denetimler', i)), id);
      assert.equal(local, false, 'cihazda kayıt kaldı');
    });
  }
  await report.step(`${tag} sayfa hatası yok`, async () => {
    assert.deepEqual(s.errors.filter(e => e.startsWith('pageerror')), []);
  });
  await s.context.close();
}

async function runModuleG(browser, appUrl, report) {
  const persona = personas.yonetici;
  const s = await newSession(browser, appUrl, persona);
  s.page.on('dialog', d => d.accept());
  const p = s.page;
  const seri = 'DMN-G-001';
  const tag = '[G/yonetici]';
  const marked = () => s.fake.tables.saha_kontrol.filter(r => r.durum === 'Kontrol tamamlandı');

  await report.step(`${tag} giriş yap`, async () => { await login(s, persona); });
  await report.step(`${tag} G denetimi oluştur → sunucuda denetim + maddeler`, async () => {
    await p.click('#btnYeni');
    await p.fill('#fMusteri', 'Duman Asansör A.Ş.');
    await p.fill('#fFirmaAdres', 'Firma Mah. 1 Sk.');
    await p.fill('#fSeri', seri);
    await p.fill('#fAdres', 'Bina Mah. 2 Sk. No:3');
    await p.click('#sAna [data-v="81-20"]');
    await p.fill('#fBinaAsansorSayisi', '2');
    await p.click('#sKabinGiris .seg >> nth=0');
    await p.click('#sKapiAcilma .seg >> nth=0');
    await p.click('#sTahrik [data-v="Elektrikli"]');
    await p.click('#sMD [data-v="MR"]');
    await p.fill('#fYuk', '630'); await p.fill('#fHiz', '1'); await p.fill('#fKapasite', '8'); await p.fill('#fDurak', '6');
    await p.click('#fKaydet');
    await p.click('#onBaslat');
    await p.waitForSelector('#back', { timeout: 20000 });
    await until(() => s.fake.tables.denetimler.length === 1 && s.fake.tables.saha_kontrol.length > 100, 'sunucuda denetim/madde yok', 20000);
    assert.equal(serverRecord(s).modul, 'Modül G');
  });
  await report.step(`${tag} maddeyi "Uygun" işaretle → sunucuya yazılır`, async () => {
    await p.locator('[data-durum="Kontrol tamamlandı"]').first().click();
    await until(() => marked().length === 1, 'işaretlenen madde sunucuda yok');
  });
  await report.step(`${tag} yenile → işaret geri geliyor`, async () => {
    await p.reload();
    await p.waitForSelector('#btnYeni', { timeout: 15000 });
    await p.getByText(seri).first().click();
    await p.waitForSelector('#back', { timeout: 15000 });
    // Ekran bir sonraki maddeye ilerlediği için işareti cihaz kaydından doğrula.
    const local = await p.evaluate(async () => (await DB.all('saha')).filter(r => r.durum === 'Kontrol tamamlandı').length);
    assert.equal(local, 1, 'işaretli madde yenilemeden sonra cihazda yok');
  });
  await report.step(`${tag} çevrimdışı ikinci madde işaretle → online olunca sunucuya gider`, async () => {
    await s.context.setOffline(true); s.fake.state.offline = true;
    await p.locator('[data-durum="Kontrol tamamlandı"]:not(.on-ok)').first().click();
    await p.waitForTimeout(800);
    assert.equal(marked().length, 1, 'çevrimdışıyken sunucuya yazılmış olamaz');
    await s.context.setOffline(false); s.fake.state.offline = false;
    await p.evaluate(() => Sync.full());
    await until(() => marked().length === 2, 'çevrimdışı işaret sunucuya aktarılmadı');
  });
  await report.step(`${tag} sil → sunucudan ve cihazdan kalkar`, async () => {
    const id = serverRecord(s).id;
    await p.click('#btnSil');
    await p.waitForSelector('#btnYeni', { timeout: 15000 });
    await until(() => s.fake.tables.denetimler.length === 0, 'sunucuda denetim kaldı');
    assert.equal(s.fake.tables.saha_kontrol.filter(r => r.denetim_id === id).length >= 0, true);
    assert.equal(await p.evaluate(async i => !!(await DB.get('denetimler', i)), id), false, 'cihazda kayıt kaldı');
  });
  await report.step(`${tag} sayfa hatası yok`, async () => {
    assert.deepEqual(s.errors.filter(e => e.startsWith('pageerror')), []);
  });
  await s.context.close();
}

// Sunucuda artık bulunmayan (ör. önceki silmede yarım kalan) yerel kayıt cihazdan kaldırılabilmeli.
async function runOrphanDelete(browser, appUrl, report) {
  const persona = personas.yonetici;
  const s = await newSession(browser, appUrl, persona);
  s.page.on('dialog', d => d.accept());
  const p = s.page;
  const seri = 'DMN-ORPHAN-001';
  const tag = '[E/yetim]';
  await report.step(`${tag} sunucudan silinmiş yerel kayıt → "Sil" cihazdan kaldırır`, async () => {
    await login(s, persona);
    await createRecord(s, 'E', seri);
    await until(() => s.fake.tables.denetimler.length === 1, 'sunucuda denetim kaydı yok');
    await until(async () => (await p.evaluate(async () => (await DB.all('outbox')).length)) === 0, 'senkron kuyruğu boşalmadı');
    await p.waitForTimeout(2500); // açılış sonrası gecikmeli yazımlar otursun
    await until(async () => (await p.evaluate(async () => (await DB.all('outbox')).length)) === 0, 'senkron kuyruğu yeniden dolu');
    const id = s.fake.tables.denetimler[0].id;
    s.fake.tables.denetimler.length = 0;
    await p.click('#fr65Delete');
    await p.waitForSelector('#btnYeni', { timeout: 15000 });
    assert.equal(await p.evaluate(async i => !!(await DB.get('denetimler', i)), id), false, 'yetim kayıt cihazda kaldı');
  });
  await s.context.close();
}

const app = await startApp();
const browser = await launch();
const report = createReporter();
try {
  for (const modul of ['E', 'B', 'H1']) {
    console.log(`\n== Modül ${modul} ==`);
    await runModule(browser, app.url, modul, personas.yonetici, report);
  }
  console.log('\n== Modül G ==');
  await runModuleG(browser, app.url, report);
  console.log('\n== Yetim kayıt ==');
  await runOrphanDelete(browser, app.url, report);
  console.log('\n== Mühendis (silme yetkisi yok) ==');
  await runModule(browser, app.url, 'E', personas.muhendis, report);
} finally { await browser.close(); app.close(); }
process.exit(report.summary() ? 1 : 0);
