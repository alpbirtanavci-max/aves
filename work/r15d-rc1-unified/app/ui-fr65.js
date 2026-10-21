/* ============================================================
   AVES Saha Denetim — FR.65 saha veri ekranı
   renderFr65SahaKaydi: B/E/H1 saha veri toplama ekranı.
   (Eski UI kapanışının parçasıdır: ui-durum → ui-foto → ui-yonetim → ui-kayit → ui-liste → ui-yeni →
   ui-fr65 → ui-denetim → ui-taslak → ui-form → ui-madde → ui-kapanis → ui-son; ortak global kapsam.)
   ============================================================ */
'use strict';

async function renderFr65SahaKaydi(initialDenetim = null) {
  if (activeFr65VersionListener) {
    window.removeEventListener('aves:fr65-server-version', activeFr65VersionListener);
    activeFr65VersionListener = null;
  }
  const d = initialDenetim || await DB.get('denetimler', currentDenetimId);
  if (!d || d.id !== currentDenetimId || !fr65SahaKaydiMi(d)) {
    activeFr65Flush = null;
    toast('Bu kayıt yeni B/E/H1 FR.65 saha veri akışı değil.');
    await showList();
    return;
  }
  stopFr65ScrollTracking();
  const editPermission = canEditDenetim(d) && !inspectionReadOnly;
  const normalized = denetimFormKaydi(d);
  const originalValues = JSON.parse(JSON.stringify(normalized.forms.FR65?.values || {}));
  let baseFr65 = stableStringify(normalized.forms.FR65 || { values: {} });
  let baseUpdatedAt = d.updated_at || '';
  const captureWriterId = await fr65TaslakYazari(d.id);
  const ownCaptureDraft = AVES_FORM_DRAFT_JOURNAL.readFr65Capture(localStorage, d.id, API.email, captureWriterId);
  const captureDraftWriterConflict = !!(ownCaptureDraft?.writerId && ownCaptureDraft.writerId !== captureWriterId);
  const inspectedCaptureDraft = AVES_FORM_DRAFT_JOURNAL.inspectFr65Capture(originalValues, ownCaptureDraft, d.updated_at);
  const captureDraft = captureDraftWriterConflict
    ? { kind: 'conflict', values: ownCaptureDraft.payload?.forms?.FR65?.values || null }
    : inspectedCaptureDraft;
  if (ownCaptureDraft && !captureDraftWriterConflict && inspectedCaptureDraft.kind === 'same') {
    AVES_FORM_DRAFT_JOURNAL.clearFr65CaptureIfOwner(
      localStorage, d.id, API.email, ownCaptureDraft.ts, ownCaptureDraft.writerId || null);
  }
  const draftIsFr65 = captureDraft.kind !== 'none';
  const draftValues = captureDraft.values;
  const draftDiffers = captureDraft.kind === 'recover' || captureDraft.kind === 'conflict';
  const captureDraftConflict = captureDraft.kind === 'conflict';
  const restoreDraftAllowed = captureDraftConflict && editPermission;
  const canEdit = editPermission && !captureDraftConflict;
  currentCanEdit = canEdit;
  if (draftIsFr65 && draftDiffers && !captureDraftConflict) {
    normalized.forms.FR65 = { ...(normalized.forms.FR65 || {}), values: draftValues };
  }
  let ownsCaptureDraft = !!ownCaptureDraft && !captureDraftWriterConflict && inspectedCaptureDraft.kind !== 'same';
  let lastCaptureDraftTs = ownsCaptureDraft ? ownCaptureDraft.ts : null;
  activeFr65VersionListener = event => {
    const detail = event.detail || {};
    if (detail.inspectionId !== d.id || baseUpdatedAt !== detail.clientVersion) return;
    baseUpdatedAt = detail.serverVersion;
    if (ownsCaptureDraft) {
      AVES_FORM_DRAFT_JOURNAL.rebaseFr65Capture(
        localStorage, d.id, API.email, detail.clientVersion, detail.serverVersion, captureWriterId);
    }
  };
  window.addEventListener('aves:fr65-server-version', activeFr65VersionListener);
  let editVersion = 0;
  let saveTimer = null;
  let saveChain = Promise.resolve();
  let draftWarningShown = false;
  const sections = AVES_TEKNIK_DOSYA_FORM.visibleFr65Sections(d.tahrik_tipi);
  const captureSectionStorageKey = `aves_fr65_active_section_v1_${encodeURIComponent(String(d.id))}`;
  const captureScrollStorageKey = `aves_fr65_scroll_v1_${encodeURIComponent(String(d.id))}`;
  let activeSectionKey = sections[0]?.key || '';
  let savedScrollY = 0;
  const sectionExists = key => sections.some(section => section.key === key);
  const rememberCaptureSection = key => {
    if (!sectionExists(key)) return;
    activeSectionKey = key;
    try { localStorage.setItem(captureSectionStorageKey, key); }
    catch (error) { console.warn('FR.65 açık bölümü cihazda saklanamadı', error); }
  };
  try {
    const savedSectionKey = localStorage.getItem(captureSectionStorageKey);
    if (sectionExists(savedSectionKey)) activeSectionKey = savedSectionKey;
    else if (activeSectionKey) localStorage.setItem(captureSectionStorageKey, activeSectionKey);
    const rawScrollY = Number(localStorage.getItem(captureScrollStorageKey));
    if (Number.isFinite(rawScrollY) && rawScrollY > 0) savedScrollY = rawScrollY;
  } catch (error) { console.warn('FR.65 son açık bölümü okunamadı', error); }
  const valuesAreSame = values => stableStringify(values || {}) === stableStringify(originalValues);
  const collectValues = () => {
    // Eski kayıtlardaki görünmeyen alanları koru; yeni saha kayıtları yalnız
    // bu ekranda tanımlı gözlem, ölçüm ve bileşen kimliklerini üretir.
    const values = JSON.parse(JSON.stringify(normalized.forms.FR65?.values || {}));
    document.querySelectorAll('[data-fr65-capture-key]').forEach(row => {
      const value = { ...(values[row.dataset.fr65CaptureKey] || {}) };
      row.querySelectorAll('[data-fr65-capture-prop]').forEach(input => {
        if (input.dataset.fr65PreserveLegacy === 'true' && input.dataset.fr65LegacyTouched !== 'true' && !input.value.trim()) return;
        value[input.dataset.fr65CaptureProp] = input.value.trim();
      });
      if (row.classList.contains('fr65-optional-serial')) {
        const hasSerialData = ['marka', 'tip', 'seri_no'].some(prop => String(value[prop] || '').trim());
        if (hasSerialData) value.var_mi = 'Var';
      }
      if (Object.values(value).some(Boolean)) values[row.dataset.fr65CaptureKey] = value;
      else delete values[row.dataset.fr65CaptureKey];
    });
    return values;
  };
  const updateCaptureConditions = () => {
    document.querySelectorAll('[data-fr65-condition-key]').forEach(wrapper => {
      const sourceRow = Array.from(document.querySelectorAll('[data-fr65-capture-key]'))
        .find(row => row.dataset.fr65CaptureKey === wrapper.dataset.fr65ConditionKey);
      const prop = wrapper.dataset.fr65ConditionProp || 'field_value';
      const source = sourceRow?.querySelector(`[data-fr65-capture-prop="${prop}"]`);
      wrapper.hidden = !source || source.value !== wrapper.dataset.fr65ConditionValue;
    });
  };
  const updateSummary = () => {
    const values = collectValues();
    const count = AVES_TEKNIK_DOSYA_FORM.countFr65Capture({ forms: { FR65: { values } } }, d.tahrik_tipi);
    const summary = document.getElementById('fr65CaptureCount');
    if (summary) summary.textContent = `${count.recorded}/${count.total} saha alanında veri var`;
    document.querySelectorAll('[data-fr65-section-id]').forEach(section => {
      const sectionCount = AVES_TEKNIK_DOSYA_FORM.countFr65Capture(
        { forms: { FR65: { values } } }, d.tahrik_tipi, section.dataset.fr65SectionId);
      const badge = section.querySelector('[data-fr65-section-count]');
      if (badge) badge.textContent = `${sectionCount.recorded}/${sectionCount.total} alan`;
      const progress = section.querySelector('[data-fr65-section-progress]');
      if (progress) progress.textContent = sectionCount.recorded === sectionCount.total
        ? 'Bölüm hazır ✓'
        : `${sectionCount.total - sectionCount.recorded} alan boş`;
      const next = section.querySelector('[data-fr65-next]');
      if (next) {
        const nextKey = next.dataset.fr65NextKey;
        const nextSection = sections.find(item => item.key === nextKey);
        next.textContent = nextSection
          ? (sectionCount.recorded === sectionCount.total
            ? `Bölümü tamamla · ${nextSection.tab || nextSection.title} →`
            : `Sonrakine geç · ${nextSection.tab || nextSection.title} →`)
          : (sectionCount.recorded === sectionCount.total ? 'Bölümü tamamla ✓' : 'Bölüm kaydını bitir');
      }
    });
  };
  const status = message => {
    const element = document.getElementById('fr65CaptureSaveStatus');
    if (element) element.textContent = message;
  };
  const persistValues = async version => {
    if (version !== editVersion || !canEdit) return;
    const values = collectValues();
    if (valuesAreSame(values)) {
      if (ownsCaptureDraft) AVES_FORM_DRAFT_JOURNAL.clearFr65CaptureIfOwner(localStorage, d.id, API.email, lastCaptureDraftTs, captureWriterId);
      status('✓ Değerler cihazda kayıtlı');
      return;
    }
    const payload = AVES_DENETIM_FORM_SETI.normalize(normalized);
    payload.saha_veri_akisi = 'fr65_saha_v1';
    payload.source_form = 'ÜB.FR.65';
    payload.source_revision = AVES_TEKNIK_DOSYA_FORM.FR65.revision;
    payload.forms.FR65 = { ...(payload.forms.FR65 || {}), values };
    payload.updated_at = new Date().toISOString();
    const draftTs = Date.now();
    const draftSaved = AVES_FORM_DRAFT_JOURNAL.writeFr65Capture(localStorage, d.id, payload, API.email, draftTs, baseUpdatedAt, captureWriterId);
    if (draftSaved) { ownsCaptureDraft = true; lastCaptureDraftTs = draftTs; }
    if (!draftSaved && !draftWarningShown) {
      draftWarningShown = true;
      toast('Taslak cihaz günlüğüne yazılamadı; ekranı kapatmadan tekrar deneyin');
    }
    status('Kaydediliyor…');
    const task = saveChain.then(async () => {
      if (version !== editVersion) return;
      const latest = await DB.get('denetimler', d.id);
      if (!latest || !fr65SahaKaydiMi(latest)) throw new Error('FR.65 saha kaydı bulunamadı');
      if (!canEditDenetim(latest)) throw new Error('Bu kayıt artık düzenlemeye açık değil');
      const current = AVES_DENETIM_FORM_SETI.normalize(latest.denetim_form_kayitlari, latest.teknik_dosya_kayitlari);
      const currentFr65 = stableStringify(current.forms.FR65 || { values: {} });
      if (String(latest.updated_at || '') !== String(baseUpdatedAt) && currentFr65 !== baseFr65) {
        throw new Error('Kayıt başka bir oturumda değişti; cihaz taslağı korunuyor. Güncel veriyi kontrol edin.');
      }
      const next = AVES_DENETIM_FORM_SETI.normalize(latest.denetim_form_kayitlari, latest.teknik_dosya_kayitlari);
      next.saha_veri_akisi = 'fr65_saha_v1';
      next.source_form = 'ÜB.FR.65';
      next.source_revision = AVES_TEKNIK_DOSYA_FORM.FR65.revision;
      next.forms.FR65 = { ...(next.forms.FR65 || {}), values };
      next.updated_at = payload.updated_at;
      latest.denetim_form_kayitlari = next;
      latest.teknik_dosya_kayitlari = { schema_version: 1, updated_at: payload.updated_at, fr65: next.forms.FR65 };
      const sayisalAlan = key => {
        const raw = String(values[key]?.field_value || '').trim();
        if (!raw) return null;
        const number = Number(raw);
        return Number.isFinite(number) && number > 0 ? number : null;
      };
      latest.beyan_yuku_kg = sayisalAlan('yuk');
      latest.kapasite_kisi = sayisalAlan('kapasite');
      latest.beyan_hizi_ms = sayisalAlan('hiz');
      latest.durak_sayisi = sayisalAlan('durak_sayisi');
      latest.bina_asansor_sayisi = sayisalAlan('bina_asansor_sayisi');
      latest.updated_at = payload.updated_at;
      await localWrite('denetimler', latest, 'denetimler', {
        conditional_update: {
          expected_updated_at: baseUpdatedAt,
            fields: ['denetim_form_kayitlari', 'teknik_dosya_kayitlari', 'beyan_yuku_kg', 'kapasite_kisi', 'beyan_hizi_ms', 'durak_sayisi', 'bina_asansor_sayisi', 'updated_at'],
        },
      });
      const committedBaseUpdatedAt = baseUpdatedAt;
      baseUpdatedAt = latest.updated_at;
      baseFr65 = stableStringify(next.forms.FR65);
      Object.keys(originalValues).forEach(key => delete originalValues[key]);
      Object.assign(originalValues, values);
      if (version === editVersion) {
        if (draftSaved) AVES_FORM_DRAFT_JOURNAL.clearFr65CaptureIfOwner(localStorage, d.id, API.email, draftTs, captureWriterId);
        ownsCaptureDraft = false;
        lastCaptureDraftTs = null;
        draftWarningShown = false;
        status('✓ Cihaza kaydedildi · sunucu eşitlemesi bekleyebilir');
        refreshSyncState();
      } else {
        if (ownsCaptureDraft && !AVES_FORM_DRAFT_JOURNAL.rebaseFr65Capture(
          localStorage, d.id, API.email, committedBaseUpdatedAt, baseUpdatedAt, captureWriterId)) {
          draftWarningShown = true;
          toast('Daha yeni FR.65 taslağının sürüm bağı yenilenemedi; taslak korunuyor');
        }
      }
    });
    saveChain = task.catch(() => undefined);
    try { await task; }
    catch (error) {
      console.warn('FR.65 saha verisi yazılamadı; cihaz taslağı korunuyor', error);
      status('⚠ Cihaza kayıt tamamlanmadı · taslak korunuyor');
      toast(error.message || 'FR.65 saha verisi kaydedilemedi');
      throw error;
    }
  };
  const flushCapture = async () => {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    if (canEdit && !valuesAreSame(collectValues())) {
      editVersion++;
      await persistValues(editVersion);
    }
    await saveChain;
  };
  activeFr65Flush = flushCapture;

  const count = AVES_TEKNIK_DOSYA_FORM.countFr65Capture(normalized, d.tahrik_tipi);
  const { items: outbox, korunan: protectedCount, bekleyen: waitingCount } = await Sync.denetimSyncOzeti(d.id);
  const localState = protectedCount
    ? `⚠ ${protectedCount} işlem cihazda korumada · senkron incelemesi gerekiyor`
    : waitingCount
      ? `✓ Cihaza kaydedildi · ${waitingCount} işlem sunucu aktarımını bekliyor`
      : '✓ Cihaz ve sunucu eşit · Bekleyen işlem yok';
  const readonlyBanner = canEdit || captureDraftConflict ? '' : `<div class="readonly-banner">${d.denetim_durumu === 'Çalışma Tamamlandı'
      ? 'Saha veri kaydı kapatıldı · Yetkiniz varsa iz bırakan düzeltme ile yeniden açabilirsiniz.'
      : 'Salt okunur · Bu kayıtta değişiklik yetkiniz yok.'}</div>`;
  const captureDraftBanner = captureDraftConflict ? `<div class="integrity-card error"><b>Çakışan FR.65 taslağı korunuyor</b><small>${captureDraftWriterConflict
      ? 'Bu taslak başka bir sekme veya önceki uygulama oturumu tarafından yazılmış. Bu ekranda düzenleme kilitli; diğer sekmede çalışmayı durdurup taslağı gözden geçirin.'
      : 'Kayıt cihaz taslağı oluşturulduktan sonra değişmiş veya taslağın dayandığı kayıt sürümü doğrulanamıyor.'} Güncel kayıt aşağıda gösteriliyor; cihaz taslağı hiçbir alanı ezmeden saklanıyor.${restoreDraftAllowed ? ' Açık onayla geri yüklemek güncel FR.65 alanlarının yerine taslak değerlerini yazar ve değişikliği denetim geçmişine kaydeder.' : ' Taslağı geri yüklemek için kayıt üzerinde düzenleme yetkisi gerekir.'}</small>${restoreDraftAllowed ? '<button type="button" class="btn btn-ghost" id="fr65RestoreDraft">Korunan cihaz taslağını geri yükle</button>' : ''}</div>` : '';
  const quickNavHtml = `<nav class="fr65-quick-nav" aria-label="FR.65 saha bölümleri">
      ${sections.map(section => `<button type="button" data-fr65-jump="${esc(section.key)}">${esc(section.tab || section.title)}</button>`).join('')}
    </nav>`;
  const fieldOptions = AVES_TEKNIK_DOSYA_FORM.FR65_FIELD_OPTIONS;
  const fieldHelp = AVES_TEKNIK_DOSYA_FORM.FR65_FIELD_HELP;
  const fieldConditions = AVES_TEKNIK_DOSYA_FORM.FR65_FIELD_CONDITIONS;
  const renderSerialInputs = (value, disabled, thirdLabel = 'Seri no', thirdProp = 'seri_no') => `
      <div class="fr65-serial-fields">
        <label>Marka / üretici<input data-fr65-capture-prop="marka" value="${esc(value.marka || '')}" autocomplete="off" ${disabled}></label>
        <label>Tip<input data-fr65-capture-prop="tip" value="${esc(value.tip || '')}" autocomplete="off" ${disabled}></label>
        <label>${thirdLabel}<input data-fr65-capture-prop="${thirdProp}" value="${esc(value[thirdProp] || '')}" autocomplete="off" ${disabled}></label>
      </div>`;
  // Word formu (ÜB.FR.65) için isteğe bağlı "teknik dosyadaki değer"; sayımlara girmez, S sütununu besler.
  const technicalUnits = AVES_FR65_DOCX.teknikAlanlari();
  const technicalSerialKeys = new Set(AVES_FR65_DOCX.komponentler('Elektrikli').concat(AVES_FR65_DOCX.komponentler('Hidrolik')).map(item => item.anahtar));
  const renderSerialTechnical = (key, value, disabled) => {
    if (!technicalSerialKeys.has(key)) return '';
    const full = ['elektrikli_makine', 'hidrolik_motor'].includes(key);
    const open = ['teknik_marka', 'teknik_tip', 'teknik_seri'].some(prop => String(value[prop] || '').trim());
    return `<details class="fr65-capture-note fr65-teknik" ${open ? 'open' : ''}>
        <summary>✎ Teknik dosyadaki değer (Word formu için)</summary>
        <div class="fr65-serial-fields">
          ${full ? `<label>Marka<input data-fr65-capture-prop="teknik_marka" value="${esc(value.teknik_marka || '')}" autocomplete="off" ${disabled}></label>
          <label>Tip<input data-fr65-capture-prop="teknik_tip" value="${esc(value.teknik_tip || '')}" autocomplete="off" ${disabled}></label>` : ''}
          <label>Seri no<input data-fr65-capture-prop="teknik_seri" value="${esc(value.teknik_seri || '')}" autocomplete="off" ${disabled}></label>
        </div>
      </details>`;
  };
  const renderTechnicalValue = (key, value, disabled) => (key in technicalUnits)
    ? `<label class="fr65-teknik-deger">Teknik dosyadaki değer${technicalUnits[key] ? ` (${esc(technicalUnits[key])})` : ''}<input data-fr65-capture-prop="teknik_deger" value="${esc(value.teknik_deger || '')}" autocomplete="off" ${disabled}></label>`
    : '';
  const renderCaptureField = (section, field) => {
    const [key, label, fieldType] = field;
    const value = normalized.forms.FR65?.values?.[key] || {};
    const legacyDetailParent = ({
      kismen_kapali_kuyu_detay: 'kismen_kapali_kuyu',
      kuyu_alti_kullanim_yuk_detay: 'kuyu_alti_kullanim_yuk',
    })[key];
    const legacyParentValue = legacyDetailParent
      ? String(normalized.forms.FR65?.values?.[legacyDetailParent]?.field_value || '') : '';
    const inheritedLegacyDetail = legacyParentValue && !['Var', 'Yok'].includes(legacyParentValue)
      ? legacyParentValue : '';
    const disabled = canEdit && fieldType !== 'readonly' ? '' : 'disabled';
    const condition = fieldConditions[key];
    const wrapperOpen = condition
      ? `<div class="fr65-conditional" data-fr65-condition-key="${esc(condition.key)}" data-fr65-condition-value="${esc(condition.value)}" ${String(normalized.forms.FR65?.values?.[condition.key]?.field_value || '') === condition.value ? '' : 'hidden'}>`
      : '';
    const wrapperClose = condition ? '</div>' : '';
    if (section.kind === 'serial' && fieldType === 'optional_serial') {
      const detailsOpen = value.var_mi === 'Var' || ['marka', 'tip', 'seri_no'].some(prop => String(value[prop] || '').trim());
      const detailsHint = value.var_mi === 'Yok' ? 'Önceki kayıt: Yok'
        : value.var_mi === 'Var' ? 'Önceki ek tampon kaydı' : 'Varsa bilgilerini ekle';
      return `<article class="tech-field fr65-optional-serial" data-fr65-capture-key="${esc(key)}">
          <details class="fr65-extra-serial-fields" ${detailsOpen ? 'open' : ''}>
            <summary>${esc(label)} <span>${detailsHint}</span></summary>
            ${renderSerialInputs(value, disabled)}
          </details>
        </article>`;
    }
    if (section.kind === 'serial' && fieldType === 'gsm') {
      const previousGsmStatus = value.var_mi === 'Yok' ? 'Önceki kayıtta GSM için “Yok” seçilmişti.'
        : value.var_mi === 'Var' && !['marka', 'tip', 'imei'].every(prop => String(value[prop] || '').trim())
          ? 'Önceki kayıtta GSM var seçilmişti; kimlik bilgilerini tamamlayın.' : '';
      return `<article class="tech-field fr65-gsm-row" data-fr65-capture-key="${esc(key)}">
          <b>${esc(label)}</b>${previousGsmStatus ? `<small class="fr65-legacy-value">${esc(previousGsmStatus)}</small>` : ''}${renderSerialInputs(value, disabled, 'IMEI', 'imei')}
        </article>`;
    }
    if (section.kind === 'serial' || fieldType === 'serial') {
      return `<article class="tech-field fr65-serial-row" data-fr65-capture-key="${esc(key)}">
          <b>${esc(label)}</b>${renderSerialInputs(value, disabled)}${renderSerialTechnical(key, value, disabled)}
        </article>`;
    }
    const options = fieldOptions[key] || [];
    let fieldControl = '';
    if (fieldType === 'readonly') {
      fieldControl = `<input aria-label="${esc(label)}" data-fr65-capture-prop="field_value" value="${esc(value.field_value || '')}" disabled>`;
    } else if (fieldType === 'select' || fieldType === 'optional_select') {
      const rawCurrent = String(value.field_value || '');
      const oldFreeTextChoice = ['kismen_kapali_kuyu', 'kuyu_alti_kullanim_yuk'].includes(key) &&
        rawCurrent && !options.includes(rawCurrent);
      const current = oldFreeTextChoice ? 'Var' : rawCurrent;
      const legacyOption = current && !options.includes(current)
        ? `<option value="${esc(current)}" selected>${esc(current)} · önceki kayıt</option>`
        : '';
      fieldControl = `<select aria-label="${esc(label)}" data-fr65-capture-prop="field_value" ${disabled}>
          <option value="" ${current ? '' : 'selected'}>Seçin</option>${legacyOption}${options.map(option => `<option value="${esc(option)}" ${current === option ? 'selected' : ''}>${esc(option)}</option>`).join('')}
        </select>`;
    } else if (fieldType === 'multi_measure') {
      const raw = String(value.field_value || '');
      fieldControl = `<textarea class="fr65-multi-measure" rows="1" aria-label="${esc(label)}" data-fr65-capture-prop="field_value" placeholder="Ölçüleri cm olarak girin" ${disabled}>${esc(raw)}</textarea>`;
    } else if (fieldType === 'number') {
      const raw = String(value.field_value || '');
      const numberValue = raw && Number.isFinite(Number(raw)) ? raw : '';
      const preserveLegacy = !!raw && !numberValue;
      const integerCount = key === 'kabin_giris_sayisi';
      fieldControl = `<input type="number" min="${integerCount ? '1' : '0'}" step="${integerCount ? '1' : 'any'}" inputmode="decimal" aria-label="${esc(label)}" data-fr65-capture-prop="field_value" data-fr65-preserve-legacy="${preserveLegacy ? 'true' : 'false'}" value="${esc(numberValue)}" placeholder="${esc(label.match(/\(([^)]+)\)/)?.[1] || 'Sahada görülen / ölçülen değer')}" ${disabled}>${preserveLegacy ? `<small class="fr65-legacy-value">Önceki kayıt: ${esc(raw)}</small><button type="button" class="fr65-clear-legacy" data-fr65-clear-legacy="${esc(key)}" ${disabled}>Eski değeri temizle</button>` : ''}<small class="fr65-birim-uyari" data-fr65-uyari role="status" ${AVES_DEGER_KONTROL.kontrol(key, numberValue) ? '' : 'hidden'}>${esc(AVES_DEGER_KONTROL.kontrol(key, numberValue)?.mesaj ? '⚠ ' + AVES_DEGER_KONTROL.kontrol(key, numberValue).mesaj : '')}</small>`;
    } else {
      const compactMeasure = section.group === 'olcu';
      const compactPlaceholder = label.includes('(cm') ? 'Ölçüyü cm olarak girin' : 'Sahada görülen bilgi';
      fieldControl = `<textarea class="${compactMeasure ? 'fr65-compact-measure-input' : ''}" rows="${compactMeasure ? '1' : '2'}" aria-label="${esc(label)}" data-fr65-capture-prop="field_value" placeholder="${compactMeasure ? compactPlaceholder : 'Sahada görülen bilgi'}" ${disabled}>${esc(value.field_value || inheritedLegacyDetail)}</textarea>`;
    }
    const help = fieldHelp[key] ? `<small class="fr65-field-help">${esc(fieldHelp[key])}</small>` : '';
    const fieldControlHtml = `<label class="fr65-field-control">${section.group === 'olcu' ? '' : 'Saha verisi'}${fieldControl}</label>`;
    return `${wrapperOpen}<article class="tech-field" data-fr65-capture-key="${esc(key)}">
        <b>${esc(label)}</b>
        ${fieldControlHtml}${help}
        <details class="fr65-capture-note ${section.group === 'olcu' ? 'fr65-measure-note' : ''}" ${value.note || value.teknik_deger ? 'open' : ''}>
          <summary>${key in technicalUnits ? '✎ Teknik dosya değeri / açıklama' : '✎ Açıklama ekle / düzenle'}</summary>
          ${renderTechnicalValue(key, value, disabled)}
          <label>Açıklama veya saha notu<textarea data-fr65-capture-prop="note" placeholder="Konum, ölçüm noktası veya kısa gözlem" ${disabled}>${esc(value.note || '')}</textarea></label>
        </details>
      </article>${wrapperClose}`;
  };
  const sectionsHtml = sections.map((section, index) => {
    const keys = section.fields.map(([key]) => key);
    const legacyMovingBuffer = normalized.forms.FR65?.values?.hareketli_tampon || {};
    const legacyMovingText = [
      legacyMovingBuffer.field_value,
      legacyMovingBuffer.marka && `Marka: ${legacyMovingBuffer.marka}`,
      legacyMovingBuffer.tip && `Tip: ${legacyMovingBuffer.tip}`,
      legacyMovingBuffer.seri_no && `Seri no: ${legacyMovingBuffer.seri_no}`,
      legacyMovingBuffer.note,
    ].filter(Boolean).join(' · ');
    const legacyMovingBufferNotice = section.key === 'seri_numaralari' && legacyMovingText
      ? `<aside class="fr65-legacy-notice"><b>Önceki hareketli tampon kaydı korunuyor</b><span>${esc(legacyMovingText)}</span><small>Bu eski kaydın kabine mi karşı ağırlığa mı ait olduğu otomatik belirlenemiyor. Gerekirse bilgiyi yukarıdaki doğru ek tampon alanına aktarın.</small></aside>`
      : '';
    const legacyRailSpacing = normalized.forms.FR65?.values?.raylar_arasi_mesafe || {};
    const legacyRailSpacingText = [legacyRailSpacing.field_value, legacyRailSpacing.note].filter(Boolean).join(' · ');
    const legacyRailSpacingNotice = section.key === 'kuyu' && legacyRailSpacingText
      ? `<aside class="fr65-legacy-notice"><b>Önceki birleşik ray aralığı kaydı korunuyor</b><span>${esc(legacyRailSpacingText)}</span><small>Yeni kayıtta kabin ana rayları ve karşı ağırlık rayları ayrı alanlara girilir.</small></aside>`
      : '';
    const legacyMeasurementKeys = {
      genel: [
        ['seyir_mesafesi', 'Seyir mesafesi (önceki m)'],
        ['kuyu_yuksekligi', 'Kuyu yüksekliği (önceki m)'],
        ['kabin_giris_sayisi_yeri', 'Önceki kabin giriş sayısı/konumu kaydı'],
      ],
      elektrikli_tahrik: [
        ['halat_tipi', 'Önceki halat kaydı'],
        ['kasnak_caplari', 'Önceki kasnak çapları'],
      ],
      kabin_kapilar: [
        ['kabin_genislik', 'Kabin genişliği (önceki mm)'],
        ['kabin_derinlik', 'Kabin derinliği (önceki mm)'],
        ['kabin_yukseklik', 'Kabin yüksekliği (önceki mm)'],
        ['kabin_kapi_genislik_cm', 'Önceki kabin kapısı genişliği (cm)'],
        ['kabin_kapi_yukseklik_cm', 'Önceki kabin kapısı yüksekliği (cm)'],
        ['kat_kapisi_genislik_cm', 'Önceki kat kapısı genişliği (cm)'],
        ['kat_kapisi_yukseklik_cm', 'Önceki kat kapısı yüksekliği (cm)'],
        ['kabin_kapi_genislik', 'Kabin kapısı genişliği (önceki mm)'],
        ['kabin_kapi_yukseklik', 'Kabin kapısı yüksekliği (önceki mm)'],
        ['kat_kapisi_genislik', 'Kat kapısı genişliği (önceki mm)'],
        ['kat_kapisi_yukseklik', 'Kat kapısı yüksekliği (önceki mm)'],
        ['kabin_kapi_acikligi', 'Önceki tek alanlı kabin kapısı açıklığı'],
        ['kat_kapisi_acikligi', 'Önceki tek alanlı kat kapısı açıklığı'],
        ['kabin_kapi_yonu', 'Önceki kabin kapısı yönü'],
        ['kabin_kapi_tipi', 'Önceki kabin kapısı tipi'],
        ['kabin_kapi_panel_sayisi', 'Önceki kabin kapısı panel sayısı'],
        ['kat_kapisi_yonu', 'Önceki kat kapısı yönü'],
        ['kat_kapisi_tipi', 'Önceki kat kapısı tipi'],
        ['kat_kapisi_panel_sayisi', 'Önceki kat kapısı panel sayısı'],
        ['kilavuz_pabucu_araligi', 'Önceki kılavuz pabucu aralığı'],
        ['kapi_yon_tip_panel', 'Önceki kapı yönü/tipi/panel bilgisi'],
      ],
      raylar: [['ray_toplam_boy', 'Önceki toplam ray boyu']],
      kuyu: [
        ['kuyu_genislik', 'Kuyu genişliği (önceki mm)'],
        ['kuyu_derinlik', 'Kuyu derinliği (önceki mm)'],
        ['kuyu_dibi', 'Önceki kuyu dibi derinliği'],
        ['kuyu_genislik_derinlik', 'Önceki birleşik kuyu ölçüsü'],
        ['ust_bosluk', 'Önceki üst boşluk kaydı'],
        ['toplam_kuyu_olcusu', 'Önceki toplam kuyu/seyir kaydı'],
        ['kabin_raylar_arasi', 'Kabin ray aralığı (önceki mm)'],
        ['karsi_agirlik_raylar_arasi', 'Karşı ağırlık ray aralığı (önceki mm)'],
        ['ray_kapi_mesafe_noktalari_cm', 'Önceki ray–kapı ölçüm satırları'],
        ['ray_kapi_mesafesi', 'Önceki ray–kapı mesafeleri'],
        ['ray_kapi_mesafeleri_cm', 'Önceki serbest metin ray–kapı mesafeleri'],
        ['karsi_agirlik_adet_olcu', 'Önceki karşı ağırlık adet/ölçü kaydı'],
        ['tampon_strok_konum', 'Önceki tampon tipi/strok/konum kaydı'],
        ['ust_alt_guvenli_bosluk', 'Önceki üst/alt güvenli boşluk kaydı'],
        ['ust_guvenli_bosluk_cm', 'Önceki kuyu üstü güvenli çalışma boşluğu (artık ölçülmüyor)'],
        ['alt_guvenli_bosluk_cm', 'Önceki kuyu altı güvenli çalışma boşluğu (artık ölçülmüyor)'],
      ],
      hidrolik: [
        ['hidrolik_halat', 'Önceki hidrolik halat kaydı'],
        ['piston_makara_cap', 'Önceki piston/makara çapları'],
        ['piston_cap_adet_konum', 'Önceki piston çapı/adedi/konumu'],
        ['hidrolik_kapi', 'Önceki hidrolik kapı/açıklık kaydı'],
      ],
    }[section.key] || [];
    const legacyMeasurementText = legacyMeasurementKeys.map(([key, label]) => {
      const oldValue = normalized.forms.FR65?.values?.[key];
      const oldPoints = Array.isArray(oldValue?.points) ? oldValue.points.map(point => {
        const position = String(point?.position || '').trim();
        const distance = String(point?.distance_cm ?? '').trim();
        return [position, distance ? `${distance} cm` : ''].filter(Boolean).join(' · ');
      }).filter(Boolean) : [];
      const parts = [...oldPoints, oldValue?.field_value, oldValue?.note].filter(Boolean);
      return parts.length ? `${label}: ${parts.join(' · ')}` : '';
    }).filter(Boolean).join(' · ');
    const legacyMeasurementNotice = legacyMeasurementText
      ? `<aside class="fr65-legacy-notice"><b>Önceki ölçü ve saha kayıtları korunuyor</b><span>${esc(legacyMeasurementText)}</span><small>Eski değerler dönüştürülmeden korunur. Yeni alanlarda etiketteki birimi kullanın; “artık ölçülmüyor” olarak belirtilen kalemler yalnızca geçmiş bilgidir.</small></aside>`
      : '';
    const fieldHtml = [];
    for (let fieldIndex = 0; fieldIndex < section.fields.length; fieldIndex++) {
      const field = section.fields[fieldIndex];
      const pairedKey = section.key === 'kabin_kapilar' ? ({
        kabin_genislik_cm: 'kabin_derinlik_cm',
        kabin_kat_kapi_genislik_cm: 'kabin_kat_kapi_yukseklik_cm',
      })[field[0]] : section.key === 'kuyu' ? ({
        kuyu_genislik_cm: 'kuyu_derinlik_cm',
        karsi_agirlik_genislik_cm: 'karsi_agirlik_derinlik_cm',
      })[field[0]] : null;
      const nextField = section.fields[fieldIndex + 1];
      if (pairedKey && nextField?.[0] === pairedKey) {
        const pairLabel = field[0] === 'kuyu_genislik_cm' ? 'Kuyu ölçüleri'
          : field[0] === 'kabin_genislik_cm' ? 'Kabin iç ölçüleri'
          : field[0] === 'karsi_agirlik_genislik_cm' ? 'Karşı ağırlık ölçüleri'
            : field[0] === 'kabin_kat_kapi_genislik_cm' ? 'Kabin ve kat kapısı ölçüleri'
              : 'Ölçüler';
        const hint = '<small class="fr65-field-help">Her değeri ayrı kutuya, cm olarak girin.</small>';
        fieldHtml.push(`<div class="fr65-measure-group" role="group" aria-label="${esc(pairLabel)}">
            <b>${esc(pairLabel)}</b><div class="fr65-measure-pair">${renderCaptureField(section, field)}${renderCaptureField(section, nextField)}</div>${hint}
          </div>`);
        fieldIndex++;
      } else fieldHtml.push(renderCaptureField(section, field));
    }
    const nextSection = sections[index + 1];
    return `<details class="tech-section" id="fr65Section-${esc(section.key)}" data-fr65-section-id="${esc(section.key)}" data-fr65-section-key="${esc(JSON.stringify(keys))}" ${section.key === activeSectionKey ? 'open' : ''}>
        <summary>${esc(section.title)} <span data-fr65-section-count>0/${keys.length} alan</span></summary>
        <div class="tech-section-body">${legacyMovingBufferNotice}${legacyRailSpacingNotice}${legacyMeasurementNotice}${fieldHtml.join('')}
          <div class="fr65-section-footer"><span data-fr65-section-progress></span><button type="button" class="btn btn-ghost" data-fr65-next="${esc(section.key)}" data-fr65-next-key="${esc(nextSection?.key || '')}">Bölümü kontrol et</button></div>
        </div>
      </details>`;
  }).join('');
  const safetyHtml = SAHA_KANIT_PLANI.guvenlik.map(item => `<li>${esc(item)}</li>`).join('');
  const fr65Tamamlandi = d.denetim_durumu === 'Çalışma Tamamlandı';
  app.innerHTML = `<div class="screen fr65-capture">
      <div class="local-sync-state fr65-sync-strip ${protectedCount ? 'error' : (outbox.length ? 'pending' : 'ok')}" id="localSyncState">${esc(localState)}</div>
      <div class="inspection-toolbar">
        <button class="backlink" id="fr65Back">‹ Denetimler</button>
        <div class="inspection-actions">
          ${fr65Tamamlandi ? '<button class="delbtn" id="fr65Summary" title="Girilen saha verilerinin özeti">📋 Denetim Özeti</button>' : ''}
          <button class="delbtn" id="fr65Excel" title="Saha verisini Excel dosyası olarak indir">📊 Excel</button>
          <button class="delbtn" id="fr65Word" title="ÜB.FR.65 Teknik Dosya–Saha Eşleşme Formu (Word)">📝 Word</button>
          <button class="delbtn" id="fr65Print" title="FR.65 saha veri özetini yazdır veya PDF kaydet">🖨 Çıktı / PDF</button>
          ${canReopenDenetim(d) ? '<button class="delbtn" id="fr65Reopen" title="İz bırakarak düzenlemeye aç">↻ Düzenlemeye Aç</button>' : ''}
          ${canDeleteDenetim(d) && denetimSahibiMi(d) ? '<button class="delbtn" id="fr65Delete" title="FR.65 saha kaydını sil">🗑 Sil</button>' : ''}
        </div>
      </div>
      ${readonlyBanner}
      ${captureDraftBanner}
      <div class="det-head">
        <div class="inspection-eyebrow">${esc(d.modul)} · ÜB.FR.65 saha veri kaydı</div>
        <div class="dtitle">${esc(d.musteri_unvani)}</div>
        <div class="dmeta"><b>Firma adresi:</b> ${esc(d.firma_adresi || '—')}</div>
        ${canEdit ? `<div class="fr65-kunye">
          <label>Asansör seri no<input id="fr65Seri" value="${esc(d.asansor_seri_no || '')}" autocomplete="off" placeholder="Sahada okuyup girin"></label>
          <label>Asansörün bulunduğu adres<input id="fr65Adres" value="${esc(d.denetim_adresi || '')}" autocomplete="street-address" placeholder="Saha adresi"></label>
          <label>Asansör kimlik no (varsa)<input id="fr65Kimlik" value="${esc(d.asansor_kimlik_no || '')}" autocomplete="off"></label>
          <label>Dosya no (varsa)<input id="fr65Dosya" value="${esc(d.dosya_no || '')}" autocomplete="off"></label>
        </div>` : `<div class="dmeta"><b>Asansör seri no:</b> ${esc(d.asansor_seri_no || '—')}</div>
        <div class="dmeta"><b>Asansörün bulunduğu adres:</b> ${esc(d.denetim_adresi || '—')}</div>
        ${d.asansor_kimlik_no ? `<div class="dmeta"><b>Asansör kimlik no:</b> ${esc(d.asansor_kimlik_no)}</div>` : ''}
        ${d.dosya_no ? `<div class="dmeta"><b>Dosya no:</b> ${esc(d.dosya_no)}</div>` : ''}`}
        <div class="dmeta"><b>Tahrik:</b> ${esc(d.tahrik_tipi)} · <b>Yük:</b> ${esc(d.beyan_yuku_kg || '—')} kg · <b>Kapasite:</b> ${esc(d.kapasite_kisi || '—')} kişi · <b>Hız:</b> ${esc(d.beyan_hizi_ms || '—')} m/s · <b>Durak:</b> ${esc(d.durak_sayisi || '—')} · <b>Tarih:</b> ${esc(d.denetim_tarihi || '')}</div>
        <div class="dmeta"><b>Durum:</b> ${esc(d.denetim_durumu || 'Devam Ediyor')}</div>
        ${canEdit ? `<aside class="saha-guvenlik" role="note"><b>⚠ Denetim başladıktan sonra saha güvenliği</b><ul>${safetyHtml}</ul><small>Bu hatırlatma, şirketin onaylı risk analizi ve güvenli çalışma prosedürünün yerini almaz.</small></aside>` : ''}
      </div>
      <div class="tech-source"><b>FR.65 referanslı saha veri toplama</b><span id="fr65CaptureCount">${count.recorded}/${count.total} saha alanında veri var</span>${canEdit ? '<button type="button" class="btn btn-ghost fr65-next-empty" id="fr65NextEmpty">Sıradaki boş alana git ↓</button>' : ''}<small>Yalnız sahada görülen/ölçülen bilgiler ve bileşen kimlikleri kaydedilir; uygunluk veya belgelendirme kararı üretilmez. Önerilen akış kuyu bölümünden başlar; sabit bölüm düğmeleriyle ilerleyin.</small></div>
      ${quickNavHtml}
      ${sectionsHtml}
      <div id="fr65CaptureSaveStatus" class="photo-help">${canEdit ? 'Alanları yazdıkça cihaza otomatik kaydedilir.' : 'Salt okunur gösterim.'}</div>
      <div class="fr65-capture-actions">${canEdit ? '<button class="btn btn-ghost" id="fr65SaveNow">Şimdi kaydet</button><button class="btn btn-primary" id="fr65Complete">Saha veri kaydını tamamla</button>' : '<button class="btn btn-ghost" id="fr65BackBottom">Denetimlere dön</button>'}</div>
    </div>`;
  updateSummary();
  updateCaptureConditions();
  updateSummary();
  activeFr65PositionSaver = () => {
    if (currentView !== 'inspection' || currentDenetimId !== d.id) return;
    try { localStorage.setItem(captureScrollStorageKey, String(Math.max(0, Math.round(window.scrollY || window.pageYOffset || 0)))); }
    catch (error) { console.warn('FR.65 kaydırma konumu saklanamadı', error); }
  };
  activeFr65ScrollHandler = () => {
    if (activeFr65ScrollSaveTimer) return;
    activeFr65ScrollSaveTimer = setTimeout(() => {
      activeFr65ScrollSaveTimer = null;
      if (activeFr65PositionSaver) activeFr65PositionSaver();
    }, 180);
  };
  window.addEventListener('scroll', activeFr65ScrollHandler, { passive: true });
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (currentView !== 'inspection' || currentDenetimId !== d.id || savedScrollY <= 0) return;
    const maxScrollY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo(0, Math.min(savedScrollY, maxScrollY));
  }));
  // Birim/aralık uyarısı: yalnız bilgilendirir, değeri değiştirmez, kaydı engellemez.
  document.querySelectorAll('[data-fr65-uyari]').forEach(uyari => {
    const input = uyari.closest('[data-fr65-capture-key]')?.querySelector('input[data-fr65-capture-prop="field_value"]');
    if (!input) return;
    const key = uyari.closest('[data-fr65-capture-key]').dataset.fr65CaptureKey;
    input.addEventListener('input', () => {
      const sonuc = AVES_DEGER_KONTROL.kontrol(key, input.value);
      uyari.hidden = !sonuc;
      uyari.textContent = sonuc ? `⚠ ${sonuc.mesaj}` : '';
    });
  });
  // İlk boş alana (önerilen akış sırasıyla) gider, bölümü açar ve alana odaklanır.
  const nextEmptyButton = document.getElementById('fr65NextEmpty');
  if (nextEmptyButton) nextEmptyButton.onclick = () => {
    const missing = AVES_TEKNIK_DOSYA_FORM.missingFr65Fields({ forms: { FR65: { values: collectValues() } } }, d.tahrik_tipi);
    if (!missing.length) { toast('Boş alan kalmadı ✓'); return; }
    const sectionElement = document.getElementById(`fr65Section-${missing[0].key}`);
    if (!sectionElement) return;
    sectionElement.open = true;
    rememberCaptureSection(missing[0].key);
    const label = missing[0].fields[0];
    const article = Array.from(sectionElement.querySelectorAll('[data-fr65-capture-key]'))
      .find(row => (row.querySelector('b')?.textContent || '').trim() === label) || sectionElement;
    article.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const control = article.querySelector('[data-fr65-capture-prop]:not([disabled])');
    if (control) setTimeout(() => control.focus({ preventScroll: true }), 350);
    toast(`${missing[0].title}: ${label}${missing.reduce((sum, s) => sum + s.fields.length, 0) > 1 ? ` · toplam ${missing.reduce((sum, s) => sum + s.fields.length, 0)} boş alan` : ''}`);
  };
  document.querySelectorAll('[data-fr65-jump]').forEach(button => {
    button.onclick = () => {
      const target = document.getElementById(`fr65Section-${button.dataset.fr65Jump}`);
      if (!target) return;
      rememberCaptureSection(button.dataset.fr65Jump);
      target.open = true;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  });
  document.querySelectorAll('[data-fr65-section-id]').forEach(sectionElement => {
    const sectionKey = sectionElement.dataset.fr65SectionId;
    sectionElement.querySelector(':scope > summary')?.addEventListener('click', () => {
      if (!sectionElement.open) rememberCaptureSection(sectionKey);
    });
    sectionElement.addEventListener('toggle', () => {
      if (sectionElement.open) {
        rememberCaptureSection(sectionKey);
        return;
      }
      if (activeSectionKey !== sectionKey) return;
      const openSections = Array.from(document.querySelectorAll('[data-fr65-section-id][open]'));
      const otherOpenSection = openSections[openSections.length - 1];
      if (otherOpenSection) rememberCaptureSection(otherOpenSection.dataset.fr65SectionId);
      else {
        activeSectionKey = '';
        try { localStorage.removeItem(captureSectionStorageKey); }
        catch (error) { console.warn('FR.65 bölüm konumu temizlenemedi', error); }
      }
    });
  });
  document.querySelectorAll('[data-fr65-next]').forEach(button => {
    button.onclick = async () => {
      const sectionKey = button.dataset.fr65Next;
      const section = sections.find(item => item.key === sectionKey);
      const progress = AVES_TEKNIK_DOSYA_FORM.countFr65Capture(
        { forms: { FR65: { values: collectValues() } } }, d.tahrik_tipi, sectionKey);
      if (progress.recorded < progress.total &&
          !confirm(`Bu bölümde ${progress.total - progress.recorded} alan boş. Boş alanları daha sonra tamamlamak üzere sonraki bölüme geçilsin mi?`)) return;
      try { await flushCapture(); }
      catch { return; }
      const nextKey = button.dataset.fr65NextKey;
      if (!nextKey) {
        toast(progress.recorded === progress.total
          ? `${section?.title || 'Bölüm'} tamamlandı ve cihaza kaydedildi`
          : `${section?.title || 'Bölüm'} kaydedildi; boş alanları daha sonra tamamlayabilirsiniz`);
        return;
      }
      const current = document.getElementById(`fr65Section-${sectionKey}`);
      const target = document.getElementById(`fr65Section-${nextKey}`);
      if (current) current.open = false;
      if (target) {
        rememberCaptureSection(nextKey);
        target.open = true;
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
  });
  document.getElementById('fr65Back').onclick = showList;
  const backBottom = document.getElementById('fr65BackBottom');
  if (backBottom) backBottom.onclick = showList;
  const reopen = document.getElementById('fr65Reopen');
  if (reopen) reopen.onclick = () => duzeltmeNedeniSec(d);
  const deleteAction = document.getElementById('fr65Delete');
  if (deleteAction) deleteAction.onclick = () => fr65SahaKaydiniSil(d, deleteAction);
  fr65AktifRapor = { id: d.id, sections, fieldConditions };
  const kunyeKaydet = () => {
    const girdi = id => document.getElementById(id);
    if (!girdi('fr65Seri') || !girdi('fr65Adres')) return;
    const yeni = {
      asansor_seri_no: girdi('fr65Seri').value.trim(),
      denetim_adresi: girdi('fr65Adres').value.trim() || null,
      asansor_kimlik_no: girdi('fr65Kimlik')?.value.trim() || null,
      dosya_no: girdi('fr65Dosya')?.value.trim() || null,
    };
    const task = saveChain.then(async () => {
      const latest = await DB.get('denetimler', d.id);
      if (!latest || !fr65SahaKaydiMi(latest) || !canEditDenetim(latest)) return;
      const degisen = Object.keys(yeni).filter(key => (latest[key] || '') !== (yeni[key] || ''));
      if (!degisen.length) return;
      if (degisen.includes('asansor_seri_no') && yeni.asansor_seri_no &&
          normSeriNo(yeni.asansor_seri_no) !== normSeriNo(latest.asansor_seri_no || '')) {
        if (!await yeniDenetimSeriNoUygunMu(yeni.asansor_seri_no)) { girdi('fr65Seri').value = latest.asansor_seri_no || ''; return; }
      }
      Object.assign(latest, yeni);
      latest.updated_at = new Date().toISOString();
      await localWrite('denetimler', latest, 'denetimler', {
        conditional_update: {
          expected_updated_at: baseUpdatedAt,
          fields: [...degisen, 'updated_at'],
        },
      });
      baseUpdatedAt = latest.updated_at;
      Object.assign(d, yeni);
      status('✓ Künye cihaza kaydedildi · sunucu eşitlemesi bekleyebilir');
      refreshSyncState();
    });
    saveChain = task.catch(() => undefined);
    task.catch(error => { console.warn('FR.65 künye kaydedilemedi', error); toast(error.message || 'Künye kaydedilemedi'); });
  };
  ['fr65Seri', 'fr65Adres', 'fr65Kimlik', 'fr65Dosya'].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.onchange = kunyeKaydet;
  });
  const summaryAction = document.getElementById('fr65Summary');
  if (summaryAction) summaryAction.onclick = () => fr65OzetiniGoster(d.id);
  // Çevrimdışı hazırlık sessizce doğrulanır; kullanıcıdan işlem istenmez.
  if (canEdit && navigator.onLine) {
    DB.get('denetimler', d.id).then(async latest => {
      // Geçerli işaret varsa yeniden çizimlerde tekrar çalıştırma (gereksiz iş + işaret titremesi).
      if (latest && !(await cevrimdisiHazirlikDurumu(latest, [])).ready) await sahayaHazirla(latest, []);
    }).catch(() => {});
  }
  const excelAction = document.getElementById('fr65Excel');
  if (excelAction) excelAction.onclick = async () => {
    excelAction.disabled = true;
    try {
      try { if (canEdit) await flushCapture(); }
      catch (error) { toast('Son kayıt doğrulanamadı; cihazdaki kayıtlı değerler aktarılıyor'); }
      const latest = await DB.get('denetimler', d.id) || d;
      const record = AVES_DENETIM_FORM_SETI.normalize(latest.denetim_form_kayitlari, latest.teknik_dosya_kayitlari);
      const bytes = await AVES_FR65_EXCEL.build({
        JSZip: window.JSZip, record: latest, values: record.forms?.FR65?.values || {},
        sections: AVES_TEKNIK_DOSYA_FORM.visibleFr65Sections(latest.tahrik_tipi),
        isActive: (field, values) => AVES_TEKNIK_DOSYA_FORM.fr65CaptureFieldActive(field, values),
        duzeltmeler: AVES_FR65_CIKTI.duzeltmeOzeti(await DB.allByIndex('gecmis', 'byDenetim', d.id)),
        meta: { surum: APP_VERSION, uretildi: new Date().toLocaleString('tr-TR') },
      });
      const ad = String(latest.asansor_seri_no || latest.musteri_unvani || 'kayit').replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 40);
      await dosyaIndir(new File([bytes], `AVES_FR65_${ad}_${new Date().toISOString().slice(0, 10)}.xlsx`,
        { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      toast('Excel dosyası hazırlandı');
    } catch (error) {
      if (!(error && error.name === 'AbortError')) {
        console.error('FR.65 Excel dışa aktarma hatası', error);
        toast('Excel dosyası oluşturulamadı; veri cihazda korunuyor');
      }
    } finally { excelAction.disabled = false; }
  };
  const wordAction = document.getElementById('fr65Word');
  if (wordAction) wordAction.onclick = async () => {
    wordAction.disabled = true;
    try {
      try { if (canEdit) await flushCapture(); }
      catch (error) { toast('Son kayıt doğrulanamadı; cihazdaki kayıtlı değerler aktarılıyor'); }
      const latest = await DB.get('denetimler', d.id) || d;
      const record = AVES_DENETIM_FORM_SETI.normalize(latest.denetim_form_kayitlari, latest.teknik_dosya_kayitlari);
      const template = await fetch('./form-assets/UB_FR_65.docx').then(r => { if (!r.ok) throw new Error('Form şablonu alınamadı'); return r.arrayBuffer(); });
      const sonuc = await AVES_FR65_DOCX.build({ JSZip: window.JSZip, template, record: latest, values: record.forms?.FR65?.values || {} });
      const ad = String(latest.asansor_seri_no || latest.musteri_unvani || 'kayit').replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 40);
      await dosyaIndir(new File([sonuc.bytes], `UB_FR_65_${ad}_${new Date().toISOString().slice(0, 10)}.docx`,
        { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
      const ozet = sonuc.ozet;
      toast(`Word formu hazırlandı · ${ozet.uygun} eşleşti, ${ozet.uygunDegil} farklı` +
        (ozet.tdGirilmemis ? ` · ${ozet.tdGirilmemis} alanda teknik dosya değeri girilmedi` : ''));
    } catch (error) {
      if (!(error && error.name === 'AbortError')) {
        console.error('FR.65 Word çıktısı hatası', error);
        toast('Word formu oluşturulamadı; veri cihazda korunuyor');
      }
    } finally { wordAction.disabled = false; }
  };
  // Yazdırma, PDF ve benzeri çıktılar aynı bağlamı kullanır (ekrandaki değerler + durum/mühür/boş alan/düzeltme).
  const ciktiBaglami = async () => {
    let saveWarning = '';
    try {
      if (canEdit) await flushCapture();
    } catch (error) {
      saveWarning = error.message || 'Son kayıt doğrulanamadı';
    }
    const screenValues = collectValues();
    let latestRecord = null;
    try { latestRecord = await DB.get('denetimler', d.id) || null; }
    catch (error) { console.warn('FR.65 çıktı için cihaz kaydı okunamadı', error); }
    const recordAvailable = !!latestRecord;
    const reportRecord = latestRecord || d;
    const savedValues = recordAvailable
      ? (AVES_DENETIM_FORM_SETI.normalize(latestRecord.denetim_form_kayitlari, latestRecord.teknik_dosya_kayitlari).forms?.FR65?.values || {})
      : {};
    const sameStoredValues = recordAvailable && AVES_FR65_CIKTI.sameValues(savedValues, screenValues);
    // Yazdırılan değerler ekrandaki değerlerdir; mührü ancak aynı içerik cihaz kaydıyla eşleşirse göster.
    const report = AVES_FR65_SAHA_TOOLS.buildReport(
      reportRecord, screenValues, sections, fieldConditions);
    let syncSummary = null;
    let syncStatus = 'unknown';
    let syncText = saveWarning
      ? `Son kaydetme doğrulanamadı (${saveWarning}). Çıktı ekrandaki değerleri içerir; bu değerlerin cihaz veya sunucu kaydı ayrıca doğrulanmalıdır.`
      : '';
    try {
      syncSummary = await Sync.denetimSyncOzeti(d.id);
      syncStatus = AVES_FR65_CIKTI.syncStatus(syncSummary);
    } catch (error) { console.warn('FR.65 çıktı senkron durumu okunamadı', error); }
    if (saveWarning || !recordAvailable || !sameStoredValues) syncStatus = 'unknown';
    if (!syncText) {
      if (!recordAvailable) syncText = 'Cihazdaki kayıt okunamadı; bu çıktı için kayıt ve sunucu aktarım durumu doğrulanamadı.';
      else if (!sameStoredValues) syncText = 'Ekrandaki değerler cihazdaki kayıtlı FR.65 verisiyle eşleşmiyor; bu çıktının aktarım durumu doğrulanamadı.';
      else if (syncStatus === 'protected') syncText = `${syncSummary.korunan} işlem cihazda korumada; sunucuya aktarım inceleme gerektiriyor.`;
      else if (syncStatus === 'pending') syncText = `Cihaza kaydedildi; ${syncSummary.bekleyen} işlem sunucu aktarımını bekliyor.`;
      else if (syncStatus === 'synced') syncText = 'Cihaz ve sunucu eşit; bekleyen FR.65 aktarımı yok.';
      else syncText = 'Senkron durumu okunamadı; bu çıktı için sunucu eşitliği doğrulanamadı.';
    }
    const total = AVES_TEKNIK_DOSYA_FORM.countFr65Capture(
      { forms: { FR65: { values: screenValues } } }, reportRecord.tahrik_tipi);
    let sealMatches = null;
    if (recordAvailable && latestRecord.butunluk_hash) {
      try { sealMatches = (await fr65ButunlukOzetiHesapla(latestRecord)).hash === latestRecord.butunluk_hash; }
      catch (error) { console.warn('FR.65 çıktı mührü doğrulanamadı', error); }
    }
    const sealStatus = AVES_FR65_CIKTI.sealStatus({
      recordAvailable, saveWarning: !!saveWarning, savedValues, reportValues: screenValues,
      hasSeal: !!latestRecord?.butunluk_hash, sealMatches,
    });
    let missing = [];
    let duzeltmeler = [];
    try { missing = AVES_TEKNIK_DOSYA_FORM.missingFr65Fields({ forms: { FR65: { values: screenValues } } }, reportRecord.tahrik_tipi); }
    catch (error) { console.warn('FR.65 boş alanlar hesaplanamadı', error); }
    try { duzeltmeler = AVES_FR65_CIKTI.duzeltmeOzeti(await DB.allByIndex('gecmis', 'byDenetim', d.id)); }
    catch (error) { console.warn('FR.65 düzeltme geçmişi okunamadı', error); }
    return {
      values: screenValues, missing, duzeltmeler, report, count: total,
      syncText: syncStatus === 'synced' ? '' : syncText, saveWarning: !!saveWarning, syncStatus, sealStatus,
      kapandi: reportRecord.denetim_durumu === 'Çalışma Tamamlandı',
      kapanisTarihi: reportRecord.calisma_tamamlandi_at ? new Date(reportRecord.calisma_tamamlandi_at).toLocaleDateString('tr-TR') : '',
      muhurKisa: sealStatus === 'valid' ? String(latestRecord.butunluk_hash).slice(0, 16) : '',
      surum: APP_VERSION, olusturuldu: new Date().toLocaleString('tr-TR'),
      firma: reportRecord.musteri_unvani || '', seri: reportRecord.asansor_seri_no || '', adres: reportRecord.denetim_adresi || '', modul: reportRecord.modul || '',
    };
  };
  const printAction = document.getElementById('fr65Print');
  if (printAction) printAction.onclick = async () => {
    // Open synchronously from the button gesture so mobile popup blockers allow the report.
    const reportWindow = window.open('about:blank', '_blank');
    if (!reportWindow) { toast('Çıktı penceresi engellendi; bu site için açılır pencerelere izin verin'); return; }
    printAction.disabled = true;
    try {
      const baglam = await ciktiBaglami();
      // Çıktı penceresi about:blank olduğundan logo veri adresi olarak gömülür; yazı tipleri mutlak adresten yüklenir.
      let logoSrc = '';
      try {
        const blob = await (await fetch('./aves-logo-white.png')).blob();
        logoSrc = await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => resolve(''); reader.readAsDataURL(blob); });
      } catch { logoSrc = ''; }
      const html = AVES_FR65_CIKTI.build({ ...baglam, baseUrl: new URL('./', location.href).href, logoSrc });
      reportWindow.document.open();
      reportWindow.document.write(html);
      reportWindow.document.close();
      // Satır içi olay işleyicileri CSP ile engellenir; düğmeler açan pencereden bağlanır.
      try {
        const doc = reportWindow.document;
        const printButton = doc.getElementById('aves-print');
        if (printButton) printButton.addEventListener('click', () => reportWindow.print());
        const bigButton = doc.getElementById('aves-big');
        if (bigButton) {
          const apply = on => { doc.documentElement.classList.toggle('big-text', on); bigButton.setAttribute('aria-pressed', on ? 'true' : 'false'); };
          let on = false;
          try { on = localStorage.getItem('aves_cikti_buyuk_yazi') === '1'; } catch { on = false; }
          apply(on);
          bigButton.addEventListener('click', () => {
            on = !on; apply(on);
            try { localStorage.setItem('aves_cikti_buyuk_yazi', on ? '1' : '0'); } catch { /* kalıcılık isteğe bağlı */ }
          });
        }
      } catch (error) { console.warn('Çıktı düğmeleri bağlanamadı', error); }
      reportWindow.focus();
      // Yazı tipleri yüklenmeden yazdırma penceresi açılırsa çıktı yedek yazı tipiyle basılır; en çok 3 sn beklenir.
      Promise.race([
        reportWindow.document.fonts ? reportWindow.document.fonts.ready : Promise.resolve(),
        new Promise(resolve => setTimeout(resolve, 3000)),
      ]).catch(() => {}).then(() => { try { reportWindow.print(); } catch {} });
    } catch (error) {
      console.error('FR.65 çıktı oluşturulamadı', error);
      try { reportWindow.close(); } catch {}
      toast('FR.65 çıktısı oluşturulamadı; denetim verisi korunuyor');
    } finally { printAction.disabled = false; }
  };
  const restoreDraft = document.getElementById('fr65RestoreDraft');
  if (restoreDraft) restoreDraft.onclick = async event => {
    event.currentTarget.disabled = true;
    try {
      if (!confirm('Bu cihazdaki FR.65 taslağı, ekranda gösterilen güncel FR.65 değerlerinin yerine yazılacak ve denetim geçmişine kaydedilecek. Geri yükleyelim mi?')) return;
      const latest = await DB.get('denetimler', d.id);
      const freshDraft = AVES_FORM_DRAFT_JOURNAL.readFr65Capture(localStorage, d.id, API.email);
      if (!latest || !fr65SahaKaydiMi(latest) || !canEditDenetim(latest) ||
          String(latest.updated_at || '') !== String(d.updated_at || '') ||
          !freshDraft || freshDraft.ts !== ownCaptureDraft?.ts ||
          freshDraft.writerId !== ownCaptureDraft?.writerId ||
          freshDraft.payload?.saha_veri_akisi !== 'fr65_saha_v1') {
        toast('Kayıt veya cihaz taslağı bu sırada değişmiş. Hiçbir veri ezilmedi; ekranı yenileyip yeniden kontrol edin.');
        await renderFr65SahaKaydi(await DB.get('denetimler', d.id));
        return;
      }
      const restored = AVES_DENETIM_FORM_SETI.normalize(freshDraft.payload, latest.teknik_dosya_kayitlari);
      const expectedUpdatedAt = latest.updated_at;
      const next = AVES_DENETIM_FORM_SETI.normalize(latest.denetim_form_kayitlari, latest.teknik_dosya_kayitlari);
      next.saha_veri_akisi = 'fr65_saha_v1';
      next.source_form = 'ÜB.FR.65';
      next.source_revision = AVES_TEKNIK_DOSYA_FORM.FR65.revision;
      next.forms.FR65 = { ...(next.forms.FR65 || {}), values: restored.forms.FR65?.values || {} };
      const now = new Date().toISOString();
      next.updated_at = now;
      latest.denetim_form_kayitlari = next;
      latest.teknik_dosya_kayitlari = { schema_version: 1, updated_at: now, fr65: next.forms.FR65 };
      latest.updated_at = now;
      await localWrite('denetimler', latest, 'denetimler', {
        conditional_update: {
          expected_updated_at: expectedUpdatedAt,
          fields: ['denetim_form_kayitlari', 'teknik_dosya_kayitlari', 'updated_at'],
        },
      });
      AVES_FORM_DRAFT_JOURNAL.clearFr65CaptureIfOwner(localStorage, d.id, API.email, freshDraft.ts, freshDraft.writerId || null);
      toast('Cihazdaki FR.65 taslağı geri yüklendi ve denetim geçmişine kaydedildi');
      await showDenetim(d.id);
    } catch (error) {
      console.warn('FR.65 cihaz taslağı geri yüklenemedi; taslak korundu', error);
      toast(error.message || 'Taslak geri yüklenemedi; cihazdaki kopya korundu');
    } finally {
      if (document.getElementById('fr65RestoreDraft')) document.getElementById('fr65RestoreDraft').disabled = false;
    }
  };
  if (canEdit) {
    app.oninput = event => {
      if (!event.target.matches('[data-fr65-capture-prop]')) return;
      if (event.target.dataset.fr65PreserveLegacy === 'true' && event.target.value.trim()) {
        event.target.dataset.fr65LegacyTouched = 'true';
      }
      editVersion++;
      const version = editVersion;
      updateCaptureConditions();
      updateSummary();
      const next = AVES_DENETIM_FORM_SETI.normalize(normalized);
      next.saha_veri_akisi = 'fr65_saha_v1';
      next.source_form = 'ÜB.FR.65';
      next.source_revision = AVES_TEKNIK_DOSYA_FORM.FR65.revision;
      const draftValues = collectValues();
      next.forms.FR65 = { ...(next.forms.FR65 || {}), values: draftValues };
      next.updated_at = new Date().toISOString();
      const draftTs = Date.now();
      const saved = AVES_FORM_DRAFT_JOURNAL.writeFr65Capture(localStorage, d.id, next, API.email, draftTs, baseUpdatedAt, captureWriterId);
      if (saved) { ownsCaptureDraft = true; lastCaptureDraftTs = draftTs; }
      if (!saved && !draftWarningShown) {
        draftWarningShown = true;
        toast('Taslak cihaz günlüğüne yazılamadı; alanı kaydetmek için bağlantı durumunu kontrol edin');
      }
      status('Taslak cihaz günlüğünde · kaydetme bekleniyor…');
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        saveTimer = null;
        persistValues(version).catch(() => {});
      }, 650);
    };
    app.onchange = event => {
      if (event.target.matches('select[data-fr65-capture-prop]')) updateCaptureConditions();
    };
    document.querySelectorAll('[data-fr65-clear-legacy]').forEach(button => {
      button.onclick = () => {
        const key = button.dataset.fr65ClearLegacy;
        const row = Array.from(document.querySelectorAll('[data-fr65-capture-key]'))
          .find(item => item.dataset.fr65CaptureKey === key);
        const input = row?.querySelector('input[data-fr65-capture-prop="field_value"]');
        if (!input) return;
        input.dataset.fr65LegacyTouched = 'true';
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      };
    });
    document.getElementById('fr65SaveNow').onclick = async event => {
      // currentTarget await sonrasında null olur; düğmeyi önce yakala.
      const button = event.currentTarget;
      button.disabled = true;
      try { await flushCapture(); }
      catch { /* Draft journal keeps the unsaved values on this device. */ }
      finally { button.disabled = false; }
    };
    document.getElementById('fr65Complete').onclick = async event => {
      event.currentTarget.disabled = true;
      try {
        await flushCapture();
        const latest = await DB.get('denetimler', d.id);
        if (!canEditDenetim(latest)) { toast('Bu kayıt üzerinde değişiklik yetkiniz yok'); return; }
        const latestRecord = AVES_DENETIM_FORM_SETI.normalize(latest.denetim_form_kayitlari, latest.teknik_dosya_kayitlari);
        // Kapatma için zorunlu alan yoktur; zorunluluklar yalnız kaydı açarken istenir.
        const total = AVES_TEKNIK_DOSYA_FORM.countFr65Capture(latestRecord, latest.tahrik_tipi);
        if (!confirm(`${total.recorded}/${total.total} FR.65 alanında veri var. Bu işlem yalnız veri toplama kaydını kapatır; uygunluk veya belgelendirme kararı vermez. Kaydı kapatmak istiyor musunuz?`)) return;
        const now = new Date().toISOString();
        const expectedUpdatedAt = latest.updated_at;
        latest.denetim_durumu = 'Çalışma Tamamlandı';
        latest.calisma_tamamlandi_at = now;
        const integrity = await fr65ButunlukOzetiHesapla(latest, 'Çalışma Tamamlandı');
        latest.butunluk_ozeti = integrity.summary;
        latest.butunluk_hash = integrity.hash;
        latest.butunluk_hesaplandi_at = now;
        latest.updated_at = now;
        await localWrite('denetimler', latest, 'denetimler', {
          conditional_update: {
            expected_updated_at: expectedUpdatedAt,
            fields: ['denetim_durumu', 'calisma_tamamlandi_at', 'butunluk_ozeti', 'butunluk_hash', 'butunluk_hesaplandi_at', 'updated_at'],
          },
        });
        activeFr65Flush = null;
        toast('Saha veri kaydı kapatıldı');
        await fr65OzetiniGoster(latest.id, { onClose: () => showList() });
      } catch (error) {
        toast(error.message || 'Kayıt kapatılamadı; veriler korundu');
      } finally {
        if (document.getElementById('fr65Complete')) document.getElementById('fr65Complete').disabled = false;
      }
    };
  }
  if (canEdit && draftDiffers && draftIsFr65) {
    status('Cihazdaki kaydedilmemiş FR.65 taslağı bulundu · geri yükleniyor…');
    editVersion++;
    persistValues(editVersion).catch(() => {});
  }
}
