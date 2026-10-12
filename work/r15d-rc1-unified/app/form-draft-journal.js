/* Synchronous localStorage journal for unsaved form edits. IndexedDB remains the
   primary local record; this small recovery copy bridges abrupt app termination. */
(function expose(root) {
  const PREFIX = 'aves_taslak_';
  const FORM_KEY = 'form:record';
  const FORM_KEY_PREFIX = `${FORM_KEY}:`;
  const FR65_CAPTURE_KEY = 'form:fr65-saha';

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

  function writeNamedForm(storage, inspectionId, payload, ownerEmail, ts, baseUpdatedAt, baseKey) {
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
      all[key] = {
        payload,
        ts: Number(ts) || Date.now(),
        ownerEmail: owner,
        baseUpdatedAt: baseUpdatedAt || null,
      };
      storage.setItem(`${PREFIX}${inspectionId}`, JSON.stringify(all));
      return true;
    } catch { return false; }
  }

  function writeForm(storage, inspectionId, payload, ownerEmail, ts = Date.now(), baseUpdatedAt = null) {
    return writeNamedForm(storage, inspectionId, payload, ownerEmail, ts, baseUpdatedAt, FORM_KEY);
  }

  function writeFr65Capture(storage, inspectionId, payload, ownerEmail, ts = Date.now(), baseUpdatedAt = null) {
    return writeNamedForm(storage, inspectionId, payload, ownerEmail, ts, baseUpdatedAt, FR65_CAPTURE_KEY);
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

  function readFr65Capture(storage, inspectionId, ownerEmail) {
    return readNamedForm(storage, inspectionId, ownerEmail, FR65_CAPTURE_KEY);
  }

  function rebaseFr65Capture(storage, inspectionId, ownerEmail, expectedBaseUpdatedAt, nextBaseUpdatedAt) {
    const found = findForm(storage, inspectionId, ownerEmail, FR65_CAPTURE_KEY);
    const entry = found && found.entry;
    const owner = String(ownerEmail || '').trim().toLowerCase();
    if (!storage || !found || !entry || !owner ||
        String(entry.ownerEmail || '').trim().toLowerCase() !== owner ||
        String(entry.baseUpdatedAt || '') !== String(expectedBaseUpdatedAt || '') ||
        !entry.payload || entry.payload.saha_veri_akisi !== 'fr65_saha_v1') return false;
    try {
      const all = readAll(storage, inspectionId);
      // Preserve the newer draft payload/timestamp; only move its base to the
      // snapshot that just committed locally, so the next queued save is not
      // mistaken for a concurrent edit by this same device.
      all[found.key] = Object.assign({}, entry, { baseUpdatedAt: nextBaseUpdatedAt || null });
      storage.setItem(`${PREFIX}${inspectionId}`, JSON.stringify(all));
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

  function clearFr65CaptureIfOwner(storage, inspectionId, ownerEmail) {
    return clearNamedFormIfOwner(storage, inspectionId, ownerEmail, FR65_CAPTURE_KEY);
  }

  function clearNamedFormIfOwner(storage, inspectionId, ownerEmail, baseKey) {
    const found = findForm(storage, inspectionId, ownerEmail, baseKey);
    const entry = found && found.entry;
    const owner = String(ownerEmail || '').trim().toLowerCase();
    const draftOwner = String(entry && entry.ownerEmail || '').trim().toLowerCase();
    if (!entry || !owner || !draftOwner || owner !== draftOwner) return false;
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
