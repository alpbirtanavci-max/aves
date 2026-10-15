// Duman testi için bellek içi sahte Supabase (PostgREST-lite). Gerçek sunucuya hiç bağlanmaz.
// Sunucu tetikleyicisini taklit eder: her INSERT/UPDATE'te updated_at = now().
import { readFileSync } from 'node:fs';

export function createFakeSupabase({ profile, now = () => new Date().toISOString() }) {
  const tables = { denetimler: [], saha_kontrol: [], denetim_fotograflari: [], madde_kutuphanesi: [], denetim_degisim_gecmisi: [], kullanici_profilleri: [profile], kutuphane_bolum_surumleri: [] };
  // Madde kütüphanesi: repodaki gerçek tohum veri (uygulama >=900 madde ister).
  try {
    const seed = JSON.parse(readFileSync(new URL('../../data/madde_kutuphanesi.json', import.meta.url), 'utf8'));
    tables.madde_kutuphanesi.push(...seed.filter(r => r.aktif));
  } catch { /* kütüphane yoksa G akışı test edilemez */ }
  const log = [];
  const state = { offline: false, failNext: null, serverClock: 0 };
  let tick = 0;
  const stamp = () => { tick += 1; return new Date(Date.parse(now()) + tick).toISOString(); };

  function parseFilters(search) {
    const params = new URLSearchParams(search);
    const filters = [];
    for (const [k, v] of params) {
      if (['select', 'order', 'limit', 'offset'].includes(k)) continue;
      const m = /^(eq|ilike|is|in|neq)\.(.*)$/.exec(v);
      if (m) filters.push({ col: k, op: m[1], val: m[2] });
    }
    return { params, filters };
  }
  const matches = (row, filters) => filters.every(({ col, op, val }) => {
    const cell = row[col];
    if (op === 'eq') return String(cell) === val;
    if (op === 'neq') return String(cell) !== val;
    if (op === 'ilike') return String(cell ?? '').toLowerCase() === val.toLowerCase().replace(/%/g, '');
    if (op === 'is') return val === 'null' ? cell == null : String(cell) === val;
    return true;
  });

  const json = (status, body, extra = {}) => ({ status, contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', ...extra },
    body: JSON.stringify(body) });

  async function handle(route) {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    const entry = { method, path: url.pathname, query: url.search };
    log.push(entry);
    if (state.offline) return route.abort('internetdisconnected');
    if (state.failNext && state.failNext(entry)) { state.failNext = null; return route.fulfill(json(500, { message: 'enjekte edilen hata' })); }

    if (url.pathname === '/auth/v1/token') {
      return route.fulfill(json(200, { access_token: 'fake-access', refresh_token: 'fake-refresh', user: { email: profile.email } }));
    }
    if (url.pathname.startsWith('/storage/')) return route.fulfill(json(200, { Key: 'x' }));
    const m = /^\/rest\/v1\/([a-z_]+)$/.exec(url.pathname);
    if (!m || !tables[m[1]]) { entry.unhandled = true; return route.fulfill(json(404, { message: 'sahte sunucuda yok: ' + url.pathname })); }
    const table = tables[m[1]];
    const { params, filters } = parseFilters(url.search);

    if (method === 'GET') {
      let rows = table.filter(r => matches(r, filters));
      const limit = Number(params.get('limit') || 1000), offset = Number(params.get('offset') || 0);
      rows = rows.slice(offset, offset + limit);
      const sel = params.get('select');
      if (sel && sel !== '*') rows = rows.map(r => Object.fromEntries(sel.split(',').map(c => [c, r[c]])));
      return route.fulfill(json(200, rows));
    }
    let body = {};
    try { body = JSON.parse(req.postData() || '{}'); } catch { /* boş */ }
    if (method === 'POST') {
      const prefer = req.headers()['prefer'] || '';
      const incoming = Array.isArray(body) ? body : [body];
      for (const row of incoming) {
        const i = table.findIndex(r => (r.id ?? null) !== null && r.id === row.id);
        if (i >= 0) { if (!prefer.includes('ignore-duplicates')) table[i] = { ...table[i], ...row, updated_at: stamp() }; }
        else table.push({ ...row, updated_at: m[1] === 'denetimler' ? stamp() : row.updated_at });
      }
      return route.fulfill(json(201, []));
    }
    if (method === 'PATCH') {
      const hit = table.filter(r => matches(r, filters));
      for (const r of hit) Object.assign(r, body, { updated_at: stamp() });
      return route.fulfill(json(200, hit.map(r => ({ ...r }))));
    }
    if (method === 'DELETE') {
      const keep = table.filter(r => !matches(r, filters));
      table.length = 0; table.push(...keep);
      return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });
    }
    return route.fulfill(json(405, {}));
  }
  return { tables, log, state, handle };
}
