// Duman testi için bellek içi sahte Supabase (PostgREST-lite). Gerçek sunucuya hiç bağlanmaz.
// Sunucu tetikleyicisini taklit eder: her INSERT/UPDATE'te updated_at = now().
import { readFileSync } from 'node:fs';

export function createFakeSupabase({ profile, now = () => new Date().toISOString() }) {
  const tables = { denetimler: [], saha_kontrol: [], denetim_fotograflari: [], madde_kutuphanesi: [], denetim_degisim_gecmisi: [], kullanici_profilleri: [profile], kutuphane_bolum_surumleri: [], cihaz_senkron_durumu: [], denetim_teknik_pdf: [] };
  // Özel depolama: yol -> bayt (yalnız teknik PDF kovası gerçekçi; diğer kovalar eskisi gibi 200 döner).
  const storage = new Map();
  // Madde kütüphanesi: repodaki gerçek tohum veri (uygulama >=900 madde ister).
  try {
    const seed = JSON.parse(readFileSync(new URL('../../data/madde_kutuphanesi.json', import.meta.url), 'utf8'));
    tables.madde_kutuphanesi.push(...seed.filter(r => r.aktif));
  } catch { /* kütüphane yoksa G akışı test edilemez */ }
  const log = [];
  const state = { offline: false, failNext: null, serverClock: 0 };

  // ÜRETİM VERİTABANININ GERÇEK CHECK KISITLARI (pg_constraint'ten okundu). Sahte sunucu bunları uygulamazsa
  // sunucuya özgü ret (ör. Makine dairesi boş → 23514) CI'da görünmez; gerçek olayda veri 30 gün cihazda takılı kaldı.
  // Ret biçimi PostgREST ile aynıdır: 400 + {"code":"23514","message":"new row for relation ... violates check constraint ..."}.
  const bosMu = v => v === null || v === undefined;
  const listede = (v, liste) => bosMu(v) || liste.includes(v);
  const nesneMi = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const DENETIM_KISITLARI = [
    ['denetimler_a3_only_module_g_check', r => r.ana_standart !== '81-1/2+A3' || (r.kontrol_profili === 'modul_g_tam' && listede(r.modul, ['Modül G']) && listede(r.denetim_turu, ['Modül G - Birim Doğrulaması']))],
    ['denetimler_bina_asansor_sayisi_check', r => bosMu(r.bina_asansor_sayisi) || r.bina_asansor_sayisi > 0],
    ['denetimler_denetim_durumu_check', r => ['Devam Ediyor', 'Gözden Geçirme', 'Çalışma Tamamlandı'].includes(r.denetim_durumu)],
    ['denetimler_denetim_form_kayitlari_object_check', r => bosMu(r.denetim_form_kayitlari) || nesneMi(r.denetim_form_kayitlari)],
    ['denetimler_denetim_turu_check', r => listede(r.denetim_turu, ['Modül G - Birim Doğrulaması', 'Modül E - Gözetim Saha Teyidi', 'Modül H1 - Gözetim Saha Teyidi', 'Modül B - AB Tip İncelemesi'])],
    ['denetimler_duzeltme_nedeni_check', r => listede(r.duzeltme_nedeni, ['Yanlış seçim düzeltmesi', 'Eksik bilgi tamamlama', 'Saha notu düzeltmesi'])],
    ['denetimler_form_cikti_snapshot_object_chk', r => bosMu(r.form_cikti_snapshot) || nesneMi(r.form_cikti_snapshot)],
    ['denetimler_kabin_giris_duzeni_check', r => listede(r.kabin_giris_duzeni, ['Tek giriş', 'Karşılıklı giriş', 'Bitişik duvarlarda giriş'])],
    ['denetimler_kabin_kapi_acilma_tipi_check', r => listede(r.kabin_kapi_acilma_tipi, ['Teleskopik', 'Merkezi'])],
    ['denetimler_kontrol_profili_check', r => listede(r.kontrol_profili, ['modul_g_tam', 'saha_teyidi_e', 'saha_teyidi_h1', 'modul_b_tip_inceleme'])],
    // NOT VALID: yalnız yeni/güncellenen satırlara uygulanır (eski boş kayıtlar geçerli kalır).
    ['denetimler_makine_dairesi_r15c_check', r => ['MR', 'MRL'].includes(r.makine_dairesi_tipi)],
    ['denetimler_seri_numaralari_object_check', r => bosMu(r.seri_numaralari) || nesneMi(r.seri_numaralari)],
    ['denetimler_teknik_dosya_kayitlari_object_check', r => bosMu(r.teknik_dosya_kayitlari) || nesneMi(r.teknik_dosya_kayitlari)],
  ];
  const MADDE_KISITLARI = [
    ['saha_kontrol_durum_check', r => listede(r.durum, ['Kontrol tamamlandı', 'Olumsuz bulgu', 'Uygulanmaz'])],
    ['saha_kontrol_esik_operator_check', r => listede(r.esik_operator, ['>=', '<='])],
    ['saha_kontrol_gozden_gecirme_nedeni_check', r => listede(r.gozden_gecirme_nedeni, ['Sonra tekrar bakılacak', 'Erişim sağlanacak', 'Ortam / aydınlatma düzeltilecek', 'Teknik bilgi doğrulanacak', 'Diğer'])],
  ];
  const ihlal = (tablo, satir) => {
    const liste = tablo === 'denetimler' ? DENETIM_KISITLARI : tablo === 'saha_kontrol' ? MADDE_KISITLARI : [];
    const hit = liste.find(([, uygun]) => !uygun(satir));
    return hit ? hit[0] : null;
  };
  const kisitHatasi = (tablo, ad) => json(400, { code: '23514', details: null, hint: null, message: `new row for relation "${tablo}" violates check constraint "${ad}"` });
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
    const TEKNIK = '/storage/v1/object/denetim-teknik-dosyalari/';
    const TEKNIK_OKU = '/storage/v1/object/authenticated/denetim-teknik-dosyalari/';
    if (method === 'POST' && url.pathname.startsWith(TEKNIK)) {
      storage.set(decodeURIComponent(url.pathname.slice(TEKNIK.length)), req.postDataBuffer());
      return route.fulfill(json(200, { Key: 'denetim-teknik-dosyalari' }));
    }
    if (method === 'GET' && url.pathname.startsWith(TEKNIK_OKU)) {
      const bytes = storage.get(decodeURIComponent(url.pathname.slice(TEKNIK_OKU.length)));
      if (!bytes) return route.fulfill(json(404, { message: 'nesne yok' }));
      return route.fulfill({ status: 200, contentType: 'application/pdf', headers: { 'access-control-allow-origin': '*' }, body: bytes });
    }
    if (method === 'DELETE' && url.pathname === '/storage/v1/object/denetim-teknik-dosyalari') {
      let silinecek = [];
      try { silinecek = JSON.parse(req.postData() || '{}').prefixes || []; } catch { /* boş */ }
      silinecek.forEach(p => storage.delete(p));
      return route.fulfill(json(200, silinecek.map(name => ({ name }))));
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
      if (!state.kisitlariKapat) {
        for (const row of incoming) {
          const mevcut = table.find(r => r.id !== undefined && r.id === row.id);
          const ad = ihlal(m[1], { ...(mevcut || {}), ...row });
          if (ad) return route.fulfill(kisitHatasi(m[1], ad));
        }
      }
      if (state.dogrulaOrnek && m[1] === 'denetimler' && incoming.some(row => row.ornek_alan === 'gecersiz')) {
        return route.fulfill(json(400, { code: '23514', details: null, hint: null,
          message: 'new row for relation "denetimler" violates check constraint "denetimler_ornek_alan_check"' }));
      }
      if (state.dogrulaMd && m[1] === 'denetimler' && incoming.some(row => !['MR', 'MRL'].includes(row.makine_dairesi_tipi))) {
        // Gerçek sunucunun migration 21 kısıtı: Makine dairesi MR/MRL olmalı (PostgREST 400 + 23514).
        return route.fulfill(json(400, { code: '23514', details: null, hint: null,
          message: 'new row for relation "denetimler" violates check constraint "denetimler_makine_dairesi_r15c_check"' }));
      }
      for (const row of incoming) {
        if (m[1] === 'cihaz_senkron_durumu') {
          // Sunucu tetikleyicisi: e-posta oturumdan, zaman sunucudan; (email, cihaz_id) birincil anahtar.
          const yeni = { ...row, email: profile.email, bildirildi_at: now() };
          const k = table.findIndex(r => r.email === profile.email && r.cihaz_id === row.cihaz_id);
          if (k >= 0) table[k] = { ...table[k], ...yeni }; else table.push(yeni);
          continue;
        }
        if (m[1] === 'denetim_teknik_pdf') {
          // Birincil anahtar denetim_id; upsert tek satırı değiştirir, sunucu saatini yazar.
          const k = table.findIndex(r => r.denetim_id === row.denetim_id);
          const yeni = { ...row, updated_at: now() };
          if (k >= 0) table[k] = { ...table[k], ...yeni }; else table.push(yeni);
          continue;
        }
        const i = table.findIndex(r => (r.id ?? null) !== null && r.id === row.id);
        if (i >= 0) { if (!prefer.includes('ignore-duplicates')) table[i] = { ...table[i], ...row, updated_at: stamp() }; }
        else table.push({ ...row, updated_at: m[1] === 'denetimler' ? stamp() : row.updated_at });
      }
      return route.fulfill(json(201, []));
    }
    if (method === 'PATCH') {
      const hit = table.filter(r => matches(r, filters));
      if (!state.kisitlariKapat) {
        for (const r of hit) { const ad = ihlal(m[1], { ...r, ...body }); if (ad) return route.fulfill(kisitHatasi(m[1], ad)); }
      }
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
  return { tables, log, state, storage, handle };
}
