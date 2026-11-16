// AVES duman testi: demo denetim (yalnız yetkili hesapta; yalnız bu cihazda; sunucuya HİÇ gitmez) ve gerçek denetimle yan yana yaşama.
import assert from 'node:assert/strict';
import { startApp, launch, newSession, createReporter, isWebkit } from './harness.mjs';

const sahibi = { email: 'aavci@avesbelgelendirme.com.tr', ad_soyad: 'Demo Sahibi', aktif: true, rol: 'yonetici' };
const baskasi = { email: 'yonetici@test.local', ad_soyad: 'Başka Yönetici', aktif: true, rol: 'yonetici' };

async function until(check, message, ms = isWebkit() ? 40000 : 12000) {
  const end = Date.now() + ms;
  let last;
  while (Date.now() < end) {
    try { last = await check(); if (last) return last; } catch (e) { last = e; }
    await new Promise(r => setTimeout(r, 150));
  }
  assert.fail(message);
}

async function login(s, persona) {
  const p = s.page;
  await p.waitForSelector('#lgEmail');
  await p.fill('#lgEmail', persona.email);
  await p.fill('#lgPass', 'yalniz-sahte-sunucu');
  await p.click('#lgBtn');
  await p.waitForSelector('#btnYeni', { timeout: 60000 });
}

async function gercekFr65Ac(s, firma) {
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
  await report.step('yetkisiz hesapta demo paneli HİÇ görünmez', async () => {
    const s = await newSession(browser, app.url, baskasi);
    await login(s, baskasi);
    await s.page.click('#btnYeni');
    await s.page.waitForSelector('#fMusteri');
    assert.equal(await s.page.locator('.demo-panel').count(), 0, 'demo paneli yetkisiz hesapta görünmemeli');
    assert.equal(await s.page.evaluate(() => typeof demoDenetimiOlustur === 'function' && AVES_DEMO.yetkili(Profile.email)), false);
    await s.context.close();
  });

  const s = await newSession(browser, app.url, sahibi);
  const p = s.page;
  const mesajlar = [];
  p.on('dialog', d => { mesajlar.push(d.message()); d.accept(); });
  let indirme = false;
  p.on('download', () => { indirme = true; });
  const sunucu = s.fake.tables;
  const outbox = () => p.evaluate(() => DB.outboxCount());
  const bar = () => p.evaluate(() => { const b = document.getElementById('veriGuvenceBar'); return b ? { seviye: b.dataset.seviye || '', metin: b.innerText } : null; });
  const idOf = () => p.evaluate(() => UI.currentDenetimId);
  const listeyeDon = async () => {
    await p.evaluate(() => { document.querySelectorAll('.overlay .close').forEach(k => k.click()); showList(); });
    await p.waitForSelector('#btnYeni', { timeout: 20000 });
    // Özet penceresi kapatma sonrası gecikmeyle açılabilir (WebKit yavaş): kalmayana kadar kapat (listeyi yeniden çizmeden).
    await until(async () => {
      await p.evaluate(() => document.querySelectorAll('.overlay .close').forEach(k => k.click()));
      return (await p.locator('.overlay').count()) === 0;
    }, 'açık pencere kapanmadı', 20000);
  };
  const sunucuBos = () => sunucu.denetimler.length === 0 && sunucu.saha_kontrol.length === 0 && sunucu.denetim_degisim_gecmisi.length === 0;

  await report.step('yetkili hesapta demo paneli görünür (Gerçek / Demo seçeneği, 4 modül)', async () => {
    await login(s, sahibi);
    await p.click('#btnYeni');
    await p.waitForSelector('.demo-panel');
    assert.equal(await p.locator('.demo-panel [data-demo]').count(), 4);
    assert.match(await p.locator('.demo-panel').innerText(), /Gerçek denetim[\s\S]*Demo denetim/);
  });

  await report.step('demo Modül G: tek tıkla açılır, maddeler cihazda, sunucuya HİÇBİR şey gitmez, çubuk DEMO der', async () => {
    await p.click('.demo-panel [data-demo="G"]');
    await until(async () => await idOf(), 'demo G denetimi açılmadı', 40000);
    const id = await idOf();
    const yerel = await p.evaluate(async id => ({ maddeSayisi: (await DB.allByIndex('saha', 'byDenetim', id)).length, firma: (await DB.get('denetimler', id)).musteri_unvani, demo: await AVES_DEMO.mu(id) }), id);
    assert.ok(yerel.maddeSayisi > 100, `maddeler cihazda olmalı: ${yerel.maddeSayisi}`);
    assert.match(yerel.firma, /^DEMO – /);
    assert.equal(yerel.demo, true);
    await p.waitForTimeout(1500);
    assert.equal(await outbox(), 0, 'demo için kuyruk üretilmemeli');
    assert.ok(sunucuBos(), 'sunucuya demo verisi gitmemeli');
    await until(async () => { const b = await bar(); return b.seviye === 'demo' && /DEMO denetim · yalnızca bu cihazda/.test(b.metin); }, 'çubuk DEMO demedi');
  });

  await report.step('demo G: madde işaretle → cihazda kalır, kuyruk ve sunucu boş; eşitleme yerel veriyi EZMEZ', async () => {
    await p.locator('[data-durum="Kontrol tamamlandı"]').first().click();
    const id = await idOf();
    await until(async () => (await p.evaluate(async id => (await DB.allByIndex('saha', 'byDenetim', id)).filter(r => r.durum === 'Kontrol tamamlandı').length, id)) === 1, 'işaret cihaza yazılmadı');
    assert.equal(await outbox(), 0);
    await p.evaluate(() => Sync.full());
    await p.evaluate(() => Sync.pullSaha(UI.currentDenetimId));
    await p.waitForTimeout(500);
    assert.equal(await p.evaluate(async id => (await DB.allByIndex('saha', 'byDenetim', id)).filter(r => r.durum === 'Kontrol tamamlandı').length, id), 1, 'çekme demo maddelerini sildi/ezdi');
    assert.ok((await p.evaluate(async id => (await DB.allByIndex('saha', 'byDenetim', id)).length, id)) > 100);
    assert.ok(sunucuBos());
  });

  await report.step('sayfa yenilenince demo denetim listede durur ve açılır', async () => {
    await p.reload();
    await p.waitForSelector('#btnYeni', { timeout: 60000 });
    await p.getByText('DEMO – Modül G Firması').first().click();
    await until(async () => await idOf(), 'demo denetim açılmadı');
    assert.equal(await p.evaluate(async () => (await DB.allByIndex('saha', 'byDenetim', UI.currentDenetimId)).filter(r => r.durum === 'Kontrol tamamlandı').length), 1);
    assert.ok(sunucuBos());
  });

  await report.step('demo Modül E (FR.65): açılır, kapatılırken ek uyarı/yedek istenmez, sunucuya gitmez', async () => {
    await listeyeDon();
    await p.click('#btnYeni');
    await p.waitForSelector('.demo-panel');
    await p.click('.demo-panel [data-demo="E"]');
    await p.waitForSelector('#fr65Complete', { timeout: 20000 });
    mesajlar.length = 0; indirme = false;
    await p.click('#fr65Complete');
    const id = await idOf();
    await until(async () => (await p.evaluate(id => DB.get('denetimler', id), id)).denetim_durumu === 'Çalışma Tamamlandı', 'demo E kapanmadı');
    assert.ok(!mesajlar.some(m => /doğrulanamadı/.test(m)), `demo için doğrulama uyarısı çıkmamalı: ${JSON.stringify(mesajlar)}`);
    assert.equal(indirme, false, 'demo için yedek indirilmemeli');
    assert.equal(await outbox(), 0);
    assert.ok(sunucuBos(), 'demo FR.65 sunucuya gitmemeli');
  });

  await report.step('GERÇEK denetim demoyla yan yana: yalnız gerçek olan sunucuya gider ve doğrulanır', async () => {
    await listeyeDon();
    await gercekFr65Ac(s, 'Gerçek Firma A.Ş.');
    const id = await idOf();
    assert.equal(await p.evaluate(id => AVES_DEMO.mu(id), id), false);
    await until(async () => sunucu.denetimler.some(r => r.id === id), 'gerçek denetim sunucuya gitmedi');
    await until(async () => { await p.evaluate(() => Sync.full()); return (await outbox()) === 0; }, 'gerçek kuyruk boşalmadı');
    await until(async () => { const b = await bar(); return b.seviye === 'guvende' && /Sunucuda doğrulandı/.test(b.metin); }, 'gerçek denetim doğrulanmadı');
    assert.equal(sunucu.denetimler.length, 1, 'sunucuda yalnız gerçek denetim olmalı');
    assert.ok(sunucu.denetimler.every(r => !/DEMO/.test(r.musteri_unvani)), 'demo sunucuya sızmış');
  });

  await report.step('demo silme yalnız cihazdan: sunucuya silme isteği gitmez, gerçek denetim etkilenmez', async () => {
    await listeyeDon();
    await p.getByText('DEMO – Modül G Firması').first().click();
    await until(async () => await idOf(), 'demo G açılmadı');
    await p.click('#btnSil');
    await p.waitForSelector('#btnYeni', { timeout: 60000 });
    assert.equal(await outbox(), 0, 'demo silme sunucu kuyruğu üretmemeli');
    assert.equal(sunucu.denetimler.length, 1, 'gerçek denetim etkilenmemeli');
    assert.equal(await p.evaluate(() => AVES_DEMO.idler().then(l => l.length)), 1, 'yalnız E demosu kalmalı');
  });

  await report.step('“Tüm demo denetimleri sil”: yalnız demolar gider, gerçek denetim kalır', async () => {
    await p.click('#btnYeni');
    await p.waitForSelector('.demo-panel');
    await p.click('#demoTemizle');
    await until(async () => (await p.evaluate(() => AVES_DEMO.idler().then(l => l.length))) === 0, 'demolar silinmedi');
    const kalanlar = await p.evaluate(async () => (await DB.all('denetimler')).map(d => d.musteri_unvani));
    assert.deepEqual(kalanlar, ['Gerçek Firma A.Ş.']);
    assert.equal(sunucu.denetimler.length, 1);
  });

  await report.step('sayfa hatası yok', async () => {
    const hatalar = s.errors.filter(e => !/favicon|manifest/.test(e));
    assert.deepEqual(hatalar, [], hatalar.join(' || ').slice(0, 600));
  });
} finally { await browser.close(); app.close(); }
process.exit(report.summary() ? 1 : 0);
