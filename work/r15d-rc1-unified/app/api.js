/* ============================================================
   AVES Saha Denetim — Supabase REST katmanı
   Oturum, seçme/yazma, koşullu güncelleme ve silme çağrıları.
   ============================================================ */
'use strict';

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

  async function insertIgnoreDuplicates(table, rows) {
    const resp = await authFetch(`/rest/v1/${table}`, {
      method: 'POST',
      headers: { 'Prefer': 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify(rows),
    });
    if (!resp.ok) {
      const text = await resp.text();
      const err = new Error(`${table} eklenemedi (${resp.status}): ${text.slice(0,200)}`);
      err.status = resp.status;
      throw err;
    }
  }

  async function conditionalUpdate(table, id, expectedUpdatedAt, patch, confirmationFields = Object.keys(patch || {})) {
    if (!table || !id || !expectedUpdatedAt || !patch || typeof patch !== 'object') {
      const err = new Error('Koşullu güncelleme için kayıt sürümü doğrulanamadı');
      err.status = 409;
      throw err;
    }
    const query = `id=eq.${encodeURIComponent(id)}&updated_at=eq.${encodeURIComponent(expectedUpdatedAt)}`;
    const confirmApplied = async () => {
      const fields = [...new Set((confirmationFields || []).filter(field =>
        field !== 'updated_at' && !field.startsWith('son_degistiren_') &&
        Object.prototype.hasOwnProperty.call(patch, field)))];
      if (!fields.length) return null;
      try {
        const selectedFields = [...new Set([...fields, 'updated_at'])];
        const check = await authFetch(`/rest/v1/${table}?select=${encodeURIComponent(selectedFields.join(','))}&id=eq.${encodeURIComponent(id)}&limit=1`);
        if (!check.ok) return null;
        const current = await check.json();
        if (!Array.isArray(current) || current.length !== 1 ||
            !fields.every(field => stableStringify(current[0][field] ?? null) === stableStringify(patch[field] ?? null))) return null;
        return current[0];
      } catch { return null; }
    };
    let resp;
    try {
      resp = await authFetch(`/rest/v1/${table}?${query}`, {
        method: 'PATCH',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify(patch),
      });
    } catch {
      const confirmed = await confirmApplied();
      if (confirmed) return confirmed;
      const err = new Error('Sunucu yanıtı alınamadı; FR.65 güncellemesinin sonucu doğrulanamadı ve cihazdaki veri korundu. Senkron merkezinden inceleyin.');
      err.status = 409;
      throw err;
    }
    if (!resp.ok) {
      const text = await resp.text();
      const err = new Error(`${table} koşullu güncellenemedi (${resp.status}): ${text.slice(0,200)}`);
      err.status = resp.status;
      throw err;
    }
    let rows;
    try { rows = await resp.json(); }
    catch {
      const confirmed = await confirmApplied();
      if (confirmed) return confirmed;
      const err = new Error('Koşullu güncellemenin sonucu doğrulanamadı; yerel kayıt korunuyor.');
      err.status = 409;
      throw err;
    }
    if (!Array.isArray(rows) || rows.length !== 1) {
      const confirmed = await confirmApplied();
      if (confirmed) return confirmed;
      const err = new Error('Kayıt başka bir oturumda değişti; cihazdaki FR.65 verisi korunuyor. Senkron merkezinden inceleyin.');
      err.status = 409;
      throw err;
    }
    return rows[0];
  }

  async function del(table, filter) {
    const resp = await authFetch(`/rest/v1/${table}?${filter}`, { method: 'DELETE' });
    if (!resp.ok) {
      const err = new Error(`${table} silinemedi (${resp.status})`);
      err.status = resp.status;
      throw err;
    }
  }

  return { loadSession, login, logout, select, selectPaged, upsert, insertIgnoreDuplicates, conditionalUpdate, del, authFetch,
    get email() { return session ? session.email : null; },
    get loggedIn() { return !!session; } };
})();

