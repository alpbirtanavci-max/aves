// AVES duman testi: "verim sunucuda mı?" güvencesi — ekranda hep görünen durum çubuğu, sunucu doğrulaması, tamamlama kapısı.
// Gerçek olay: veri 30 gün yalnızca cihazda kaldı, kullanıcı fark etmedi ve ekran görüntüsüyle kurtarmak zorunda kaldı.
import assert from 'node:assert/strict';
import { startApp, launch, newSession, createReporter, isWebkit } from './harness.mjs';

const persona = { email: 'yonetici@test.local', ad_soyad: 'Test Yönetici', aktif: true, rol: 'yonetici' };

async function until(check, message, ms = isWebkit() ? 40000 : 12000) {
  const end = Date.now() + ms;
  let last;
  while (Date.now() < end) {
    try { last = await check(); if (last) return last; } catch (e) { last = e; }
    await new Promise(r => setTimeout(r, 150));
  }
  assert.fail(message);
}

async function login(s) {
  const p = s.page;
  await p.waitForSelector('#lgEmail');
  await p.fill('#lgEmail', persona.email);
  await p.fill('#lgPass', 'yalniz-sahte-sunucu');
  await p.click('#lgBtn');
  await p.waitForSelector('#btnYeni', { timeout: 60000 });
}

async function createRecord(s, firma) {
  const p = s.page;
  await p.click('#btnYeni');
  await p.waitForSelector('#fMusteri');
  await p.fill('#fMusteri', firma);
  await p.fill('#fFirmaAdres', 'Firma Mah. 1 Sk.');
  await p.click('#sModul [data-v="E"]');
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

const report = createReporter();
const app = await startApp();
const browser = await launch();
try {
  const s = await newSession(browser, app.url, persona);
  const p = s.page;
  const mesajlar = [];
  p.on('dialog', d => { mesajlar.push(d.message()); d.accept(); });
  const sunucu = s.fake.tables.denetimler;
  const bar = () => p.evaluate(() => { const b = document.getElementById('veriGuvenceBar'); return b ? { gizli: b.hidden, seviye: b.dataset.seviye || '', metin: b.innerText } : null; });
  const offline = async v => {
    s.fake.state.offline = v;
    await p.evaluate(v => { Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => !v }); window.dispatchEvent(new Event(v ? 'offline' : 'online')); }, v);
  };
  const idOf = () => p.evaluate(() => UI.currentDenetimId);

  await report.step('giriş yapılınca çubuk görünür (giriş ekranında gizli)', async () => {
    assert.equal((await bar()).gizli, true, 'giriş ekranında çubuk gizli olmalı');
    await login(s);
    await until(async () => (await bar()).gizli === false, 'çubuk görünmedi');
  });

  await report.step('denetim açıldı + gönderim bitti → “Sunucuda doğrulandı” (karşılaştırmalı kanıt)', async () => {
    await createRecord(s, 'Güvence A.Ş.');
    const id = await idOf();
    await until(async () => sunucu.some(r => r.id === id), 'denetim sunucuya gitmedi');
    // FR.65 başlatma işlemleri kuyruğa az sonra girer; kuyruk boşalana kadar gönderimi sürdür.
    await until(async () => { await p.evaluate(() => Sync.full()); return (await p.evaluate(() => DB.outboxCount())) === 0; }, 'kuyruk boşalmadı');
    await until(async () => { const b = await bar(); return b.seviye === 'guvende' && /Sunucuda doğrulandı/.test(b.metin); }, 'çubuk “doğrulandı” demedi');
    const kanit = await p.evaluate(() => DB.kvGet('dogrulama_son'));
    assert.equal(kanit.ok, true);
    assert.equal(kanit.id, id);
  });

  await report.step('çevrimdışı düzenleme → “yalnızca bu cihazda” (veri sunucuda değil, açıkça söylenir)', async () => {
    await offline(true);
    const id = await idOf();
    await p.evaluate(async id => {
      const d = await DB.get('denetimler', id);
      d.denetimi_yapan = 'Güvence Testi';
      d.updated_at = new Date().toISOString();
      await localWrite('denetimler', d, 'denetimler');
      await Sync.updatePill();
    }, id);
    await until(async () => { const b = await bar(); return b.seviye === 'cevrimdisi' && /yalnızca bu cihazda/.test(b.metin); }, 'çevrimdışı uyarısı yok');
  });

  await report.step('çevrimiçi ama sunucu hata veriyor → eşikten sonra kırmızı “SUNUCUDA DEĞİL” + “Şimdi gönder”', async () => {
    await p.evaluate(() => DB.kvSet('veri_guvence_esik_ms', 1)); // test: eşik 1 ms
    Object.defineProperty(s.fake.state, 'failNext', { configurable: true, get: () => () => true, set: () => {} });
    await offline(false);
    await p.evaluate(() => Sync.pushOutbox());
    await until(async () => { const b = await bar(); return b.seviye === 'uyari' && /SUNUCUDA DEĞİL/.test(b.metin) && /Şimdi gönder/.test(b.metin); }, 'kırmızı uyarı yok');
  });

  await report.step('sunucu düzelince “Şimdi gönder” veriyi yollar → çubuk yeşile döner', async () => {
    delete s.fake.state.failNext;
    s.fake.state.failNext = null;
    await p.click('#veriGuvenceBar .guvence-eylem');
    await until(async () => sunucu.some(r => r.denetimi_yapan === 'Güvence Testi'), 'düzenleme sunucuya gitmedi');
    await p.evaluate(() => Sync.full());
    await until(async () => (await bar()).seviye === 'guvende', 'çubuk yeşile dönmedi');
  });

  await report.step('sunucudaki kopya farklılaşırsa (bozulma/başka cihaz) çubuk “FARKLI” der, sessiz kalmaz', async () => {
    const id = await idOf();
    sunucu.find(r => r.id === id).denetim_durumu = 'Gözden Geçirme';
    const sonuc = await p.evaluate(id => Sync.dogrula(id), id);
    assert.equal(sonuc.ok, false);
    await until(async () => { const b = await bar(); return b.seviye === 'sorun' && /FARKLI/.test(b.metin); }, 'fark uyarısı yok');
    // Arka plan çekmesi (pull) bu arada sunucudaki değeri cihaza almış olabilir; iki tarafı da eski haline getir.
    sunucu.find(r => r.id === id).denetim_durumu = 'Devam Ediyor';
    await p.evaluate(async id => { const d = await DB.get('denetimler', id); d.denetim_durumu = 'Devam Ediyor'; await DB.put('denetimler', d); }, id);
    await p.evaluate(id => Sync.dogrula(id), id);
    await until(async () => (await bar()).seviye === 'guvende', 'fark giderilince çubuk yeşile dönmedi');
  });

  await report.step('tamamlama kapısı (çevrimdışı): “doğrulanamadı” uyarısı + denetim YEDEĞİ iner, sonra tamamlanır', async () => {
    await offline(true);
    mesajlar.length = 0;
    const [indirme] = await Promise.all([
      p.waitForEvent('download', { timeout: 15000 }),
      p.click('#fr65Complete'),
    ]);
    assert.ok(/\.json$/.test(indirme.suggestedFilename()), `yedek dosyası bekleniyordu: ${indirme.suggestedFilename()}`);
    assert.ok(mesajlar.some(m => /doğrulanamadı/.test(m)), `uyarı iletisi yok: ${JSON.stringify(mesajlar)}`);
    const id = await idOf();
    await until(async () => (await p.evaluate(id => DB.get('denetimler', id), id)).denetim_durumu === 'Çalışma Tamamlandı', 'tamamlanmadı');
    await offline(false);
  });

  await report.step('tamamlama kapısı (çevrimiçi, doğrulanmış): ek uyarı çıkmaz, yedek istenmez', async () => {
    await p.evaluate(() => Sync.full());
    await p.evaluate(() => { const k = document.querySelector('.fr65-ozet .close'); if (k) k.click(); });
    await p.evaluate(() => { if (typeof showList === 'function') showList(); });
    await p.waitForSelector('#btnYeni', { timeout: 15000 });
    await createRecord(s, 'Güvence B A.Ş.');
    const id = await idOf();
    await until(async () => sunucu.some(r => r.id === id), 'ikinci denetim sunucuya gitmedi');
    await p.evaluate(() => Sync.full());
    mesajlar.length = 0;
    let indirildi = false;
    p.once('download', () => { indirildi = true; });
    await p.click('#fr65Complete');
    await until(async () => (await p.evaluate(id => DB.get('denetimler', id), id)).denetim_durumu === 'Çalışma Tamamlandı', 'tamamlanmadı');
    assert.ok(!mesajlar.some(m => /doğrulanamadı/.test(m)), `gereksiz uyarı: ${JSON.stringify(mesajlar)}`);
    assert.equal(indirildi, false, 'doğrulanmış denetimde yedek indirilmemeli');
  });

  await report.step('Modül G (ayrı oturum): maddeler sunucuyla birebir doğrulanır; çevrimdışı işaret “yalnızca bu cihazda”, sunucudaki sapma yakalanır', async () => {
    const g = await newSession(browser, app.url, persona);
    const q = g.page;
    q.on('dialog', d => d.accept());
    const maddeler = g.fake.tables.saha_kontrol;
    const bar2 = () => q.evaluate(() => { const b = document.getElementById('veriGuvenceBar'); return b ? { seviye: b.dataset.seviye || '', metin: b.innerText } : null; });
    const offline2 = async v => {
      g.fake.state.offline = v;
      await q.evaluate(v => { Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => !v }); window.dispatchEvent(new Event(v ? 'offline' : 'online')); }, v);
    };
    await login(g);
    await q.click('#btnYeni');
    await q.waitForSelector('#fMusteri');
    await q.click('#sModul [data-v="G"]');
    await q.fill('#fMusteri', 'Güvence G A.Ş.');
    await q.fill('#fFirmaAdres', 'Firma Mah. 1 Sk.');
    await q.fill('#fSeri', 'G-GUV-1');
    await q.fill('#fAdres', 'Bina Mah. 2 Sk. No:3');
    await q.click('#sAna [data-v="81-20"]');
    await q.fill('#fBinaAsansorSayisi', '2');
    await q.click('#sKabinGiris .seg >> nth=0');
    await q.click('#sKapiAcilma .seg >> nth=0');
    await q.click('#sTahrik [data-v="Elektrikli"]');
    await q.click('#sMD [data-v="MR"]');
    await q.fill('#fYuk', '630'); await q.fill('#fHiz', '1'); await q.fill('#fKapasite', '8'); await q.fill('#fDurak', '6');
    await q.click('#fKaydet');
    await q.click('#onBaslat');
    // G denetimi cihazda yüzlerce madde üretir; denetim açılana (currentDenetimId) kadar bekle.
    await until(async () => await q.evaluate(() => UI.currentDenetimId), 'G denetimi açılmadı', 40000);
    const id = await q.evaluate(() => UI.currentDenetimId);
    await until(async () => maddeler.filter(m => m.denetim_id === id).length > 100, 'G maddeleri sunucuya gitmedi', 30000);
    await until(async () => { await q.evaluate(() => Sync.full()); return (await q.evaluate(() => DB.outboxCount())) === 0; }, 'G kuyruğu boşalmadı', 30000);
    const ilk = await q.evaluate(id => Sync.dogrula(id), id);
    assert.equal(ilk.ok, true, JSON.stringify(ilk));
    // çevrimdışı işaret → yalnızca cihazda
    await offline2(true);
    await q.locator('[data-durum="Kontrol tamamlandı"]').first().click();
    await until(async () => { const b = await bar2(); return b.seviye === 'cevrimdisi' && /yalnızca bu cihazda/.test(b.metin); }, 'G çevrimdışı uyarısı yok');
    // bağlantı gelince gider ve doğrulanır
    await offline2(false);
    await until(async () => { await q.evaluate(() => Sync.full()); return (await q.evaluate(() => DB.outboxCount())) === 0; }, 'G işareti sunucuya gitmedi', 30000);
    await until(async () => maddeler.some(m => m.denetim_id === id && m.durum === 'Kontrol tamamlandı'), 'işaret sunucuda yok');
    const ikinci = await q.evaluate(id => Sync.dogrula(id), id);
    assert.equal(ikinci.ok, true, JSON.stringify(ikinci));
    // sunucuda bir maddenin sonucu bozulursa yakalanır
    const bozulan = maddeler.find(m => m.denetim_id === id && m.durum === 'Kontrol tamamlandı');
    bozulan.durum = 'Olumsuz bulgu';
    const ucuncu = await q.evaluate(id => Sync.dogrula(id), id);
    assert.equal(ucuncu.ok, false);
    assert.ok(ucuncu.farklar.some(f => /sonucu farklı/.test(f)), JSON.stringify(ucuncu.farklar));
    await until(async () => { const b = await bar2(); return b.seviye === 'sorun' && /FARKLI/.test(b.metin); }, 'G sapma uyarısı yok');
    bozulan.durum = 'Kontrol tamamlandı';
    await g.context.close();
  });

  await report.step('sayfa hatası yok', async () => {
    const hatalar = s.errors.filter(e => !/favicon|manifest|status of 500/.test(e));
    assert.deepEqual(hatalar, [], hatalar.join(' || ').slice(0, 600));
  });
} finally { await browser.close(); app.close(); }
process.exit(report.summary() ? 1 : 0);
