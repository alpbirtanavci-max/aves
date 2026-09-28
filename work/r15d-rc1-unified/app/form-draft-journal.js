/* Synchronous localStorage journal for unsaved form edits. IndexedDB remains the
   primary local record; this small recovery copy bridges abrupt app termination. */
(function expose(root) {
  const PREFIX = 'aves_taslak_';
  const FORM_KEY = 'form:record';
  const FORM_KEY_PREFIX = `${FORM_KEY}:`;

  function readAll(storage, inspectionId) {
    try {
      const value = JSON.parse(storage.getItem(`${PREFIX}${inspectionId}`) || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch { return {}; }
  }

  function scopedFormKey(ownerEmail) {
    const owner = String(ownerEmail || '').trim().toLowerCase();
    return owner ? `${FORM_KEY_PREFIX}${encodeURIComponent(owner)}` : FORM_KEY;
  }

  function findForm(storage, inspectionId, ownerEmail) {
    const all = readAll(storage, inspectionId);
    const owner = String(ownerEmail || '').trim().toLowerCase();
    if (owner) {
      const scopedKey = scopedFormKey(owner);
      if (all[scopedKey]) return { key: scopedKey, entry: all[scopedKey] };
      const legacy = all[FORM_KEY];
      if (legacy && String(legacy.ownerEmail || '').trim().toLowerCase() === owner) {
        return { key: FORM_KEY, entry: legacy };
      }
      return null;
    }
    if (all[FORM_KEY]) return { key: FORM_KEY, entry: all[FORM_KEY] };
    const key = Object.keys(all).find(item => item.startsWith(FORM_KEY_PREFIX));
    return key ? { key, entry: all[key] } : null;
  }

  function writeForm(storage, inspectionId, payload, ownerEmail, ts = Date.now(), baseUpdatedAt = null) {
    if (!storage || !inspectionId || !payload || typeof payload !== 'object') return false;
    try {
      const all = readAll(storage, inspectionId);
      const owner = String(ownerEmail || '').trim().toLowerCase();
      if (!owner) return false;
      const scopedKey = scopedFormKey(owner);
      const legacyOwner = String(all[FORM_KEY] && all[FORM_KEY].ownerEmail || '').trim().toLowerCase();
      const key = all[scopedKey] ? scopedKey : (legacyOwner === owner ? FORM_KEY : scopedKey);
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

  function readForm(storage, inspectionId, ownerEmail) {
    const found = findForm(storage, inspectionId, ownerEmail);
    const entry = found && found.entry;
    return entry && entry.payload && typeof entry.payload === 'object' && !Array.isArray(entry.payload)
      ? entry : null;
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
    const found = findForm(storage, inspectionId, ownerEmail);
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

  root.AVES_FORM_DRAFT_JOURNAL = Object.freeze({ FORM_KEY, writeForm, readForm, clearForm, clearFormIfOwner });
})(globalThis);
