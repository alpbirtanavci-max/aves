import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createFakeSupabase } from './fake-supabase.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
export const appDir = path.resolve(here, '../../app');
const require = createRequire(import.meta.url);
export const SUPABASE_ORIGIN = 'https://jmccmkqyncunpqliqvox.supabase.co';

function loadPlaywright() {
  for (const name of ['playwright', 'playwright-core', 'C:/Users/alpbi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright']) {
    try { return require(name); } catch { /* sıradaki */ }
  }
  throw new Error('playwright bulunamadı (CI: npm i --no-save playwright-core)');
}

const mime = { '.js': 'text/javascript', '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };

export async function startApp() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const target = path.resolve(appDir, '.' + p);
    if (!target.startsWith(appDir) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': mime[path.extname(target)] || 'application/octet-stream' });
    fs.createReadStream(target).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${server.address().port}/`, close: () => server.close() };
}

export async function launch() {
  const { chromium } = loadPlaywright();
  const candidates = [process.env.PLAYWRIGHT_CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean);
  const executablePath = candidates.find(c => fs.existsSync(c));
  return chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
}

export async function newSession(browser, appUrl, profile) {
  const fake = createFakeSupabase({ profile });
  const context = await browser.newContext({ serviceWorkers: 'block', acceptDownloads: true, viewport: { width: 420, height: 900 } });
  await context.route(SUPABASE_ORIGIN + '/**', fake.handle);
  context.setDefaultTimeout(8000);
  // Gerçek yazdırma penceresi sayfayı kilitler; testlerde window.print boş bırakılır (açılan pencereler dahil).
  await context.addInitScript(() => { window.print = () => {}; });
  // Service Worker bu testte kapalı; çevrimdışı önbellek denetimi gerçek tarayıcıda SW ile yapılır.
  await context.addInitScript(() => { if ('caches' in window) window.caches.match = async () => new Response('x'); });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message + ' @ ' + String(e.stack).split(String.fromCharCode(10)).slice(1, 3).join(' | ')));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(appUrl);
  return { fake, context, page, errors };
}

export function createReporter() {
  const results = [];
  return {
    results,
    async step(name, fn) {
      const t = Date.now();
      try { await fn(); results.push({ name, ok: true, ms: Date.now() - t }); console.log('  ✓', name); }
      catch (e) { results.push({ name, ok: false, error: String(e.message).split('\n')[0] }); console.log('  ✗', name, '\n     →', String(e.message).split('\n')[0]); }
    },
    summary() { const bad = results.filter(r => !r.ok); console.log(`\n${results.length - bad.length}/${results.length} adım geçti`); return bad.length; },
  };
}
