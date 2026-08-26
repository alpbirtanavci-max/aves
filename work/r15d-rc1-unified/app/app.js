/* ============================================================
   AVES Saha Denetim R15D — Kararlı offline-first uygulama çekirdeği
   Katmanlar: DB (IndexedDB) → API (Supabase REST) → Sync → UI
   ============================================================ */
'use strict';

const CONFIG = {
  url: 'https://jmccmkqyncunpqliqvox.supabase.co',
  key: 'sb_publishable_WVlR6u3sfDiu8V121t4x-Q_4yxHCJ2W',
};

const APP_VERSION = 'R15D-rc3.9.7';
const DB_VERSION = 3;
const OFFLINE_CORE_ASSETS = [
  './', './index.html', './section-mapping.js', './app.js', './manifest.json',
  './logo.png', './aves-logo-white.png',
  './fonts/Inter-latin-ext.woff2', './fonts/Inter-latin.woff2',
  './fonts/Montserrat-latin-ext.woff2', './fonts/Montserrat-latin.woff2',
];

if (typeof avesFizikselBolumUygula !== 'function' ||
    typeof AVES_FIZIKSEL_BOLUM_ESLEMESI !== 'object' ||
    Object.keys(AVES_FIZIKSEL_BOLUM_ESLEMESI).length !== 70) {
  throw new Error('AVES fiziksel bölüm eşlemesi yüklenemedi');
}

// AVES saha checklist sonucu yalnız üçlüdür. "Kontrol edilemedi / Veri eksik"
// denetim sonucu değildir; eski kayıtlar R15C geçişinde iç kontrol notuna taşınır.
const DURUMLAR = ['Kontrol tamamlandı','Olumsuz bulgu','Uygulanmaz'];
const DURUM_CSS = {'Kontrol tamamlandı':'ok','Olumsuz bulgu':'bad','Uygulanmaz':'na'};
const DURUM_KISA = {'Kontrol tamamlandı':'✓ Uygun','Olumsuz bulgu':'✗ Uygun Değil','Uygulanmaz':'— Uygulanmaz'};
const FOTO_HATIRLATMALARI = {
  '01 - Kuyu Dibi': 'Kabin ve karşı ağırlık tamponlarının etiket fotoğraflarını çekmeyi unutmayın.',
  '03 - Kabin ve Kabin Üstü': 'Paraşüt fren ve kat kapılarının etiket fotoğraflarını çekmeyi unutmayın.',
  '05 - Elektrik ve Test': 'Kumanda kartı etiketinin fotoğrafını çekmeyi unutmayın.',
};
// Ana durum butonlarının kopyası olan genel bulgu seçenekleri — Uygun Değil altında gösterilmez
const GENEL_BULGULAR = ['Belirgin olumsuzluk yok','Olumsuz durum görüldü','Belirgin kusur görülmedi','2.000 mm altında ve belirgin kusur yok','8.8 veya üzeri','Kontrol edilemedi','Uygulanmaz','Aranmaz','Diğer bulgu'];


const DENETIM_TURLERI = {
  MODUL_G: 'Modül G - Birim Doğrulaması',
  MODUL_E: 'Modül E - Gözetim Saha Teyidi',
  MODUL_H1: 'Modül H1 - Gözetim Saha Teyidi',
};
const KONTROL_PROFILLERI = {
  TAM: 'modul_g_tam',
  SAHA_TEYIDI_E: 'saha_teyidi_e',
  SAHA_TEYIDI_H1: 'saha_teyidi_h1',
};

/* ================= IndexedDB ================= */
const DB = (() => {
  let db = null;
  function open() {
    return new Promise((res, rej) => {
      const req = indexedDB.open('aves-saha', DB_VERSION);
      req.onupgradeneeded = (e) => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
        if (!d.objectStoreNames.contains('kutuphane')) d.createObjectStore('kutuphane', { keyPath: 'madde_id' });
        if (!d.objectStoreNames.contains('denetimler')) d.createObjectStore('denetimler', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('saha')) {
          const s = d.createObjectStore('saha', { keyPath: 'id' });
          s.createIndex('byDenetim', 'denetim_id');
        } else {
          const s = e.target.transaction.objectStore('saha');
          if (!s.indexNames.contains('byDenetim')) s.createIndex('byDenetim', 'denetim_id');
        }
        if (!d.objectStoreNames.contains('outbox')) {
          d.createObjectStore('outbox', { keyPath: 'seq', autoIncrement: true });
        }
        if (!d.objectStoreNames.contains('gecmis')) {
          const h = d.createObjectStore('gecmis', { keyPath: 'id' });
          h.createIndex('byDenetim', 'denetim_id');
        } else {
          const h = e.target.transaction.objectStore('gecmis');
          if (!h.indexNames.contains('byDenetim')) h.createIndex('byDenetim', 'denetim_id');
        }
      };
      req.onsuccess = () => { db = req.result; res(); };
      req.onerror = () => rej(req.error);
    });
  }
  function tx(store, mode) { return db.transaction(store, mode).objectStore(store); }
  const p = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  return {
    open,
    kvGet: (k) => p(tx('kv','readonly').get(k)),
    kvSet: (k, v) => p(tx('kv','readwrite').put(v, k)),
    kvDel: (k) => p(tx('kv','readwrite').delete(k)),
    put: (store, obj) => p(tx(store,'readwrite').put(obj)),
    putAll: (store, arr) => new Promise((res, rej) => {
      const t = db.transaction(store,'readwrite'); const s = t.objectStore(store);
      arr.forEach(o => s.put(o));
      t.oncomplete = res; t.onerror = () => rej(t.error);
    }),
    replaceAll: (store, arr) => new Promise((res, rej) => {
      const t = db.transaction(store, 'readwrite');
      const s = t.objectStore(store);
      s.clear();
      arr.forEach(o => s.put(o));
      t.oncomplete = res;
      t.onerror = () => rej(t.error || new Error(`${store} yenileme işlemi başarısız`));
      t.onabort = () => rej(t.error || new Error(`${store} yenileme işlemi iptal edildi`));
    }),
    replaceAllWithMeta: (store, arr, meta) => new Promise((res, rej) => {
      const t = db.transaction([store, 'kv'], 'readwrite');
      const s = t.objectStore(store);
      const kv = t.objectStore('kv');
      s.clear();
      arr.forEach(o => s.put(o));
      Object.entries(meta).forEach(([key, value]) => kv.put(value, key));
      t.oncomplete = res;
      t.onerror = () => rej(t.error || new Error(`${store} ve manifest yenileme işlemi başarısız`));
      t.onabort = () => rej(t.error || new Error(`${store} ve manifest yenileme işlemi iptal edildi`));
    }),
    replaceByIndex: (store, indexName, indexValue, arr) => new Promise((res, rej) => {
      const t = db.transaction(store, 'readwrite');
      const s = t.objectStore(store);
      const request = s.index(indexName).openKeyCursor(IDBKeyRange.only(indexValue));
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          s.delete(cursor.primaryKey);
          cursor.continue();
          return;
        }
        arr.forEach(o => s.put(o));
      };
      request.onerror = () => t.abort();
      t.oncomplete = res;
      t.onerror = () => rej(t.error || new Error(`${store} bölüm yenileme işlemi başarısız`));
      t.onabort = () => rej(t.error || new Error(`${store} bölüm yenileme işlemi iptal edildi`));
    }),
    putAllWithOutbox: (store, arr, outboxItem, historyItems = [], historyOutboxItem = null) => new Promise((res, rej) => {
      const stores = historyItems.length ? [store, 'outbox', 'gecmis'] : [store, 'outbox'];
      const t = db.transaction(stores, 'readwrite');
      const localStore = t.objectStore(store);
      const outbox = t.objectStore('outbox');
      arr.forEach(o => localStore.put(o));
      outbox.add(outboxItem);
      if (historyItems.length) {
        const history = t.objectStore('gecmis');
        historyItems.forEach(item => history.put(item));
        if (historyOutboxItem) outbox.add(historyOutboxItem);
      }
      t.oncomplete = () => res(outboxItem.operation_id);
      t.onerror = () => rej(t.error || new Error('Yerel kayıt işlemi başarısız'));
      t.onabort = () => rej(t.error || new Error('Yerel kayıt işlemi iptal edildi'));
    }),
    get: (store, key) => p(tx(store,'readonly').get(key)),
    all: (store) => p(tx(store,'readonly').getAll()),
    allByIndex: (store, idx, val) => p(tx(store,'readonly').index(idx).getAll(val)),
    del: (store, key) => p(tx(store,'readwrite').delete(key)),
    clear: (store) => p(tx(store,'readwrite').clear()),
    outboxAdd: (item) => p(tx('outbox','readwrite').add(item)),
    outboxPut: (item) => p(tx('outbox','readwrite').put(item)),
    outboxAll: () => p(tx('outbox','readonly').getAll()),
    outboxDel: (seq) => p(tx('outbox','readwrite').delete(seq)),
    outboxCount: () => p(tx('outbox','readonly').count()),
  };
})();

let cachedDeviceId = null;
async function getDeviceId() {
  if (cachedDeviceId) return cachedDeviceId;
  cachedDeviceId = await DB.kvGet('device_id');
  if (!cachedDeviceId) {
    cachedDeviceId = crypto.randomUUID();
    await DB.kvSet('device_id', cachedDeviceId);
  }
  return cachedDeviceId;
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

/* ================= Supabase REST ================= */
const API = (() => {
  let session = null;
  async function loadSession() { session = await DB.kvGet('session') || null; return session; }
  async function saveSession(s) { session = s; if (s) await DB.kvSet('session', s); else await DB.kvDel('session'); }

  async function authFetch(path, opts = {}, retry = true) {
    const headers = Object.assign({
      'apikey': CONFIG.key,
      'Content-Type': 'application/json',
    }, opts.headers || {});
    if (session) headers['Authorization'] = 'Bearer ' + session.access_token;
    const resp = await fetch(CONFIG.url + path, Object.assign({}, opts, { headers }));
    if (resp.status === 401 && retry && session && session.refresh_token) {
      const ok = await refresh();
      if (ok) return authFetch(path, opts, false);
    }
    return resp;
  }

  async function login(email, password) {
    const resp = await fetch(CONFIG.url + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { 'apikey': CONFIG.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error_description || data.msg || 'Giriş başarısız');
    await saveSession({ access_token: data.access_token, refresh_token: data.refresh_token, email: data.user.email });
    return session;
  }

  async function refresh() {
    try {
      const resp = await fetch(CONFIG.url + '/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        headers: { 'apikey': CONFIG.key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      });
      if (!resp.ok) return false;
      const data = await resp.json();
      await saveSession({ access_token: data.access_token, refresh_token: data.refresh_token, email: data.user.email });
      return true;
    } catch { return false; }
  }

  async function logout() { await saveSession(null); }

  async function select(table, query) {
    const resp = await authFetch(`/rest/v1/${table}?${query}`, { method: 'GET' });
    if (!resp.ok) {
      const err = new Error(`${table} okunamadı (${resp.status})`);
      err.status = resp.status;
      throw err;
    }
    return resp.json();
  }

  async function selectPaged(table, query, pageSize = 500) {
    const all = [];
    let offset = 0;
    while (true) {
      const pageQuery = `${query}${query ? '&' : ''}limit=${pageSize}&offset=${offset}`;
      const rows = await select(table, pageQuery);
      all.push(...rows);
      if (rows.length < pageSize) break;
      offset += pageSize;
    }
    return all;
  }

  async function upsert(table, rows) {
    const resp = await authFetch(`/rest/v1/${table}`, {
      method: 'POST',
      // Geçmiş eklemeli ve değiştirilemezdir. Belirsiz ağ sonucundan sonra aynı
      // olay yeniden gönderilirse mevcut satırı UPDATE etmeye çalışmadan geçilir.
      headers: { 'Prefer': `${table === 'denetim_degisim_gecmisi' ? 'resolution=ignore-duplicates' : 'resolution=merge-duplicates'},return=minimal` },
      body: JSON.stringify(rows),
    });
    if (!resp.ok) {
      const t = await resp.text();
      const err = new Error(`${table} yazılamadı (${resp.status}): ${t.slice(0,200)}`);
      err.status = resp.status;
      throw err;
    }
  }

  async function del(table, filter) {
    const resp = await authFetch(`/rest/v1/${table}?${filter}`, { method: 'DELETE' });
    if (!resp.ok) {
      const err = new Error(`${table} silinemedi (${resp.status})`);
      err.status = resp.status;
      throw err;
    }
  }

  return { loadSession, login, logout, select, selectPaged, upsert, del,
    get email() { return session ? session.email : null; },
    get loggedIn() { return !!session; } };
})();

/* ================= Kullanıcı profili ================= */
const Profile = (() => {
  let current = null;

  function normalize(profile) {
    if (!profile) return null;
    const email = (profile.email || '').toLowerCase();
    return Object.assign({}, profile, {
      email,
      // Yetki kaynağı yalnız sunucudaki profil kaydıdır. Eski çevrimdışı
      // önbelleklerde rol yoksa güvenli varsayılan mühendis olur.
      rol: ['yonetici','teknik_mudur','muhendis'].includes(profile.rol) ? profile.rol : 'muhendis',
    });
  }

  async function load() {
    const cached = normalize(await DB.kvGet('user_profile'));
    try {
      const email = (API.email || '').toLowerCase();
      const rows = await API.select(
        'kullanici_profilleri',
        `select=email,ad_soyad,aktif,rol&email=eq.${encodeURIComponent(email)}&aktif=eq.true&limit=1`
      );
      if (!rows.length) throw new Error('PROFILE_NOT_FOUND');
      current = normalize(rows[0]);
      await DB.kvSet('user_profile', current);
      await DB.kvSet('profile_verified_at', new Date().toISOString());
      await DB.kvSet('profile_verified_email', current.email);
      return current;
    } catch (e) {
      if (e.message !== 'PROFILE_NOT_FOUND' && cached && cached.aktif !== false &&
          (cached.email || '').toLowerCase() === (API.email || '').toLowerCase()) {
        current = cached;
        return current;
      }
      throw e;
    }
  }

  function clear() { current = null; }

  return {
    load, clear,
    get name() { return current ? current.ad_soyad : ''; },
    get email() { return current ? current.email : ''; },
    get role() { return current ? current.rol : 'muhendis'; },
    get isAdmin() { return !!current && current.rol === 'yonetici'; },
    get isTechnicalManager() { return !!current && current.rol === 'teknik_mudur'; },
    // Teknik müdür sahaya çıkıp kendi denetimini oluşturabilir; sistem içeriğini
    // yönetemez. Tüm denetimleri görme, düzeltme ve silme yetkileri ayrıca tanımlıdır.
    get canManage() { return !!current && current.rol === 'yonetici'; },
    get canSeeAllInspections() { return !!current && (current.rol === 'yonetici' || current.rol === 'teknik_mudur'); },
    get canCorrectInspections() { return !!current && (current.rol === 'yonetici' || current.rol === 'teknik_mudur'); },
    get canCreate() { return !!current && ['yonetici','teknik_mudur','muhendis'].includes(current.rol); },
    get canDelete() { return !!current && (current.rol === 'yonetici' || current.rol === 'teknik_mudur'); },
  };
})();

/* ================= Sync ================= */
const Sync = (() => {
  let running = false;
  let pushRunning = false;
  let pushTimer = null;

  async function updatePill() {
    const pill = document.getElementById('syncPill');
    const label = document.getElementById('syncLabel');
    if (!pill || !label) return;
    const n = await DB.outboxCount();
    const warning = await DB.kvGet('sync_warning');
    if (!navigator.onLine) {
      pill.className = 'syncpill offline';
      label.textContent = n > 0 ? `Çevrimdışı · ${n} bekliyor` : 'Çevrimdışı';
    } else if (warning) {
      pill.className = 'syncpill error';
      label.textContent = warning.kind === 'conflict' ? 'Çakışma uyarısı' : 'Yetki uyarısı';
    } else if (n > 0) {
      pill.className = 'syncpill pending';
      label.textContent = `${n} bekliyor`;
    } else {
      pill.className = 'syncpill';
      label.textContent = 'Senkron';
    }
  }

  async function pendingRows(table) {
    const items = await DB.outboxAll();
    const map = new Map();
    for (const item of items) {
      if (item.table !== table || item.op === 'delete') continue;
      for (const row of (item.rows || [])) if (row && row.id) map.set(row.id, row);
    }
    return map;
  }

  async function pushOutbox() {
    // Başka bir gönderim sürüyorsa bunu "tamamlandı" sayma; aksi halde eşzamanlı
    // full() çağrısı henüz gönderilmemiş yerel kayıtların üstüne PULL yapabilir.
    if (pushRunning) return false;
    if (!navigator.onLine || !API.loggedIn) return false;
    pushRunning = true;
    let allSent = true;
    try {
      const items = (await DB.outboxAll()).filter(item =>
        !item.sync_status || ['pending', 'retry', 'sending'].includes(item.sync_status)
      );
      for (const item of items) {
        try {
          item.sync_status = 'sending';
          item.attempt_count = (item.attempt_count || 0) + 1;
          item.last_attempt_at = new Date().toISOString();
          await DB.outboxPut(item);
          if (item.op === 'delete') {
            await API.del(item.table, item.filter);
            const m = (item.filter || '').match(/id=eq\.(.+)/);
            if (m) {
              const deleted = (await DB.kvGet('deleted_ids')) || [];
              await DB.kvSet('deleted_ids', deleted.filter(x => x !== m[1]));
            }
          } else {
            await API.upsert(item.table, item.rows);
          }
          await DB.outboxDel(item.seq);
        } catch (e) {
          if (e.status === 403) {
            item.sync_status = 'forbidden';
            item.last_error_code = 403;
            item.last_error_message = e.message;
            await DB.outboxPut(item);
            const warning = {
              kind: 'forbidden',
              message: 'Yetki uyuşmazlığı olan yerel kayıt silinmedi; inceleme gerekiyor.',
              ts: Date.now(),
            };
            await DB.kvSet('sync_warning', warning);
            console.warn('Yetkisiz senkron işlemi cihazda korundu:', item.table);
            toast(warning.message);
            allSent = false;
            break;
          }
          if (e.status === 409) {
            item.sync_status = 'conflict';
            item.last_error_code = 409;
            item.last_error_message = e.message;
            await DB.outboxPut(item);
            const warning = {
              kind: 'conflict',
              message: 'Aynı kayıt başka bir cihazda değişmiş olabilir. Yerel cevap silinmedi; çakışma incelemesi gerekiyor.',
              ts: Date.now(),
            };
            await DB.kvSet('sync_warning', warning);
            console.warn('Senkron çakışması cihazda korundu:', item.table);
            toast(warning.message);
            allSent = false;
            break;
          }
          item.sync_status = 'retry';
          item.last_error_code = e.status || null;
          item.last_error_message = e.message;
          await DB.outboxPut(item);
          allSent = false;
          console.warn('Senkron duraksadı:', e.message);
          break; // sıra korunur; sonraki denemede kaldığı yerden devam
        }
        await updatePill();
      }
    } finally {
      pushRunning = false;
      await updatePill();
      if (typeof UI !== 'undefined' && UI.refresh && UI.canRefreshSafely()) UI.refresh();
    }
    return allSent && (await DB.outboxCount()) === 0;
  }

  function schedulePush(delay = 900) {
    if (!navigator.onLine || !API.loggedIn) { updatePill(); return; }
    clearTimeout(pushTimer);
    pushTimer = setTimeout(async () => {
      await pushOutbox();
      const retryableItems = (await DB.outboxAll()).filter(item =>
        !item.sync_status || ['pending', 'retry', 'sending'].includes(item.sync_status)
      );
      if (retryableItems.length) {
        const maxAttempt = Math.max(...retryableItems.map(item => item.attempt_count || 0));
        const backoff = Math.min(60000, 1800 * (2 ** Math.min(maxAttempt, 5)));
        schedulePush(backoff);
      }
    }, delay);
  }

  const KUTUPHANE_VER = 10; // R15D: 81-71/81-73 fiziksel bölüm güvenlik eşlemesi
  const surumAnahtari = (rows) => (rows || [])
    .slice()
    .sort((a,b) => (a.bolum || '').localeCompare(b.bolum || ''))
    .map(r => `${r.bolum}:${r.surum}`)
    .join('|');

  async function sunucuBolumSurumleri() {
    const rows = await API.select(
      'kutuphane_bolum_surumleri',
      'select=bolum,surum,updated_at&order=bolum.asc&limit=100'
    );
    return { rows, key: surumAnahtari(rows) };
  }

  async function pullKutuphane(force = false) {
    const have = await DB.kvGet('kutuphane_ok');
    const ver = await DB.kvGet('kutuphane_ver');
    const localServerKey = await DB.kvGet('kutuphane_sunucu_surumleri');
    let server = null;
    try {
      server = await sunucuBolumSurumleri();
    } catch (e) {
      console.warn('Bölüm sürümü okunamadı; doğrudan kütüphane senkronu denenecek:', e.message);
    }
    const serverChanged = !!server && server.key !== localServerKey;
    if (have && ver === KUTUPHANE_VER && !force && !serverChanged) return;
    try {
      const rows = await API.selectPaged('madde_kutuphanesi', 'select=*&aktif=eq.true&order=sira_no.asc,madde_id.asc');
      const temiz = rows
        .filter(r => r.madde_id !== 'MAD-1010')
        .map(avesFizikselBolumUygula);
      const ids = temiz.map(r => r.madde_id);
      if (temiz.length < 900 || ids.some(id => !id) || new Set(ids).size !== ids.length) {
        throw new Error(`Kütüphane bütünlük kontrolü başarısız (${temiz.length} kayıt)`);
      }
      const contentHash = await sha256Hex(JSON.stringify(temiz));
      await DB.replaceAllWithMeta('kutuphane', temiz, {
        kutuphane_ok: Date.now(),
        kutuphane_ver: KUTUPHANE_VER,
        kutuphane_manifest: {
          count: temiz.length,
          content_hash: contentHash,
          verified_at: new Date().toISOString(),
          server_revision_key: server ? server.key : null,
        },
        ...(server ? { kutuphane_sunucu_surumleri: server.key } : {}),
      });
    } catch (e) {
      if (!have) throw e;
      console.warn('Kütüphane yenilenemedi; cihazdaki son başarılı kopya kullanılıyor:', e.message);
    }
  }

  async function pullDenetimler() {
    const rows = await API.selectPaged('denetimler', 'select=*&order=created_at.desc');
    const deleted = (await DB.kvGet('deleted_ids')) || [];
    const localRows = await DB.all('denetimler');
    const pending = await pendingRows('denetimler');
    const merged = new Map(rows.filter(r => !deleted.includes(r.id)).map(r => [r.id, r]));
    // Sunucunun eksik/boş yanıtı açık bir silme bildirimi değildir. Yerel kayıtlar,
    // bu cihazın doğrulanmış silme listesinde olmadıkça korunur.
    for (const row of localRows) {
      if (!deleted.includes(row.id) && !merged.has(row.id)) merged.set(row.id, row);
    }
    for (const [id,row] of pending) merged.set(id,row);
    await DB.replaceAll('denetimler', [...merged.values()]);
  }

  async function pullSaha(denetimId) {
    const rows = await API.selectPaged('saha_kontrol', `select=*&denetim_id=eq.${denetimId}&order=sira_no.asc,madde_id.asc`);
    const localRows = await DB.allByIndex('saha', 'byDenetim', denetimId);
    const pending = await pendingRows('saha_kontrol');
    // Checklist satırı ürün kararı gereği silinmez. Sunucudan eksik sayfa gelmesi,
    // cihazdaki sağlam snapshot'ın silinmesine yol açamaz.
    const merged = new Map(localRows.map(r => [r.id, r]));
    for (const row of rows) merged.set(row.id, row);
    for (const [id,row] of pending) if (row.denetim_id === denetimId) merged.set(id,row);
    await DB.replaceByIndex('saha', 'byDenetim', denetimId, [...merged.values()]);
  }

  async function pullGecmis(denetimId) {
    const rows = await API.selectPaged(
      'denetim_degisim_gecmisi',
      `select=*&denetim_id=eq.${denetimId}&order=created_at.desc`
    );
    const localRows = await DB.allByIndex('gecmis', 'byDenetim', denetimId);
    const pending = await pendingRows('denetim_degisim_gecmisi');
    const merged = new Map(localRows.map(row => [row.id, row]));
    for (const row of rows) merged.set(row.id, row);
    for (const [id,row] of pending) if (row.denetim_id === denetimId) merged.set(id,row);
    await DB.replaceByIndex('gecmis', 'byDenetim', denetimId, [...merged.values()]);
  }

  async function full() {
    if (running || !navigator.onLine || !API.loggedIn) { await updatePill(); return false; }
    running = true;
    let completed = false;
    try {
      const sent = await pushOutbox();
      if (!sent) return false; // yerel değişiklik sunucuya gitmediyse PULL ile üzerine yazma
      await pullKutuphane();
      await pullDenetimler();
      if (UI.currentDenetimId) {
        await pullSaha(UI.currentDenetimId);
        await pullGecmis(UI.currentDenetimId);
      }
      completed = true;
    } catch (e) {
      console.warn('Senkron hatası:', e.message);
    } finally {
      running = false;
      await updatePill();
      if (UI.refresh && UI.canRefreshSafely()) UI.refresh();
    }
    return completed;
  }

  async function manual() {
    if (!navigator.onLine) { toast('Çevrimdışısınız — bağlantı gelince otomatik senkron olur'); return; }
    const warning = await DB.kvGet('sync_warning');
    if (warning) {
      toast(warning.message);
      return;
    }
    toast('Senkronize ediliyor…');
    const completed = await full();
    toast(completed ? 'Senkron tamamlandı' : 'Bazı kayıtlar cihazda korunuyor; yeniden denenecek');
  }

  function start() {
    window.addEventListener('online', full);
    window.addEventListener('offline', updatePill);
    setInterval(() => { pushOutbox(); }, 20000);
    updatePill();
  }

  return { full, manual, start, updatePill, pullSaha, pullGecmis, pullKutuphane, pushOutbox, schedulePush, sunucuBolumSurumleri };
})();

/* ================= Yerel yazma (local-first) ================= */
const GECMIS_ALANLARI = {
  denetimler: [
    'denetim_durumu', 'saha_tamamlandi_at', 'gozden_gecirme_at', 'calisma_tamamlandi_at',
    'offline_hazir_at', 'expected_item_count', 'expected_item_set_hash', 'butunluk_hash', 'seri_numaralari',
    'takip_ana_denetim_id', 'takip_onceki_denetim_id', 'takip_sira_no',
    'form_cikti_snapshot',
    'duzeltme_oturumu_id', 'duzeltme_nedeni', 'duzeltme_baslatildi_at',
  ],
  saha_kontrol: [
    'durum', 'denetci_gordu', 'bulgu_secenegi', 'diger_bulgu', 'aciklama',
    'olcu1_degeri', 'olcu2_degeri', 'olcum_degerleri', 'otomatik_uygulanmaz',
  ],
};

function gecmisDegeri(table, row) {
  const result = {};
  for (const field of (GECMIS_ALANLARI[table] || [])) result[field] = row ? (row[field] ?? null) : null;
  return result;
}

async function gecmisKayitlariHazirla(table, arr, store, now) {
  if (!GECMIS_ALANLARI[table]) return [];
  const events = [];
  for (const row of arr) {
    const before = await DB.get(store, row.id);
    const previous = gecmisDegeri(table, before);
    const next = gecmisDegeri(table, row);
    if (before && stableStringify(previous) === stableStringify(next)) continue;
    // İlk checklist üretimi 1000 ayrı geçmiş satırı oluşturmaz; denetimin
    // oluşturulması tek olay olarak kaydedilir. Sonraki her cevap değişikliği izlenir.
    if (!before && table === 'saha_kontrol') continue;
    const context = table === 'saha_kontrol'
      ? await DB.get('denetimler', row.denetim_id)
      : row;
    events.push({
      id: crypto.randomUUID(),
      denetim_id: table === 'saha_kontrol' ? row.denetim_id : row.id,
      saha_kontrol_id: table === 'saha_kontrol' ? row.id : null,
      madde_id: table === 'saha_kontrol' ? row.madde_id : null,
      islem_turu: before ? (table === 'saha_kontrol' ? 'madde_guncelleme' : 'denetim_guncelleme') : 'denetim_olusturma',
      onceki_deger: before ? previous : null,
      yeni_deger: next,
      degistiren_email: Profile.email || API.email || null,
      degistiren_ad: Profile.name || null,
      degistiren_rol: Profile.role || null,
      cihaz_id: await getDeviceId(),
      app_build_id: APP_VERSION,
      duzeltme_oturumu_id: context && context.duzeltme_oturumu_id ? context.duzeltme_oturumu_id : null,
      duzeltme_nedeni: context && context.duzeltme_nedeni ? context.duzeltme_nedeni : null,
      created_at: now,
    });
  }
  return events;
}

async function localWrite(table, rows, store) {
  const arr = Array.isArray(rows) ? rows : [rows];
  const operationId = crypto.randomUUID();
  const now = new Date().toISOString();
  const historyItems = await gecmisKayitlariHazirla(table, arr, store, now);
  for (const row of arr) {
    if (table === 'denetimler' || table === 'saha_kontrol') {
      row.son_degistiren_email = Profile.email || API.email || null;
      row.son_degistiren_ad = Profile.name || null;
      row.son_degistiren_rol = Profile.role || null;
      row.son_degistiren_at = now;
    }
  }
  const outboxItem = {
    operation_id: operationId,
    user_id: Profile.email || API.email || null,
    device_id: await getDeviceId(),
    inspection_id: table === 'saha_kontrol'
      ? (arr[0] && arr[0].denetim_id)
      : (arr[0] && arr[0].id),
    entity_type: table,
    entity_key: arr.length === 1 ? (arr[0].id || arr[0].madde_id || null) : null,
    operation_type: 'upsert',
    table,
    rows: arr,
    created_at: now,
    ts: Date.now(),
    attempt_count: 0,
    sync_status: 'pending',
  };
  const historyOutboxItem = historyItems.length ? {
    operation_id: crypto.randomUUID(),
    user_id: Profile.email || API.email || null,
    device_id: await getDeviceId(),
    inspection_id: historyItems[0].denetim_id,
    entity_type: 'denetim_degisim_gecmisi',
    entity_key: historyItems.length === 1 ? historyItems[0].id : null,
    operation_type: 'upsert',
    table: 'denetim_degisim_gecmisi',
    rows: historyItems,
    created_at: now,
    ts: Date.now(),
    attempt_count: 0,
    sync_status: 'pending',
  } : null;
  await DB.putAllWithOutbox(store, arr, outboxItem, historyItems, historyOutboxItem);
  await Sync.updatePill();
  if (typeof UI !== 'undefined' && UI.refreshSyncState) await UI.refreshSyncState();
  Sync.schedulePush();
  return operationId;
}

/* ================= UI ================= */
const UI = (() => {
  const app = document.getElementById('app');
  let currentDenetimId = null;
  let currentView = 'login';
  let filter = 'all';
  let search = '';
  let openBolums = new Set();
  let cursors = {}; // adım adım mod: bölüm -> gösterilen madde indeksi
  let autoAdvanceTimer = null;
  let transitioningId = null;
  let currentCanEdit = false;
  let inspectionReadOnly = false;
  let listSearch = '';
  let listDateFilter = 'all';
  const pendingEditorWrites = new Set();
  const editorDraftTimers = new Map();

  const esc = (s) => (s ?? '').toString().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const SERI_GRUPLARI = [
    ['kabin_tamponlari', 'Kabin tamponu', '01 - Kuyu Dibi'],
    ['karsi_agirlik_tamponlari', 'Karşı ağırlık tamponu', '01 - Kuyu Dibi'],
    ['parasut_frenleri', 'Paraşüt fren / güvenlik tertibatı', '03 - Kabin ve Kabin Üstü'],
    ['kat_kapilari', 'Kat kapısı', '03 - Kabin ve Kabin Üstü'],
    ['regulatorler', 'Regülatör', '04 - Makine ve Şase'],
    ['motorlar', 'Motor / tahrik makinesi', '04 - Makine ve Şase'],
    ['kumanda_kartlari', 'Kumanda kartı', '05 - Elektrik ve Test'],
    ['hidrolik_valf_grubu', 'Hidrolik valf grubu', '04 - Makine ve Şase'],
    ['boru_kirilma_valfleri', 'Boru kırılma valfi', '04 - Makine ve Şase'],
  ];

  function seriNumaralariNormalize(value) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const result = { schema_version: 1 };
    for (const [key] of SERI_GRUPLARI) {
      result[key] = Array.isArray(source[key])
        ? source[key].map(item => ({
          id: item && item.id ? item.id : crypto.randomUUID(),
          seri_no: item && item.seri_no ? String(item.seri_no) : '',
          ...(key === 'kat_kapilari' ? {
            kat: item && item.kat ? String(item.kat) : '',
            giris: item && item.giris ? String(item.giris) : '',
          } : {}),
        }))
        : [];
    }
    return result;
  }

  // Sayaç ve eksik listesi ana ekipman GRUBU bazında tutulur (kaç ayrı parça
  // türü, kaç durak/kat sayısı değil). Bir grup için tek bir seri no girilmesi
  // yeterlidir; kat kapısı gibi çok sayıda kayıt alınabilen gruplarda ek
  // kayıtlar (her kat için ayrı satır) denetçinin isteğine bağlı kalır.
  function seriNumarasiSayisi(d) {
    const data = seriNumaralariNormalize(d && d.seri_numaralari);
    return seriGereksinimleri(d).filter(([key]) => data[key].some(item => item.seri_no.trim())).length;
  }

  function seriGereksinimleri(d) {
    const requirements = [
      ['kabin_tamponlari', 'Kabin tamponu', 1],
      ['parasut_frenleri', 'Paraşüt fren / güvenlik tertibatı', 1],
      ['kat_kapilari', 'Kat kapısı', 1],
      ['kumanda_kartlari', 'Kumanda kartı', 1],
    ];
    if (d && d.tahrik_tipi === 'Elektrikli') requirements.splice(1, 0, ['karsi_agirlik_tamponlari', 'Karşı ağırlık tamponu', 1]);
    if (d && d.makine_dairesi_tipi === 'MRL') {
      requirements.push(['regulatorler', 'Regülatör', 1], ['motorlar', 'Motor / tahrik makinesi', 1]);
    }
    if (d && d.tahrik_tipi === 'Hidrolik') {
      requirements.push(
        ['hidrolik_valf_grubu', 'Hidrolik valf grubu', 1],
        ['boru_kirilma_valfleri', 'Boru kırılma valfi', 1],
      );
    }
    return requirements;
  }

  function seriBeklenenMinimum(d) {
    return seriGereksinimleri(d).length;
  }

  function seriEksikleri(d) {
    const data = seriNumaralariNormalize(d && d.seri_numaralari);
    return seriGereksinimleri(d).flatMap(([key, label]) => {
      const dolu = data[key].some(item => item.seri_no.trim());
      return dolu ? [] : [`${label}: eksik`];
    });
  }
  // Eski kütüphane alan adları geriye uyumluluk için korunur. Denetçiye
  // gösterilen AVES yönlendirmelerinde sonuç dili resmî üçlü yapıya çevrilir.
  const resmiSonucDili = (s) => (s ?? '').toString()
    .replace(/\bAranmaz\b/g, 'Uygulanmaz')
    .replace(/\baranmaz\b/g, 'uygulanmaz');
  const normEmail = (s) => (s || '').trim().toLowerCase();
  const localDateISO = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  };
  const siraKarsilastir = (a, b) => (a.sira_no - b.sira_no) || String(a.madde_id).localeCompare(String(b.madde_id), 'tr');
  const denetimSahibiMi = (d) => !!d && normEmail(d.olusturan_email) !== '' && normEmail(d.olusturan_email) === normEmail(Profile.email);
  const denetimGorunebilirMi = (d) => !!d && (Profile.canSeeAllInspections || denetimSahibiMi(d));
  const canEditDenetim = (d) => !!d && d.denetim_durumu !== 'Çalışma Tamamlandı' && (
    Profile.isAdmin || denetimSahibiMi(d) ||
    (Profile.isTechnicalManager && d.denetim_durumu === 'Gözden Geçirme' && normEmail(d.duzeltme_baslatan_email) === normEmail(Profile.email))
  );
  const canReopenDenetim = (d) => !!d && d.denetim_durumu === 'Çalışma Tamamlandı' && (Profile.canCorrectInspections || denetimSahibiMi(d));
  const canStartFollowup = (d) => !!d && d.denetim_durumu === 'Çalışma Tamamlandı' &&
    kontrolProfili(d) === KONTROL_PROFILLERI.TAM && Profile.canCreate && (Profile.isAdmin || denetimSahibiMi(d));
  const canDeleteDenetim = (d) => !!d && Profile.canDelete;

  async function cevrimdisiHazirlikDurumu(d, rows = []) {
    const marker = await DB.kvGet(`offline_ready_${d.id}`);
    if (!marker) return { ready: false, detail: 'Bu cihazda hazırlık kontrolü yapılmadı.' };
    if (marker.device_id !== await getDeviceId()) return { ready: false, detail: 'Hazırlık başka bir cihazda yapılmış.' };
    if (marker.app_build_id !== APP_VERSION) return { ready: false, detail: 'Uygulama güncellendi; bu cihazda tekrar kontrol edilmeli.' };
    if (!rows.length) return { ready: false, detail: 'Checklist maddeleri bu cihazda bulunmuyor.' };
    if (rows.length !== marker.expected_item_count) return { ready: false, detail: `${rows.length}/${marker.expected_item_count} madde cihazda.` };
    const itemSetHash = await sha256Hex(rows.map(row => row.madde_id).sort().join('|'));
    if (itemSetHash !== marker.item_set_hash) return { ready: false, detail: 'Cihazdaki madde kümesi hazırlanan kopyayla eşleşmiyor.' };
    return {
      ready: true,
      detail: `${rows.length} madde ve gerekli uygulama dosyaları bu cihazda doğrulandı.`,
      checkedAt: marker.checked_at,
    };
  }

  // TS EN 81-70 (erişilebilirlik), TS EN 81-71 (kasıtlı tahribata dayanıklılık)
  // ve TS EN 81-73 (yangın anında davranış) AVES saha denetiminin zorunlu
  // katmanlarıdır. Denetçi bunları ek standart olarak seçip kaldıramaz;
  // uygulanabilirlik (örn. bina yüksekliği eşiği) her bölümün kendi ilk
  // maddesinde denetçi tarafından değerlendirilir. TS EN 81-72 (itfaiyeci
  // asansörü) ise ayrı, kategorik bir asansör tipidir — yalnız denetçi
  // açıkça işaretlerse (ek_standartlar) checklist'e eklenir.
  function seciliStandartGruplari(anaStandart, ekStandartlar = []) {
    const gruplar = new Set(['Genel', anaStandart, '81-71', '81-73', ...(ekStandartlar || [])]);
    if (anaStandart === '81-20') gruplar.add('81-70');
    return gruplar;
  }

  function kontrolProfili(d) {
    if (d && d.kontrol_profili) return d.kontrol_profili;
    return KONTROL_PROFILLERI.TAM;
  }

  function denetimTuruOzeti(d) {
    return (d && (d.denetim_turu || d.modul)) || '';
  }

  function maddeKontrolProfilineUygun(m, profil) {
    if (profil === KONTROL_PROFILLERI.TAM) return true;
    const profiller = Array.isArray(m.denetim_profilleri) ? m.denetim_profilleri : [];
    return profiller.includes(profil);
  }

  function sahaTeyidiProfiliMi(profil) {
    return profil === KONTROL_PROFILLERI.SAHA_TEYIDI_E ||
      profil === KONTROL_PROFILLERI.SAHA_TEYIDI_H1;
  }

  function standartOzeti(d) {
    const gruplar = [d.ana_standart];
    if (d.ana_standart === '81-20') gruplar.push('81-70 (zorunlu)');
    gruplar.push('81-71 (zorunlu)', '81-73 (zorunlu)');
    gruplar.push(...(d.ek_standartlar || []).map(g => g === '81-72' ? '81-72 (İtfaiyeci)' : g));
    return gruplar.filter(Boolean).join(' + ');
  }

  // Bir madde "tamamlanmış" sayılır mı? (sıralı akışın temeli)
  // Not: Uygun Değil'de açıklama/bulgu seçimi ARTIK ZORUNLU DEĞİL — bazı maddelerde
  // durum kendini açıklar, denetçi gerek görmeyebilir. Alanlar hâlâ mevcut ve kullanılabilir.
  function effectiveDurum(r) {
    // "Veri eksik" eski sürümden gelebilen iç kontrol bilgisidir; checklist sonucu sayılmaz.
    if (r.durum === 'Veri eksik') return null;
    // Görülmemiş normal bir madde, olası eski DOM/senkron durumunu devralmaz.
    // Otomatik Uygulanmaz bunun tek bilinçli istisnasıdır.
    if (r.denetci_gordu === false && !r.otomatik_uygulanmaz) return null;
    return r.durum || null;
  }
  const icKontrolNotuVar = (r) => !!(r && (r.ic_kontrol_notu || r.durum === 'Veri eksik'));

  function isComplete(r) {
    return DURUMLAR.includes(effectiveDurum(r));
  }

  const canAdvanceFromItem = (r) => isComplete(r);

  // Otomatik Uygulanmaz madde, denetçinin karşısına çıkıp Sonraki ile geçilmeden
  // sıralı akışta tamamlanmış sayılmaz. Eski kayıtlarda alan yoksa akış bozulmaz.
  function isFlowComplete(r) {
    return isComplete(r) && r.denetci_gordu !== false;
  }

  /* ---- Login ---- */
  function showLogin(err) {
    currentView = 'login';
    currentDenetimId = null;
    document.getElementById('btnLogout').classList.add('hidden');
    app.innerHTML = `
    <div class="login-wrap"><div class="login-card">
      <div class="login-kicker">AVES Saha Denetim</div><h1>Hoş geldiniz</h1>
      <p>AVES saha denetim hesabınızla devam edin.</p>
      ${err ? `<div class="err">${esc(err)}</div>` : ''}
      <div class="field"><label>E-posta</label><input id="lgEmail" type="email" autocomplete="username" autocapitalize="off"></div>
      <div class="field"><label>Şifre</label><input id="lgPass" type="password" autocomplete="current-password"></div>
      <button class="btn btn-primary" id="lgBtn">Giriş yap</button>
    </div>
    <div class="about-note">Bu uygulama saha kontrol yardımcısıdır; resmi muayene formu veya rapor yerine geçmez.</div>
    </div>`;
    document.getElementById('lgBtn').onclick = async () => {
      const b = document.getElementById('lgBtn');
      b.disabled = true; b.textContent = 'Giriş yapılıyor…';
      try {
        await API.login(document.getElementById('lgEmail').value.trim(), document.getElementById('lgPass').value);
        toast('Hoş geldiniz');
        await afterLogin();
      } catch (e) {
        showLogin(e.message.includes('Invalid') ? 'E-posta veya şifre hatalı' : e.message);
      }
    };
  }

  async function afterLogin() {
    document.getElementById('btnLogout').classList.remove('hidden');
    try {
      await Profile.load();
    } catch (e) {
      await API.logout();
      Profile.clear();
      const msg = e.message === 'PROFILE_NOT_FOUND'
        ? 'Bu e-posta için aktif AVES kullanıcı profili tanımlanmamış. Yöneticiyle görüşün.'
        : 'Kullanıcı profili alınamadı. İlk giriş için internet bağlantısını kontrol edin.';
      showLogin(msg);
      return;
    }
    try { await Sync.pullKutuphane(); } catch (e) {
      // çevrimdışı ilk giriş: kütüphane yoksa uyar
      const have = await DB.kvGet('kutuphane_ok');
      if (!have) { showLogin('İlk giriş için internet gerekli (madde kütüphanesi indirilecek)'); return; }
    }
    Sync.full();
    showList();
  }

  /* ---- Denetim listesi ---- */
  async function showList() {
    currentView = 'list';
    currentDenetimId = null;
    const denetimler = (await DB.all('denetimler'))
      .filter(denetimGorunebilirMi)
      .sort((a,b) => (b.denetim_tarihi || b.created_at || '').localeCompare(a.denetim_tarihi || a.created_at || ''));
    const sahaAll = await DB.all('saha');
    const statsBy = {};
    const rowsBy = {};
    for (const s of sahaAll) {
      (rowsBy[s.denetim_id] || (rowsBy[s.denetim_id] = [])).push(s);
      const st = statsBy[s.denetim_id] || (statsBy[s.denetim_id] = { toplam:0, ok:0, bad:0, na:0, ic:0 });
      st.toplam++;
      if (s.denetci_gordu !== false) {
        if (s.durum === 'Kontrol tamamlandı') st.ok++;
        else if (s.durum === 'Olumsuz bulgu') st.bad++;
        else if (s.durum === 'Uygulanmaz') st.na++;
      }
      if (icKontrolNotuVar(s)) st.ic++;
    }
    app.innerHTML = `
    <div class="screen">
      <div class="list-head"><h2>Denetimler</h2>${Profile.canCreate ? '<button class="btn-new" id="btnYeni">+ Yeni denetim</button>' : ''}</div>
      <div class="inspection-list-tools">
        <input class="searchbox" id="listSearch" type="search" placeholder="Müşteri, adres, seri veya dosya no ara…" value="${esc(listSearch)}">
        <div class="inspection-date-filter">
          <label for="listDate">Denetim tarihi</label>
          <input id="listDate" type="date" value="${listDateFilter === 'all' ? '' : esc(listDateFilter)}">
          <button type="button" class="btn btn-ghost" id="listClear">Tümünü göster</button>
        </div>
      </div>
      <div id="dlist">${denetimler.length ? '' : '<div class="empty">Görüntüleyebileceğiniz denetim yok.<br>Denetçiler yalnızca kendi denetimlerini görür.</div>'}</div>
      <div class="empty hidden" id="listNoResult">Arama ölçütlerine uyan denetim bulunamadı.</div>
      <div class="about-note">Bu uygulama saha kontrol yardımcısıdır; resmi muayene formu veya rapor yerine geçmez.</div>
    </div>`;
    const dl = document.getElementById('dlist');
    for (const d of denetimler) {
      const st = statsBy[d.id];
      const offlineState = await cevrimdisiHazirlikDurumu(d, rowsBy[d.id] || []);
      const canEdit = canEditDenetim(d);
      const tamamlandi = d.denetim_durumu === 'Çalışma Tamamlandı';
      const gozden = d.denetim_durumu === 'Gözden Geçirme';
      const card = document.createElement('button');
      card.className = 'dcard';
      card.dataset.search = `${d.musteri_unvani || ''} ${d.asansor_seri_no || ''} ${d.dosya_no || ''} ${d.denetim_adresi || ''} ${d.denetimi_yapan || ''}`.toLocaleLowerCase('tr-TR');
      card.dataset.date = d.denetim_tarihi || '';
      card.innerHTML = `
        <div class="drow1"><span class="dtitle">${esc(d.musteri_unvani)} · ${esc(d.asansor_seri_no)}</span>
        <span class="ddate">${esc(d.denetim_tarihi || '')}</span></div>
        <div class="dmeta">${esc(d.denetim_adresi || '')} ${denetimTuruOzeti(d) ? '· ' + esc(denetimTuruOzeti(d)) : ''} · ${esc(standartOzeti(d))}</div>
        ${Profile.canSeeAllInspections ? `<div class="dmeta"><b>Denetçi:</b> ${esc(d.denetimi_yapan || d.olusturan_ad || d.olusturan_email || 'Kayıt yok')}</div>` : ''}
        ${d.takip_sira_no ? `<div class="dmeta"><b>Takip denetimi:</b> T${esc(d.takip_sira_no)}</div>` : ''}
        <div class="dstats">${st
          ? `<span class="pill total">${st.ok + st.bad + st.na}/${st.toplam}</span>
             <span class="pill ok">${st.ok} uygun</span>
             ${st.bad ? `<span class="pill bad">${st.bad} uygun değil</span>` : ''}
             ${st.ic ? `<span class="pill warn">${st.ic} iç kontrol notu</span>` : ''}
             <span class="pill ${tamamlandi ? 'ok' : 'total'}">${tamamlandi ? 'Çalışma tamamlandı' : (gozden ? 'Gözden geçirme' : 'Devam ediyor')}</span>
             ${canEdit ? '' : '<span class="pill readonly">Salt okunur</span>'}
             <span class="pill cached">📱 cihazda</span>`
          : `<span class="pill na">maddeler cihazda değil — açınca iner</span>${canEdit ? '' : '<span class="pill readonly">Salt okunur</span>'}`}</div>
        <div class="offline-card-state ${offlineState.ready ? 'ok' : 'no'}"><b>${offlineState.ready ? '✓ Çevrimdışı çalışmaya hazır' : '⚠ Çevrimdışı çalışmaya hazır değil'}</b><small>${esc(offlineState.detail)}</small></div>`;
      card.onclick = () => tamamlandi ? showTamamlananDenetimSecimi(d) : showDenetim(d.id, Profile.isTechnicalManager && !denetimSahibiMi(d));
      dl.appendChild(card);
    }
    const applyListFilters = () => {
      const query = listSearch.trim().toLocaleLowerCase('tr-TR');
      let visible = 0;
      dl.querySelectorAll('.dcard').forEach(card => {
        const show = (!query || card.dataset.search.includes(query)) &&
          (listDateFilter === 'all' || card.dataset.date === listDateFilter);
        card.classList.toggle('hidden', !show);
        if (show) visible++;
      });
      const noResult = document.getElementById('listNoResult');
      if (noResult) noResult.classList.toggle('hidden', visible > 0 || denetimler.length === 0);
    };
    document.getElementById('listSearch').oninput = e => { listSearch = e.target.value; applyListFilters(); };
    document.getElementById('listDate').onchange = e => { listDateFilter = e.target.value || 'all'; applyListFilters(); };
    document.getElementById('listClear').onclick = () => {
      listSearch = ''; listDateFilter = 'all';
      document.getElementById('listSearch').value = '';
      document.getElementById('listDate').value = '';
      applyListFilters();
    };
    applyListFilters();
    const btnYeni = document.getElementById('btnYeni');
    if (btnYeni) btnYeni.onclick = showYeniForm;
  }

  function showTamamlananDenetimSecimi(d) {
    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = `<div class="modal completed-choice">
      <button class="close">×</button>
      <h3>Tamamlanmış denetim</h3>
      <div class="onay-box">
        <div class="onay-satir"><span>Müşteri</span><b>${esc(d.musteri_unvani)}</b></div>
        <div class="onay-satir"><span>Seri no</span><b>${esc(d.asansor_seri_no)}</b></div>
        <div class="onay-satir"><span>Tarih</span><b>${esc(d.denetim_tarihi || '')}</b></div>
        <div class="onay-satir"><span>Denetçi</span><b>${esc(d.denetimi_yapan || d.olusturan_ad || d.olusturan_email || 'Kayıt yok')}</b></div>
      </div>
      <button class="mode-choice" id="completedReview"><b>İnceleme</b><span>Sonuçları, açıklamaları ve seri numaralarını salt okunur açar. Yetkiniz varsa içeriden iz bırakan düzeltme başlatabilirsiniz.</span></button>
      ${canStartFollowup(d) ? '<button class="mode-choice followup" id="completedFollowup"><b>Takip Denetimi</b><span>Yalnız Modül G için, önceki sonuçlara bağlı yeni ve bağımsız bir denetim oluşturur.</span></button>' : ''}
      ${kontrolProfili(d) !== KONTROL_PROFILLERI.TAM ? '<div class="photo-help">Takip denetimi yalnızca Modül G denetimlerinde kullanılabilir.</div>' : ''}
    </div>`;
    document.body.appendChild(ov);
    const close = () => ov.remove();
    ov.querySelector('.close').onclick = close;
    ov.onclick = e => { if (e.target === ov) close(); };
    ov.querySelector('#completedReview').onclick = () => { close(); showDenetim(d.id, true); };
    const followup = ov.querySelector('#completedFollowup');
    if (followup) followup.onclick = async () => {
      if (!confirm('Önceki denetim değiştirilmeyecek. Ona bağlı yeni bir Modül G takip denetimi oluşturulsun mu?')) return;
      followup.disabled = true;
      followup.querySelector('b').textContent = 'Takip hazırlanıyor…';
      try {
        const yeniId = await takipDenetimiOlustur(d);
        close();
        await showDenetim(yeniId, false, 'previous_bad');
      } catch (error) {
        followup.disabled = false;
        followup.querySelector('b').textContent = 'Takip Denetimi';
        toast(error.message || 'Takip denetimi oluşturulamadı');
      }
    };
  }

  function duzeltmeNedeniSec(d) {
    const nedenler = ['Yanlış seçim düzeltmesi', 'Eksik bilgi tamamlama', 'Saha notu düzeltmesi'];
    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = `<div class="modal completed-choice">
      <button class="close">×</button>
      <h3>Düzeltme başlat</h3>
      <div class="photo-help">Yapılan her değişiklik; kişi, tarih, eski değer ve yeni değerle birlikte geçmişte saklanacaktır.</div>
      ${nedenler.map(neden => `<button type="button" class="mode-choice correction-reason" data-reason="${esc(neden)}"><b>${esc(neden)}</b></button>`).join('')}
    </div>`;
    document.body.appendChild(ov);
    const close = () => ov.remove();
    ov.querySelector('.close').onclick = close;
    ov.onclick = e => { if (e.target === ov) close(); };
    ov.querySelectorAll('[data-reason]').forEach(btn => btn.onclick = async () => {
      btn.disabled = true;
      const now = new Date().toISOString();
      d.denetim_durumu = 'Gözden Geçirme';
      d.duzeltme_oturumu_id = crypto.randomUUID();
      d.duzeltme_nedeni = btn.dataset.reason;
      d.duzeltme_baslatildi_at = now;
      d.duzeltme_baslatan_email = Profile.email;
      d.duzeltme_baslatan_ad = Profile.name;
      d.calisma_tamamlandi_at = null;
      d.butunluk_ozeti = null;
      d.butunluk_hash = null;
      d.butunluk_hesaplandi_at = null;
      d.updated_at = now;
      await localWrite('denetimler', d, 'denetimler');
      close();
      inspectionReadOnly = false;
      toast('Denetim izlenebilir düzeltmeye açıldı');
      await renderDenetim();
    });
  }

  async function takipDenetimiOlustur(kaynak) {
    if (!canStartFollowup(kaynak)) throw new Error('Takip denetimi oluşturma yetkiniz yok');
    const kaynakRows = (await DB.allByIndex('saha', 'byDenetim', kaynak.id)).sort(siraKarsilastir);
    if (!kaynakRows.length) throw new Error('Önceki denetimin maddeleri bu cihazda bulunmuyor');

    const tumDenetimler = await DB.all('denetimler');
    const anaId = kaynak.takip_ana_denetim_id || kaynak.id;
    const mevcutSiralar = tumDenetimler
      .filter(item => item.takip_ana_denetim_id === anaId)
      .map(item => Number(item.takip_sira_no) || 0);
    const takipSira = Math.max(0, ...mevcutSiralar) + 1;
    const now = new Date().toISOString();
    const d = {
      id: crypto.randomUUID(),
      dosya_no: kaynak.dosya_no || null,
      musteri_unvani: kaynak.musteri_unvani,
      denetim_adresi: kaynak.denetim_adresi,
      asansor_seri_no: kaynak.asansor_seri_no,
      modul: kaynak.modul,
      denetim_turu: kaynak.denetim_turu,
      kontrol_profili: kaynak.kontrol_profili,
      ana_standart: kaynak.ana_standart,
      ek_standartlar: kaynak.ek_standartlar || [],
      bina_asansor_sayisi: kaynak.bina_asansor_sayisi || null,
      kabin_giris_duzeni: kaynak.kabin_giris_duzeni || null,
      kabin_kapi_acilma_tipi: kaynak.kabin_kapi_acilma_tipi || null,
      tahrik_tipi: kaynak.tahrik_tipi,
      makine_dairesi_tipi: kaynak.makine_dairesi_tipi,
      beyan_yuku_kg: kaynak.beyan_yuku_kg || null,
      beyan_hizi_ms: kaynak.beyan_hizi_ms || null,
      kapasite_kisi: kaynak.kapasite_kisi || null,
      durak_sayisi: kaynak.durak_sayisi || null,
      aski_tipi: kaynak.aski_tipi || null,
      denetimi_yapan: Profile.name,
      denetim_tarihi: localDateISO(),
      denetim_durumu: 'Devam Ediyor',
      takip_ana_denetim_id: anaId,
      takip_onceki_denetim_id: kaynak.id,
      takip_sira_no: takipSira,
      takip_onceki_seri_numaralari: seriNumaralariNormalize(kaynak.seri_numaralari),
      saha_tamamlandi_at: null,
      gozden_gecirme_at: null,
      calisma_tamamlandi_at: null,
      snapshot_kilitli_at: now,
      snapshot_app_build_id: APP_VERSION,
      snapshot_kutuphane_hash: kaynak.snapshot_kutuphane_hash || null,
      snapshot_bolum_surumleri: kaynak.snapshot_bolum_surumleri || null,
      snapshot_madde_sayisi: kaynak.snapshot_madde_sayisi || kaynakRows.length,
      snapshot_madde_set_hash: kaynak.snapshot_madde_set_hash || null,
      snapshot_content_hash: kaynak.snapshot_content_hash || null,
      butunluk_ozeti: null,
      butunluk_hash: null,
      butunluk_hesaplandi_at: null,
      seri_numaralari: { schema_version: 1 },
      form_cikti_snapshot: kaynak.form_cikti_snapshot || await FormOutput.createSnapshot(kaynak.ana_standart),
      olusturan_email: Profile.email,
      olusturan_ad: Profile.name,
      created_at: now,
      updated_at: now,
    };

    const sonucAlanlari = new Set([
      'id','denetim_id','durum','denetci_gordu','bulgu_secenegi','diger_bulgu','aciklama',
      'olcu1_degeri','olcu2_degeri','olcum_degerleri','ic_kontrol_notu','gozden_gecirme_nedeni',
      'gozden_gecirme_notu','guncelleyen_email','olusturan_email','olusturan_ad','son_degistiren_email',
      'son_degistiren_ad','son_degistiren_rol','son_degistiren_at','created_at','updated_at'
    ]);
    const sahaRows = kaynakRows.map(eski => {
      const yeni = {};
      Object.entries(eski).forEach(([key, value]) => { if (!sonucAlanlari.has(key)) yeni[key] = value; });
      return Object.assign(yeni, {
        id: crypto.randomUUID(),
        denetim_id: d.id,
        takip_kaynak_saha_kontrol_id: eski.id,
        takip_onceki_durum: effectiveDurum(eski),
        takip_onceki_aciklama: eski.aciklama || null,
        takip_onceki_bulgu_secenegi: eski.bulgu_secenegi || null,
        takip_onceki_diger_bulgu: eski.diger_bulgu || null,
        durum: eski.otomatik_uygulanmaz ? 'Uygulanmaz' : null,
        otomatik_uygulanmaz: !!eski.otomatik_uygulanmaz,
        denetci_gordu: false,
        bulgu_secenegi: null,
        diger_bulgu: null,
        aciklama: null,
        olcu1_degeri: null,
        olcu2_degeri: null,
        olcum_degerleri: {},
        ic_kontrol_notu: null,
        gozden_gecirme_nedeni: null,
        gozden_gecirme_notu: null,
        guncelleyen_email: Profile.email,
        olusturan_email: Profile.email,
        olusturan_ad: Profile.name,
        updated_at: now,
      });
    });

    await localWrite('denetimler', d, 'denetimler');
    for (let i = 0; i < sahaRows.length; i += 200) {
      await localWrite('saha_kontrol', sahaRows.slice(i, i + 200), 'saha');
    }
    toast(`T${takipSira} takip denetimi hazırlandı`);
    return d.id;
  }

  /* ---- Yeni denetim ---- */
  function showYeniForm() {
    if (!Profile.canCreate) { toast('Yeni denetim oluşturma yetkiniz yok'); showList(); return; }
    currentView = 'new-inspection';
    currentDenetimId = null;
    const seg = (id, opts, multi) => `<div class="segs" id="${id}">${opts.map(o =>
      `<button type="button" class="seg" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
    app.innerHTML = `
    <div class="screen">
      <button type="button" class="backlink" id="back">‹ Denetimler</button>
      <div class="form-card"><h3>Denetim bilgileri</h3>
        <div class="field full"><label for="fMuhendis">Denetimi gerçekleştiren mühendis</label><input id="fMuhendis" class="readonly-field" value="${esc(Profile.name)}" readonly></div>
      </div>
      <div class="form-card"><h3>Asansör bilgileri</h3>
        <div class="grid2">
          <div class="field full"><label for="fMusteri">Müşteri ünvanı *</label><input id="fMusteri" autocomplete="organization"></div>
          <div class="field"><label for="fSeri">Asansör seri no *</label><input id="fSeri" autocomplete="off"></div>
          <div class="field"><label for="fDosya">Dosya no</label><input id="fDosya" autocomplete="off"></div>
          <div class="field full"><label for="fAdres">Adres *</label><input id="fAdres" autocomplete="street-address"></div>
        </div>
      </div>
      <div class="form-card"><h3>Denetim türü *</h3>${seg('sDenetimTuru', [DENETIM_TURLERI.MODUL_G,DENETIM_TURLERI.MODUL_E,DENETIM_TURLERI.MODUL_H1])}
        <p style="font-size:11.5px;color:var(--muted);margin:8px 2px 0">Modül G tam birim doğrulaması; Modül E ve H1 ise AVES gözetim form setlerine bağlı saha teyidi akışıdır.</p>
      </div>
      <div class="form-card" id="standartCard"><h3>Ana standart *</h3>
        <div class="segs" id="sAna">
          <button type="button" class="seg" data-v="81-20">TS EN 81-20</button>
          <button type="button" class="seg" data-v="81-1/2+A3">TS EN 81-1/2+A3</button>
        </div>
        <p id="standartAciklama" style="font-size:11.5px;color:var(--muted);margin:8px 2px 0">Modül G için TS EN 81-20 veya TS EN 81-1/2+A3 seçilir. TS EN 81-70, TS EN 81-20 akışına otomatik ve zorunlu olarak eklenir.</p>
      </div>
      <div class="form-card"><h3>Bina ve kabin düzeni *</h3>
        <div class="grid2">
          <div class="field full"><label>Binadaki toplam asansör sayısı *</label><input id="fBinaAsansorSayisi" type="number" min="1" step="1" inputmode="numeric"></div>
          <div class="field full"><label>Kabin giriş düzeni *</label>${seg('sKabinGiris', ['Tek giriş','Karşılıklı giriş','Bitişik duvarlarda giriş'])}</div>
          <div class="field full"><label>Kabin kapısı açılma biçimi *</label>${seg('sKapiAcilma', ['Teleskopik','Merkezi'])}</div>
        </div>
      </div>
      <div class="form-card"><h3>Teknik *</h3>
        <div class="grid2">
          <div class="field full"><label>Tahrik tipi *</label>${seg('sTahrik', ['Elektrikli','Hidrolik'])}</div>
          <div class="field full"><label>Makine dairesi *</label>${seg('sMD', ['MR','MRL'])}</div>
          <div class="field full"><label>Askı tipi</label>${seg('sAski', ['1:1','2:1','4:1'])}</div>
          <div class="field"><label>Beyan yükü (kg) *</label><input id="fYuk" type="number" inputmode="numeric"></div>
          <div class="field"><label>Beyan hızı (m/s) *</label><input id="fHiz" type="number" step="0.01" inputmode="decimal"></div>
          <div class="field"><label>Kapasite (kişi) *</label><input id="fKapasite" type="number" inputmode="numeric"></div>
          <div class="field"><label>Durak sayısı</label><input id="fDurak" type="number" inputmode="numeric"></div>
        </div>
      </div>
      <div class="form-card"><h3>İtfaiyeci Asansörü</h3>
        <div class="segs" id="sItfaiyeci">
          <button type="button" class="seg on" data-v="hayir">Hayır</button>
          <button type="button" class="seg" data-v="evet">Evet — TS EN 81-72</button>
        </div>
        <p style="font-size:11.5px;color:var(--muted);margin:8px 2px 0">Bu asansör itfaiyeci asansörü olarak tasarlanmışsa "Evet" seçin; TS EN 81-72 maddeleri checklist'e eklenir. Kasıtlı tahribata dayanıklılık (TS EN 81-71) ve yangın anında davranış (TS EN 81-73) maddeleri her denetimde otomatik yer alır; uygulanmadıkları durum ilgili maddede belirlenir.</p>
      </div>
      <button type="button" class="btn btn-primary" id="fKaydet">Denetimi başlat</button>
      <div style="height:20px"></div>
    </div>`;
    document.getElementById('back').onclick = showList;

    // seçim davranışı
    const single = { sItfaiyeci: 'hayir' };
    ['sDenetimTuru','sAna','sKabinGiris','sKapiAcilma','sTahrik','sMD','sAski','sItfaiyeci'].forEach(id => {
      document.getElementById(id).addEventListener('click', (e) => {
        const b = e.target.closest('.seg'); if (!b) return;
        document.querySelectorAll(`#${id} .seg`).forEach(x => x.classList.remove('on'));
        b.classList.add('on'); single[id] = b.dataset.v;
        if (id === 'sDenetimTuru') uygulaDenetimTuru();
      });
    });

    function uygulaDenetimTuru() {
      const sahaTeyidi = single.sDenetimTuru === DENETIM_TURLERI.MODUL_E ||
        single.sDenetimTuru === DENETIM_TURLERI.MODUL_H1;
      const standartButonlari = [...document.querySelectorAll('#sAna .seg')];
      if (sahaTeyidi) {
        single.sAna = '81-20';
        standartButonlari.forEach(b => {
          b.classList.toggle('on', b.dataset.v === '81-20');
          b.disabled = true;
        });
        document.getElementById('standartAciklama').textContent =
          'AVES Modül E/H1 gözetim form setinde saha teyidi TS EN 81-20 üzerinden yürür. Standart denetçi tarafından değiştirilemez.';
      } else {
        single.sAna = null;
        standartButonlari.forEach(b => { b.classList.remove('on'); b.disabled = false; });
        document.getElementById('standartAciklama').textContent =
          'Modül G için TS EN 81-20 veya TS EN 81-1/2+A3 seçilir. TS EN 81-70, TS EN 81-20 akışına otomatik ve zorunlu olarak eklenir.';
      }
    }

    document.getElementById('fKaydet').onclick = async () => {
      const muhendis = Profile.name;
      const musteri = document.getElementById('fMusteri').value.trim();
      const seri = document.getElementById('fSeri').value.trim();
      const adres = document.getElementById('fAdres').value.trim();
      const yuk = parseInt(document.getElementById('fYuk').value) || null;
      const hiz = parseFloat(document.getElementById('fHiz').value) || null;
      const kapasite = parseInt(document.getElementById('fKapasite').value) || null;
      const binaAsansorSayisi = parseInt(document.getElementById('fBinaAsansorSayisi').value) || null;
      if (!muhendis) { toast('Mühendis profili bulunamadı'); return; }
      if (!musteri || !seri) { toast('Müşteri ünvanı ve seri no zorunlu'); return; }
      if (!adres) { toast('Adres zorunlu'); return; }
      if (!single.sDenetimTuru) { toast('Denetim türünü seçin'); return; }
      if (!single.sAna) { toast('Ana standart seçin'); return; }
      if (!binaAsansorSayisi || binaAsansorSayisi < 1) { toast('Binadaki toplam asansör sayısını girin'); return; }
      if (!single.sKabinGiris) { toast('Kabin giriş düzenini seçin'); return; }
      if (!single.sKapiAcilma) { toast('Kabin kapısı açılma biçimini seçin'); return; }
      if (!single.sTahrik) { toast('Tahrik tipi seçin'); return; }
      if (!single.sMD) { toast('Makine dairesi tipini (MR/MRL) seçin'); return; }
      if (!yuk || !hiz || !kapasite) { toast('Beyan yükü, beyan hızı ve kapasite zorunlu'); return; }

      const ekStandartlar = single.sItfaiyeci === 'evet' ? ['81-72'] : [];
      // Cihazdaki son başarılı kütüphane canlı migration'dan önce indirilmiş
      // olsa bile yeni denetim yanlış 08/09 özel bölümleriyle oluşturulmaz.
      const lib = (await DB.all('kutuphane')).map(avesFizikselBolumUygula);
      const secili = seciliStandartGruplari(single.sAna, ekStandartlar);
      const kontrolProfil = single.sDenetimTuru === DENETIM_TURLERI.MODUL_G
        ? KONTROL_PROFILLERI.TAM
        : single.sDenetimTuru === DENETIM_TURLERI.MODUL_E
          ? KONTROL_PROFILLERI.SAHA_TEYIDI_E
          : KONTROL_PROFILLERI.SAHA_TEYIDI_H1;
      const tahmini = lib.filter(m =>
        m.aktif && secili.has(m.standart_grubu) && maddeKontrolProfilineUygun(m, kontrolProfil)
      ).length;
      if (sahaTeyidiProfiliMi(kontrolProfil) && tahmini === 0) {
        toast('Saha teyidi madde profili henüz bu çalışma paketine eklenmedi');
        return;
      }

      const formVals = {
        muhendis, musteri, seri, adres,
        dosya: document.getElementById('fDosya').value.trim() || null,
        denetimTuru: single.sDenetimTuru,
        kontrolProfili: kontrolProfil,
        modul: single.sDenetimTuru === DENETIM_TURLERI.MODUL_G ? 'Modül G' :
          single.sDenetimTuru === DENETIM_TURLERI.MODUL_E ? 'Modül E' : 'Modül H1',
        anaStandart: single.sAna,
        ekStandartlar,
        binaAsansorSayisi,
        kabinGirisDuzeni: single.sKabinGiris,
        kabinKapiAcilmaTipi: single.sKapiAcilma,
        tahrik: single.sTahrik,
        md: single.sMD,
        yuk, hiz, kapasite,
        durak: parseInt(document.getElementById('fDurak').value) || null,
        aski: single.sAski || null,
      };
      showOnayEkrani(formVals, tahmini);
    };
  }

  function showOnayEkrani(f, tahmini) {
    const ov = document.createElement('div');
    ov.className = 'overlay';
    const satir = (k, v) => v ? `<div class="onay-satir"><span>${esc(k)}</span><b>${esc(v)}</b></div>` : '';
    ov.innerHTML = `<div class="modal">
      <h3>Denetimi başlatmadan önce kontrol edin</h3>
      <div class="onay-box">
        ${satir('Mühendis', f.muhendis)}
        ${satir('Müşteri', f.musteri)}
        ${satir('Seri no', f.seri)}
        ${satir('Denetim türü', f.denetimTuru)}
        ${satir('Kontrol profili', f.kontrolProfili === KONTROL_PROFILLERI.TAM ? 'Tam saha kontrolü' :
          f.kontrolProfili === KONTROL_PROFILLERI.SAHA_TEYIDI_E ? 'Modül E saha teyidi' : 'Modül H1 saha teyidi')}
        ${satir('Ana standart', f.anaStandart)}
        ${satir('Zorunlu erişilebilirlik', f.anaStandart === '81-20' ? 'TS EN 81-70' : null)}
        ${satir('Zorunlu ek standartlar', 'TS EN 81-71 + TS EN 81-73')}
        ${satir('İtfaiyeci Asansörü', f.ekStandartlar.includes('81-72') ? 'Evet — TS EN 81-72' : null)}
        ${satir('Binadaki asansör sayısı', f.binaAsansorSayisi)}
        ${satir('Kabin giriş düzeni', f.kabinGirisDuzeni)}
        ${satir('Kapı açılma biçimi', f.kabinKapiAcilmaTipi)}
        ${satir('Tahrik tipi', f.tahrik)}
        ${satir('Makine dairesi', f.md)}
        ${satir('Beyan yükü', f.yuk ? f.yuk + ' kg' : null)}
        ${satir('Beyan hızı', f.hiz ? f.hiz + ' m/s' : null)}
        ${satir('Kapasite', f.kapasite ? f.kapasite + ' kişi' : null)}
        ${satir('Oluşturulacak madde', tahmini + ' madde')}
      </div>
      <button class="btn btn-ghost" id="onDuzelt" style="margin-bottom:8px">‹ Bilgileri düzelt</button>
      <button class="btn btn-primary" id="onBaslat">Denetimi başlat</button>
    </div>`;
    document.body.appendChild(ov);
    ov.querySelector('#onDuzelt').onclick = () => ov.remove();
    ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
    ov.querySelector('#onBaslat').onclick = async () => {
      const btn = ov.querySelector('#onBaslat');
      btn.disabled = true; btn.textContent = 'Maddeler hazırlanıyor…';
      await olustur(f);
      ov.remove();
    };
  }

  async function olustur(f) {
      const d = {
        id: crypto.randomUUID(),
        dosya_no: f.dosya,
        musteri_unvani: f.musteri,
        denetim_adresi: f.adres,
        asansor_seri_no: f.seri,
        modul: f.modul,
        denetim_turu: f.denetimTuru,
        kontrol_profili: f.kontrolProfili,
        ana_standart: f.anaStandart,
        ek_standartlar: f.ekStandartlar,
        bina_asansor_sayisi: f.binaAsansorSayisi,
        kabin_giris_duzeni: f.kabinGirisDuzeni,
        kabin_kapi_acilma_tipi: f.kabinKapiAcilmaTipi,
        tahrik_tipi: f.tahrik,
        makine_dairesi_tipi: f.md,
        beyan_yuku_kg: f.yuk,
        beyan_hizi_ms: f.hiz,
        kapasite_kisi: f.kapasite,
        durak_sayisi: f.durak,
        aski_tipi: f.aski,
        denetimi_yapan: f.muhendis,
        denetim_tarihi: localDateISO(),
        denetim_durumu: 'Devam Ediyor',
        saha_tamamlandi_at: null,
        gozden_gecirme_at: null,
        calisma_tamamlandi_at: null,
        offline_hazir_at: null,
        offline_hazirlayan_email: null,
        expected_item_count: null,
        expected_item_set_hash: null,
        app_build_id: null,
        kutuphane_content_hash: null,
        snapshot_kilitli_at: null,
        snapshot_app_build_id: APP_VERSION,
        snapshot_kutuphane_hash: null,
        snapshot_bolum_surumleri: null,
        snapshot_madde_sayisi: null,
        snapshot_madde_set_hash: null,
        snapshot_content_hash: null,
        butunluk_ozeti: null,
        butunluk_hash: null,
        butunluk_hesaplandi_at: null,
        offline_check: null,
        seri_numaralari: { schema_version: 1 },
        form_cikti_snapshot: await FormOutput.createSnapshot(f.anaStandart),
        olusturan_email: Profile.email,
        olusturan_ad: Profile.name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // maddeleri CİHAZDA üret (offline-first'in kalbi)
      const lib = await DB.all('kutuphane');
      const secili = seciliStandartGruplari(d.ana_standart, d.ek_standartlar);
      const sahaRows = lib
        .filter(m =>
          m.aktif && m.madde_id !== 'MAD-1010' && secili.has(m.standart_grubu) &&
          maddeKontrolProfilineUygun(m, kontrolProfili(d))
        )
        .sort(siraKarsilastir)
        .map(m => {
          // konfigürasyon uyuşmazlığı → otomatik Uygulanmaz
          let otoSebep = null;
          if (m.tahrik_kosulu && d.tahrik_tipi && m.tahrik_kosulu !== d.tahrik_tipi)
            otoSebep = `${m.tahrik_kosulu} asansörlere özgü madde (bu asansör: ${d.tahrik_tipi})`;
          else if (m.md_kosulu && d.makine_dairesi_tipi && m.md_kosulu !== d.makine_dairesi_tipi)
            otoSebep = `${m.md_kosulu} asansörlere özgü madde (bu asansör: ${d.makine_dairesi_tipi})`;
          return {
            id: crypto.randomUUID(),
            denetim_id: d.id,
            madde_id: m.madde_id, sira_no: m.sira_no, bolum: m.bolum,
            standart_grubu: m.standart_grubu, kaynak_turu: m.kaynak_turu,
            standart_madde_no: m.standart_madde_no, kontrol_basligi: m.kontrol_basligi,
            denetci_yonlendirmesi: m.denetci_yonlendirmesi,
            resmi_madde_metni: m.resmi_madde_metni ?? null,
            kaynak_form_kodu: m.kaynak_form_kodu ?? null,
            kaynak_form_revizyonu: m.kaynak_form_revizyonu ?? null,
            kaynak_form_tablo_no: m.kaynak_form_tablo_no ?? null,
            kaynak_form_satir_no: m.kaynak_form_satir_no ?? null,
            kaynak_form_bolumu: m.kaynak_form_bolumu ?? null,
            kaynak_form_alt_grubu: m.kaynak_form_alt_grubu ?? null,
            yontem_kodu: m.yontem_kodu, dogrulama_yontemi: m.dogrulama_yontemi,
            hazir_secenekler: m.hazir_secenekler,
            olcu1_adi: m.olcu1_adi, olcu1_birimi: m.olcu1_birimi, olcu1_degeri: null,
            olcu2_adi: m.olcu2_adi, olcu2_birimi: m.olcu2_birimi, olcu2_degeri: null,
            esik_deger: m.esik_deger ?? null, esik_operator: m.esik_operator ?? null,
            olcum_tanimlari: Array.isArray(m.olcum_tanimlari) ? m.olcum_tanimlari : [],
            olcum_degerleri: {},
            otomatik_aranmaz_kurali: m.otomatik_aranmaz_kurali ?? null,
            aranmaz_kosulu: m.aranmaz_kosulu ?? null,
            otomatik_gerekce: otoSebep,
            gorsel_referansi: m.gorsel_referansi ?? null,
            snapshot_madde_hash: null,
            durum: otoSebep ? 'Uygulanmaz' : null,
            otomatik_uygulanmaz: !!otoSebep,
            denetci_gordu: false,
            bulgu_secenegi: null, diger_bulgu: null,
            aciklama: null,
            ic_kontrol_notu: null,
            gozden_gecirme_nedeni: null,
            gozden_gecirme_notu: null,
            guncelleyen_email: API.email,
            olusturan_email: Profile.email,
            olusturan_ad: Profile.name,
            updated_at: new Date().toISOString(),
          };
        });

      // Denetim başladıktan sonra bu içerik yeni kütüphane sürümleriyle
      // değişmez. Hem madde bazında hem tüm seçili set için doğrulanabilir
      // SHA-256 parmak izi saklanır.
      const snapshotFields = [
        'madde_id', 'sira_no', 'bolum', 'standart_grubu', 'kaynak_turu',
        'standart_madde_no', 'kontrol_basligi', 'denetci_yonlendirmesi',
        'resmi_madde_metni', 'kaynak_form_kodu', 'kaynak_form_revizyonu',
        'kaynak_form_tablo_no', 'kaynak_form_satir_no', 'kaynak_form_bolumu',
        'kaynak_form_alt_grubu', 'yontem_kodu', 'dogrulama_yontemi',
        'hazir_secenekler', 'olcu1_adi', 'olcu1_birimi', 'olcu2_adi',
        'olcu2_birimi', 'esik_deger', 'esik_operator', 'olcum_tanimlari',
        'otomatik_aranmaz_kurali', 'aranmaz_kosulu', 'gorsel_referansi',
      ];
      for (const row of sahaRows) {
        const frozen = {};
        for (const field of snapshotFields) frozen[field] = row[field] ?? null;
        row.snapshot_madde_hash = await sha256Hex(stableStringify(frozen));
      }
      const manifest = await DB.kvGet('kutuphane_manifest');
      const itemIds = sahaRows.map(row => row.madde_id).sort();
      const contentManifest = sahaRows
        .map(row => ({ madde_id: row.madde_id, hash: row.snapshot_madde_hash }))
        .sort((a,b) => a.madde_id.localeCompare(b.madde_id, 'tr'));
      d.snapshot_kilitli_at = new Date().toISOString();
      d.snapshot_kutuphane_hash = manifest ? manifest.content_hash : null;
      d.snapshot_bolum_surumleri = manifest ? manifest.server_revision_key : null;
      d.snapshot_madde_sayisi = sahaRows.length;
      d.snapshot_madde_set_hash = await sha256Hex(itemIds.join('|'));
      d.snapshot_content_hash = await sha256Hex(stableStringify(contentManifest));

      await localWrite('denetimler', d, 'denetimler');
      // 1000+ satırı tek outbox kalemi yapmak yerine 200'lük parçalara böl (istek boyutu güvenliği)
      for (let i = 0; i < sahaRows.length; i += 200) {
        await localWrite('saha_kontrol', sahaRows.slice(i, i+200), 'saha');
      }
      toast(`${sahaRows.length} madde hazırlandı`);
      showDenetim(d.id);
  }

  /* ---- Denetim detay ---- */
  async function sahayaHazirla(d, rows) {
    // Yeni kontrol tamamlanana kadar önceki cihaz işaretine güvenilmez.
    await DB.kvDel(`offline_ready_${d.id}`);
    const checks = [];
    const add = (name, ok, detail) => checks.push({ name, ok: !!ok, detail });
    const manifest = await DB.kvGet('kutuphane_manifest');
    const library = await DB.all('kutuphane');
    const itemIds = rows.map(r => r.madde_id).sort();
    const uniqueIds = new Set(itemIds);
    const itemSetHash = await sha256Hex(itemIds.join('|'));

    add('Denetim maddeleri cihazda', rows.length > 0, `${rows.length} madde`);
    add('Madde kimlikleri eksiksiz ve benzersiz', itemIds.every(Boolean) && uniqueIds.size === rows.length, `${uniqueIds.size}/${rows.length}`);
    add('Madde snapshot alanları hazır', rows.every(r => r.id && r.denetim_id === d.id && r.bolum && r.kontrol_basligi), 'Kimlik, bölüm ve kontrol metni');
    add('Kütüphane manifesti doğrulandı', !!manifest && manifest.count === library.length && !!manifest.content_hash, manifest ? `${library.length} madde · ${String(manifest.content_hash || '').slice(0,12)}…` : 'Manifest yok');

    const profileVerifiedAt = await DB.kvGet('profile_verified_at');
    const profileVerifiedEmail = await DB.kvGet('profile_verified_email');
    add('Kullanıcı yetkisi çevrimiçiyken doğrulandı', !!profileVerifiedAt && profileVerifiedEmail === Profile.email, profileVerifiedAt ? new Date(profileVerifiedAt).toLocaleString('tr-TR') : 'Doğrulama yok');

    let storageOk = false;
    try {
      const probeKey = `offline_probe_${d.id}`;
      const probeValue = crypto.randomUUID();
      await DB.kvSet(probeKey, probeValue);
      storageOk = (await DB.kvGet(probeKey)) === probeValue;
      await DB.kvDel(probeKey);
    } catch { storageOk = false; }
    add('Yerel veritabanı yazma testi', storageOk, storageOk ? 'Yazma ve geri okuma başarılı' : 'Başarısız');

    let quotaDetail = 'Tarayıcı bilgi vermedi';
    let quotaOk = true;
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const remaining = Math.max(0, (estimate.quota || 0) - (estimate.usage || 0));
      quotaOk = !estimate.quota || remaining >= 5 * 1024 * 1024;
      quotaDetail = `${Math.round(remaining / 1024 / 1024)} MB boş`;
    }
    add('Yerel depolama alanı', quotaOk, quotaDetail);

    const visualAssets = [...new Set(rows.flatMap(r => gorselDosyalari(r.gorsel_referansi)).map(file => `./referans-gorseller/${file}`))];
    const assets = [...OFFLINE_CORE_ASSETS, ...visualAssets];
    let cachedCount = 0;
    if ('caches' in window) {
      for (const asset of assets) {
        if (await caches.match(new URL(asset, location.href).href)) cachedCount++;
      }
    }
    add('Uygulama ve gerekli görseller çevrimdışı hazır', cachedCount === assets.length, `${cachedCount}/${assets.length} dosya`);

    const ready = checks.every(check => check.ok);
    if (ready) {
      const now = new Date().toISOString();
      d.offline_hazir_at = now;
      d.offline_hazirlayan_email = Profile.email;
      d.expected_item_count = rows.length;
      d.expected_item_set_hash = itemSetHash;
      d.app_build_id = APP_VERSION;
      d.kutuphane_content_hash = manifest.content_hash;
      d.offline_check = { checked_at: now, checks };
      d.updated_at = now;
      await DB.kvSet(`offline_ready_${d.id}`, {
        device_id: await getDeviceId(),
        app_build_id: APP_VERSION,
        expected_item_count: rows.length,
        item_set_hash: itemSetHash,
        kutuphane_content_hash: manifest.content_hash,
        checked_at: now,
      });
      await localWrite('denetimler', d, 'denetimler');
    }
    return { ready, checks };
  }

  function sahayaHazirlikSonucuGoster(result) {
    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = `<div class="modal"><button class="close">×</button>
      <h3>${result.ready ? '✓ Çevrimdışı çalışmaya hazır' : '⚠ Çevrimdışı çalışmaya hazır değil'}</h3>
      <div class="preflight-list">${result.checks.map(check => `<div class="preflight-row ${check.ok?'ok':'fail'}"><span>${check.ok?'✓':'✕'}</span><div><b>${esc(check.name)}</b><small>${esc(check.detail || '')}</small></div></div>`).join('')}</div>
      <div class="photo-help">${result.ready ? 'Bu denetim bu cihazda internet olmadan açılıp tamamlanabilir. Cihazdaki yerel kopya, sunucu doğrulanana kadar korunur.' : 'Kırmızı kontroller düzelmeden bu cihaz “Çevrimdışı çalışmaya hazır” olarak işaretlenmez.'}</div>
    </div>`;
    document.body.appendChild(ov);
    ov.querySelector('.close').onclick = () => ov.remove();
    ov.onclick = e => { if (e.target === ov) ov.remove(); };
  }

  async function showDenetim(id, forceReadOnly = false, initialFilter = 'all') {
    currentView = 'inspection';
    currentDenetimId = id;
    inspectionReadOnly = !!forceReadOnly;
    filter = initialFilter; search = ''; openBolums = new Set();
    const denetim = await DB.get('denetimler', id);
    if (!denetimGorunebilirMi(denetim)) {
      toast('Bu denetimi görüntüleme yetkiniz yok');
      showList();
      return;
    }
    let rows = await DB.allByIndex('saha', 'byDenetim', id);
    const pending = await DB.outboxCount();
    if (navigator.onLine && pending === 0) {
      if (!rows.length) toast('Maddeler indiriliyor…');
      try {
        // Sunucudaki cevaplar ve kimlik geçmişi, bekleyen yerel işlem yoksa alınır.
        await Sync.pullSaha(id);
        await Sync.pullGecmis(id);
        rows = await DB.allByIndex('saha', 'byDenetim', id);
      } catch {
        if (!rows.length) toast('İndirilemedi — internet bağlantısını kontrol edin');
      }
    }
    const savedPosition = await DB.kvGet(`last_position_${id}`);
    if (savedPosition && rows.some(r => r.id === savedPosition.item_id && r.bolum === savedPosition.bolum)) {
      openBolums = new Set([savedPosition.bolum]);
      const bolumRows = rows.filter(r => r.bolum === savedPosition.bolum).sort(siraKarsilastir);
      cursors[savedPosition.bolum] = bolumRows.findIndex(r => r.id === savedPosition.item_id);
    }
    renderDenetim();
  }

  async function rememberPosition(bolum, itemId) {
    if (!currentDenetimId || !bolum || !itemId) return;
    await DB.kvSet(`last_position_${currentDenetimId}`, {
      bolum,
      item_id: itemId,
      saved_at: new Date().toISOString(),
    });
  }

  const KUTUPHANE_META_ALANLARI = [
    'kontrol_basligi', 'denetci_yonlendirmesi', 'resmi_madde_metni',
    'standart_madde_no', 'kaynak_turu', 'dogrulama_yontemi', 'yontem_kodu',
    'aranmaz_kosulu', 'gorsel_referansi', 'olcum_tanimlari', 'hazir_secenekler',
    'esik_deger', 'esik_operator', 'otomatik_aranmaz_kurali',
  ];

  async function guncelKutuphaneMetadatasi(rows) {
    const library = await DB.all('kutuphane');
    const byId = new Map(library.map(item => [item.madde_id, item]));
    return rows.map(row => {
      const latest = byId.get(row.madde_id);
      // Denetim satırı tarihsel snapshot'tır. Kütüphanede sonradan değişen veya
      // pasifleştirilen bir madde bu kopyayı değiştiremez ve denetimden düşüremez.
      if (!latest) return { ...row, kutuphane_pasif: true };
      const merged = { ...row };
      // Yalnız eski sürümlerde hiç üretilmemiş alanlara geriye uyumluluk
      // desteği verilir. Bilerek null bırakılmış ya da dolu hiçbir alanın
      // üzerine güncel kütüphane değeri yazılmaz.
      KUTUPHANE_META_ALANLARI.forEach(field => {
        if (typeof merged[field] === 'undefined') merged[field] = latest[field] ?? null;
      });
      return merged;
    }).filter(Boolean);
  }

  async function guncelSahaSatiri(id) {
    const row = await DB.get('saha', id);
    if (!row) return row;
    return (await guncelKutuphaneMetadatasi([row]))[0];
  }

  async function renderDenetim() {
    const d = await DB.get('denetimler', currentDenetimId);
    if (!d) { showList(); return; }
    const normaldeDuzenleyebilir = canEditDenetim(d);
    currentCanEdit = normaldeDuzenleyebilir && !inspectionReadOnly;
    const rows = (await guncelKutuphaneMetadatasi(
      await DB.allByIndex('saha', 'byDenetim', currentDenetimId)
    )).sort(siraKarsilastir);
    const offlineState = await cevrimdisiHazirlikDurumu(d, rows);
    const inspectionOutbox = (await DB.outboxAll()).filter(item => item.inspection_id === currentDenetimId);
    const conflictSync = inspectionOutbox.filter(item => item.sync_status === 'conflict').length;
    const protectedSync = inspectionOutbox.filter(item => ['forbidden','conflict'].includes(item.sync_status)).length;
    const waitingSync = inspectionOutbox.length - protectedSync;
    const done = rows.filter(isFlowComplete).length;
    const bad = rows.filter(r => r.durum === 'Olumsuz bulgu').length;
    const icNot = rows.filter(icKontrolNotuVar).length;
    const bakilmadiSayisi = rows.filter(r => !isFlowComplete(r)).length;
    const tamamlandi = d.denetim_durumu === 'Çalışma Tamamlandı';
    const gozden = d.denetim_durumu === 'Gözden Geçirme';

    const bolums = [];
    const byBolum = {};
    for (const r of rows) {
      if (!byBolum[r.bolum]) { byBolum[r.bolum] = []; bolums.push(r.bolum); }
      byBolum[r.bolum].push(r);
    }

    const matches = (r) => {
      if (search) {
        const hay = `${r.standart_madde_no} ${r.kontrol_basligi} ${r.resmi_madde_metni || ''} ${r.denetci_yonlendirmesi}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      if (filter === 'all') return true;
      if (filter === 'empty') return !r.durum || r.denetci_gordu === false;
      if (filter === 'bad') return r.durum === 'Olumsuz bulgu';
      if (filter === 'internal') return icKontrolNotuVar(r);
      if (filter === 'previous_bad') return r.takip_onceki_durum === 'Olumsuz bulgu';
      return true;
    };

    let html = `
    <div class="screen" style="padding-bottom:0">
      <div class="inspection-toolbar">
        <button class="backlink" id="back">‹ Denetimler</button>
        <div class="inspection-actions">
          ${currentCanEdit && !tamamlandi ? '<button class="delbtn" id="btnSahayaHazirla" title="Bu cihazdaki çevrimdışı hazırlığı doğrula">📱 Çevrimdışı Kontrol</button>' : ''}
          ${canReopenDenetim(d) ? '<button class="delbtn" id="btnYenidenAc" title="Düzenlemeye aç">↻ Düzenlemeye Aç</button>' : ''}
          ${tamamlandi ? '<button class="delbtn" id="btnYazdir" title="Resmî formu PDF veya Word olarak hazırla">Yazdır</button>' : ''}
          ${canDeleteDenetim(d) ? '<button class="delbtn" id="btnSil" title="Denetimi sil">🗑 Sil</button>' : ''}
        </div>
      </div>
      ${currentCanEdit ? (gozden ? '<div class="readonly-banner">Gözden Geçirme · Sahadaki işaretleri kontrol edip düzeltebilirsiniz.</div>' : '') : `<div class="readonly-banner">${inspectionReadOnly
        ? `İnceleme Modu · Maddeler salt okunur gösteriliyor.${normaldeDuzenleyebilir ? ' <button type="button" class="inline-review-exit" id="btnDuzenlemeyeDon">Düzenlemeye dön</button>' : ''}`
        : (tamamlandi
          ? 'Çalışma tamamlandı · Yalnız denetimin sahibi veya yönetici yeniden düzenlemeye açabilir.'
          : 'Salt okunur · Teknik müdür maddeleri inceleyebilir ve bütün denetimi silebilir; içerik veya sonuç değiştiremez.')}</div>`}
      <div class="det-head">
        <div class="inspection-eyebrow">${esc(standartOzeti(d))}</div>
        <div class="dtitle">${esc(d.musteri_unvani)}</div>
        <div class="dmeta"><b>Seri no:</b> ${esc(d.asansor_seri_no)}${d.denetim_adresi ? ` · ${esc(d.denetim_adresi)}` : ''}</div>
        ${d.denetimi_yapan ? `<div class="dmeta" style="margin-top:2px"><b>Denetimi yapan:</b> ${esc(d.denetimi_yapan)}</div>` : ''}
        ${d.bina_asansor_sayisi || d.kabin_giris_duzeni || d.kabin_kapi_acilma_tipi ? `<div class="dmeta" style="margin-top:2px"><b>Yerleşim:</b> ${esc([
          d.bina_asansor_sayisi ? `${d.bina_asansor_sayisi} asansör` : null,
          d.kabin_giris_duzeni,
          d.kabin_kapi_acilma_tipi,
        ].filter(Boolean).join(' · '))}</div>` : ''}
        <div class="dmeta" style="margin-top:4px"><b>Durum:</b> ${tamamlandi ? '✓ Çalışma Tamamlandı' : (gozden ? 'Gözden Geçirme' : 'Devam Ediyor')}</div>
        <div class="offline-ready ${offlineState.ready ? 'ok' : 'pending'}"><b>${offlineState.ready
          ? '✓ Bu cihaz çevrimdışı çalışmaya hazır'
          : '⚠ Bu cihaz çevrimdışı çalışmaya hazır değil'}</b><small>${esc(offlineState.detail)}</small></div>
        <div class="local-sync-state ${protectedSync ? 'error' : (inspectionOutbox.length ? 'pending' : 'ok')}" id="localSyncState">${protectedSync
          ? `⚠ ${protectedSync} işlem cihazda korumada · ${conflictSync ? 'Çakışma veya yetki' : 'Yetki'} incelemesi gerekiyor`
          : waitingSync
            ? `✓ Cihaza kaydedildi · ${waitingSync} işlem sunucu aktarımı bekliyor`
            : '✓ Cihaz ve sunucu eşit · Bekleyen işlem yok'}</div>
        <div class="progressbar"><div style="width:${rows.length ? done/rows.length*100 : 0}%"></div></div>
        <div class="pnums"><span>${done} / ${rows.length} madde</span><span>${bad} uygun değil${bakilmadiSayisi ? ` · ${bakilmadiSayisi} bakılmadı` : ''}</span></div>
      </div>
      <input class="searchbox" id="srch" placeholder="Madde no veya kelime ara…" value="${esc(search)}">
      <div class="filters">
        <button class="chip ${filter==='all'?'on':''}" data-f="all">Tümü</button>
        ${d.takip_onceki_denetim_id ? `<button class="chip ${filter==='previous_bad'?'on':''}" data-f="previous_bad">Önceki Uygun Değil</button>` : ''}
        <button class="chip ${filter==='empty'?'on':''}" data-f="empty">Bakılmadı</button>
        <button class="chip ${filter==='bad'?'on':''}" data-f="bad">Uygun Değil</button>
        ${icNot ? `<button class="chip ${filter==='internal'?'on':''}" data-f="internal">İç kontrol notu</button>` : ''}
      </div>
      <div id="bolums">`;

    const notlar = d.bolum_aciklamalari || {};
    // sıralı akış: tamamlanmamış ilk bölümü bul; ilk açılışta o bölüm açık gelsin
    let firstIncompleteBolum = null;
    for (const b of bolums) {
      if (byBolum[b].some(r => !isFlowComplete(r))) { firstIncompleteBolum = b; break; }
    }
    if (openBolums.size === 0 && !search && filter === 'all' && bolums.length) {
      openBolums.add(firstIncompleteBolum || bolums[0]);
    }
    const reviewMode = gozden;
    const freeMode = !!search || filter !== 'all'; // arama/filtre modunda klasik liste

    let lockActive = false; // firstIncomplete'ten SONRAKİ bölümler kilitli
    let stickyNav = null; // step modda aktif bölümün prev/next durumu
    for (const b of bolums) {
      const list = byBolum[b].filter(matches);
      const all = byBolum[b];
      const bd = all.filter(isFlowComplete).length;
      const bbad = all.filter(r => r.durum === 'Olumsuz bulgu').length;
      const bComplete = all.every(isFlowComplete);
      const locked = !freeMode && !reviewMode && currentCanEdit && lockActive;
      if (!freeMode && !reviewMode && currentCanEdit && b === firstIncompleteBolum) lockActive = true;
      if (!list.length) continue;
      const isOpen = !locked && (openBolums.has(b) || freeMode);

      let bodyHtml = '';
      if (isOpen && freeMode) {
        // arama/filtre: klasik liste
        bodyHtml = list.map(maddeHTML).join('');
      } else if (isOpen) {
        // ADIM ADIM MOD: tek madde göster
        let idx = cursors[b];
        if (idx === undefined || idx < 0 || idx >= all.length) {
          idx = currentCanEdit ? all.findIndex(r => !isFlowComplete(r)) : 0;
          if (idx === -1) idx = all.length - 1; // bölüm bitti: son madde
          cursors[b] = idx;
        }
        const cur = all[idx];
        const canNext = currentCanEdit ? canAdvanceFromItem(cur) : true;
        const isLast = idx === all.length - 1;
        const nextLabel = currentCanEdit
          ? (isLast ? 'Bölümü tamamla' : 'Sonraki ›')
          : (isLast ? 'Sonraki bölüm ›' : 'Sonraki ›');
        stickyNav = { b, idx, total: all.length, canPrev: idx > 0, canNext, isLast, nextLabel };
        bodyHtml = `
        <div class="stepnav">
          <button class="stepbtn" data-step="prev" data-b="${esc(b)}" ${idx===0?'disabled':''}>‹ Önceki</button>
          <span class="stepcount">${idx+1} / ${all.length}</span>
          <button class="stepbtn" data-step="next" data-b="${esc(b)}" ${canNext?'':'disabled'}>${nextLabel}</button>
        </div>
        ${maddeHTML(cur)}
        ${((bComplete || idx === all.length - 1) && (currentCanEdit || notlar[b])) ? `
        <div class="bolum-not"><label>Bölüm açıklaması (opsiyonel)</label>
        <textarea class="diger" data-bolumnot="${esc(b)}" placeholder="Bu bölümle ilgili genel not…" ${currentCanEdit?'':'disabled'}>${esc(notlar[b] || '')}</textarea></div>` : ''}`;
      }

      html += `
      <div class="bolum ${isOpen?'open':''} ${locked?'locked':''}">
        <button class="bolum-head" data-b="${esc(b)}" data-locked="${locked?1:0}">
          <span class="btitle">${locked?'🔒 ':''}${bComplete?'✅ ':''}${esc(b)}</span>
          <span class="bstat">${bbad ? `<span class="bbadge">${bbad}</span>` : ''}<span class="bcount">${bd}/${all.length}</span><span class="chev"></span></span>
        </button>
        <div class="bolum-body">${bodyHtml}${freeMode ? '' : ''}</div>
      </div>`;
    }
    html += `</div><div style="height:8px"></div></div>
    ${stickyNav ? `<div class="stickynav">
      <button class="sn-prev" data-sn="prev" ${stickyNav.canPrev?'':'disabled'}>‹ Önceki</button>
      <button class="sn-next" data-sn="next" ${stickyNav.canNext?'':'disabled'}>${stickyNav.nextLabel}</button>
    </div>` : ''}
    <div class="footbar">
      <button class="btn btn-ozet" id="btnOzet">İnceleme Modu (${rows.length})</button>
      <button class="btn btn-serial ${seriEksikleri(d).length ? 'pending' : 'ready'}" id="btnSeriler">Seri No · ${seriNumarasiSayisi(d)}/${seriBeklenenMinimum(d)}</button>
      ${inspectionReadOnly && normaldeDuzenleyebilir ? '<button class="btn btn-finish ready" id="btnDenetimeDon">↩ Denetime Geri Dön</button>' : ''}
      ${currentCanEdit && !tamamlandi ? `<button class="btn btn-finish ${bakilmadiSayisi === 0 ? 'ready' : ''}" id="btnBitirGlobal">${bakilmadiSayisi === 0
        ? (gozden ? 'Çalışmayı Tamamla' : 'Saha Kontrolünü Bitir')
        : 'Denetimi Bitir'}</button>` : ''}
    </div>`;
    document.getElementById('app').innerHTML = html;

    if (stickyNav) {
      const sn = stickyNav;
      document.querySelector('[data-sn="prev"]').onclick = () => moveStep(sn.b, sn.idx, -1);
      const nx = document.querySelector('[data-sn="next"]');
      nx.onclick = () => { if (!nx.disabled) moveStep(sn.b, sn.idx, 1); };
    }

    document.getElementById('back').onclick = showList;
    const btnDuzenlemeyeDon = document.getElementById('btnDuzenlemeyeDon');
    if (btnDuzenlemeyeDon) btnDuzenlemeyeDon.onclick = () => { inspectionReadOnly = false; renderDenetim(); };
    const btnDenetimeDon = document.getElementById('btnDenetimeDon');
    if (btnDenetimeDon) btnDenetimeDon.onclick = () => { inspectionReadOnly = false; renderDenetim(); };
    const btnSahayaHazirla = document.getElementById('btnSahayaHazirla');
    if (btnSahayaHazirla) btnSahayaHazirla.onclick = async () => {
      btnSahayaHazirla.disabled = true;
      btnSahayaHazirla.textContent = 'Doğrulanıyor…';
      try {
        const result = await sahayaHazirla(d, rows);
        sahayaHazirlikSonucuGoster(result);
        if (result.ready) await renderDenetim();
      } catch (error) {
        sahayaHazirlikSonucuGoster({ ready: false, checks: [{ name: 'Hazırlık kontrolü', ok: false, detail: error.message }] });
        btnSahayaHazirla.disabled = false;
        btnSahayaHazirla.textContent = '📱 Çevrimdışı Kontrol';
      }
    };
    const btnSil = document.getElementById('btnSil');
    const btnYazdir = document.getElementById('btnYazdir');
    if (btnYazdir) btnYazdir.onclick = async () => {
      if (!navigator.onLine) {
        toast('Bu özellik yalnız çevrimiçiyken kullanılabilir. Denetim kaydınız cihazda korunuyor.');
        return;
      }
      try {
        const forms = await FormOutput.formsForInspection(d);
        if (!forms.length) { toast('Bu denetim için resmî form tanımlı değil'); return; }
        const ov = document.createElement('div');
        ov.className = 'overlay';
        ov.innerHTML = `<div class="modal">
          <button class="close" aria-label="Kapat">×</button>
          <h3>Yazdır</h3>
          <div class="photo-help">Denetim verileri, denetim tarihinde kilitlenen resmî form revizyonuna aktarılır. Kaynak denetim kaydı değiştirilmez.</div>
          <div class="print-form-list">${forms.map(form => `<div class="print-form-card ${form.available ? '' : 'print-pending'}">
            <b>${esc(form.code)} · ${esc(form.revision)}</b>
            <small>${form.legacy_inferred ? 'Eski denetim · ana standarda göre mevcut resmî revizyon' : 'Denetime kilitli revizyon'}${form.available ? '' : ` · ${esc(form.reason)}`}</small>
          </div>`).join('')}</div>
          <div class="print-actions">
            <button class="btn btn-primary" data-print="pdf" ${forms.some(f => f.available) ? '' : 'disabled'}>PDF indir</button>
            <button class="btn btn-ghost" data-print="docx" ${forms.some(f => f.available) ? '' : 'disabled'}>Word indir</button>
          </div>
        </div>`;
        document.body.appendChild(ov);
        const close = () => ov.remove();
        ov.querySelector('.close').onclick = close;
        ov.onclick = event => { if (event.target === ov) close(); };
        ov.querySelectorAll('[data-print]').forEach(button => button.onclick = async () => {
          const original = button.textContent; button.disabled = true; button.textContent = 'Hazırlanıyor…';
          try {
            const filename = await FormOutput.download(button.dataset.print, d, rows);
            toast(`${filename} hazırlandı`);
          } catch (error) {
            console.error('Form çıktısı üretilemedi', error);
            toast(error.message || 'Form çıktısı üretilemedi');
          } finally { button.disabled = false; button.textContent = original; }
        });
      } catch (error) { toast(error.message || 'Yazdırma seçenekleri açılamadı'); }
    };
    if (btnSil) btnSil.onclick = async () => {
      if (!canDeleteDenetim(d)) { toast('Denetim silme yetkiniz yok'); return; }
      const bagliTakipler = (await DB.all('denetimler')).filter(item =>
        item.id !== d.id && (item.takip_onceki_denetim_id === d.id || item.takip_ana_denetim_id === d.id)
      );
      if (bagliTakipler.length) {
        toast(`Bu denetime bağlı ${bagliTakipler.length} takip denetimi var; zincirin ana kaydı silinemez`);
        return;
      }
      if (!confirm(`"${d.musteri_unvani} · ${d.asansor_seri_no}" denetimi ve tüm maddeleri silinecek. Emin misiniz?`)) return;
      if (!confirm('Bu işlem geri alınamaz. Silinsin mi?')) return;
      const sahaRows = await DB.allByIndex('saha', 'byDenetim', currentDenetimId);
      for (const r of sahaRows) await DB.del('saha', r.id);
      await DB.del('denetimler', currentDenetimId);
      await DB.kvDel(`offline_ready_${currentDenetimId}`);
      await DB.outboxAdd({ op: 'delete', table: 'denetimler', filter: `id=eq.${currentDenetimId}`, ts: Date.now() });
      const deleted = (await DB.kvGet('deleted_ids')) || [];
      deleted.push(currentDenetimId);
      await DB.kvSet('deleted_ids', deleted);
      Sync.updatePill();
      Sync.schedulePush();
      toast('Denetim silindi');
      showList();
    };
    const btnYenidenAc = document.getElementById('btnYenidenAc');
    if (btnYenidenAc) btnYenidenAc.onclick = async () => {
      if (!canReopenDenetim(d)) return;
      duzeltmeNedeniSec(d);
    };
    document.getElementById('srch').oninput = (e) => { search = e.target.value.trim().toLowerCase(); renderDenetim(); };
    document.querySelectorAll('.chip').forEach(c => c.onclick = () => { filter = c.dataset.f; renderDenetim(); });
    document.querySelectorAll('.bolum-head').forEach(h => h.onclick = () => {
      if (h.dataset.locked === '1') {
        toast('Önce açık bölümdeki maddeleri tamamlayın');
        const firstEmpty = document.querySelector('.bolum.open .madde:not(.done)');
        if (firstEmpty) firstEmpty.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      const b = h.dataset.b;
      if (openBolums.has(b)) openBolums.delete(b); else openBolums.add(b);
      renderDenetim();
    });
    document.getElementById('btnOzet').onclick = showOzet;
    document.getElementById('btnSeriler').onclick = seriNumaralariGoster;
    const btnBitirGlobal = document.getElementById('btnBitirGlobal');
    if (btnBitirGlobal) btnBitirGlobal.onclick = async () => {
      const latestRows = (await DB.allByIndex('saha', 'byDenetim', currentDenetimId)).sort(siraKarsilastir);
      const firstPending = latestRows.find(r => !isFlowComplete(r));
      if (!firstPending) {
        await denetimDurumuDegistir(gozden ? 'Çalışma Tamamlandı' : 'Gözden Geçirme');
        return;
      }
      search = ''; filter = 'all';
      openBolums = new Set([firstPending.bolum]);
      const bolumRows = latestRows.filter(r => r.bolum === firstPending.bolum);
      cursors[firstPending.bolum] = bolumRows.findIndex(r => r.id === firstPending.id);
      await rememberPosition(firstPending.bolum, firstPending.id);
      toast(`${latestRows.filter(r => !isFlowComplete(r)).length} madde henüz sonuçlandırılmadı`);
      await renderDenetim();
      const opened = document.querySelector('.bolum.open');
      if (opened) opened.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    bindMaddeEvents();
  }

  async function refreshSyncState() {
    const element = document.getElementById('localSyncState');
    if (!element || !currentDenetimId) return;
    const inspectionOutbox = (await DB.outboxAll()).filter(item => item.inspection_id === currentDenetimId);
    const conflictSync = inspectionOutbox.filter(item => item.sync_status === 'conflict').length;
    const protectedSync = inspectionOutbox.filter(item => ['forbidden','conflict'].includes(item.sync_status)).length;
    const waitingSync = inspectionOutbox.length - protectedSync;
    element.className = `local-sync-state ${protectedSync ? 'error' : (inspectionOutbox.length ? 'pending' : 'ok')}`;
    element.textContent = protectedSync
      ? `⚠ ${protectedSync} işlem cihazda korumada · ${conflictSync ? 'Çakışma veya yetki' : 'Yetki'} incelemesi gerekiyor`
      : waitingSync
        ? `✓ Cihaza kaydedildi · ${waitingSync} işlem sunucu aktarımı bekliyor`
        : '✓ Cihaz ve sunucu eşit · Bekleyen işlem yok';
  }

  function gorselDosyalari(referans) {
    const kod = (referans || '').split('—')[0].trim();
    const map = {
      'G-ISO13857-C4': ['G-ISO13857-C4-TR.svg'],
      'G-PIT-LADDER-TYPE3-4': ['G-PIT-LADDER-TYPE3-4-TR.svg'],
      'G-PIT-REFUGE-TABLE4': ['G-8120-C4.png'],
      'G-EN8120-FIG6-7': ['G-8120-S6-S7-TR.svg'],
      'G-8120-C3-S4': ['G-8120-C3-S4.png'],
      'G-8120-C4': ['G-8120-C4.png'],
      'G-8120-C6': ['G-8120-C6.png'],
      'G-8120-C6-C7': ['G-8120-C6.png', 'G-8120-C7.png'],
      'G-8120-S6-S7': ['G-8120-S6-S7-TR.svg'],
    };
    return map[kod] || [];
  }

  function fotoHatirlatmaMetni(bolum, d) {
    if (bolum === '04 - Makine ve Şase' && d.makine_dairesi_tipi === 'MRL') {
      return 'Regülatör ve motor etiketlerinin fotoğraflarını çekmeyi unutmayın.';
    }
    return FOTO_HATIRLATMALARI[bolum] || null;
  }

  function editorDraftKey(target) {
    const item = target.closest('.madde');
    if (!item) return null;
    const field = target.dataset.olcumId || (target.matches('[data-diger]') ? 'diger_bulgu' : 'aciklama');
    return `${item.dataset.id}:${field}`;
  }

  async function trackedEditorWrite(work) {
    const promise = Promise.resolve(work);
    pendingEditorWrites.add(promise);
    try { return await promise; }
    finally { pendingEditorWrites.delete(promise); }
  }

  function clearEditorDraft(target) {
    const key = editorDraftKey(target);
    const pending = key && editorDraftTimers.get(key);
    if (pending) clearTimeout(pending);
    if (key) editorDraftTimers.delete(key);
  }

  function scheduleEditorDraft(target) {
    const key = editorDraftKey(target);
    const item = target.closest('.madde');
    if (!key || !item) return;
    clearEditorDraft(target);
    const snapshot = {
      rowId: item.dataset.id,
      measurementId: target.dataset.olcumId || null,
      field: target.matches('[data-diger]') ? 'diger_bulgu' : (target.matches('[data-aciklama]') ? 'aciklama' : null),
      value: target.value,
    };
    const timer = setTimeout(() => {
      editorDraftTimers.delete(key);
      trackedEditorWrite((async () => {
        const row = await guncelSahaSatiri(snapshot.rowId);
        if (!row || !currentCanEdit) return;
        const value = snapshot.value.trim();
        if (snapshot.measurementId) {
          row.olcum_degerleri = row.olcum_degerleri && typeof row.olcum_degerleri === 'object' ? row.olcum_degerleri : {};
          if (value) row.olcum_degerleri[snapshot.measurementId] = value;
          else delete row.olcum_degerleri[snapshot.measurementId];
          if (snapshot.measurementId === 'olcu1') row.olcu1_degeri = value || null;
          if (snapshot.measurementId === 'olcu2') row.olcu2_degeri = value || null;
        } else if (snapshot.field) {
          row[snapshot.field] = value || null;
        }
        row.guncelleyen_email = API.email;
        row.updated_at = new Date().toISOString();
        await localWrite('saha_kontrol', row, 'saha');
      })()).catch(error => console.warn('Alan taslağı cihazda saklanamadı:', error.message));
    }, 700);
    editorDraftTimers.set(key, timer);
  }

  async function flushEditorWrites() {
    const active = document.activeElement;
    if (active && active.matches && active.matches('[data-diger],[data-aciklama],[data-olcum-id]')) active.blur();
    await new Promise(resolve => setTimeout(resolve, 0));
    if (pendingEditorWrites.size) await Promise.all([...pendingEditorWrites]);
  }

  async function fotoKontrolUyarisi(bolum) {
    if (!currentCanEdit) return true;
    const d = await DB.get('denetimler', currentDenetimId);
    const mesaj = fotoHatirlatmaMetni(bolum, d);
    if (!mesaj) return true;
    return new Promise(resolve => {
      const ov = document.createElement('div');
      ov.className = 'overlay';
      ov.innerHTML = `<div class="modal reminder-modal">
        <button class="close" aria-label="Kapat">×</button>
        <h3>Fotoğraf hatırlatması</h3>
        <div class="photo-help">${esc(mesaj)}</div>
        <button class="btn btn-primary" id="photoContinue">Tamam, devam et</button>
      </div>`;
      document.body.appendChild(ov);
      let finished = false;
      const finish = () => { if (finished) return; finished = true; ov.remove(); resolve(true); };
      ov.querySelector('.close').onclick = finish;
      ov.onclick = e => { if (e.target === ov) finish(); };
      ov.querySelector('#photoContinue').onclick = finish;
    });
  }

  async function seriNumaralariGoster() {
    const d = await DB.get('denetimler', currentDenetimId);
    if (!d) return;
    const canEdit = currentCanEdit;
    const original = seriNumaralariNormalize(d.seri_numaralari);
    const data = seriNumaralariNormalize(d.seri_numaralari);
    const ov = document.createElement('div');
    ov.className = 'overlay';
    const rowHTML = (key, item = {}) => {
      const id = item.id || crypto.randomUUID();
      const door = key === 'kat_kapilari';
      return `<div class="serial-row ${door ? 'door' : ''}" data-serial-row data-serial-key="${esc(key)}" data-serial-id="${esc(id)}">
        ${door ? `<input data-serial-prop="kat" placeholder="Kat / durak" value="${esc(item.kat || '')}" ${canEdit?'':'disabled'}>
          <input data-serial-prop="giris" placeholder="Giriş (A/B)" value="${esc(item.giris || '')}" ${canEdit?'':'disabled'}>` : ''}
        <input data-serial-prop="seri_no" placeholder="Seri numarası" value="${esc(item.seri_no || '')}" autocomplete="off" ${canEdit?'':'disabled'}>
        ${canEdit ? '<button type="button" class="serial-remove" aria-label="Kaydı kaldır">×</button>' : ''}
      </div>`;
    };
    const groupHTML = ([key, label, bolum]) => {
      if ((key === 'regulatorler' || key === 'motorlar') && d.makine_dairesi_tipi !== 'MRL') return '';
      const items = data[key].length ? data[key] : [{}];
      return `<section class="serial-group" data-serial-group="${esc(key)}">
        <div class="serial-group-head"><div><b>${esc(label)}</b><small>${esc(bolum)}</small></div>
          ${canEdit ? `<button type="button" class="serial-add" data-serial-add="${esc(key)}">+ Ekle</button>` : ''}</div>
        <div class="serial-rows">${items.map(item => rowHTML(key, item)).join('')}</div>
      </section>`;
    };
    ov.innerHTML = `<div class="modal serial-modal">
      <button class="close" aria-label="Kapat">×</button>
      <h3>Ekipman seri numaraları</h3>
      <div class="photo-help">Bu ekran denetimin her aşamasından açılabilir. Bilgiler fotoğraflardan bağımsızdır ve çevrimdışı olarak cihazda saklanır.</div>
      <div class="serial-groups">${SERI_GRUPLARI.map(groupHTML).join('')}</div>
      ${canEdit ? '<button class="btn btn-primary" id="serialSave">Kaydet ve kapat</button>' : '<button class="btn btn-primary" id="serialClose">Kapat</button>'}
    </div>`;
    document.body.appendChild(ov);

    const collect = () => {
      // Ekranda gösterilmeyen koşullu grupları koru. Örneğin geçmişte MRL
      // olarak kaydedilmiş regülatör/motor bilgileri, yapılandırma sonradan
      // farklı görünse bile başka bir seri kaydı düzenlenirken silinmemeli.
      const result = seriNumaralariNormalize(data);
      ov.querySelectorAll('[data-serial-group]').forEach(group => {
        result[group.dataset.serialGroup] = [];
      });
      ov.querySelectorAll('[data-serial-row]').forEach(row => {
        const key = row.dataset.serialKey;
        const value = { id: row.dataset.serialId };
        row.querySelectorAll('[data-serial-prop]').forEach(input => { value[input.dataset.serialProp] = input.value.trim(); });
        const keep = key === 'kat_kapilari' ? (value.seri_no || value.kat || value.giris) : value.seri_no;
        if (keep) result[key].push(value);
      });
      return result;
    };
    const persist = async () => {
      if (!canEdit) return;
      const next = collect();
      if (stableStringify(next) === stableStringify(original)) return;
      d.seri_numaralari = next;
      d.updated_at = new Date().toISOString();
      await localWrite('denetimler', d, 'denetimler');
      const button = document.getElementById('btnSeriler');
      if (button) {
        button.textContent = `Seri No · ${seriNumarasiSayisi(d)}/${seriBeklenenMinimum(d)}`;
        button.classList.toggle('pending', seriEksikleri(d).length > 0);
        button.classList.toggle('ready', seriEksikleri(d).length === 0);
      }
    };
    let closing = false;
    const close = async () => {
      if (closing) return;
      closing = true;
      try {
        await persist();
        ov.remove();
      } catch (error) {
        closing = false;
        toast('Seri numaraları cihazda kaydedilemedi; ekran açık bırakıldı');
        console.error('Seri numarası kaydı başarısız', error);
      }
    };

    ov.querySelectorAll('[data-serial-add]').forEach(button => button.onclick = () => {
      const key = button.dataset.serialAdd;
      ov.querySelector(`[data-serial-group="${key}"] .serial-rows`).insertAdjacentHTML('beforeend', rowHTML(key));
    });
    ov.addEventListener('click', e => {
      const remove = e.target.closest('.serial-remove');
      if (!remove) return;
      const row = remove.closest('[data-serial-row]');
      const rows = row.parentElement.querySelectorAll('[data-serial-row]');
      if (rows.length > 1) row.remove();
      else row.querySelectorAll('input').forEach(input => { input.value = ''; });
    });
    ov.querySelector('.close').onclick = close;
    ov.onclick = e => { if (e.target === ov) close(); };
    const save = ov.querySelector('#serialSave');
    if (save) save.onclick = close;
    const closeButton = ov.querySelector('#serialClose');
    if (closeButton) closeButton.onclick = () => ov.remove();
  }

  function gorselHTML(r) {
    const files = gorselDosyalari(r.gorsel_referansi);
    if (!files.length) return '';
    const aciklama = (r.gorsel_referansi || '').split('—').slice(1).join('—').trim();
    return `<details class="mvisual">
      <summary>Şekil / çizelgeyi aç</summary>
      ${aciklama ? `<div class="mvisual-note">${esc(aciklama)}</div>` : ''}
      ${files.map(f => `<img src="referans-gorseller/${esc(f)}" alt="${esc(aciklama || 'Standart referans görseli')}" loading="lazy">`).join('')}
    </details>`;
  }

  function olcumTanimlari(r) {
    if (Array.isArray(r.olcum_tanimlari) && r.olcum_tanimlari.length) return r.olcum_tanimlari;
    const legacy = [];
    const belirsizEtiket = (value) => ['Ölçü 1', 'Ölçü 2', 'Ölçülen değer'].includes((value || '').trim());
    // R6 çıkarımından kalan belirsiz alanlar yeni denetimde gösterilmez. Eski bir
    // denetimde değer girilmişse geçmiş kaydı erişilebilir tutmak için gösterilir.
    if (r.olcu1_adi && (!belirsizEtiket(r.olcu1_adi) || r.olcu1_degeri != null)) {
      legacy.push({ id: 'olcu1', etiket: r.olcu1_adi, birim: r.olcu1_birimi || null, tur: 'sayi' });
    }
    if (r.olcu2_adi && (!belirsizEtiket(r.olcu2_adi) || r.olcu2_degeri != null)) {
      legacy.push({ id: 'olcu2', etiket: r.olcu2_adi, birim: r.olcu2_birimi || null, tur: 'sayi' });
    }
    return legacy;
  }

  function olcumDegeri(r, tanim) {
    const values = r.olcum_degerleri && typeof r.olcum_degerleri === 'object' ? r.olcum_degerleri : {};
    if (values[tanim.id] != null) return values[tanim.id];
    if (tanim.id === 'olcu1') return r.olcu1_degeri || '';
    if (tanim.id === 'olcu2') return r.olcu2_degeri || '';
    return '';
  }

  function olcumHTML(r) {
    const defs = olcumTanimlari(r);
    if (!defs.length) return '';
    return `<div class="olcumler"><div class="olcum-baslik">Saha ölçüleri <span>opsiyonel</span></div>
      <div class="olcu-row">${defs.map(def => {
        const label = ['Ölçü 1', 'Ölçülen değer'].includes(def.etiket) ? 'Ölçülen değer' : def.etiket;
        const value = olcumDegeri(r, def);
        const ref = def.referans_metni ? `<div class="olcum-ref"><b>Referans:</b> ${esc(def.referans_metni)}</div>` : '';
        if (def.tur === 'secim' && Array.isArray(def.secenekler)) {
          return `<div class="olcu"><label>${esc(label)}${def.birim ? ` (${esc(def.birim)})` : ''}</label>
            <select data-olcum-id="${esc(def.id)}" ${currentCanEdit ? '' : 'disabled'}><option value="">—</option>${def.secenekler.map(o => `<option value="${esc(o)}" ${String(value) === String(o) ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>${ref}</div>`;
        }
        const inputmode = def.tur === 'metin' ? 'text' : 'decimal';
        return `<div class="olcu"><label>${esc(label)}${def.birim ? ` (${esc(def.birim)})` : ''}</label>
          <input data-olcum-id="${esc(def.id)}" value="${esc(value)}" inputmode="${inputmode}" placeholder="—" ${currentCanEdit ? '' : 'disabled'}>${ref}</div>`;
      }).join('')}</div></div>`;
  }

  function maddeHTML(r) {
    const durum = effectiveDurum(r);
    const cls = durum ? 's-' + DURUM_CSS[durum] : '';
    const tasarim = r.kaynak_turu === 'Ek Mühendislik';
    const olcumKaydi = r.kaynak_turu === 'Saha Ölçümü';
    const opts = (r.hazir_secenekler || '').split('|').map(o => o.trim()).filter(Boolean);
    const ozelOpts = opts.filter(o => !GENEL_BULGULAR.includes(o));
    const uygunDegil = durum === 'Olumsuz bulgu';
    // Bulgu seçenekleri YALNIZCA Uygun Değil'de ve yalnızca özel seçenek varsa
    const showBulguOpts = uygunDegil && ozelOpts.length > 0;
    const showUygDegilAciklama = uygunDegil && (ozelOpts.length === 0 || r.bulgu_secenegi === 'Diğer bulgu');
    // Eski 'Veri eksik' kaydı checklist sonucu değildir; iç kontrol notu olarak gösterilir.
    const eskiEksikKaydi = r.durum === 'Veri eksik';
    const icKontrolNotu = r.ic_kontrol_notu || (eskiEksikKaydi ? 'Önceki sürümde Veri eksik olarak işaretlenmişti; üçlü sonuçtan biriyle yeniden değerlendirin.' : '');
    const eskiOtoNot = !!r.otomatik_uygulanmaz && (r.aciklama || '').startsWith('Otomatik işaretlendi:');
    const gosterilenAciklama = eskiOtoNot ? '' : (r.aciklama || '');
    const noteOpen = !!gosterilenAciklama;
    const durumlar = DURUMLAR;
    const durumEtiketleri = DURUM_KISA;
    const baslik = r.kontrol_basligi || '';
    const rehber = rehberMetni(r.denetci_yonlendirmesi || '');
    const resmiMetin = r.resmi_madde_metni || '';
    const ayni = metinlerAyni(baslik, rehber);
    const rehberResmiyleAyni = metinlerAyni(resmiMetin, rehber);
    const hamRehberParca = resmiMetin ? { ana: '', saha: rehberResmiyleAyni ? '' : rehber } : splitRehber(rehber);
    const kaynakEtiketi = [r.kaynak_form_kodu, r.kaynak_form_revizyonu].filter(Boolean).join(' ');
    // Başlık kısa/kalıtsal görünse bile kalın gösterilen alan hep başlıktır;
    // resmi metin ve rehber gövdesi hep normal punto ile ayrı gösterilir.
    // Böylece uzun bir resmi madde metni yanlışlıkla tek bir kalın blok
    // olarak basılmaz (göz yorması ve okunabilirlik sorununa yol açardı).
    const gosterilenBaslik = baslik;
    const gosterilenResmiMetin = resmiMetin;
    const rehberParca = hamRehberParca;
    return `
    <div class="madde ${cls} ${isComplete(r)?'done':''} ${currentCanEdit?'':'readonly'}" data-id="${r.id}">
      <div class="mtop">
        ${tasarim ? '<span class="mtag muh">Tasarım İnceleme</span>' : ''}
        ${olcumKaydi ? '<span class="mtag olcum-tag">Saha Ölçümü</span>' : ''}
        ${r.dogrulama_yontemi ? `<span class="mtag yontem">${esc(r.dogrulama_yontemi)}</span>` : ''}
        <span class="mref">${esc(r.standart_madde_no || '')}</span>
      </div>
      <div class="mtitle">${esc(gosterilenBaslik)}</div>
      ${gosterilenResmiMetin ? `<div class="mrequirement">${esc(gosterilenResmiMetin)}</div>` : ''}
      ${kaynakEtiketi ? `<div class="msource">Kaynak: ${esc(kaynakEtiketi)}</div>` : ''}
      ${ayni && !resmiMetin ? '' : `${rehberParca.ana ? `<div class="mrequirement">${esc(rehberParca.ana)}</div>` : ''}
      ${rehberParca.saha ? `<div class="mguide saha-guide"><span>AVES SAHA REHBERİ</span>${esc(rehberParca.saha)}</div>` : ''}`}
      ${r.aranmaz_kosulu ? `<div class="aranmaz-note"><b>Uygulanmaz koşulu:</b> ${esc(uygulanmazKosuluMetni(r.aranmaz_kosulu))}</div>` : ''}
      ${r.otomatik_uygulanmaz && r.otomatik_gerekce ? `<div class="aranmaz-note"><b>Otomatik Uygulanmaz gerekçesi:</b> ${esc(r.otomatik_gerekce)}</div>` : ''}
      ${r.takip_kaynak_saha_kontrol_id ? `<div class="followup-previous ${r.takip_onceki_durum === 'Olumsuz bulgu' ? 'bad' : ''}">
        <b>Önceki denetim sonucu:</b> ${esc(DURUM_KISA[r.takip_onceki_durum] || r.takip_onceki_durum || 'Sonuç yok')}
        ${r.takip_onceki_bulgu_secenegi ? `<span> · ${esc(r.takip_onceki_bulgu_secenegi)}</span>` : ''}
        ${r.takip_onceki_diger_bulgu || r.takip_onceki_aciklama ? `<small>${esc(r.takip_onceki_diger_bulgu || r.takip_onceki_aciklama)}</small>` : ''}
      </div>` : ''}
      ${gorselHTML(r)}
      ${olcumHTML(r)}
      ${icKontrolNotu ? `<div class="aranmaz-note"><b>İç kontrol notu:</b> ${esc(icKontrolNotu)}</div>` : ''}
      <div class="mstates" style="margin-top:9px">
        ${durumlar.map(du => `<button class="mst ${durum===du ? 'on-'+DURUM_CSS[du] : ''}" data-durum="${esc(du)}" ${(transitioningId===r.id || !currentCanEdit)?'disabled':''}>${durumEtiketleri[du]}</button>`).join('')}
        ${currentCanEdit ? `<button class="notbtn ${gosterilenAciklama ? 'has' : ''}" data-notbtn title="Madde açıklaması">✎</button>` : ''}
      </div>
      ${showBulguOpts ? `<div class="msub"><label>Bulgu</label><div class="bulgu-opts">
        ${ozelOpts.map(o => `<button class="bopt ${r.bulgu_secenegi===o ? 'on' : ''}" data-bulgu="${esc(o)}" ${currentCanEdit?'':'disabled'}>${esc(o)}</button>`).join('')}
        <button class="bopt ${r.bulgu_secenegi==='Diğer bulgu' ? 'on' : ''}" data-bulgu="Diğer bulgu" ${currentCanEdit?'':'disabled'}>Diğer bulgu</button>
      </div><div class="optional-hint">Bulgu seçmeden Sonraki ile devam edebilirsiniz.</div></div>` : ''}
      ${showUygDegilAciklama ? `<div class="msub"><label>Uygunsuzluk açıklaması (opsiyonel)</label>
        <textarea class="diger" data-diger placeholder="Ne görüldü, neresi uygun değil…" ${currentCanEdit?'':'disabled'}>${esc(r.diger_bulgu || '')}</textarea>
        <div class="optional-hint">Açıklama yazmadan Sonraki ile devam edebilirsiniz.</div></div>` : ''}
      <div class="msub ${noteOpen ? '' : 'hidden'}" data-notwrap><label>Madde açıklaması (opsiyonel)</label>
        <textarea class="diger" data-aciklama placeholder="Bu maddeye özel not…" ${currentCanEdit?'':'disabled'}>${esc(gosterilenAciklama)}</textarea></div>
    </div>`;
  }

  function splitRehber(text) {
    const s = (text || '').trim();
    if (!s) return { ana: '', saha: '' };
    let m = /:\s*-\s+/.exec(s);
    if (m) {
      const colon = m.index + 1;
      return { ana: s.slice(0, colon).trim(), saha: s.slice(m.index + m[0].length).trim() };
    }
    m = /\s+-\s+/.exec(s);
    if (m) return { ana: s.slice(0, m.index).trim(), saha: s.slice(m.index + m[0].length).trim() };
    return { ana: s, saha: '' };
  }

  function rehberMetni(text) {
    return resmiSonucDili(text || '')
      .replace(/\s+(?:Aranmaz|Uygulanmaz)\s*:[\s\S]*$/i, '')
      .replace(/\s+Bölme\s+deliksizse\s+(?:Aranmaz|Uygulanmaz)\s+seçin\.?$/i, '')
      .replace(/\s+Bu\s+bileşen\s+yoksa\s+maddeyi\s+(?:Aranmaz|Uygulanmaz)\s+olarak\s+değerlendirin\.?$/i, '')
      .replace(/\s+Makara\s+dairesi\s+yoksa\s+(?:Aranmaz|Uygulanmaz)\s+olarak\s+değerlendirin\.?$/i, '')
      .trim();
  }

  function uygulanmazKosuluMetni(text) {
    let s = (text || '').trim()
      .replace(/\s+sistem\s+(?:Aranmaz|Uygulanmaz)\s+olarak\s+ön\s+işaretler;\s*mühendis\s+değiştirebilir\.?$/i, '')
      .replace(/\s+merdiven\s+için\s+(?:Aranmaz|Uygulanmaz)\.?$/i, '')
      .replace(/\s+ölçü\s+alanları\s+için\s+(?:Aranmaz|Uygulanmaz)\.?$/i, '')
      .replace(/\s+(?:Aranmaz|Uygulanmaz)\.?$/i, '')
      .trim();
    if (s && !/[.!?]$/.test(s)) s += '.';
    return s;
  }

  function metinlerAyni(a, b) {
    const normalize = (value) => (value || '')
      .replace(/^kontrol:\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLocaleLowerCase('tr-TR');
    return !!normalize(a) && normalize(a) === normalize(b);
  }

  function bindMaddeEvents() {
    document.getElementById('bolums').addEventListener('input', (e) => {
      if (!currentCanEdit) return;
      if (e.target.matches('[data-diger],[data-aciklama],[data-olcum-id]')) scheduleEditorDraft(e.target);
    });
    document.getElementById('bolums').addEventListener('click', async (e) => {
      const stepBtn = e.target.closest('[data-step]');
      if (stepBtn && !stepBtn.disabled) {
        const b = stepBtn.dataset.b;
        const idx = cursors[b] || 0;
        await moveStep(b, idx, stepBtn.dataset.step === 'next' ? 1 : -1);
        return;
      }
      const mEl = e.target.closest('.madde'); if (!mEl) return;
      const id = mEl.dataset.id;
      const row = await guncelSahaSatiri(id);
      if (!currentCanEdit) {
        toast('Bu denetim salt okunur');
        return;
      }

      const notBtn = e.target.closest('[data-notbtn]');
      if (notBtn) {
        const wrap = mEl.querySelector('[data-notwrap]');
        wrap.classList.toggle('hidden');
        if (!wrap.classList.contains('hidden')) wrap.querySelector('textarea').focus();
        return;
      }
      const durumBtn = e.target.closest('[data-durum]');
      if (durumBtn) {
        if (autoAdvanceTimer) { clearTimeout(autoAdvanceTimer); autoAdvanceTimer = null; transitioningId = null; }
        mEl.querySelectorAll('[data-durum]').forEach(b => { b.disabled = true; });
        const yeni = durumBtn.dataset.durum;
        row.durum = (row.durum === yeni) ? null : yeni;
        row.otomatik_uygulanmaz = false;
        row.otomatik_gerekce = null;
        if (row.durum) {
          row.gozden_gecirme_nedeni = null;
          row.gozden_gecirme_notu = null;
        }
        transitioningId = (!search && filter === 'all' && row.durum === 'Kontrol tamamlandı') ? id : null;
        if (row.durum !== 'Olumsuz bulgu') {
          row.bulgu_secenegi = null; row.diger_bulgu = null;
        }
        await save(row, mEl);
        return;
      }
      const bulguBtn = e.target.closest('[data-bulgu]');
      if (bulguBtn) {
        row.bulgu_secenegi = (row.bulgu_secenegi === bulguBtn.dataset.bulgu) ? null : bulguBtn.dataset.bulgu;
        if (row.bulgu_secenegi !== 'Diğer bulgu') row.diger_bulgu = null;
        await save(row, mEl);
        return;
      }
    });
    document.getElementById('bolums').addEventListener('change', async (e) => {
      if (!currentCanEdit) {
        toast('Bu denetim salt okunur');
        await renderDenetim();
        return;
      }
      // bölüm notu
      if (e.target.matches('[data-bolumnot]')) {
        const d = await DB.get('denetimler', currentDenetimId);
        d.bolum_aciklamalari = d.bolum_aciklamalari || {};
        d.bolum_aciklamalari[e.target.dataset.bolumnot] = e.target.value.trim();
        d.updated_at = new Date().toISOString();
        await localWrite('denetimler', d, 'denetimler');
        toast('Bölüm notu kaydedildi');
        return;
      }
      const mEl = e.target.closest('.madde'); if (!mEl) return;
      const row = await guncelSahaSatiri(mEl.dataset.id);
      clearEditorDraft(e.target);
      if (e.target.matches('[data-olcum-id]')) {
        const olcumId = e.target.dataset.olcumId;
        row.olcum_degerleri = row.olcum_degerleri && typeof row.olcum_degerleri === 'object' ? row.olcum_degerleri : {};
        const value = e.target.value.trim();
        if (value) row.olcum_degerleri[olcumId] = value; else delete row.olcum_degerleri[olcumId];
        // Eski iki kolon, eski denetimlerin ve dışa aktarımların geriye uyumluluğu için korunur.
        if (olcumId === 'olcu1') row.olcu1_degeri = value || null;
        if (olcumId === 'olcu2') row.olcu2_degeri = value || null;
        row.guncelleyen_email = API.email;
        row.updated_at = new Date().toISOString();
        await trackedEditorWrite(localWrite('saha_kontrol', row, 'saha'));
        await uygulaOlcumeBagliAranmaz(row);
        await esikOnerisiGoster(row, olcumId, value);
        await renderDenetim();
        return;
      }
      if (e.target.matches('[data-diger]')) {
        row.diger_bulgu = e.target.value.trim() || null;
        await trackedEditorWrite(save(row, mEl));
        return;
      }
      if (e.target.matches('[data-aciklama]')) {
        row.aciklama = e.target.value.trim() || null;
        row.guncelleyen_email = API.email;
        row.updated_at = new Date().toISOString();
        await trackedEditorWrite(localWrite('saha_kontrol', row, 'saha'));
        mEl.querySelector('[data-notbtn]').classList.toggle('has', !!row.aciklama);
        toast('Madde açıklaması kaydedildi');
        return; // açıklama tamamlanmayı etkilemez, otomatik geçiş tetiklenmez
      }
      await save(row, mEl);
    });
  }

  function kuralSaglanir(value, rule) {
    // Metinsel eşleşme (ör. kabin tipi seçimi gibi sayısal olmayan ortak
    // değerler) — sayısal ayrıştırmadan önce kontrol edilir.
    if (rule.operator === 'icerir') return String(value).includes(String(rule.deger));
    if (rule.operator === 'icermez') return !String(value).includes(String(rule.deger));
    const n = Number(String(value).replace(',', '.'));
    const limit = Number(rule.deger);
    if (!Number.isFinite(n) || !Number.isFinite(limit)) return false;
    if (rule.operator === '>') return n > limit;
    if (rule.operator === '>=') return n >= limit;
    if (rule.operator === '<') return n < limit;
    if (rule.operator === '<=') return n <= limit;
    if (rule.operator === '=') return n === limit;
    return false;
  }

  async function esikOnerisiGoster(row, olcumId, value) {
    // Eski eşik alanı yalnız olcu1 ile ilişkilidir. Yapılandırılmış çoklu
    // ölçümlerde eşik-ölçüm bağı açıkça tanımlanmadıkça tahmin yürütülmez.
    if (olcumId !== 'olcu1' || !value || row.durum === 'Olumsuz bulgu') return;
    if (Array.isArray(row.olcum_tanimlari) && row.olcum_tanimlari.length) return;
    if (row.esik_deger == null || !row.esik_operator) return;
    const numericValue = Number(String(value).replace(',', '.'));
    if (!Number.isFinite(numericValue)) return;
    if (kuralSaglanir(value, { operator: row.esik_operator, deger: row.esik_deger })) return;

    const operatorLabels = { '>': '>', '>=': '≥', '<': '<', '<=': '≤', '=': '=' };
    const operatorLabel = operatorLabels[row.esik_operator] || row.esik_operator;
    const unit = row.olcu1_birimi ? ` ${row.olcu1_birimi}` : '';
    const label = row.olcu1_adi || 'Ölçülen değer';
    await new Promise(resolve => {
      const ov = document.createElement('div');
      ov.className = 'overlay';
      ov.innerHTML = `<div class="modal">
        <button class="close" aria-label="Kapat">×</button>
        <h3>Ölçüm eşik önerisi</h3>
        <div class="onay-box">
          <div class="onay-satir"><span>${esc(label)}</span><b>${esc(value)}${esc(unit)}</b></div>
          <div class="onay-satir"><span>Kontrol ölçütü</span><b>${esc(operatorLabel)} ${esc(row.esik_deger)}${esc(unit)}</b></div>
        </div>
        <p style="font-size:13px;line-height:1.5;color:var(--muted);margin:0 0 14px">Girilen değer kayıtlı ölçütü karşılamıyor. Bu yalnızca bir öneridir; uygulama sonucu kendiliğinden değiştirmez. Madde metnindeki istisnaları denetçi değerlendirir.</p>
        <button class="btn btn-ghost" id="thresholdIgnore" style="margin-bottom:8px">Yoksay</button>
        <button class="btn btn-primary" id="thresholdReject">Uygun Değil işaretle</button>
      </div>`;
      document.body.appendChild(ov);
      let finished = false;
      const finish = () => { if (finished) return; finished = true; ov.remove(); resolve(); };
      ov.querySelector('.close').onclick = finish;
      ov.querySelector('#thresholdIgnore').onclick = finish;
      ov.onclick = e => { if (e.target === ov) finish(); };
      ov.querySelector('#thresholdReject').onclick = async () => {
        row.durum = 'Olumsuz bulgu';
        row.otomatik_uygulanmaz = false;
        row.denetci_gordu = true;
        row.guncelleyen_email = API.email;
        row.updated_at = new Date().toISOString();
        await localWrite('saha_kontrol', row, 'saha');
        finish();
      };
    });
  }

  async function uygulaOlcumeBagliAranmaz(changedRow) {
    const changedDefs = olcumTanimlari(changedRow);
    const sharedKeys = changedDefs.map(d => d.paylasimli_anahtar).filter(Boolean);
    if (!sharedKeys.length) return;
    const rows = await DB.allByIndex('saha', 'byDenetim', currentDenetimId);
    for (const key of sharedKeys) {
      const sourceDef = changedDefs.find(d => d.paylasimli_anahtar === key);
      const value = olcumDegeri(changedRow, sourceDef);
      for (const target of rows) {
        const rule = target.otomatik_aranmaz_kurali;
        if (!rule || rule.paylasimli_anahtar !== key) continue;
        const shouldBeNa = value !== '' && kuralSaglanir(value, rule);
        let changed = false;
        if (shouldBeNa && target.durum !== 'Uygulanmaz') {
          target.durum = 'Uygulanmaz';
          target.otomatik_uygulanmaz = true;
          // Bu yolun gerekçesi aranmaz_kosulu'dur; tahrik/MD yolundan kalan
          // eski gerekçe metni yanlışlıkla gösterilmesin.
          target.otomatik_gerekce = null;
          target.denetci_gordu = false;
          changed = true;
        } else if (!shouldBeNa && target.otomatik_uygulanmaz && target.durum === 'Uygulanmaz') {
          target.durum = null;
          target.otomatik_uygulanmaz = false;
          target.otomatik_gerekce = null;
          target.denetci_gordu = false;
          changed = true;
        }
        if (changed) {
          target.guncelleyen_email = API.email;
          target.updated_at = new Date().toISOString();
          await localWrite('saha_kontrol', target, 'saha');
        }
      }
    }
  }

  async function save(row, mEl) {
    if (!currentCanEdit) { toast('Bu denetim salt okunur'); return; }
    if (row.durum) row.denetci_gordu = true;
    row.guncelleyen_email = API.email;
    row.updated_at = new Date().toISOString();
    await localWrite('saha_kontrol', row, 'saha');
    const freeMode = !!search || filter !== 'all';

    if (freeMode) {
      const wrap = document.createElement('div');
      wrap.innerHTML = maddeHTML(row);
      mEl.replaceWith(wrap.firstElementChild);
      renderHeaderCounts();
      return;
    }

    // Uygun Değil'de açıklama/bulgu tamamen opsiyoneldir. Ekranı tam yeniden
    // çizerek hem üst hem sabit Sonraki düğmesini kesin olarak aktif tut.
    if (row.durum === 'Olumsuz bulgu') {
      await renderDenetim();
      return;
    }

    // ADIM ADIM MOD
    if (!canAdvanceFromItem(row)) {
      // sonuç seçilmediyse aynı maddede kal
      const wrap = document.createElement('div');
      wrap.innerHTML = maddeHTML(row);
      mEl.replaceWith(wrap.firstElementChild);
      renderHeaderCounts();
      // Sonraki butonunun aktifliğini tazele
      const canMove = canAdvanceFromItem(row);
      const nav = document.querySelector('.bolum.open [data-step="next"]');
      if (nav) nav.disabled = !canMove;
      const stickyNext = document.querySelector('[data-sn="next"]');
      if (stickyNext) {
        stickyNext.disabled = !canMove;
        const idx = cursors[row.bolum] || 0;
        stickyNext.onclick = () => { if (!stickyNext.disabled) moveStep(row.bolum, idx, 1); };
      }
      return;
    }

    // tamamlandı → kısa bir onay görünümü, sonra otomatik SONRAKİ madde
    const wrap = document.createElement('div');
    wrap.innerHTML = maddeHTML(row);
    mEl.replaceWith(wrap.firstElementChild);
    renderHeaderCounts();

    const rows = (await guncelKutuphaneMetadatasi(
      await DB.allByIndex('saha', 'byDenetim', currentDenetimId)
    )).sort(siraKarsilastir);
    const bolumRows = rows.filter(r => r.bolum === row.bolum);
    const idx = bolumRows.findIndex(r => r.id === row.id);

    if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer = setTimeout(async () => {
      autoAdvanceTimer = null;
      transitioningId = null;
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      if (idx < bolumRows.length - 1) {
        const nextRow = bolumRows[idx + 1];
        if (nextRow && nextRow.denetci_gordu === false && !nextRow.otomatik_uygulanmaz && nextRow.durum) {
          nextRow.durum = null;
          nextRow.bulgu_secenegi = null;
          nextRow.diger_bulgu = null;
          await localWrite('saha_kontrol', nextRow, 'saha');
        }
        cursors[row.bolum] = idx + 1;
        await rememberPosition(row.bolum, nextRow.id);
        await renderDenetim();
        const opened = document.querySelector('.bolum.open');
        if (opened) opened.scrollIntoView({ block: 'start' });
      } else {
        // Bölümün son maddesi tamamlandı. Kullanıcıyı otomatik olarak başka
        // bölüme taşımıyoruz; sonraki bölüm seçimini saha kullanıcısı yapar.
        const allDone = bolumRows.every(isFlowComplete);
        if (allDone) toast(`${row.bolum} tamamlandı ✓`);
        await renderDenetim();
      }
    }, 150);
  }

  async function moveStep(bolum, idx, delta) {
    const allRows = (await DB.allByIndex('saha', 'byDenetim', currentDenetimId))
      .sort(siraKarsilastir);
    const rows = allRows.filter(r => r.bolum === bolum);
    if (!currentCanEdit) {
      if (delta > 0 && idx >= rows.length - 1) {
        const order = [];
        allRows.forEach(r => { if (!order.includes(r.bolum)) order.push(r.bolum); });
        const bIdx = order.indexOf(bolum);
        if (bIdx >= 0 && bIdx < order.length - 1) {
          openBolums.delete(bolum);
          delete cursors[bolum];
          openBolums.add(order[bIdx + 1]);
        } else {
          toast('Son bölüm');
        }
      } else {
        cursors[bolum] = Math.max(0, Math.min(rows.length - 1, idx + delta));
      }
      await renderDenetim();
      return;
    }
    if (delta > 0) {
      const row = rows[idx];
      if (row && row.denetci_gordu === false) {
        row.denetci_gordu = true;
        row.guncelleyen_email = API.email;
        row.updated_at = new Date().toISOString();
        await localWrite('saha_kontrol', row, 'saha');
      }
      if (idx >= rows.length - 1) {
        const firstPending = rows.findIndex(r => !isFlowComplete(r));
        if (firstPending !== -1) {
          cursors[bolum] = firstPending;
          await renderDenetim();
          return;
        }
        if (!(await fotoKontrolUyarisi(bolum))) return;
        const order = [];
        allRows.forEach(r => { if (!order.includes(r.bolum)) order.push(r.bolum); });
        const bolumIndex = order.indexOf(bolum);
        if (bolumIndex >= 0 && bolumIndex < order.length - 1) {
          const sonrakiBolum = order[bolumIndex + 1];
          const sonrakiRows = allRows.filter(r => r.bolum === sonrakiBolum);
          let sonrakiIndex = sonrakiRows.findIndex(r => !isFlowComplete(r));
          if (sonrakiIndex < 0) sonrakiIndex = 0;
          openBolums.delete(bolum);
          delete cursors[bolum];
          openBolums.add(sonrakiBolum);
          cursors[sonrakiBolum] = sonrakiIndex;
          if (sonrakiRows[sonrakiIndex]) await rememberPosition(sonrakiBolum, sonrakiRows[sonrakiIndex].id);
          toast(`${bolum} tamamlandı ✓ · ${sonrakiBolum} açıldı`);
        } else {
          toast(`${bolum} tamamlandı ✓ · Son bölüm`);
        }
        await renderDenetim();
        requestAnimationFrame(() => {
          const opened = document.querySelector('.bolum.open');
          if (opened) opened.scrollIntoView({ block: 'start' });
        });
        return;
      }
    }
    cursors[bolum] = idx + delta;
    const target = rows[cursors[bolum]];
    if (target) await rememberPosition(bolum, target.id);
    await renderDenetim();
  }

  async function renderHeaderCounts() {
    const rows = await DB.allByIndex('saha', 'byDenetim', currentDenetimId);
    const done = rows.filter(isFlowComplete).length;
    const bad = rows.filter(r => r.durum === 'Olumsuz bulgu').length;
    const pending = rows.filter(r => !isFlowComplete(r)).length;
    const pb = document.querySelector('.progressbar>div');
    if (pb) pb.style.width = (rows.length ? done/rows.length*100 : 0) + '%';
    const pn = document.querySelector('.pnums');
    if (pn) pn.innerHTML = `<span>${done} / ${rows.length} madde</span><span>${bad} uygun değil${pending ? ` · ${pending} bakılmadı` : ''}</span>`;
    const ob = document.getElementById('btnOzet');
    if (ob) ob.textContent = `İnceleme Modu (${rows.length})`;
  }

  /* ---- Gözden Geçirme / kapanış ---- */
  async function butunlukOzetiHesapla(d, rows, hedefDurum) {
    const sorted = rows.slice().sort(siraKarsilastir);
    const actors = [...new Set(sorted.map(row => row.son_degistiren_ad || row.son_degistiren_email).filter(Boolean))].sort();
    const summary = {
      surum: 2,
      denetim_id: d.id,
      durum: hedefDurum || d.denetim_durumu,
      madde_sayisi: sorted.length,
      uygun: sorted.filter(row => row.durum === 'Kontrol tamamlandı' && row.denetci_gordu !== false).length,
      uygun_degil: sorted.filter(row => row.durum === 'Olumsuz bulgu' && row.denetci_gordu !== false).length,
      uygulanmaz: sorted.filter(row => row.durum === 'Uygulanmaz' && row.denetci_gordu !== false).length,
      sonucsuz: sorted.filter(row => !isFlowComplete(row)).length,
      aciklamali: sorted.filter(row => !!String(row.aciklama || row.diger_bulgu || '').trim()).length,
      olcumlu: sorted.filter(row => olcumTanimlari(row).some(def => olcumDegeri(row, def) !== '')).length,
      snapshot_madde_set_hash: d.snapshot_madde_set_hash || d.expected_item_set_hash || null,
      snapshot_content_hash: d.snapshot_content_hash || null,
      snapshot_kutuphane_hash: d.snapshot_kutuphane_hash || d.kutuphane_content_hash || null,
      snapshot_app_build_id: d.snapshot_app_build_id || d.app_build_id || APP_VERSION,
      denetimi_yapan: d.denetimi_yapan || null,
      seri_numaralari: seriNumaralariNormalize(d.seri_numaralari),
      seri_numarasi_kayit_sayisi: seriNumarasiSayisi(d),
      degistirenler: actors,
      satirlar: sorted.map(row => ({
        madde_id: row.madde_id,
        snapshot_hash: row.snapshot_madde_hash || null,
        durum: row.durum || null,
        denetci_gordu: row.denetci_gordu !== false,
        aciklama: row.aciklama || null,
        bulgu: row.bulgu_secenegi || null,
        diger_bulgu: row.diger_bulgu || null,
        olcumler: row.olcum_degerleri || null,
        olcu1: row.olcu1_degeri ?? null,
        olcu2: row.olcu2_degeri ?? null,
      })),
    };
    return { summary, hash: await sha256Hex(stableStringify(summary)) };
  }

  async function denetimDurumuDegistir(yeniDurum, overlay) {
    await flushEditorWrites();
    const d = await DB.get('denetimler', currentDenetimId);
    const rows = await DB.allByIndex('saha', 'byDenetim', currentDenetimId);
    const bakilmadi = rows.filter(r => !isFlowComplete(r));
    if (bakilmadi.length) {
      toast(`${bakilmadi.length} sonuçsuz madde var`);
      search = '';
      filter = 'empty';
      await renderDenetim();
      return;
    }
    const eksikSeriler = seriEksikleri(d);
    if (eksikSeriler.length) {
      toast(`Seri numarası kayıtlarında ${eksikSeriler.length} eksik grup var`);
      await seriNumaralariGoster();
      return;
    }
    if (!canEditDenetim(d)) { toast('Bu çalışma üzerinde değişiklik yetkiniz yok'); return; }
    const now = new Date().toISOString();
    if (yeniDurum === 'Gözden Geçirme') {
      if (!confirm('Saha kontrolü tamamlandı. Gözden Geçirme aşamasına geçilsin mi? Sonuçları bu aşamada düzeltebilirsiniz.')) return;
      d.denetim_durumu = 'Gözden Geçirme';
      d.saha_tamamlandi_at = d.saha_tamamlandi_at || now;
      d.gozden_gecirme_at = now;
      toast('Gözden Geçirme aşamasına geçildi');
    } else if (yeniDurum === 'Çalışma Tamamlandı') {
      if (!confirm('Gözden geçirme tamamlandı mı? Çalışma “Çalışma Tamamlandı” durumuna alınacak. Daha sonra gerekirse yeniden düzenlemeye açabilirsiniz.')) return;
      d.denetim_durumu = 'Çalışma Tamamlandı';
      d.calisma_tamamlandi_at = now;
      toast('Çalışma tamamlandı');
    } else return;
    const integrity = await butunlukOzetiHesapla(d, rows, yeniDurum);
    d.butunluk_ozeti = integrity.summary;
    d.butunluk_hash = integrity.hash;
    d.butunluk_hesaplandi_at = now;
    d.updated_at = now;
    await localWrite('denetimler', d, 'denetimler');
    if (overlay) overlay.remove();
    // Çalışma Tamamlandı sahanın son adımıdır; denetçiyi otomatik olarak
    // denetim listesine döndürür. Gözden Geçirme aşaması aynı ekranda kalır.
    if (yeniDurum === 'Çalışma Tamamlandı') showList();
    else await renderDenetim();
  }

  async function showOzet() {
    const d = await DB.get('denetimler', currentDenetimId);
    const rows = (await guncelKutuphaneMetadatasi(
      await DB.allByIndex('saha', 'byDenetim', currentDenetimId)
    )).sort(siraKarsilastir);
    const inspectionOutbox = (await DB.outboxAll()).filter(item => item.inspection_id === currentDenetimId);
    const conflictSync = inspectionOutbox.filter(item => item.sync_status === 'conflict').length;
    const protectedSync = inspectionOutbox.filter(item => ['forbidden','conflict'].includes(item.sync_status)).length;
    const bad = rows.filter(r => r.durum === 'Olumsuz bulgu');
    const bakilmadi = rows.filter(r => !isFlowComplete(r));
    const icNotlar = rows.filter(icKontrolNotuVar);
    const hazir = bakilmadi.length === 0;
    const eksikSeriler = seriEksikleri(d);
    const durum = d.denetim_durumu || 'Devam Ediyor';
    const currentIntegrity = await butunlukOzetiHesapla(d, rows, durum);
    const integrityMatches = !!d.butunluk_hash && d.butunluk_hash === currentIntegrity.hash;
    const history = (await DB.allByIndex('gecmis', 'byDenetim', currentDenetimId))
      .sort((a,b) => (b.created_at || '').localeCompare(a.created_at || ''));
    const lastActor = history[0]
      ? (history[0].degistiren_ad || history[0].degistiren_email)
      : (d.son_degistiren_ad || d.son_degistiren_email);
    const kapanis = hazir
      ? '<div class="oz-hazir ok">✓ Tüm checklist maddelerine Uygun / Uygun Değil / Uygulanmaz sonucu verilmiş</div>'
      : `<div class="oz-hazir no">⚠ <b>${bakilmadi.length} madde</b> henüz sonuçlandırılmadı.</div>`;
    const compactStatus = (r) => {
      if (!isFlowComplete(r)) return ['pending', '○', 'Bakılmadı'];
      if (r.durum === 'Olumsuz bulgu') return ['bad', '✕', 'Uygun Değil'];
      if (r.durum === 'Uygulanmaz') return ['na', '—', 'Uygulanmaz'];
      return ['ok', '✓', 'Uygun'];
    };
    const compactRows = rows.map(r => {
      const [status, icon, label] = compactStatus(r);
      const hasNote = !!(r.aciklama || r.diger_bulgu || icKontrolNotuVar(r));
      const hasMeasurement = olcumTanimlari(r).some(def => olcumDegeri(r, def) !== '');
      return `<button type="button" class="compact-row ${status}" data-go-row="${esc(r.id)}" data-review-status="${status}" data-has-note="${hasNote?1:0}" data-has-measurement="${hasMeasurement?1:0}">
        <span class="compact-icon">${icon}</span><span class="compact-ref">${esc(r.standart_madde_no || r.madde_id)}</span>
        <span class="compact-title">${esc(r.kontrol_basligi)}</span><span class="compact-result">${label}${hasNote?' · ✎':''}${hasMeasurement?' · ◫':''}</span>
      </button>`;
    }).join('');
    const item = (r, cls) => `<button type="button" class="oz-item ${cls}" data-go-row="${esc(r.id)}" style="display:block;width:100%;text-align:left"><b>${esc(r.standart_madde_no || r.madde_id)} · ${esc(r.bolum)}</b>
      ${esc(r.kontrol_basligi)}${r.bulgu_secenegi ? `<div class="not">Bulgu: ${esc(r.bulgu_secenegi)}${r.diger_bulgu ? ' — ' + esc(r.diger_bulgu) : ''}</div>` : ''}
      ${olcumTanimlari(r).map(def => {
        const value = olcumDegeri(r, def);
        return value !== '' ? `<div class="not">${esc(def.etiket)}: ${esc(value)} ${esc(def.birim || '')}</div>` : '';
      }).join('')}</button>`;
    const notlar = d.bolum_aciklamalari || {};
    const notEntries = Object.entries(notlar).filter(([,v]) => v);
    const seriData = seriNumaralariNormalize(d.seri_numaralari);
    const seriEntries = SERI_GRUPLARI.flatMap(([key, label]) => seriData[key]
      .filter(item => item.seri_no)
      .map(item => [label, item]));
    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = `<div class="modal">
      <button class="close">×</button>
      <h3>İnceleme Modu — ${esc(d.musteri_unvani)} · ${esc(d.asansor_seri_no)}</h3>
      <div class="photo-help">Bu ekran salt okunurdur. Arama veya filtreyle herhangi bir maddeye doğrudan ulaşabilirsiniz.</div>
      <div class="onay-satir"><span>Çalışma durumu</span><b>${esc(durum)}</b></div>
      <div class="onay-satir"><span>Oluşturan</span><b>${esc(d.olusturan_ad || d.denetimi_yapan || d.olusturan_email || 'Kayıt yok')}</b></div>
      <div class="onay-satir"><span>Son değiştiren</span><b>${esc(lastActor || 'Kayıt yok')}</b></div>
      <div class="integrity-card ${integrityMatches ? 'ok' : 'pending'}"><b>${integrityMatches ? '✓ Bütünlük özeti doğrulandı' : 'Bütünlük özeti henüz kesinleşmedi'}</b><small>${d.butunluk_hash ? esc(d.butunluk_hash.slice(0,16)) + '…' : 'Çalışma tamamlanınca parmak izi kaydedilir'} · ${currentIntegrity.summary.uygun}/${rows.length} uygun · ${currentIntegrity.summary.uygun_degil} uygun değil · ${currentIntegrity.summary.uygulanmaz} uygulanmaz</small></div>
      <div class="local-sync-state ${protectedSync ? 'error' : (inspectionOutbox.length ? 'pending' : 'ok')}">${protectedSync
        ? `⚠ ${protectedSync} yerel işlem ${conflictSync ? 'çakışma/yetki' : 'yetki'} incelemesinde; hiçbir kayıt silinmedi`
        : inspectionOutbox.length
          ? `✓ Tüm yanıtlar cihazda · ${inspectionOutbox.length} işlem sunucu aktarımı bekliyor`
          : '✓ Tüm yanıtlar cihazda · Sunucuyla tamamen eşitlendi'}</div>
      ${kapanis}
      <div class="oz-hazir ${eksikSeriler.length ? 'no' : 'ok'}">${eksikSeriler.length
        ? `⚠ <b>${eksikSeriler.length} seri numarası grubu eksik:</b> ${esc(eksikSeriler.join(' · '))}`
        : `✓ Seri numarası kayıtları tamamlandı (${seriNumarasiSayisi(d)}/${seriBeklenenMinimum(d)})`}</div>
      <details class="compact-review" open>
        <summary>Tüm maddeler (${rows.length})</summary>
        <input class="searchbox compact-search" type="search" placeholder="Madde no, başlık veya kelime ara…">
        <div class="compact-filters">
          <button type="button" class="chip on" data-compact-filter="all">Tümü</button>
          <button type="button" class="chip" data-compact-filter="pending">Bakılmadı</button>
          <button type="button" class="chip" data-compact-filter="bad">Uygun Değil</button>
          <button type="button" class="chip" data-compact-filter="note">Notlu</button>
          <button type="button" class="chip" data-compact-filter="measurement">Ölçümlü</button>
        </div>
        <div class="compact-list">${compactRows}</div>
      </details>
      ${seriEntries.length ? `<h4>Ekipman seri numaraları</h4>${seriEntries.map(([label,item]) => `<div class="oz-item"><b>${esc(label)}${item.kat ? ` · ${esc(item.kat)}${item.giris ? ` / ${esc(item.giris)}` : ''}` : ''}</b><div class="not">${esc(item.seri_no)}</div></div>`).join('')}` : ''}
      ${bakilmadi.length ? `<div style="font-size:12px;font-weight:700;color:var(--warn);margin:12px 0 6px">BAKILMADI (${bakilmadi.length})</div>` + bakilmadi.slice(0,100).map(r => item(r,'warn')).join('') : ''}
      ${bad.length ? `<div style="font-size:12px;font-weight:700;color:var(--fuchsia);margin:12px 0 6px">UYGUN DEĞİL (${bad.length})</div>` + bad.map(r => item(r,'')).join('') : ''}
      ${icNotlar.length ? `<div style="font-size:12px;font-weight:700;color:var(--warn);margin:12px 0 6px">İÇ KONTROL NOTU (${icNotlar.length})</div>` + icNotlar.map(r => `<div class="oz-item warn"><b>${esc(r.standart_madde_no || r.madde_id)} · ${esc(r.bolum)}</b>${esc(r.ic_kontrol_notu || 'Eski sürümden kalan iç kontrol kaydı')}</div>`).join('') : ''}
      ${notEntries.length ? `<div style="font-size:12px;font-weight:700;color:var(--navy);margin:12px 0 6px">BÖLÜM AÇIKLAMALARI</div>` + notEntries.map(([b,v]) => `<div class="oz-item" style="border-left-color:var(--navy)"><b>${esc(b)}</b>${esc(v)}</div>`).join('') : ''}
      ${history.length ? `<details class="compact-review"><summary>Değişiklik geçmişi (${history.length})</summary><div class="history-list">${history.slice(0,250).map(event => `<div class="history-row"><b>${esc(event.degistiren_ad || event.degistiren_email || 'Bilinmeyen kullanıcı')}</b><span>${esc(event.madde_id || (event.islem_turu === 'denetim_olusturma' ? 'Denetim oluşturuldu' : 'Denetim bilgisi'))}</span><small>${esc(event.degistiren_rol || '')} · ${event.created_at ? new Date(event.created_at).toLocaleString('tr-TR') : ''}${event.duzeltme_nedeni ? ` · Düzeltme: ${esc(event.duzeltme_nedeni)}` : ''}</small></div>`).join('')}</div></details>` : ''}
      ${!bad.length && !bakilmadi.length && !notEntries.length && !icNotlar.length ? '<div class="empty">Açık konu yok 🎉</div>' : ''}
      <button class="btn btn-ghost" id="ozKopya" style="margin-top:10px">Özeti panoya kopyala</button>
    </div>`;
    document.body.appendChild(ov);
    ov.querySelector('.close').onclick = () => ov.remove();
    ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
    ov.querySelectorAll('[data-compact-filter]').forEach(btn => btn.onclick = () => {
      ov.querySelectorAll('[data-compact-filter]').forEach(other => other.classList.toggle('on', other === btn));
      const selected = btn.dataset.compactFilter;
      ov.querySelectorAll('.compact-row').forEach(row => {
        const visible = selected === 'all' || row.dataset.reviewStatus === selected ||
          (selected === 'note' && row.dataset.hasNote === '1') ||
          (selected === 'measurement' && row.dataset.hasMeasurement === '1');
        row.classList.toggle('hidden', !visible);
      });
    });
    const compactSearch = ov.querySelector('.compact-search');
    if (compactSearch) compactSearch.oninput = () => {
      const query = compactSearch.value.trim().toLocaleLowerCase('tr-TR');
      ov.querySelectorAll('.compact-row').forEach((element, index) => {
        const row = rows[index];
        const haystack = `${row.madde_id || ''} ${row.standart_madde_no || ''} ${row.bolum || ''} ${row.kontrol_basligi || ''} ${row.denetci_yonlendirmesi || ''}`.toLocaleLowerCase('tr-TR');
        element.classList.toggle('hidden', !!query && !haystack.includes(query));
      });
    };
    ov.querySelectorAll('[data-go-row]').forEach(btn => btn.onclick = () => {
      const hedef = rows.find(r => r.id === btn.dataset.goRow);
      if (!hedef) return;
      ov.remove();
      inspectionReadOnly = true;
      search = ''; filter = 'all';
      openBolums = new Set([hedef.bolum]);
      const bolumRows = rows.filter(r => r.bolum === hedef.bolum);
      cursors[hedef.bolum] = bolumRows.findIndex(r => r.id === hedef.id);
      rememberPosition(hedef.bolum, hedef.id);
      renderDenetim().then(() => {
        const opened = document.querySelector('.bolum.open');
        if (opened) opened.scrollIntoView({ block: 'start' });
      });
    });
    ov.querySelector('#ozKopya').onclick = () => {
      const lines = [`AVES SAHA ÇALIŞMA ÖZETİ — ${d.musteri_unvani} · ${d.asansor_seri_no} · ${d.denetim_tarihi}`, `Durum: ${durum}`];
      if (bakilmadi.length) { lines.push('', `BAKILMADI (${bakilmadi.length}):`); bakilmadi.forEach(r => lines.push(`- [${r.standart_madde_no||r.madde_id}] ${r.kontrol_basligi}`)); }
      if (bad.length) { lines.push('', `UYGUN DEĞİL BULUNAN MADDELER (${bad.length}):`);
        bad.forEach(r => lines.push(`- [${r.standart_madde_no||r.madde_id}] ${r.kontrol_basligi}${r.bulgu_secenegi ? ' — ' + r.bulgu_secenegi : ''}${r.diger_bulgu ? ' (' + r.diger_bulgu + ')' : ''}`)); }
      notEntries.forEach(([b,v]) => { lines.push('', `${b} — AÇIKLAMA:`, v); });
      navigator.clipboard.writeText(lines.join('\n')).then(() => toast('Panoya kopyalandı'));
    };
  }

  return {
    showLogin, afterLogin, showList,
    get currentDenetimId() { return currentDenetimId; },
    refreshSyncState,
    canRefreshSafely: () => {
      const active = document.activeElement;
      return !(active && active.matches && active.matches('input,textarea,select'));
    },
    // Arka plan senkronu form doldurulurken tamamlanabilir. Yeni denetim
    // ekranını yeniden çizmek girilmiş alanları siler ve kullanıcıyı listeye
    // döndürür; bu yüzden yalnız veri listesi veya açık denetim yenilenir.
    refresh: () => {
      if (!UI.canRefreshSafely()) return;
      if (currentView === 'inspection' && currentDenetimId) renderDenetim();
      else if (currentView === 'list') showList();
    },
  };
})();

/* ================= Toast ================= */
let toastTimer;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

async function registerServiceWorkerWithUpdateChoice() {
  if (!('serviceWorker' in navigator)) return;

  let reloadRequested = false;
  const showUpdateChoice = (worker) => {
    if (!worker || document.getElementById('swUpdateBanner')) return;
    const banner = document.createElement('div');
    banner.id = 'swUpdateBanner';
    banner.className = 'update-banner';
    banner.setAttribute('role', 'status');
    banner.innerHTML = `<span><b>Yeni uygulama sürümü hazır</b>Açık çalışma cihazda korunur. Güncellemeyi uygun olduğunuzda uygulayın.</span>
      <button type="button" class="update-later">Sonra</button>
      <button type="button" class="update-now">Şimdi güncelle</button>`;
    banner.querySelector('.update-later').onclick = () => banner.remove();
    banner.querySelector('.update-now').onclick = () => {
      reloadRequested = true;
      banner.querySelector('.update-now').disabled = true;
      banner.querySelector('.update-now').textContent = 'Güncelleniyor…';
      worker.postMessage({ type: 'SKIP_WAITING' });
    };
    document.body.appendChild(banner);
  };

  const registration = await navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' });
  // sw.js her açılışta ağdan doğrulanır; eski HTTP önbelleği güncellemeyi
  // geciktiremez. Güncelleme denetimi yerel denetim verilerini değiştirmez.
  registration.update().catch(() => {});
  if (registration.waiting) showUpdateChoice(registration.waiting);
  registration.addEventListener('updatefound', () => {
    const installing = registration.installing;
    if (!installing) return;
    installing.addEventListener('statechange', () => {
      if (installing.state === 'installed' && navigator.serviceWorker.controller) showUpdateChoice(installing);
    });
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadRequested) location.reload();
  });
}

/* ================= Başlat ================= */
(async () => {
  try {
    await DB.open();
  } catch (error) {
    console.error('Yerel veritabanı açılamadı', error);
    document.getElementById('app').innerHTML = `<div class="empty" style="margin-top:24px">
      <b>Uygulama yerel veritabanını açamadı.</b><br>
      Çevrimdışı kayıtlarınızı silmeyin. Tüm AVES sekmelerini kapatıp uygulamayı yeniden açın.
    </div>`;
    return;
  }
  try { await registerServiceWorkerWithUpdateChoice(); } catch {}
  await API.loadSession();
  document.getElementById('btnLogout').onclick = async () => {
    if (confirm('Çıkış yapılsın mı? (Cihazdaki veriler korunur)')) { await API.logout(); Profile.clear(); UI.showLogin(); }
  };
  Sync.start();
  if (API.loggedIn) await UI.afterLogin();
  else UI.showLogin();
})();
