/* ============================================================
   AVES Saha Denetim — yerel yazma (local-first)
   localWrite ve değişiklik geçmişi hazırlığı.
   ============================================================ */
'use strict';

/* ================= Yerel yazma (local-first) ================= */
const GECMIS_ALANLARI = {
  denetimler: [
    'firma_adresi', 'denetim_adresi',
    'denetim_durumu', 'saha_tamamlandi_at', 'gozden_gecirme_at', 'calisma_tamamlandi_at',
    'offline_hazir_at', 'expected_item_count', 'expected_item_set_hash', 'butunluk_hash', 'seri_numaralari', 'teknik_dosya_kayitlari', 'denetim_form_kayitlari',
    'takip_ana_denetim_id', 'takip_onceki_denetim_id', 'takip_sira_no',
    'takip_atanan_email', 'takip_atanan_ad', 'takip_atama_at',
    'form_cikti_snapshot',
    'resmi_cikti_uretildi_at', 'resmi_cikti_snapshot_ozeti', 'resmi_cikti_hash',
    'arsive_aktarildi_at', 'arsive_aktaran_email',
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

async function localWrite(table, rows, store, options = {}) {
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
  if (options.insert_only) outboxItem.insert_only = true;
  if (options.conditional_update) outboxItem.conditional_update = options.conditional_update;
  if (historyItems.length) outboxItem.history_event_ids = historyItems.map(item => item.id);
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

