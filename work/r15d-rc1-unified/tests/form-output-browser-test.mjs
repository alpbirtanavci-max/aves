import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const app = path.join(root, 'app');
const out = path.join(root, 'test-artifacts', 'form-output');
fs.mkdirSync(out, { recursive: true });
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/alpbi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const mime = { '.js':'text/javascript', '.json':'application/json', '.pdf':'application/pdf', '.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.ttf':'font/ttf' };
const harness = `<!doctype html><meta charset="utf-8">
<script src="/vendor/jszip.min.js"></script><script src="/vendor/pdf-lib.min.js"></script>
<script src="/vendor/fontkit.umd.min.js"></script><script src="/form-output.js"></script>`;
const server = http.createServer((req,res) => {
  if (req.url === '/' || req.url === '/test.html') { res.writeHead(200,{'content-type':'text/html; charset=utf-8'}); res.end(harness); return; }
  const target = path.resolve(app, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/,''));
  if (!target.startsWith(app) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200,{'content-type':mime[path.extname(target)] || 'application/octet-stream'}); fs.createReadStream(target).pipe(res);
});
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
const port = server.address().port;
const chromeCandidates = [process.env.PLAYWRIGHT_CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean);
const executablePath = chromeCandidates.find(candidate => fs.existsSync(candidate));
const browser = await chromium.launch({ headless:true, ...(executablePath ? { executablePath } : {}) });
try {
  const page = await browser.newPage({ acceptDownloads:true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/test.html`);
  const fixture = {
    dosya_no:'AVES-TEST-001', musteri_unvani:'AVES TEST MÜŞTERİSİ', denetim_adresi:'İstanbul / Test Adresi',
    asansor_seri_no:'SN-TEST-2026', modul:'Modül G', ana_standart:'81-20', ek_standartlar:['81-72'],
    tahrik_tipi:'Elektrikli', makine_dairesi_tipi:'MRL', beyan_yuku_kg:'1000', beyan_hizi_ms:'1.0',
    kapasite_kisi:'13', durak_sayisi:'5', aski_tipi:'2:1', denetimi_yapan:'Test Denetçisi',
    denetim_tarihi:'2026-08-20', denetim_durumu:'Çalışma Tamamlandı', seri_numaralari:{
      kabin_tamponlari:[{seri_no:'KT-100'}], karsi_agirlik_tamponlari:[{seri_no:'KAT-200'}],
      parasut_frenleri:[{seri_no:'PF-300'}], kat_kapilari:[{kat:'Z',giris:'A',seri_no:'KK-400'}],
      regulatorler:[{seri_no:'RG-500'}], motorlar:[{seri_no:'MT-600'}], kumanda_kartlari:[{seri_no:'KR-700'}],
    },
  };
  const rows38 = [
    {madde_id:'MAD-0001',durum:'Kontrol tamamlandı',aciklama:'Ön kontrol tamamlandı.'},
    {madde_id:'MAD-0008A',olcum_degerleri:{kuyu_genisligi:'2100',kuyu_derinligi:'1900',kabin_tampon_yuksekligi:'420',kuyu_dibi_yuksekligi:'1650',karsi_agirlik_yeri:'Arka'}},
    {madde_id:'MAD-0008B',olcum_degerleri:{ray_kapi_arasi:'95',kabin_raylar_arasi:'1500',karsi_agirlik_raylar_arasi:'900',kabin_kilavuz_ray_tipi:'T90',karsi_agirlik_kilavuz_ray_tipi:'T50'}},
    {madde_id:'MAD-0008C',olcum_degerleri:{kabin_konsol_en_buyuk_aralik:'2200',kabin_patenleri_dusey_aralik:'3100',karsi_agirlik_konsol_en_buyuk_aralik:'2100',karsi_agirlik_patenleri_dusey_aralik:'2800'}},
    {madde_id:'MAD-0008D',olcum_degerleri:{kat_kapisi_net_genisligi:'900',kat_kapisi_net_yuksekligi:'2100',kat_kapisi_tipi:'Otomatik',kat_kapisi_acilma_yonu:'Merkezi',kabin_genisligi:'1400',kabin_derinligi:'1600'}},
    {madde_id:'MAD-0017',durum:'Olumsuz bulgu',aciklama:'Test bulgusu',olcum_tanimlari:[{id:'x',etiket:'Ölçüm',birim:'mm'}],olcum_degerleri:{x:'125'}},
    {madde_id:'MAD-0123',durum:'Uygulanmaz',aciklama:'Yapılandırma nedeniyle uygulanmaz.'},
  ];
  const cases = [
    {name:'fr38', fixture, rows:rows38},
    {name:'fr39', fixture:{...fixture,ana_standart:'81-1/2+A3',ek_standartlar:[],dosya_no:'AVES-TEST-A3-001'}, rows:[
      {madde_id:'MAD-0001',durum:'Kontrol tamamlandı',aciklama:'A3 ön kontrol tamamlandı.'},
      ...rows38.filter(row=>['MAD-0008A','MAD-0008B','MAD-0008D'].includes(row.madde_id)),
      {madde_id:'MAD-0008E',olcum_degerleri:{a3_kuyu_dibi_yuksekligi:'1550',a3_kabin_tampon_yuksekligi:'390'}},
      {madde_id:'MAD-0310',durum:'Olumsuz bulgu',aciklama:'A3 test bulgusu',olcum_tanimlari:[{id:'a3',etiket:'A3 ölçümü',birim:'mm'}],olcum_degerleri:{a3:'88'}},
    ]},
  ];
  for (const testCase of cases) for (const format of ['docx','pdf']) {
    const pending = page.waitForEvent('download');
    await page.evaluate(async ({format,fixture,rows}) => {
      fixture.form_cikti_snapshot = await FormOutput.createSnapshot(fixture.ana_standart);
      return FormOutput.download(format,fixture,rows);
    }, {format,fixture:testCase.fixture,rows:testCase.rows});
    const download = await pending;
    await download.saveAs(path.join(out,`${testCase.name}.${format}`));
  }
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(JSON.stringify(Object.fromEntries(cases.flatMap(testCase => ['docx','pdf'].map(format => [`${testCase.name}_${format}`,fs.statSync(path.join(out,`${testCase.name}.${format}`)).size])).concat([['errors',errors]])),null,2));
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
