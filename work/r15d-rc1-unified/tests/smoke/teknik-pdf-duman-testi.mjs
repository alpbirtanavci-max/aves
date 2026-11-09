// AVES duman testi: denetime bağlı teknik dosya PDF'i (gerçek tarayıcı, sahte Supabase + sahte özel depolama).
// Ekle -> eşitle -> yenile -> değiştir -> kaldır -> çevrimdışı ekle -> bağlanınca gönder -> çakışma -> kopyayı seç.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { startApp, launch, newSession, createReporter, isWebkit } from './harness.mjs';

const persona = { email: 'yonetici@test.local', ad_soyad: 'Test Yönetici', aktif: true, rol: 'yonetici' };

// Elle yazılmış en küçük PDF: standart Helvetica yazı tipi, seçilebilir metin (satırlar boş ise metinsiz/taranmış gibi).
function makePdf(lines, title) {
  const content = lines.length
    ? 'BT /F1 12 Tf 50 750 Td 16 TL ' + lines.map(l => `(${l.replace(/[()\\]/g, '')}) Tj T*`).join(' ') + ' ET'
    : '0.9 g 50 700 200 40 re f';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    `<< /Title (${title}) >>`,
  ];
  let out = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((body, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${body}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` + offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}
const sha = buf => createHash('sha256').update(buf).digest('hex');
const pdfMetinli = makePdf(['Anma hiz: 1.0 m/s', 'Anma yuku 630 kg', 'Durak sayisi: 6', 'Model: GTW-630'], 'metinli');
const pdfMetinsiz = makePdf([], 'taranmis');
const pdfCevrimdisi = makePdf(['Anma hiz: 1.6 m/s', 'Anma yuku 800 kg'], 'cevrimdisi');
const pdfBaskaCihaz = makePdf(['Anma hiz: 2.5 m/s'], 'baska-cihaz');

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

async function createRecord(s) {
  const p = s.page;
  await p.click('#btnYeni');
  await p.waitForSelector('#fMusteri');
  await p.fill('#fMusteri', 'PDF Duman A.Ş.');
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
  p.on('dialog', d => d.accept());
  const T = s.fake.tables.denetim_teknik_pdf;
  const store = s.fake.storage;
  const durum = () => p.locator('#fr65TechnicalPdfCard .fr65-pdf-state').innerText();
  // Dosya sayfa içinde bellekten üretilir (Playwright'ın setInputFiles dosyası WebKit'te çevrimdışıyken okunamıyor: "I/O read operation failed").
  const dosya = (name, buffer) => p.evaluate(({ name, bytes }) => {
    const dt = new DataTransfer();
    dt.items.add(new File([new Uint8Array(bytes)], name, { type: 'application/pdf' }));
    const input = document.getElementById('fr65PdfFile');
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, { name, bytes: Array.from(buffer) });
  // Çevrimdışı taklidi: sahte sunucu bağlantıyı keser + navigator.onLine yanlışlanır. (context.setOffline kullanılmaz: WebKit'te
  // Blob okumalarını da engelleyip "I/O read operation failed" verir; gerçek Safari çevrimdışıyken Blob okuyabilir.)
  const offline = async v => {
    s.fake.state.offline = v;
    await p.evaluate(v => { Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => !v }); window.dispatchEvent(new Event(v ? 'offline' : 'online')); }, v);
  };
  // Kaldırma bittiğinde hem sunucu hem kart güncel olmalı (kart yenilenmeden dosya seçmek eski girdiye yazar).
  const kaldir = async () => {
    await p.click('#fr65PdfRemove');
    await until(() => T.length === 0 && store.size === 0, 'sunucudan silinmedi');
    await until(async () => /henüz PDF eklenmedi/.test(await durum()), 'kart sıfırlanmadı');
  };
  const bildirim = () => p.evaluate(() => (document.querySelector('.toast, #toast') || {}).textContent);
  const idOf = () => s.fake.tables.denetimler[0].id;
  const yerel = () => p.evaluate(async id => { const r = await DB.get('teknik_pdf', id); return r ? { durum: r.sync_status, yol: r.object_path, blob: !!r.blob } : null; }, idOf());

  await report.step('giriş yap, FR.65 kaydı aç; kartta "PDF eklenmedi" yazar', async () => {
    await login(s);
    await createRecord(s);
    await p.waitForSelector('#fr65TechnicalPdfCard');
    assert.match(await durum(), /henüz PDF eklenmedi/);
  });

  await report.step('PDF ekle (çevrimiçi) → sunucuda satır + özel depoda dosya, SHA-256 doğru, aday çıkarıldı', async () => {
    await dosya('teknik.pdf', pdfMetinli);
    try { await until(async () => /eşitlendi/.test(await durum()), 'PDF eşitlenmedi'); }
    catch (e) { throw new Error(`${e.message}: ${await durum()} | bildirim: ${await p.evaluate(() => (document.querySelector('.toast, #toast') || {}).textContent)} | hatalar: ${s.errors.join(' | ').slice(0, 300)}`); }
    assert.equal(T.length, 1);
    assert.equal(T[0].sha256, sha(pdfMetinli));
    assert.equal(T[0].denetim_id, idOf());
    assert.equal(store.size, 1);
    const yuklenen = store.get(T[0].object_path);
    if (yuklenen) assert.deepEqual(Buffer.from(yuklenen), pdfMetinli); // Playwright WebKit istek gövdesini vermeyebilir (null)
    assert.ok(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.pdf$/.test(T[0].object_path), 'yol <denetim>/<uuid>.pdf olmalı');
    await p.waitForSelector('.fr65-pdf-candidate', { timeout: 15000 });
    assert.ok(await p.locator('.fr65-pdf-candidate').count() >= 2, 'hız / yük adayları bulunmalı');
    assert.match(await p.locator('#fr65TechnicalPdfCard').innerText(), /otomatik aktarılmaz/);
  });

  await report.step('adaylar saha alanlarına yazılmaz (FR.65 değerleri değişmedi)', async () => {
    const degerler = await p.evaluate(async id => JSON.stringify((await DB.get('denetimler', id))?.denetim_form_kayitlari?.forms?.FR65?.values || {}), idOf());
    assert.ok(!degerler.includes('GTW-630'), 'model adayı saha alanına yazılmış');
  });

  await report.step('sayfayı yenile → kart ve PDF kaydı geri gelir', async () => {
    await p.reload();
    await p.waitForSelector('#btnYeni', { timeout: 60000 });
    await p.getByText('PDF Duman A.Ş.').first().click();
    await p.waitForSelector('#fr65TechnicalPdfCard', { timeout: 15000 });
    assert.match(await durum(), /eşitlendi/);
  });

  await report.step('PDF’yi değiştir (taranmış, metinsiz) → "metin bulunamadı"; eski nesne depodan silinir', async () => {
    const eski = T[0].object_path;
    await dosya('taranmis.pdf', pdfMetinsiz);
    await until(() => T[0]?.sha256 === sha(pdfMetinsiz), 'yeni PDF sunucuya gitmedi');
    await until(() => !store.has(eski), 'eski nesne depoda kaldı');
    assert.equal(store.size, 1);
    await until(async () => /seçilebilir metin bulunamadı/.test(await p.locator('#fr65TechnicalPdfCard').innerText()), 'metinsiz PDF uyarısı yok: ' + (await p.locator('#fr65TechnicalPdfCard').innerText()).replace(/\n/g, ' / ').slice(0, 500) + ' | ' + await bildirim());
  });

  await report.step('geçersiz dosya (PDF değil) reddedilir; mevcut PDF korunur', async () => {
    await dosya('x.pdf', Buffer.from('bu bir pdf degil'));
    await p.waitForTimeout(800);
    assert.equal(T[0].sha256, sha(pdfMetinsiz));
    assert.equal(store.size, 1);
  });

  await report.step('PDF’yi kaldır → satır, depo nesnesi ve cihaz kaydı gider', async () => {
    await kaldir();
    assert.equal(await yerel(), null);
  });

  await report.step('çevrimdışı PDF ekle → cihazda bekler, sunucuya gitmez; bağlanınca gönderilir', async () => {
    await p.evaluate(() => AVES_TEKNIK_PDF.prepareOfflineReader().catch(() => {})); // okuyucu dosyaları çevrimdışı önbelleğe (WebKit'te yavaş olabilir)
    await offline(true);
    await dosya('cevrimdisi.pdf', pdfCevrimdisi);
    await until(async () => /sunucu aktarımı bekliyor/.test(await durum()), 'bekleme durumu görünmedi: ' + await durum() + ' | ' + await bildirim());
    assert.equal(T.length, 0);
    assert.equal(store.size, 0);
    const l = await yerel();
    assert.equal(l.durum, 'pending');
    assert.equal(l.blob, true, 'PDF cihazda saklanmalı');
    await offline(false);
    await p.evaluate(() => Sync.full());
    await until(() => T.length === 1 && store.size === 1, 'bağlanınca gönderilmedi');
    assert.equal(T[0].sha256, sha(pdfCevrimdisi));
    await until(async () => (await yerel())?.durum === 'synced', 'cihaz kaydı synced olmadı');
  });

  await report.step('çevrimdışıyken mevcut eşitlenmiş PDF değiştirilemez (iki kopya korunur)', async () => {
    await offline(true);
    await dosya('degistir.pdf', pdfMetinli);
    await p.waitForTimeout(800);
    const l = await yerel();
    assert.equal(l.durum, 'synced', `durum=${l.durum} onLine=${await p.evaluate(() => navigator.onLine)} bildirim=${await bildirim()}`);
    await offline(false);
  });

  await report.step('çakışma: başka cihaz aynı denetime PDF yazmış → iki kopya korunur, sunucu ezilmez', async () => {
    await kaldir();
    await offline(true);
    await dosya('benim.pdf', pdfMetinli);
    await until(async () => (await yerel())?.durum === 'pending', 'yerel bekleyen kayıt yok');
    const yol = `${idOf()}/${randomUUID()}.pdf`;
    T.push({ denetim_id: idOf(), file_name: 'baska.pdf', object_path: yol, file_size_bytes: pdfBaskaCihaz.length, sha256: sha(pdfBaskaCihaz), page_count: 1, text_page_count: 1, extracted_fields: {}, uploaded_by: 'baska@test.local', updated_at: new Date().toISOString() });
    store.set(yol, pdfBaskaCihaz);
    await offline(false);
    await p.evaluate(() => Sync.full());
    await until(async () => (await yerel())?.durum === 'conflict', 'çakışma algılanmadı: ' + JSON.stringify(await yerel()));
    assert.equal(T[0].sha256, sha(pdfBaskaCihaz), 'sunucudaki PDF ezilmemeli');
    assert.equal(store.size, 1, 'sunucu nesnesi silinmemeli');
    assert.equal((await yerel()).blob, true, 'yerel PDF korunmalı');
    await p.reload();
    await p.waitForSelector('#btnYeni', { timeout: 60000 });
    await p.getByText('PDF Duman A.Ş.').first().click();
    await p.waitForSelector('#fr65PdfCompare', { timeout: 15000 });
    assert.match(await p.locator('#fr65TechnicalPdfCard').innerText(), /İki kopyayı da koruyor/);
  });

  await report.step('sunucu kopyasını indir ve karşılaştır → "Cihazdakini kullan" ile çakışma çözülür', async () => {
    await p.click('#fr65PdfCompare');
    await p.waitForSelector('#fr65PdfUseLocal', { timeout: 15000 });
    assert.match(await p.locator('#fr65TechnicalPdfCard').innerText(), /Sunucu kopyası/);
    await p.click('#fr65PdfUseLocal');
    await until(() => T.length === 1 && T[0].sha256 === sha(pdfMetinli), 'cihaz PDF’si sunucuda etkin olmadı');
    await until(() => store.size === 1, 'eski sunucu nesnesi silinmedi');
    await until(async () => (await yerel())?.durum === 'synced', 'çakışma sonrası synced olmadı');
  });

  await report.step('Senkron Merkezi’nde bekleyen PDF sayılır (çevrimdışı + bekleyen)', async () => {
    await kaldir();
    await offline(true);
    await dosya('bekleyen.pdf', pdfCevrimdisi);
    await until(async () => (await yerel())?.durum === 'pending', 'bekleyen yok: ' + JSON.stringify(await yerel()) + ' | ' + await bildirim() + ' | ' + await durum());
    const pill = await p.locator('.syncpill').first().innerText();
    assert.match(pill, /1 bekliyor/);
    await offline(false);
    await p.evaluate(() => Sync.full());
    await until(() => T.length === 1, 'gönderilmedi');
  });

  await report.step('PDF’li FR.65 kaydı silinmez (önce PDF kaldırılmalı)', async () => {
    assert.equal(await p.locator('#fr65Delete').count(), 1, 'yönetici silme düğmesi görmeli');
    await p.click('#fr65Delete');
    await p.waitForTimeout(1500);
    assert.equal(s.fake.tables.denetimler.length, 1, 'PDF’li kayıt silindi');
    assert.equal(T.length, 1, 'PDF satırı silindi');
    assert.equal(await p.evaluate(async i => !!(await DB.get('denetimler', i)), idOf()), true, 'cihazdaki kayıt silindi');
  });

  await report.step('PDF kaldırıldıktan sonra FR.65 kaydı silinebilir', async () => {
    await kaldir();
    const id = idOf();
    await p.click('#fr65Delete');
    await p.waitForSelector('#btnYeni', { timeout: 60000 });
    await until(() => s.fake.tables.denetimler.length === 0, 'kayıt sunucudan silinmedi');
    assert.equal(await p.evaluate(async i => !!(await DB.get('denetimler', i)), id), false, 'cihazda kayıt kaldı');
  });

  await report.step('sayfa hatası yok', async () => {
    assert.deepEqual(s.errors.filter(e => e.startsWith('pageerror')), []);
  });
  await s.context.close();
} finally { await browser.close(); app.close(); }
process.exit(report.summary() ? 1 : 0);
