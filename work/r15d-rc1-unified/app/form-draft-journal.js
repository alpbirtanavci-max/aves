/* Synchronous localStorage journal for unsaved form edits. IndexedDB remains the
   primary local record; this small recovery copy bridges abrupt app termination. */
(function expose(root) {
  const PREFIX = 'aves_taslak_';
  const FORM_KEY = 'form:record';
  const FORM_KEY_PREFIX = `${FORM_KEY}:`;
  const FR65_CAPTURE_KEY = 'form:fr65-saha';
  const FR65_CAPTURE_STORAGE_PREFIX = 'aves_fr65_taslak:';

  function readAll(storage, inspectionId) {
    try {
      const value = JSON.parse(storage.getItem(`${PREFIX}${inspectionId}`) || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch { return {}; }
  }

  function scopedFormKey(ownerEmail, baseKey = FORM_KEY) {
    const owner = String(ownerEmail || '').trim().toLowerCase();
    return owner ? `${baseKey}:${encodeURIComponent(owner)}` : baseKey;
  }

  function findForm(storage, inspectionId, ownerEmail, baseKey = FORM_KEY) {
    const all = readAll(storage, inspectionId);
    const owner = String(ownerEmail || '').trim().toLowerCase();
    const prefix = `${baseKey}:`;
    if (owner) {
      const scopedKey = scopedFormKey(owner, baseKey);
      if (all[scopedKey]) return { key: scopedKey, entry: all[scopedKey] };
      const legacy = all[baseKey];
      if (legacy && String(legacy.ownerEmail || '').trim().toLowerCase() === owner) {
        return { key: baseKey, entry: legacy };
      }
      return null;
    }
    if (all[baseKey]) return { key: baseKey, entry: all[baseKey] };
    const key = Object.keys(all).find(item => item.startsWith(prefix));
    return key ? { key, entry: all[key] } : null;
  }

  function writeNamedForm(storage, inspectionId, payload, ownerEmail, ts, baseUpdatedAt, baseKey, writerId = null) {
    if (!storage || !inspectionId || !payload || typeof payload !== 'object') return false;
    try {
      const all = readAll(storage, inspectionId);
      const owner = String(ownerEmail || '').trim().toLowerCase();
      if (!owner) return false;
      const scopedKey = scopedFormKey(owner, baseKey);
      const legacyOwner = String(all[baseKey] && all[baseKey].ownerEmail || '').trim().toLowerCase();
      const key = all[scopedKey] ? scopedKey : (legacyOwner === owner ? baseKey : scopedKey);
      const existing = all[key];
      const existingOwner = String(existing && existing.ownerEmail || '').trim().toLowerCase();
      // Aynı hesabın eski taslağı farklı bir kayıt sürümüne dayanıyorsa da
      // sessizce ezme; çakışma çözülene kadar o kurtarma noktası korunur.
      if (existing && (!existingOwner || owner !== existingOwner ||
          (existing.baseUpdatedAt && baseUpdatedAt && existing.baseUpdatedAt !== baseUpdatedAt))) return false;
      if (baseKey === FR65_CAPTURE_KEY && existing && existing.writerId && writerId && existing.writerId !== writerId) return false;
      all[key] = {
        payload,
        ts: Number(ts) || Date.now(),
        ownerEmail: owner,
        baseUpdatedAt: baseUpdatedAt || null,
        ...(baseKey === FR65_CAPTURE_KEY && writerId ? { writerId } : {}),
      };
      storage.setItem(`${PREFIX}${inspectionId}`, JSON.stringify(all));
      return true;
    } catch { return false; }
  }

  function writeForm(storage, inspectionId, payload, ownerEmail, ts = Date.now(), baseUpdatedAt = null) {
    return writeNamedForm(storage, inspectionId, payload, ownerEmail, ts, baseUpdatedAt, FORM_KEY);
  }

  function writeFr65Capture(storage, inspectionId, payload, ownerEmail, ts = Date.now(), baseUpdatedAt = null, writerId = null) {
    if (!writerId) return writeNamedForm(storage, inspectionId, payload, ownerEmail, ts, baseUpdatedAt, FR65_CAPTURE_KEY);
    if (!storage || !inspectionId || !payload || typeof payload !== 'object') return false;
    const owner = String(ownerEmail || '').trim().toLowerCase();
    if (!owner) return false;
    const key = fr65CaptureStorageKey(inspectionId, owner, writerId);
    try {
      const existing = readFr65Entry(storage, key);
      const legacy = existing ? null : findForm(storage, inspectionId, owner, FR65_CAPTURE_KEY);
      const prior = existing || (legacy && legacy.entry);
      const priorOwner = String(prior && prior.ownerEmail || '').trim().toLowerCase();
      if (prior && (!priorOwner || owner !== priorOwner ||
          (prior.baseUpdatedAt && baseUpdatedAt && prior.baseUpdatedAt !== baseUpdatedAt) ||
          (prior.writerId && prior.writerId !== writerId))) return false;
      const entry = {
        payload,
        ts: Number(ts) || Date.now(),
        ownerEmail: owner,
        baseUpdatedAt: baseUpdatedAt || null,
        writerId,
      };
      storage.setItem(key, JSON.stringify(entry));
      if (legacy && legacy.entry && legacy.entry.writerId === writerId) {
        clearNamedFormIfOwner(storage, inspectionId, owner, FR65_CAPTURE_KEY, legacy.entry.ts, writerId);
      } else if (legacy && !legacy.entry.writerId &&
          (!legacy.entry.baseUpdatedAt || !baseUpdatedAt || legacy.entry.baseUpdatedAt === baseUpdatedAt)) {
        clearNamedFormIfOwner(storage, inspectionId, owner, FR65_CAPTURE_KEY, legacy.entry.ts, null);
      }
      return true;
    } catch { return false; }
  }

  function readNamedForm(storage, inspectionId, ownerEmail, baseKey) {
    const found = findForm(storage, inspectionId, ownerEmail, baseKey);
    const entry = found && found.entry;
    return entry && entry.payload && typeof entry.payload === 'object' && !Array.isArray(entry.payload)
      ? entry : null;
  }

  function readForm(storage, inspectionId, ownerEmail) {
    return readNamedForm(storage, inspectionId, ownerEmail, FORM_KEY);
  }

  function readFr65Capture(storage, inspectionId, ownerEmail, writerId = null) {
    const owner = String(ownerEmail || '').trim().toLowerCase();
    if (!storage || !inspectionId || !owner) return null;
    if (writerId) {
      const own = readFr65Entry(storage, fr65CaptureStorageKey(inspectionId, owner, writerId));
      if (own && String(own.ownerEmail || '').trim().toLowerCase() === owner) return own;
    }
    const entries = listFr65CaptureEntries(storage, inspectionId, owner);
    const legacy = readNamedForm(storage, inspectionId, owner, FR65_CAPTURE_KEY);
    if (legacy) entries.push(legacy);
    entries.sort((a, b) => (Number(b.ts) || 0) - (Number(a.ts) || 0));
    return entries[0] || null;
  }

  function rebaseFr65Capture(storage, inspectionId, ownerEmail, expectedBaseUpdatedAt, nextBaseUpdatedAt, writerId = null) {
    const owner = String(ownerEmail || '').trim().toLowerCase();
    const key = writerId ? fr65CaptureStorageKey(inspectionId, owner, writerId) : null;
    const entry = key ? readFr65Entry(storage, key) : null;
    const found = key ? null : findForm(storage, inspectionId, owner, FR65_CAPTURE_KEY);
    const current = entry || (found && found.entry);
    if (!storage || !current || !owner ||
        String(current.ownerEmail || '').trim().toLowerCase() !== owner ||
        String(current.baseUpdatedAt || '') !== String(expectedBaseUpdatedAt || '') ||
        (writerId && current.writerId !== writerId) ||
        !current.payload || current.payload.saha_veri_akisi !== 'fr65_saha_v1') return false;
    try {
      // Preserve the newer draft payload/timestamp; only move its base to the
      // snapshot that just committed locally, so the next queued save is not
      // mistaken for a concurrent edit by this same device.
      const next = Object.assign({}, current, { baseUpdatedAt: nextBaseUpdatedAt || null });
      if (key) storage.setItem(key, JSON.stringify(next));
      else {
        const all = readAll(storage, inspectionId);
        all[found.key] = next;
        storage.setItem(`${PREFIX}${inspectionId}`, JSON.stringify(all));
      }
      return true;
    } catch { return false; }
  }

  function clearForm(storage, inspectionId) {
    if (!storage || !inspectionId) return false;
    try {
      const all = readAll(storage, inspectionId);
      const keys = Object.keys(all).filter(key => key === FORM_KEY || key.startsWith(FORM_KEY_PREFIX));
      if (!keys.length) return true;
      keys.forEach(key => delete all[key]);
      if (Object.keys(all).length) storage.setItem(`${PREFIX}${inspectionId}`, JSON.stringify(all));
      else storage.removeItem(`${PREFIX}${inspectionId}`);
      return true;
    } catch { return false; }
  }

  function clearFormIfOwner(storage, inspectionId, ownerEmail) {
    return clearNamedFormIfOwner(storage, inspectionId, ownerEmail, FORM_KEY);
  }

  function clearFr65CaptureIfOwner(storage, inspectionId, ownerEmail, expectedTs = null, writerId = null) {
    if (writerId) {
      const owner = String(ownerEmail || '').trim().toLowerCase();
      const key = fr65CaptureStorageKey(inspectionId, owner, writerId);
      const entry = readFr65Entry(storage, key);
      if (entry) {
        if (String(entry.ownerEmail || '').trim().toLowerCase() !== owner ||
            (expectedTs !== null && Number(entry.ts) !== Number(expectedTs)) || entry.writerId !== writerId) return false;
        try { storage.removeItem(key); return true; } catch { return false; }
      }
    }
    return clearNamedFormIfOwner(storage, inspectionId, ownerEmail, FR65_CAPTURE_KEY, expectedTs, writerId);
  }

  function fr65CaptureStorageKey(inspectionId, ownerEmail, writerId) {
    return `${FR65_CAPTURE_STORAGE_PREFIX}${encodeURIComponent(inspectionId)}:${encodeURIComponent(ownerEmail)}:${encodeURIComponent(writerId)}`;
  }

  function readFr65Entry(storage, key) {
    try {
      const value = JSON.parse(storage.getItem(key) || 'null');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
    } catch { return null; }
  }

  function listFr65CaptureEntries(storage, inspectionId, ownerEmail) {
    const prefix = `${FR65_CAPTURE_STORAGE_PREFIX}${encodeURIComponent(inspectionId)}:${encodeURIComponent(ownerEmail)}:`;
    const entries = [];
    try {
      for (let index = 0; index < storage.length; index++) {
        const key = storage.key(index);
        if (!key || !key.startsWith(prefix)) continue;
        const entry = readFr65Entry(storage, key);
        if (entry && String(entry.ownerEmail || '').trim().toLowerCase() === ownerEmail &&
            entry.payload && entry.payload.saha_veri_akisi === 'fr65_saha_v1') entries.push(entry);
      }
    } catch { /* Storage enumeration can be unavailable in restricted browsers. */ }
    return entries;
  }

  function clearNamedFormIfOwner(storage, inspectionId, ownerEmail, baseKey, expectedTs = null, writerId = null) {
    const found = findForm(storage, inspectionId, ownerEmail, baseKey);
    const entry = found && found.entry;
    const owner = String(ownerEmail || '').trim().toLowerCase();
    const draftOwner = String(entry && entry.ownerEmail || '').trim().toLowerCase();
    if (!entry || !owner || !draftOwner || owner !== draftOwner ||
        (expectedTs !== null && Number(entry.ts) !== Number(expectedTs)) ||
        (writerId && entry.writerId !== writerId)) return false;
    try {
      const all = readAll(storage, inspectionId);
      delete all[found.key];
      if (Object.keys(all).length) storage.setItem(`${PREFIX}${inspectionId}`, JSON.stringify(all));
      else storage.removeItem(`${PREFIX}${inspectionId}`);
      return true;
    } catch { return false; }
  }

  function stableSerialize(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(',')}}`;
  }

  function inspectFr65Capture(currentValues, draftEntry, recordUpdatedAt) {
    const payload = draftEntry && draftEntry.payload;
    const values = payload && payload.saha_veri_akisi === 'fr65_saha_v1' &&
      payload.forms && payload.forms.FR65 && payload.forms.FR65.values;
    if (!values || typeof values !== 'object' || Array.isArray(values)) return { kind: 'none', values: null };
    if (stableSerialize(values) === stableSerialize(currentValues || {})) return { kind: 'same', values };
    const baseMatches = !!(draftEntry.baseUpdatedAt && recordUpdatedAt &&
      String(draftEntry.baseUpdatedAt) === String(recordUpdatedAt));
    return { kind: baseMatches ? 'recover' : 'conflict', values };
  }

  root.AVES_FORM_DRAFT_JOURNAL = Object.freeze({
    FORM_KEY, FR65_CAPTURE_KEY,
    writeForm, readForm, clearForm, clearFormIfOwner,
    writeFr65Capture, readFr65Capture, clearFr65CaptureIfOwner,
    inspectFr65Capture, rebaseFr65Capture,
  });
})(globalThis);
