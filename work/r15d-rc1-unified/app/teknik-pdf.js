/* ============================================================
   AVES Saha — denetime bağlı teknik PDF, yerel metin çıkarımı ve senkron
   Harici AI/OCR çağrısı yoktur. PDF.js yalnız bu cihazda çalışır.
   ============================================================ */
'use strict';

window.AVES_TEKNIK_PDF = (() => {
  const BUCKET = 'denetim-teknik-dosyalari';
  const MAX_BYTES = 20 * 1024 * 1024;
  // Okuyucu sürümü adreste taşınır: SW önbellek-öncelikli olduğundan, kurallar değişince eski kopya sonsuza dek sunulmasın.
  const READER_URL = './pdf-field-reader.mjs?v=3';
  const PENDING = new Set(['pending', 'metadata_pending', 'delete_pending', 'conflict']);
  let pendingPushPromise = null;
  let pendingPushAgain = false;

  function objectUrl(path, authenticated = false) {
    const prefix = authenticated ? 'authenticated/' : '';
    const safePath = String(path || '').split('/').map(encodeURIComponent).join('/');
    return `/storage/v1/object/${prefix}${BUCKET}/${safePath}`;
  }

  async function remoteMetadata(denetimId) {
    const rows = await API.select('denetim_teknik_pdf',
      `select=denetim_id,file_name,object_path,file_size_bytes,sha256,page_count,text_page_count,extracted_fields,uploaded_by,updated_at&denetim_id=eq.${encodeURIComponent(denetimId)}&limit=1`);
    return rows[0] || null;
  }

  async function fetchVerifiedPdf(remote) {
    if (!navigator.onLine || !API.loggedIn) throw new Error('PDF’yi almak için internet bağlantısı ve oturum gerekli.');
    const response = await API.authFetch(objectUrl(remote.object_path, true), { method: 'GET' });
    if (!response.ok) throw new Error(`PDF indirilemedi (${response.status})`);
    const blob = await response.blob();
    if (blob.size !== Number(remote.file_size_bytes) || await sha256HexBytes(new Uint8Array(await blob.arrayBuffer())) !== remote.sha256) {
      throw new Error('İndirilen PDF’nin boyutu veya SHA-256 özeti kayıtla uyuşmuyor; dosya cihazda saklanmadı.');
    }
    return blob;
  }

  async function writeMetadata(record) {
    await API.upsert('denetim_teknik_pdf', [{
      denetim_id: record.denetim_id,
      file_name: record.file_name,
      object_path: record.object_path,
      file_size_bytes: record.file_size_bytes,
      sha256: record.sha256,
      page_count: record.page_count,
      text_page_count: record.text_page_count,
      extracted_fields: record.extracted_fields || {},
      uploaded_by: API.email,
      updated_at: record.updated_at,
    }]);
  }

  async function deleteObject(path) {
    if (!path) return;
    const response = await API.authFetch(`/storage/v1/object/${BUCKET}`, {
      method: 'DELETE',
      body: JSON.stringify({ prefixes: [path] }),
    });
    if (!response.ok) throw new Error(`Teknik PDF silinemedi (${response.status})`);
  }

  async function prepareOfflineReader() {
    if (typeof isNativeApp === 'function' && isNativeApp()) return true;
    if (!('caches' in window)) {
      if (navigator.onLine) return true;
      throw new Error('Bu tarayıcı çevrimdışı PDF okuyucu önbelleğini desteklemiyor.');
    }
    const cache = await caches.open('aves-pdfjs-v6.2.108');
    const coreUrls = [
      READER_URL,
      './vendor/pdfjs/pdf.min.mjs',
      './vendor/pdfjs/pdf.worker.min.mjs',
      './vendor/pdfjs/assets.json',
    ].map(path => new URL(path, location.href).href);
    const missingCore = [];
    for (const url of coreUrls) if (!(await cache.match(url))) missingCore.push(url);
    if (navigator.onLine && missingCore.length) await cache.addAll(missingCore);
    for (const url of coreUrls) {
      if (!(await cache.match(url))) throw new Error('PDF okuyucu uygulama dosyaları bu cihazda hazır değil. İnternetle yeniden deneyin.');
    }
    const manifestResponse = await fetch('./vendor/pdfjs/assets.json');
    if (!manifestResponse.ok) throw new Error('PDF okuyucu dosya listesi alınamadı.');
    const manifest = await manifestResponse.json();
    const urls = (manifest.files || []).map(path => new URL(path, location.href).href);
    const missing = [];
    for (const url of urls) if (!(await cache.match(url))) missing.push(url);
    if (navigator.onLine && missing.length) await cache.addAll(missing);
    for (const url of urls) {
      if (!(await cache.match(url))) throw new Error('PDF okuyucu dosyaları bu cihazda hazır değil. İnternetle yeniden deneyin.');
    }
    return true;
  }

  async function readPdf(file) {
    // Önbellek yalnız çevrimdışı kullanım içindir. Çevrimiçiyken önbellek yazılamasa bile okuyucu ağdan yüklenir;
    // çevrimdışıyken hazır değilse hata verilir ve PDF "metin okunamadı" durumuyla cihazda korunur.
    try { await prepareOfflineReader(); }
    catch (error) {
      if (!navigator.onLine) throw error;
      console.warn('PDF okuyucu önbelleği hazırlanamadı; okuyucu ağdan yükleniyor', error);
    }
    const reader = await import(READER_URL);
    return reader.extractTechnicalPdf(file);
  }

  async function load(denetimId) {
    const local = await DB.get('teknik_pdf', denetimId);
    if (local && PENDING.has(local.sync_status)) return local;
    if (!navigator.onLine || !API.loggedIn) return local || null;
    try {
      const remote = await remoteMetadata(denetimId);
      if (!remote) return local || null;
      if (local?.blob && local.sha256 === remote.sha256) {
        const merged = { ...local, ...remote, blob: local.blob, sync_status: 'synced' };
        await DB.put('teknik_pdf', merged);
        return merged;
      }
      // Büyük PDF'leri denetimi açarken otomatik indirme; cihaz/veri kotası
      // kullanıcının açık indirme eylemiyle tüketilsin.
      const merged = { ...remote, sync_status: 'synced' };
      await DB.put('teknik_pdf', merged);
      return merged;
    } catch (error) {
      console.warn('Teknik PDF sunucudan alınamadı; cihazdaki kopya korunuyor', error);
      return local || null;
    }
  }

  async function download(denetimId) {
    let record = await DB.get('teknik_pdf', denetimId);
    if (record?.blob) return record;
    if (record && PENDING.has(record.sync_status)) throw new Error('Cihazdaki bekleyen PDF işlemi sonuçlanmadan sunucu kopyası indirilemez.');
    if (!navigator.onLine || !API.loggedIn) throw new Error('PDF’yi indirmek için internet bağlantısı gerekli.');
    const remote = await remoteMetadata(denetimId);
    if (!remote) throw new Error('Bu denetime bağlı sunucu PDF’si bulunamadı.');
    const blob = await fetchVerifiedPdf(remote);
    record = { ...remote, blob, sync_status: 'synced' };
    await DB.put('teknik_pdf', record);
    return record;
  }

  async function compareConflictVersion(denetimId) {
    const local = await DB.get('teknik_pdf', denetimId);
    if (local?.sync_status !== 'conflict') throw new Error('Karşılaştırılacak teknik PDF çakışması bulunamadı.');
    const remote = await remoteMetadata(denetimId);
    if (!remote) throw new Error('Sunucu kopyası artık bulunmuyor; cihazdaki PDF korundu.');
    const blob = await fetchVerifiedPdf(remote);
    let extracted;
    try { extracted = await readPdf(blob); }
    catch (error) {
      extracted = {
        reader: 'pdfjs-local-rules-v3', status: 'reader_error',
        message: String(error?.message || 'PDF metni okunamadı').slice(0, 180),
        parsed_at: new Date().toISOString(), page_count: remote.page_count || null,
        text_page_count: remote.text_page_count ?? 0, values: [], equipment: [],
      };
    }
    const current = await DB.get('teknik_pdf', denetimId);
    if (!current || current.sync_status !== 'conflict' || current.updated_at !== local.updated_at) {
      throw new Error('Çakışma bu sırada değişti; cihazdaki ve sunucudaki PDF korunuyor. Ekranı yenileyip tekrar deneyin.');
    }
    current.conflict_remote = { ...remote, blob, extracted_fields: extracted };
    await DB.put('teknik_pdf', current);
    return current;
  }

  async function keepDeviceVersion(denetimId) {
    const current = await DB.get('teknik_pdf', denetimId);
    const compared = current?.conflict_remote;
    if (current?.sync_status !== 'conflict' || !compared?.object_path || !current.blob) {
      throw new Error('Önce sunucu kopyasını indirip karşılaştırın; iki PDF de cihazda korunuyor.');
    }
    const latestRemote = await remoteMetadata(denetimId);
    if (!latestRemote || latestRemote.object_path !== compared.object_path || latestRemote.sha256 !== compared.sha256) {
      throw new Error('Sunucu PDF’si karşılaştırmadan sonra değişmiş; hiçbir kopya ezilmedi. Yeniden karşılaştırın.');
    }
    current.previous_object_path = latestRemote.object_path;
    current.sync_status = 'pending';
    current.upload_attempted = false;
    current.uploaded_to_storage = false;
    current.updated_at = new Date().toISOString();
    delete current.conflict_remote;
    delete current.conflict_remote_metadata;
    delete current.sync_error;
    await DB.put('teknik_pdf', current);
    if (navigator.onLine && API.loggedIn) await pushPending();
    return await DB.get('teknik_pdf', denetimId);
  }

  async function useServerVersion(denetimId) {
    const current = await DB.get('teknik_pdf', denetimId);
    const compared = current?.conflict_remote;
    if (current?.sync_status !== 'conflict' || !compared?.blob) {
      throw new Error('Önce sunucu kopyasını indirip karşılaştırın; iki PDF de cihazda korunuyor.');
    }
    const latestRemote = await remoteMetadata(denetimId);
    if (!latestRemote || latestRemote.object_path !== compared.object_path || latestRemote.sha256 !== compared.sha256) {
      throw new Error('Sunucu PDF’si karşılaştırmadan sonra değişmiş; hiçbir kopya değiştirilmedi. Yeniden karşılaştırın.');
    }
    const record = {
      ...latestRemote,
      blob: compared.blob,
      extracted_fields: compared.extracted_fields || latestRemote.extracted_fields || {},
      sync_status: 'synced',
      downloaded_at: new Date().toISOString(),
    };
    await DB.put('teknik_pdf', record);
    return record;
  }

  async function pushPending() {
    if (!navigator.onLine || !API.loggedIn) return { sent: 0, failed: 0 };
    if (pendingPushPromise) {
      pendingPushAgain = true;
      return pendingPushPromise;
    }
    pendingPushPromise = pushPendingOnce();
    try { return await pendingPushPromise; }
    finally {
      pendingPushPromise = null;
      if (pendingPushAgain) {
        pendingPushAgain = false;
        setTimeout(() => { pushPending().catch(error => console.warn('Teknik PDF aktarım tekrarı başarısız', error)); }, 0);
      }
    }
  }

  async function pushPendingOnce() {
    const queue = (await DB.all('teknik_pdf'))
      .filter(item => ['pending', 'metadata_pending', 'delete_pending'].includes(item.sync_status))
      .map(item => item.denetim_id);
    let sent = 0;
    let failed = 0;
    for (const denetimId of queue) {
      let item = await DB.get('teknik_pdf', denetimId);
      if (!item || !['pending', 'metadata_pending', 'delete_pending'].includes(item.sync_status)) continue;
      const version = item.updated_at;
      let expectedStatus = item.sync_status;
      let conflictRemoteMetadata = null;
      const getCurrent = async () => {
        const current = await DB.get('teknik_pdf', denetimId);
        return current && current.updated_at === version && current.sync_status === expectedStatus ? current : null;
      };
      try {
        const old = await remoteMetadata(item.denetim_id);
        if (item.sync_status === 'delete_pending') {
          const expected = [...new Set([item.object_path, item.previous_object_path].filter(Boolean))];
          if (old && !expected.includes(old.object_path)) {
            const error = new Error('Başka cihazdaki teknik PDF değişmiş; yeni dosya korunuyor.');
            error.pdfConflict = true;
            error.remoteMetadata = old;
            throw error;
          }
          if (old) {
            await API.del('denetim_teknik_pdf', `denetim_id=eq.${encodeURIComponent(item.denetim_id)}`);
            if (await remoteMetadata(item.denetim_id)) throw new Error('PDF bağlantısı sunucuda kaldı; cihazdaki kayıt korunuyor.');
          }
          for (const path of [...new Set([...expected, old?.object_path].filter(Boolean))]) await deleteObject(path);
          if (!(await getCurrent())) continue;
          await DB.del('teknik_pdf', denetimId);
          sent++;
          continue;
        }

        if (item.sync_status === 'metadata_pending') {
          if (old && (old.object_path !== item.object_path || old.sha256 !== item.sha256)) {
            const error = new Error('Sunucudaki teknik PDF değişmiş; iki sürüm de korunuyor.');
            error.pdfConflict = true;
            error.remoteMetadata = old;
            throw error;
          }
          if (old) {
            await writeMetadata(item);
            const current = await getCurrent();
            if (!current) continue;
            item = current;
            item.sync_status = 'synced';
            item.synced_at = new Date().toISOString();
            delete item.sync_error;
            await DB.put('teknik_pdf', item);
            sent++;
            continue;
          }
          item.sync_status = 'pending';
          const current = await getCurrent();
          if (!current) continue;
          item = { ...current, sync_status: 'pending' };
          await DB.put('teknik_pdf', item);
          expectedStatus = 'pending';
        }

        if (!item.blob) throw new Error('PDF bu cihazda yok; sunucuya aktarım yapılamıyor.');
        const replacingExpected = !!old && item.previous_object_path === old.object_path;
        const alreadyUploaded = !!old && old.object_path === item.object_path && old.sha256 === item.sha256;
        if (old && !alreadyUploaded && !replacingExpected) {
          const error = new Error('Sunucudaki teknik PDF başka bir cihazda değiştirilmiş; yerel dosya korunuyor.');
          error.pdfConflict = true;
          error.remoteMetadata = old;
          throw error;
        }
        // Depo ve tablo kuralları denetimin sunucuda var olmasını şart koşar; yeni denetim henüz eşitlenmediyse bekle.
        const sunucudaDenetim = await API.select('denetimler', `select=id&id=eq.${encodeURIComponent(item.denetim_id)}&limit=1`);
        if (!sunucudaDenetim.length) {
          const bekle = new Error('Denetim kaydı henüz sunucuda yok; PDF, denetim eşitlenince gönderilecek.');
          bekle.denetimBekliyor = true;
          throw bekle;
        }
        if (!alreadyUploaded && !item.uploaded_to_storage) {
          const current = await getCurrent();
          if (!current) continue;
          item = { ...current, upload_attempted: true };
          await DB.put('teknik_pdf', item);
          item.upload_attempted = true;
          const response = await API.authFetch(objectUrl(item.object_path), {
            method: 'POST',
            headers: { 'Content-Type': 'application/pdf', 'x-upsert': 'true' },
            body: item.blob,
          });
          if (!response.ok) throw new Error(`PDF sunucuya aktarılamadı (${response.status})`);
          const afterUpload = await getCurrent();
          if (!afterUpload) continue;
          item = { ...afterUpload, uploaded_to_storage: true };
          await DB.put('teknik_pdf', item);
        }
        await writeMetadata(item);
        const current = await getCurrent();
        if (!current) continue;
        item = current;
        item.sync_status = 'synced';
        item.synced_at = new Date().toISOString();
        delete item.sync_error;
        await DB.put('teknik_pdf', item);
        sent++;
        if (old?.object_path && old.object_path !== item.object_path) {
          try { await deleteObject(old.object_path); }
          catch (error) { console.warn('Eski teknik PDF temizlenemedi; yeni PDF kullanılıyor', error); }
        }
      } catch (error) {
        const current = await getCurrent();
        if (!current) continue;
        item = current;
        if (error?.denetimBekliyor) {
          item.sync_error = error.message;
          await DB.put('teknik_pdf', item);
          continue;
        }
        if (error?.pdfConflict) {
          item.sync_status = 'conflict';
          conflictRemoteMetadata = error.remoteMetadata || null;
          if (conflictRemoteMetadata) item.conflict_remote_metadata = conflictRemoteMetadata;
        }
        item.sync_error = String(error?.message || 'Teknik PDF aktarımı başarısız').slice(0, 240);
        await DB.put('teknik_pdf', item);
        failed++;
        console.warn('Teknik PDF cihazda korunuyor; aktarım yeniden denenecek', error);
      }
    }
    return { sent, failed };
  }

  async function attach(denetimId, file, existing = null) {
    if (!file || file.size <= 0 || file.size > MAX_BYTES) throw new Error('PDF boş veya 20 MB sınırından büyük.');
    const signature = new Uint8Array(await file.slice(0, 5).arrayBuffer());
    if (String.fromCharCode(...signature) !== '%PDF-') throw new Error('Seçilen dosya geçerli PDF görünmüyor.');
    // Ekranın elindeki kayıt eski kalmış olabilir (arka planda eşitlenmiş/çakışmış); karar için cihazdaki güncel kayıt esastır.
    const current = await DB.get('teknik_pdf', denetimId) || existing || await load(denetimId);
    if (current?.sync_status === 'conflict') throw new Error('Önce Senkron Merkezi’nde teknik PDF çakışmasını çözün.');
    if (current?.sync_status === 'synced' && !navigator.onLine) {
      throw new Error('Mevcut PDF’yi çevrimdışıyken değiştiremeyiz; önce internet bağlantısı kurun.');
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    let extracted;
    try {
      extracted = await readPdf(file);
    } catch (error) {
      if (String(error?.message || '').includes('250 sayfadan uzun')) throw error;
      extracted = {
        reader: 'pdfjs-local-rules-v3',
        status: navigator.onLine ? 'reader_error' : 'not_extracted',
        message: String(error?.message || 'PDF metni okunamadı').slice(0, 180),
        parsed_at: new Date().toISOString(), page_count: null, text_page_count: 0, values: [], equipment: [],
      };
    }
    const record = {
      denetim_id: denetimId,
      file_name: String(file.name || 'Teknik dosya.pdf').slice(0, 255),
      object_path: `${denetimId}/${crypto.randomUUID()}.pdf`,
      previous_object_path: current?.previous_object_path || current?.object_path || null,
      file_size_bytes: file.size,
      sha256: await sha256HexBytes(bytes),
      page_count: extracted.page_count || null,
      text_page_count: extracted.text_page_count ?? null,
      extracted_fields: extracted,
      uploaded_by: API.email,
      updated_at: new Date().toISOString(),
      // Dosya seçicinin File nesnesi değil, bellek içi kopya saklanır: Safari/WebKit seçici dosyasını IndexedDB'ye yazamaz
      // ve iOS seçicinin geçici dosyası kaybolabilir.
      blob: new Blob([bytes], { type: 'application/pdf' }),
      sync_status: 'pending',
      upload_attempted: false,
      uploaded_to_storage: false,
    };
    await DB.put('teknik_pdf', record);
    if (navigator.onLine && API.loggedIn) await pushPending();
    return await DB.get('teknik_pdf', denetimId);
  }

  async function retryExtraction(denetimId) {
    const record = await DB.get('teknik_pdf', denetimId);
    if (!record?.blob) throw new Error('PDF bu cihazda yok; metni yeniden okumak için dosyayı cihaza indirin.');
    const extracted = await readPdf(record.blob);
    record.extracted_fields = extracted;
    record.page_count = extracted.page_count || null;
    record.text_page_count = extracted.text_page_count ?? null;
    record.updated_at = new Date().toISOString();
    if (record.sync_status === 'synced' || record.sync_status === 'remote') record.sync_status = 'metadata_pending';
    await DB.put('teknik_pdf', record);
    if (navigator.onLine && API.loggedIn) await pushPending();
    return await DB.get('teknik_pdf', denetimId);
  }

  async function remove(denetimId) {
    let record = await DB.get('teknik_pdf', denetimId);
    if (!record && navigator.onLine && API.loggedIn) record = await load(denetimId);
    if (!record) return null;
    if (record.sync_status === 'pending' && !record.upload_attempted && !record.previous_object_path) {
      await DB.del('teknik_pdf', denetimId);
      return null;
    }
    record.sync_status = 'delete_pending';
    record.updated_at = new Date().toISOString();
    await DB.put('teknik_pdf', record);
    if (navigator.onLine && API.loggedIn) await pushPending();
    return await DB.get('teknik_pdf', denetimId);
  }

  async function pendingSummary() {
    const map = new Map();
    for (const item of await DB.all('teknik_pdf')) {
      if (!PENDING.has(item.sync_status)) continue;
      if (item.sync_status === 'pending' && !item.blob) continue;
      map.set(item.denetim_id, (map.get(item.denetim_id) || 0) + 1);
    }
    return map;
  }

  return { load, download, compareConflictVersion, keepDeviceVersion, useServerVersion, attach, retryExtraction, remove, pushPending, pendingSummary, prepareOfflineReader, readPdf };
})();
