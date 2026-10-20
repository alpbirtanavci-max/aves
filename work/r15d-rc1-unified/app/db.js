/* ============================================================
   AVES Saha Denetim — yerel veritabanı (IndexedDB)
   DB katmanı ve ortak yardımcılar (getDeviceId, sha256Hex, stableStringify).
   ============================================================ */
'use strict';

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
        if (!d.objectStoreNames.contains('fotograflar')) {
          const f = d.createObjectStore('fotograflar', { keyPath: 'id' });
          f.createIndex('byDenetim', 'denetim_id');
          f.createIndex('byKategori', 'kategori');
        } else {
          const f = e.target.transaction.objectStore('fotograflar');
          if (!f.indexNames.contains('byKategori')) f.createIndex('byKategori', 'kategori');
          if (f.indexNames.contains('byMadde')) f.deleteIndex('byMadde');
          // rc3.9.14-19 cihaz kuyruğundaki madde bazlı fotoğrafları kaybetmeden
          // rc3.9.20+ kategori sekmesine taşı. Eski sistem yalnız bu dokuz maddeye
          // fotoğraf ekleyebildiği için eşleme kapalı ve belirgindir.
          const cursorReq = f.openCursor();
          cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (!cursor) return;
            const foto = cursor.value;
            if (!foto.kategori && LEGACY_FOTOGRAF_KATEGORISI[foto.madde_id]) {
              foto.kategori = LEGACY_FOTOGRAF_KATEGORISI[foto.madde_id];
              cursor.update(foto);
            }
            cursor.continue();
          };
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
    deleteInspectionLocal: (id) => new Promise((resolve, reject) => {
      const t = db.transaction(['denetimler', 'saha', 'fotograflar', 'kv'], 'readwrite');
      t.objectStore('denetimler').delete(id);
      const removeIndexedRows = storeName => {
        const store = t.objectStore(storeName);
        const request = store.index('byDenetim').openKeyCursor(IDBKeyRange.only(id));
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) return;
          store.delete(cursor.primaryKey);
          cursor.continue();
        };
        request.onerror = () => t.abort();
      };
      removeIndexedRows('saha');
      removeIndexedRows('fotograflar');
      const kv = t.objectStore('kv');
      kv.delete(`offline_ready_${id}`);
      kv.delete(`last_position_${id}`);
      const lastInspection = kv.get('last_inspection');
      lastInspection.onsuccess = () => {
        if (lastInspection.result?.id === id) kv.delete('last_inspection');
      };
      t.oncomplete = resolve;
      t.onerror = () => reject(t.error || new Error('Cihazdaki denetim verileri temizlenemedi'));
      t.onabort = () => reject(t.error || new Error('Cihazdaki denetim verileri temizlenemedi'));
    }),
    clear: (store) => p(tx(store,'readwrite').clear()),
    outboxAdd: (item) => p(tx('outbox','readwrite').add(item)),
    outboxGet: (seq) => p(tx('outbox','readonly').get(seq)),
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

async function sha256HexBytes(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

