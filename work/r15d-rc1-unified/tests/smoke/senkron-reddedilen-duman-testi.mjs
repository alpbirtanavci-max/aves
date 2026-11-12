// AVES duman testi: sunucunun kalıcı olarak reddettiği kayıt kuyruğu bloklamaz; cihazda korunur; Senkron Merkezi'nden düzeltilir.
// Gerçek olay: Makine dairesi tipi boş bir denetim, 30 gün boyunca arkasındaki tüm işlemleri engelledi.
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

const report = createReporter();
const app = await startApp();
const browser = await launch();
try {
  const s = await newSession(browser, app.url, persona);
  const p = s.page;
  const sunucu = s.fake.tables.denetimler;
  await p.waitForSelector('#lgEmail');
  await p.fill('#lgEmail', persona.email);
  await p.fill('#lgPass', 'yalniz-sahte-sunucu');
  await p.click('#lgBtn');
  await p.waitForSelector('#btnYeni', { timeout: 60000 });

  const bozuk = '11111111-1111-4111-8111-111111111111';
  const saglam = '22222222-2222-4222-8222-222222222222';

  await report.step('kuyruk: önce bozuk (MD boş) denetim + alt işlemi, sonra sağlam denetim', async () => {
    s.fake.state.dogrulaMd = true;
    await p.evaluate(async ({ bozuk, saglam, email }) => {
      const satir = (id, md, ad) => ({ id, musteri_unvani: ad, asansor_seri_no: 'S-' + id.slice(0, 4), olusturan_email: email,
        modul: 'Modül E', ana_standart: 'EN 81-20', denetim_durumu: 'Devam Ediyor', makine_dairesi_tipi: md });
      const ekle = async (table, rows, denetimId) => DB.outboxAdd({ operation_id: crypto.randomUUID(), user_id: email, device_id: 'test', inspection_id: denetimId,
        entity_type: table, operation_type: 'upsert', table, rows, created_at: new Date().toISOString(), ts: Date.now(), attempt_count: 0, sync_status: 'pending' });
      const b = satir(bozuk, null, 'Bozuk Kayıt A.Ş.');
      const g = satir(saglam, 'MR', 'Sağlam Kayıt A.Ş.');
      await DB.put('denetimler', b); await DB.put('denetimler', g);
      await ekle('denetimler', [b], bozuk);
      await ekle('saha_kontrol', [{ id: crypto.randomUUID(), denetim_id: bozuk, madde_id: 'm1', sira_no: 1, bolum: 'x', standart_grubu: 'y', kontrol_basligi: 'z' }], bozuk);
      await ekle('denetimler', [g], saglam);
    }, { bozuk, saglam, email: persona.email });
    assert.equal(await p.evaluate(() => DB.outboxCount()), 3);
  });

  await report.step('gönderim: sağlam denetim sunucuya gider; bozuk denetimin iki işlemi "reddedildi" olarak korunur', async () => {
    // Arka planda süren bir gönderim varsa pushOutbox() hemen döner; koşul gerçekleşene kadar yeniden dene.
    await until(async () => {
      await p.evaluate(() => Sync.pushOutbox());
      return sunucu.some(r => r.id === saglam) && (await p.evaluate(() => DB.outboxCount())) === 2 &&
        (await p.evaluate(async () => (await DB.outboxAll()).every(i => i.sync_status === 'rejected')));
    }, 'sağlam denetim sunucuya gitmedi veya bozuk denetim “reddedildi” olmadı (kuyruk bloklandı)');
    assert.ok(sunucu.some(r => r.id === saglam), 'sağlam denetim sunucuya gitmedi (kuyruk bloklandı)');
    assert.ok(!sunucu.some(r => r.id === bozuk), 'bozuk denetim sunucuya girmemeli');
    const kalan = await p.evaluate(async () => (await DB.outboxAll()).map(i => ({ t: i.table, d: i.inspection_id, s: i.sync_status, e: i.last_error_message })));
    assert.equal(kalan.length, 2, JSON.stringify(kalan));
    assert.ok(kalan.every(i => i.d === bozuk && i.s === 'rejected'), JSON.stringify(kalan));
    assert.ok(kalan.some(i => /makine_dairesi/.test(i.e || '')));
    assert.equal(await p.evaluate(async () => (await DB.kvGet('sync_warning'))?.kind), 'rejected');
    // cihazdaki yerel kayıt silinmedi
    assert.equal(await p.evaluate(id => DB.get('denetimler', id).then(r => !!r), bozuk), true);
  });

  await report.step('gösterge "Reddedilen kayıt" der; Senkron Merkezi sebebi ve düzeltme denetimini gösterir', async () => {
    await p.evaluate(() => Sync.updatePill());
    assert.match(await p.locator('#syncLabel').innerText(), /Reddedilen kayıt/);
    await p.evaluate(() => Sync.syncCenter());
    await p.waitForSelector('[data-sync-duzelt]');
    const metin = await p.locator('.sync-review-list').first().innerText();
    assert.match(metin, /Bozuk Kayıt/);
    assert.match(await p.locator('[data-sync-rej]').innerText(), /Makine dairesi tipi \(MR\/MRL\) eksik/);
  });

  await report.step('MD seçmeden "Düzelt ve gönder" gönderim yapmaz; MRL seçince denetim sunucuya girer, uyarı temizlenir', async () => {
    await p.click('[data-sync-duzelt]');
    assert.ok(!sunucu.some(r => r.id === bozuk), 'seçimsiz gönderildi');
    await p.selectOption('[data-sync-md]', 'MRL');
    await p.click('[data-sync-duzelt]');
    await until(() => sunucu.some(r => r.id === bozuk && r.makine_dairesi_tipi === 'MRL'), 'düzeltilen denetim sunucuya girmedi');
    await until(async () => (await p.evaluate(() => DB.outboxCount())) === 0, 'kuyruk boşalmadı');
    assert.equal(await p.evaluate(async () => (await DB.kvGet('sync_warning')) || null), null);
    assert.equal(await p.evaluate(id => DB.get('denetimler', id).then(r => r.makine_dairesi_tipi), bozuk), 'MRL');
  });

  await report.step('sayfa hatası yok', async () => { const hatalar = s.errors.filter(e => !/favicon|manifest|status of 400/.test(e)); assert.deepEqual(hatalar, [], hatalar.join(' || ').slice(0, 600)); });
} finally { await browser.close(); app.close(); }
process.exit(report.summary() ? 1 : 0);
