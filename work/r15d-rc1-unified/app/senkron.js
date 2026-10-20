/* ============================================================
   AVES Saha Denetim — senkronizasyon
   Outbox gönderimi, çekme, Senkron Merkezi (Sync).
   ============================================================ */
'use strict';

/* ================= Sync ================= */
const Sync = (() => {
  let running = false;
  let pushRunning = false;
  let pushTimer = null;

  const KORUNAN_DURUMLAR = ['conflict', 'forbidden'];

  async function retrySafeFr65Conflicts() {
    if (typeof AVES_FR65_SAHA_TOOLS === 'undefined') return 0;
    const items = (await DB.outboxAll())
      .filter(item => item.sync_status === 'conflict' && item.last_error_code === 409 &&
        item.table === 'denetimler' && item.conditional_update &&
        item.conditional_update.fields?.includes('denetim_form_kayitlari') &&
        item.rows?.[0]?.denetim_form_kayitlari?.saha_veri_akisi === 'fr65_saha_v1')
      .sort((a, b) => a.seq - b.seq);
    let recovered = 0;
    for (const item of items) {
      try {
        const history = await DB.allByIndex('gecmis', 'byDenetim', item.inspection_id);
        const linkedIds = new Set(item.history_event_ids || []);
        let matchingHistory = history.filter(event => linkedIds.has(event.id));
        if (!matchingHistory.length) matchingHistory = history.filter(event =>
          event.created_at === item.created_at && event.islem_turu === 'denetim_guncelleme');
        if (matchingHistory.length !== 1) continue;
        const previousCapture = matchingHistory[0].onceki_deger?.denetim_form_kayitlari;
        const remoteRows = await API.select('denetimler',
          `select=id,updated_at,denetim_form_kayitlari,teknik_dosya_kayitlari&id=eq.${encodeURIComponent(item.inspection_id)}&limit=1`);
        if (remoteRows.length !== 1 || !remoteRows[0].updated_at ||
            !AVES_FR65_SAHA_TOOLS.sameCapture(previousCapture, remoteRows[0].denetim_form_kayitlari)) continue;

        // The remote FR.65 snapshot still equals this operation's recorded base.
        // Only the row version drifted, so merge this capture into the latest remote
        // form objects and retain any unrelated form data before retrying.
        const row = item.rows[0];
        row.denetim_form_kayitlari = AVES_FR65_SAHA_TOOLS.mergeCapture(
          remoteRows[0].denetim_form_kayitlari, row.denetim_form_kayitlari);
        row.teknik_dosya_kayitlari = AVES_FR65_SAHA_TOOLS.mergeTechnicalRecord(
          remoteRows[0].teknik_dosya_kayitlari, row.teknik_dosya_kayitlari, row.denetim_form_kayitlari);
        item.conditional_update.expected_updated_at = remoteRows[0].updated_at;
        item.sync_status = 'retry';
        item.last_error_code = null;
        item.last_error_message = null;
        await DB.outboxPut(item);
        recovered++;
      } catch (error) {
        // An unverifiable conflict remains protected; do not guess or overwrite.
        console.warn('FR.65 çakışması güvenli biçimde yeniden eşleştirilemedi', error.message);
      }
    }
    return recovered;
  }

  async function reconcileFr65ServerVersion(item, serverRow) {
    const submitted = item.rows?.[0];
    const clientVersion = submitted?.updated_at;
    const serverVersion = serverRow?.updated_at;
    if (!submitted?.denetim_form_kayitlari ||
        submitted.denetim_form_kayitlari.saha_veri_akisi !== 'fr65_saha_v1' ||
        !clientVersion || !serverVersion || clientVersion === serverVersion) return;

    const allItems = await DB.outboxAll();
    const rebased = AVES_FR65_SAHA_TOOLS.rebaseFollowingUpdates(allItems, item, serverVersion);
    for (const following of rebased) await DB.outboxPut(following);

    const hasLaterUpdate = allItems.some(next => next.seq > item.seq && next.inspection_id === item.inspection_id &&
      next.table === 'denetimler' && next.conditional_update);
    if (!hasLaterUpdate) {
      const local = await DB.get('denetimler', submitted.id);
      if (local && String(local.updated_at || '') === String(clientVersion)) {
        local.updated_at = serverVersion;
        await DB.put('denetimler', local);
      }
    }
    if (typeof window !== 'undefined' && typeof CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent('aves:fr65-server-version', {
        detail: { inspectionId: item.inspection_id, clientVersion, serverVersion },
      }));
    }
  }

  async function korunanKalemler() {
    return (await DB.outboxAll()).filter(it => KORUNAN_DURUMLAR.includes(it.sync_status));
  }

  async function updatePill() {
    const pill = document.getElementById('syncPill');
    const label = document.getElementById('syncLabel');
    if (!pill || !label) return;
    const outbox = await DB.outboxAll();
    const n = outbox.length;
    const warning = await DB.kvGet('sync_warning');
    // KV yazılmadan uygulama kapanmış olabilir; gerçek outbox durumu esastır.
    const korunan = outbox.filter(it => KORUNAN_DURUMLAR.includes(it.sync_status));
    const uyariVar = !!warning || korunan.length > 0;
    if (!navigator.onLine) {
      pill.className = 'syncpill offline';
      label.textContent = n > 0 ? `Çevrimdışı · ${n} bekliyor` : 'Çevrimdışı';
    } else if (uyariVar) {
      pill.className = 'syncpill error';
      const cakisma = warning ? warning.kind === 'conflict' : korunan.some(x => x.sync_status === 'conflict');
      label.textContent = (cakisma ? 'Çakışma uyarısı' : 'Yetki uyarısı') + ' · dokun';
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
      await retrySafeFr65Conflicts();
      const items = (await DB.outboxAll()).filter(item =>
        !item.sync_status || ['pending', 'retry', 'sending'].includes(item.sync_status)
      );
      for (const queued of items) {
        // Önceki kalemin senkronu bu kalemi (ör. expected_updated_at) yeniden eşlemiş olabilir;
        // başta okunan eski kopya DB'deki güncel kalemi ezmesin diye her turda yeniden okunur.
        const item = await DB.outboxGet(queued.seq);
        if (!item || (item.sync_status && !['pending', 'retry', 'sending'].includes(item.sync_status))) continue;
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
          } else if (item.insert_only) {
            const rows = item.rows || [];
            if (item.table !== 'denetimler' || rows.length !== 1 || !rows[0].id ||
                rows[0].denetim_form_kayitlari?.saha_veri_akisi !== 'fr65_saha_v1') {
              const err = new Error('FR.65 yeni kayıt senkronu doğrulanamadı; cihazdaki veri korundu.');
              err.status = 409;
              throw err;
            }
            await API.insertIgnoreDuplicates(item.table, rows);
            // Sunucu updated_at'i kendisi damgalar; sıradaki koşullu güncellemeler yanlış 409 almasın diye eşle.
            try {
              const created = await API.select('denetimler', `select=id,updated_at&id=eq.${encodeURIComponent(rows[0].id)}&limit=1`);
              if (created.length === 1) await reconcileFr65ServerVersion(item, created[0]);
            } catch (error) { console.warn('FR.65 yeni kayıt sürümü eşlenemedi', error.message); }
          } else if (item.conditional_update) {
            const rows = item.rows || [];
            const condition = item.conditional_update;
            const allowedFields = new Set([
              'denetim_form_kayitlari', 'teknik_dosya_kayitlari', 'updated_at',
              'beyan_yuku_kg', 'kapasite_kisi', 'beyan_hizi_ms', 'durak_sayisi', 'bina_asansor_sayisi',
              'denetim_durumu', 'calisma_tamamlandi_at', 'duzeltme_oturumu_id',
              'duzeltme_nedeni', 'duzeltme_baslatildi_at', 'duzeltme_baslatan_email', 'arsive_aktarildi_at', 'arsive_aktaran_email',
              'asansor_seri_no', 'denetim_adresi', 'asansor_kimlik_no', 'dosya_no',
              'duzeltme_baslatan_ad', 'butunluk_ozeti', 'butunluk_hash', 'butunluk_hesaplandi_at',
              'son_degistiren_email', 'son_degistiren_ad', 'son_degistiren_rol', 'son_degistiren_at',
            ]);
            if (item.table !== 'denetimler' || rows.length !== 1 || !rows[0].id ||
                !rows[0].denetim_form_kayitlari || rows[0].denetim_form_kayitlari.saha_veri_akisi !== 'fr65_saha_v1' ||
                !Array.isArray(condition.fields) || !condition.fields.length ||
                !condition.expected_updated_at || condition.fields.some(field =>
                  !allowedFields.has(field) || !Object.prototype.hasOwnProperty.call(rows[0], field))) {
              const err = new Error('FR.65 koşullu senkron kaydı doğrulanamadı; cihazdaki veri korundu.');
              err.status = 409;
              throw err;
            }
            const patch = {};
            for (const field of condition.fields) patch[field] = rows[0][field];
            for (const field of ['son_degistiren_email', 'son_degistiren_ad', 'son_degistiren_rol', 'son_degistiren_at']) {
              patch[field] = rows[0][field] ?? null;
            }
            const serverRow = await API.conditionalUpdate(item.table, rows[0].id, condition.expected_updated_at, patch, condition.fields);
            await reconcileFr65ServerVersion(item, serverRow);
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
      const remaining = await DB.outboxAll();
      const warning = await DB.kvGet('sync_warning');
      if (warning?.kind === 'conflict' && !remaining.some(item => item.sync_status === 'conflict')) {
        await DB.kvDel('sync_warning');
      } else if (warning?.kind === 'forbidden' && !remaining.some(item => item.sync_status === 'forbidden')) {
        await DB.kvDel('sync_warning');
      }
    } finally {
      pushRunning = false;
      await updatePill();
      durumBildir();
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

  const escSync = (s) => (s ?? '').toString().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const BEKLEYEN_DURUMLAR = ['pending', 'retry', 'sending'];
  // Bir denetimin outbox özeti — 4 yerde kopyalanmış filtre bloğunun tek kaynağı.
  function outboxOzeti(items) {
    const cakisma = items.filter(it => it.sync_status === 'conflict').length;
    const yetki = items.filter(it => it.sync_status === 'forbidden').length;
    const korunan = cakisma + yetki;
    const bekleyen = items.length - korunan;
    const sonHata = items.map(it => it.last_error_message).filter(Boolean).slice(-1)[0] || '';
    return { toplam: items.length, cakisma, yetki, korunan, bekleyen, sonHata };
  }
  async function denetimSyncOzeti(denetimId) {
    const items = (await DB.outboxAll()).filter(it => it.inspection_id === denetimId);
    return { items, ...outboxOzeti(items) };
  }

  // Senkron Merkezi — tüm denetimlerin bekleyen/hata/çakışma durumu tek panelde,
  // güvenli yeniden deneme ile. Kalıcı `sync_warning` kilidini de buradan kırılır.
  //
  // KRİTİK: yalnız 403 (yetki) kalemleri kullanıcı isteğiyle yeniden gönderilir.
  // 409 (çakışma) kalemleri körlemesine gönderilmez — sunucudaki değişikliği
  // ezebilir; karşılaştırma akışı (yol haritası 4d) gelene kadar korunur.
  // Cihazda gönderilmeyi bekleyen fotoğraflar (fotograflar store, blob'lu).
  async function bekleyenFotoOzeti() {
    const map = new Map();
    for (const f of await DB.all('fotograflar')) {
      if (f.sync_status !== 'pending' || !f.blob) continue;
      map.set(f.denetim_id, (map.get(f.denetim_id) || 0) + 1);
    }
    return map;
  }

  async function syncCenter() {
    const items = await DB.outboxAll();
    const warning = await DB.kvGet('sync_warning');
    const fotoByDenetim = await bekleyenFotoOzeti();
    const fotoToplam = [...fotoByDenetim.values()].reduce((a, b) => a + b, 0);
    if (!items.length && !fotoToplam && !warning) { toast('Bekleyen senkron işlemi yok'); return; }
    if (!items.length && !fotoToplam && warning) {
      await DB.kvDel('sync_warning');
      await updatePill();
      toast('Senkron uyarısı temizlendi');
      return;
    }

    const denetimler = await DB.all('denetimler');
    const adOf = (id) => {
      const d = denetimler.find(x => x.id === id);
      return d ? `${d.musteri_unvani || 'Firma bilgisi yok'} · ${d.asansor_seri_no || '-'}` : 'Bilinmeyen denetim';
    };
    const grup = new Map();
    for (const it of items) {
      const key = it.inspection_id || 'yok';
      if (!grup.has(key)) grup.set(key, []);
      grup.get(key).push(it);
    }
    const tumIdler = new Set([...grup.keys(), ...fotoByDenetim.keys()]);
    const satirlar = [...tumIdler]
      .map(id => [id, outboxOzeti(grup.get(id) || []), fotoByDenetim.get(id) || 0])
      .sort((a, b) => (b[1].korunan - a[1].korunan) || ((b[1].toplam + b[2]) - (a[1].toplam + a[2])))
      .map(([id, o, foto]) => {
        const parts = [];
        if (o.bekleyen) parts.push(`${o.bekleyen} işlem`);
        if (foto) parts.push(`${foto} fotoğraf`);
        if (o.yetki) parts.push(`${o.yetki} yetki incelemesi`);
        if (o.cakisma) parts.push(`${o.cakisma} çakışma`);
        return `<div class="sync-review-row ${o.cakisma ? 'is-conflict' : ''}"><b>${escSync(adOf(id))}</b>` +
          `<small>${parts.join(' · ') || 'sunucu aktarımı bekliyor'}${o.sonHata ? ` · ${escSync(o.sonHata).slice(0, 140)}` : ''}</small></div>`;
      }).join('');

    const yetkiKalemleri = items.filter(it => it.sync_status === 'forbidden');
    const cakismaVar = items.some(it => it.sync_status === 'conflict');

    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = `<div class="modal">
      <button class="close" aria-label="Kapat">×</button>
      <h3>Senkron Merkezi</h3>
      <div class="photo-help">${warning ? escSync(warning.message) + ' ' : ''}Hiçbir saha cevabı silinmedi; cihazda korunuyor. Bağlantı geldikçe bekleyen işlemler ve fotoğraflar otomatik gönderilir.</div>
      <div class="sync-review-list">${satirlar}</div>
      <div class="print-actions">
        <button class="btn btn-primary" id="syncCenterNow">Şimdi senkronize et</button>
        ${yetkiKalemleri.length ? '<button class="btn btn-ghost" id="syncRetryForbidden">Yetki kayıtlarını yeniden dene</button>' : ''}
        <button class="btn btn-ghost" id="syncTanilama">Tanılama bilgisini paylaş</button>
        <button class="btn btn-ghost" id="syncReviewClose">Kapat</button>
      </div>
      ${cakismaVar ? '<p class="photo-help" style="margin-top:10px">Çakışma kayıtları otomatik gönderilmez; başka cihazdaki değişikliği ezmemek için korunur. Karşılaştırma akışı ayrı geliştirmede eklenecek.</p>' : ''}
    </div>`;
    document.body.appendChild(ov);
    const close = () => ov.remove();
    ov.querySelector('.close').onclick = close;
    ov.querySelector('#syncReviewClose').onclick = close;
    ov.querySelector('#syncTanilama').onclick = () => { if (typeof UI !== 'undefined' && UI.tanilamaPaylas) UI.tanilamaPaylas(); };
    ov.onclick = e => { if (e.target === ov) close(); };

    ov.querySelector('#syncCenterNow').onclick = async () => {
      if (!navigator.onLine) { toast('Çevrimdışısınız — bağlantı gelince otomatik gönderilir'); return; }
      close();
      toast('Senkronize ediliyor…');
      const ok = await full();
      if (typeof UI !== 'undefined' && UI.bekleyenFotograflariYukle) {
        try { await UI.bekleyenFotograflariYukle(); } catch (e) { console.warn('Fotoğraf gönderimi sürdü', e); }
      }
      const kalan = await korunanKalemler();
      const kalanFoto = [...(await bekleyenFotoOzeti()).values()].reduce((a, b) => a + b, 0);
      toast(kalan.length ? `${kalan.length} işlem hâlâ inceleme gerektiriyor`
        : kalanFoto ? `${kalanFoto} fotoğraf gönderilemedi; yeniden denenecek`
        : (ok ? 'Senkron tamamlandı' : 'Bazı kayıtlar cihazda korunuyor; yeniden denenecek'));
      await updatePill();
    };

    const btnRetry = ov.querySelector('#syncRetryForbidden');
    if (btnRetry) btnRetry.onclick = async () => {
      if (!navigator.onLine) { toast('Çevrimdışısınız — bağlantı gelince yeniden deneyin'); return; }
      btnRetry.disabled = true; btnRetry.textContent = 'Deneniyor…';
      for (const it of yetkiKalemleri) {
        it.sync_status = 'retry';
        it.last_error_code = null;
        it.last_error_message = null;
        await DB.outboxPut(it);
      }
      const kalanCakisma = (await DB.outboxAll()).filter(x => x.sync_status === 'conflict');
      if (kalanCakisma.length) {
        await DB.kvSet('sync_warning', {
          kind: 'conflict',
          message: 'Bir veya daha fazla kayıt başka bir cihazda değişmiş olabilir. Yerel cevap silinmedi; çakışma incelemesi gerekiyor.',
          ts: Date.now(),
        });
      } else {
        await DB.kvDel('sync_warning');
      }
      close();
      toast('Senkronize ediliyor…');
      await full();
      const kalan = await korunanKalemler();
      toast(kalan.length ? `${kalan.length} işlem hâlâ inceleme gerektiriyor` : 'Senkron tamamlandı');
      await updatePill();
    };
  }

  // Geriye uyumluluk: dış çağrılar ve pill "uyarı" yolu Senkron Merkezi'ne yönlendirilir.
  async function reviewWarning() { await syncCenter(); }

  async function manual() {
    const warning = await DB.kvGet('sync_warning');
    const outboxVar = (await DB.outboxCount()) > 0;
    // Fotoğraf taraması blob'ları yüklediği için ağırdır; yalnız hızlı-senkron
    // yolundan önce (uyarı/outbox yokken) bir kez bakılır.
    const fotoVar = !warning && !outboxVar && (await bekleyenFotoOzeti()).size > 0;
    if (warning || outboxVar || fotoVar) { await syncCenter(); return; }
    if (!navigator.onLine) { toast('Çevrimdışısınız — bağlantı gelince otomatik senkron olur'); return; }
    toast('Senkronize ediliyor…');
    const completed = await full();
    toast(completed ? 'Senkron tamamlandı' : 'Bazı kayıtlar cihazda korunuyor; yeniden denenecek');
  }

  // Cihaz senkron durumu sunucuya (en iyi çaba) bildirilir: yönetici hangi cihazın neyi gönderemediğini görür.
  // Saha cevabı veya firma bilgisi gönderilmez. Tablo yoksa/izin yoksa bu oturumda sessizce kapanır.
  let durumBildirimiKapali = false;
  let sonDurumBildirimi = { imza: null, at: 0 };
  async function durumBildir({ zorla = false } = {}) {
    if (durumBildirimiKapali || !navigator.onLine || !API.loggedIn || !Profile.email) return;
    try {
      const outbox = await DB.outboxAll();
      let { satir, imza } = AVES_CIHAZ_DURUMU.olustur({
        cihazId: await getDeviceId(), surum: APP_VERSION, cevrimici: navigator.onLine, outbox, bekleyenFotograf: 0,
      });
      const taze = Date.now() - sonDurumBildirimi.at < 15 * 60 * 1000;
      if (!zorla && imza === sonDurumBildirimi.imza && taze) return;
      // Fotoğraf sayısı blob'lu kayıtları taradığı için yalnız gerçekten bildirirken hesaplanır.
      satir.bekleyen_fotograf = (await DB.all('fotograflar')).filter(f => f.sync_status === 'pending' && f.blob).length;
      imza = AVES_CIHAZ_DURUMU.olustur({ cihazId: satir.cihaz_id, surum: APP_VERSION, cevrimici: true, outbox, bekleyenFotograf: satir.bekleyen_fotograf }).imza;
      await API.upsert('cihaz_senkron_durumu', [satir]);
      sonDurumBildirimi = { imza, at: Date.now() };
    } catch (error) {
      if ([400, 401, 403, 404].includes(error && error.status)) durumBildirimiKapali = true;
    }
  }

  function start() {
    window.addEventListener('online', full);
    window.addEventListener('offline', updatePill);
    setInterval(() => { pushOutbox(); }, 20000);
    setInterval(() => { durumBildir(); }, 60000);
    window.addEventListener('online', () => { durumBildir({ zorla: true }); });
    updatePill();
  }

  return { full, manual, reviewWarning, syncCenter, denetimSyncOzeti, start, updatePill, pullSaha, pullGecmis, pullKutuphane, pushOutbox, schedulePush, sunucuBolumSurumleri, durumBildir };
})();

