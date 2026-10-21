/* ============================================================
   AVES Saha Denetim — taslaklar ve seri numaraları
   Form taslağı günlüğü, editör yazımları, fotoğraf kontrol uyarısı, seri numaraları ekranı.
   (Eski UI kapanışının parçasıdır: ui-durum → ui-foto → ui-yonetim → ui-kayit → ui-liste → ui-yeni →
   ui-fr65 → ui-denetim → ui-taslak → ui-form → ui-madde → ui-kapanis → ui-son; ortak global kapsam.)
   ============================================================ */
'use strict';

async function refreshSyncState() {
  const element = document.getElementById('localSyncState');
  if (!element || !currentDenetimId) return;
  const { items: inspectionOutbox, cakisma: conflictSync, korunan: protectedSync, bekleyen: waitingSync } = await Sync.denetimSyncOzeti(currentDenetimId);
  element.className = `local-sync-state ${protectedSync ? 'error' : (inspectionOutbox.length || fotografBekleyenSayisi ? 'pending' : 'ok')}`;
  element.textContent = protectedSync
    ? `⚠ ${protectedSync} işlem cihazda korumada · ${conflictSync ? 'Çakışma veya yetki' : 'Yetki'} incelemesi gerekiyor`
    : waitingSync || fotografBekleyenSayisi
      ? `✓ Cihaza kaydedildi · ${[waitingSync ? `${waitingSync} işlem` : null, fotografBekleyenSayisi ? `${fotografBekleyenSayisi} fotoğraf` : null].filter(Boolean).join(', ')} sunucu aktarımı bekliyor`
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

// Senkron taslak günlüğü (Codex incelemesi, PR #26 sonrası): IndexedDB
// yazımı asenkrondur — telefon donarsa/işlem öldürülürse yazının bitmesi
// garanti değildir. localStorage.setItem SENKRONdur; her tuş vuruşunda
// (debounce beklemeden) burada de yazılır. Değer IndexedDB'ye durduğunda
// silinir. Denetim açılışında/uygulama başlangıcında artakalan taslak
// varsa kurtarılır — yaşam-döngüsü dinleyicisi (visibilitychange/pagehide)
// bunun ANA mekanizması değil, ek bir güvencesidir.
//
// İkinci Codex incelemesi — 3 kritik düzeltme:
//  1) Kurtarma sırasında bir kayıt başarısız olursa yalnız BAŞARILI
//     anahtarlar günlükten silinir; başarısız olan cihazda kalır ve bir
//     sonraki açılışta yeniden denenir (yerel veritabanı geçici olarak
//     açılamazsa taslak kaybolmaz).
//  2) Her taslak kendi zaman damgasını taşır; 700ms'lik gecikmeli yazım
//     bitince yalnız KENDİ damgasıyla eşleşen (yani üzerine yeni bir tuş
//     vuruşu gelmemiş) taslağı siler — aksi hâlde yazım sürerken girilen
//     yeni karakter, henüz kaydedilmeden silinebilirdi.
//  3) Her taslak yazıldığı andaki oturum e-postasıyla damgalanır; kurtarma
//     yalnız GÜNCEL oturumun e-postasıyla eşleşen taslakları uygular —
//     ortak cihazda önceki kullanıcının taslağı asla başka bir hesaba
//     otomatik uygulanmaz (eşleşmeyenler dokunulmadan cihazda kalır).
function taslakAnahtari(target) {
  if (target.matches('[data-bolumnot]')) return `bolum:${target.dataset.bolumnot}`;
  const item = target.closest('.madde');
  if (!item) return null;
  const field = target.dataset.olcumId ? `olcum:${target.dataset.olcumId}`
    : target.matches('[data-diger]') ? 'diger_bulgu' : 'aciklama';
  return `saha:${item.dataset.id}:${field}`;
}

function taslakDeposu(denetimId) {
  try { return JSON.parse(localStorage.getItem(`aves_taslak_${denetimId}`) || '{}'); }
  catch { return {}; }
}

function taslakDeposunuYaz(denetimId, all) {
  try {
    if (all && Object.keys(all).length) localStorage.setItem(`aves_taslak_${denetimId}`, JSON.stringify(all));
    else localStorage.removeItem(`aves_taslak_${denetimId}`);
  } catch { /* localStorage dolu/kapalı olabilir — best-effort ek güvence */ }
}

function taslakYaz(target, ts = Date.now()) {
  if (!currentDenetimId) return ts;
  const key = taslakAnahtari(target);
  if (!key) return ts;
  const all = taslakDeposu(currentDenetimId);
  all[key] = { value: target.value, ts, ownerEmail: normEmail(API.email) };
  taslakDeposunuYaz(currentDenetimId, all);
  return ts;
}

// Yalnız BLUR/change ile hemen komuta edilen alanlar için: o an
// localStorage'daki değer zaten DOM'daki komuta edilen değerin aynısı
// olmak zorunda (blur sonrası başka tuş vuruşu gelemez), bu yüzden
// koşulsuz silinebilir.
function taslakSil(target) {
  if (!currentDenetimId) return;
  const key = taslakAnahtari(target);
  if (!key) return;
  const all = taslakDeposu(currentDenetimId);
  if (key in all) { delete all[key]; taslakDeposunuYaz(currentDenetimId, all); }
}

// 700ms'lik gecikmeli yazım bitince kullanılır: yalnız YAZILAN taslakla
// aynı zaman damgasını taşıyan kayıt silinir. Bu süre içinde yeni bir tuş
// vuruşu gelip taslağı güncellediyse (daha yeni ts), o taslak dokunulmadan
// kalır — kendi 700ms döngüsü onu ayrıca kaydedip silecektir.
function taslakSilEger(target, ts) {
  if (!currentDenetimId || ts == null) return;
  const key = taslakAnahtari(target);
  if (!key) return;
  const all = taslakDeposu(currentDenetimId);
  if (all[key] && all[key].ts <= ts) { delete all[key]; taslakDeposunuYaz(currentDenetimId, all); }
}

async function taslaklariKurtar(denetimId, ownerEmail) {
  const normOwner = normEmail(ownerEmail);
  if (!normOwner) return 0; // oturum/kimlik henüz yoksa hiçbir taslak otomatik uygulanmaz
  const all = taslakDeposu(denetimId);
  const keys = Object.keys(all);
  if (!keys.length) return 0;
  let kurtarilan = 0;
  let degisti = false;
  for (const key of keys) {
    const entry = all[key];
    if (!entry) { delete all[key]; degisti = true; continue; }
    // Farklı (veya bilinmeyen — eski format) kullanıcıya ait taslak asla
    // otomatik uygulanmaz; dokunulmadan cihazda kalır, doğru kullanıcı
    // giriş yaptığında kurtarılır.
    if (normEmail(entry.ownerEmail) !== normOwner) continue;
    try {
      const value = (entry.value || '').trim();
      let basarili = false;
      const formDraftKey = AVES_FORM_DRAFT_JOURNAL.FORM_KEY;
      const isFormDraft = key === formDraftKey || key.startsWith(`${formDraftKey}:`);
      if (isFormDraft && entry.payload && typeof entry.payload === 'object') {
        const d = await DB.get('denetimler', denetimId);
        if (!d || !modulFormDenetimiMi(d) || !canEditDenetim(d)) continue;
        const current = AVES_DENETIM_FORM_SETI.normalize(d.denetim_form_kayitlari, d.teknik_dosya_kayitlari);
        const next = AVES_DENETIM_FORM_SETI.normalize(entry.payload, d.teknik_dosya_kayitlari);
        const formsMatch = stableStringify(current.forms) === stableStringify(next.forms);
        const baseChanged = !!entry.baseUpdatedAt && String(entry.baseUpdatedAt) !== String(d.updated_at || '');
        if (baseChanged && !formsMatch) {
          toast('Form taslağı korundu: denetim bu sırada başka bir oturumda değişmiş. Taslak otomatik uygulanmadı; formu açıp karşılaştırın.');
          continue;
        }
        next.form_seti_gozden_gecirildi_at = null;
        next.form_seti_gozden_geciren_email = null;
        next.form_seti_gozden_geciren_ad = null;
        if (!formsMatch) {
          const now = new Date().toISOString();
          next.updated_at = now;
          d.denetim_form_kayitlari = next;
          d.teknik_dosya_kayitlari = { schema_version: 1, updated_at: now, fr65: next.forms.FR65, rp14: next.forms.RP14 };
          d.updated_at = now;
          await localWrite('denetimler', d, 'denetimler');
          kurtarilan++;
        }
        basarili = true;
      } else if (key.startsWith('bolum:')) {
        const bolumAdi = key.slice('bolum:'.length);
        const d = await DB.get('denetimler', denetimId);
        if (!d) continue;
        d.bolum_aciklamalari = d.bolum_aciklamalari || {};
        if ((d.bolum_aciklamalari[bolumAdi] || '') !== value) {
          d.bolum_aciklamalari[bolumAdi] = value;
          d.updated_at = new Date().toISOString();
          await localWrite('denetimler', d, 'denetimler');
          kurtarilan++;
        }
        basarili = true;
      } else if (key.startsWith('saha:')) {
        const rest = key.slice('saha:'.length);
        const sep = rest.indexOf(':');
        const rowId = rest.slice(0, sep);
        const field = rest.slice(sep + 1);
        const row = await guncelSahaSatiri(rowId);
        if (!row) continue;
        if (field.startsWith('olcum:')) {
          const measurementId = field.slice('olcum:'.length);
          row.olcum_degerleri = row.olcum_degerleri && typeof row.olcum_degerleri === 'object' ? row.olcum_degerleri : {};
          if ((row.olcum_degerleri[measurementId] || '') !== value) {
            if (value) row.olcum_degerleri[measurementId] = value; else delete row.olcum_degerleri[measurementId];
            if (measurementId === 'olcu1') row.olcu1_degeri = value || null;
            if (measurementId === 'olcu2') row.olcu2_degeri = value || null;
            row.updated_at = new Date().toISOString();
            await localWrite('saha_kontrol', row, 'saha');
            kurtarilan++;
          }
          basarili = true;
        } else if ((row[field] || '') !== value) {
          row[field] = value || null;
          row.updated_at = new Date().toISOString();
          await localWrite('saha_kontrol', row, 'saha');
          kurtarilan++;
          basarili = true;
        } else {
          basarili = true; // değer zaten aynı, kaydedecek bir şey yok
        }
      }
      // Yalnız BAŞARIYLA uygulanan (veya uygulanacak bir şeyi kalmayan)
      // anahtar günlükten silinir; hata alan cihazda kalıp yeniden denenir.
      if (basarili) { delete all[key]; degisti = true; }
    } catch (error) {
      console.warn('Taslak kurtarma başarısız — cihazda korunuyor, sonraki açılışta yeniden denenecek', key, error);
    }
  }
  if (degisti) taslakDeposunuYaz(denetimId, all);
  return kurtarilan;
}

async function taslaklariTaraVeKurtar(ownerEmail) {
  if (!normEmail(ownerEmail)) return; // oturum yüklenmeden kurtarma çalıştırılmaz
  let anahtarlar = [];
  try { anahtarlar = Object.keys(localStorage).filter(k => k.startsWith('aves_taslak_')); } catch { return; }
  let toplam = 0;
  for (const k of anahtarlar) {
    const denetimId = k.slice('aves_taslak_'.length);
    try { toplam += await taslaklariKurtar(denetimId, ownerEmail); } catch (error) { console.warn('Taslak taraması başarısız', denetimId, error); }
  }
  if (toplam) toast(`${toplam} kaydedilmemiş değişiklik kurtarıldı`);
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

function scheduleEditorDraft(target, ts = Date.now()) {
  const key = editorDraftKey(target);
  const item = target.closest('.madde');
  if (!key || !item) return;
  clearEditorDraft(target);
  const snapshot = {
    rowId: item.dataset.id,
    measurementId: target.dataset.olcumId || null,
    field: target.matches('[data-diger]') ? 'diger_bulgu' : (target.matches('[data-aciklama]') ? 'aciklama' : null),
    value: target.value,
    ts,
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
      // Yalnız BU yazımın taslağı silinir — 700ms içinde yeni bir tuş
      // vuruşu geldiyse (daha yeni ts) taslak dokunulmadan kalır.
      taslakSilEger(target, snapshot.ts);
    })()).catch(error => console.warn('Alan taslağı cihazda saklanamadı:', error.message));
  }, 700);
  editorDraftTimers.set(key, timer);
}

async function flushEditorWrites() {
  if (activeFr65Flush) await activeFr65Flush();
  const active = document.activeElement;
  // Codex incelemesi: data-bolumnot (Bölüm açıklaması) burada eksikti —
  // yalnız change'te (blur) yazılıyor, debounce'a hiç girmiyordu; bu
  // yüzden arka plana alma/kapatma anında hâlâ kaybolabiliyordu.
  if (active && active.matches && active.matches('[data-diger],[data-aciklama],[data-olcum-id],[data-bolumnot]')) active.blur();
  await new Promise(resolve => setTimeout(resolve, 0));
  let firstError = null;
  while (pendingEditorWrites.size) {
    const settled = await Promise.allSettled([...pendingEditorWrites]);
    if (!firstError) firstError = settled.find(result => result.status === 'rejected')?.reason || null;
  }
  if (firstError) throw firstError;
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
  let formReviewCleared = false;
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
      <div class="photo-help">${esc(SERI_NUMARASI_YARDIMI)} Bilgiler fotoğraflardan bağımsızdır ve çevrimdışı olarak cihazda saklanır.</div>
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
    if (modulFormDenetimiMi(d)) {
      const formRecord = AVES_DENETIM_FORM_SETI.normalize(d.denetim_form_kayitlari, d.teknik_dosya_kayitlari);
      formReviewCleared = !!formRecord.form_seti_gozden_gecirildi_at;
      formRecord.form_seti_gozden_gecirildi_at = null;
      formRecord.form_seti_gozden_geciren_email = null;
      formRecord.form_seti_gozden_geciren_ad = null;
      d.denetim_form_kayitlari = formRecord;
    }
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
      if (formReviewCleared && formOdakliDenetimMi(d, await DB.allByIndex('saha', 'byDenetim', d.id))) await renderDenetim();
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
