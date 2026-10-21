/* ============================================================
   AVES Saha Denetim — denetim formları
   denetimFormuGoster: modül form seti ekranı.
   (Eski UI kapanışının parçasıdır: ui-durum → ui-foto → ui-yonetim → ui-kayit → ui-liste → ui-yeni →
   ui-fr65 → ui-denetim → ui-taslak → ui-form → ui-madde → ui-kapanis → ui-son; ortak global kapsam.)
   ============================================================ */
'use strict';

async function denetimFormuGoster(denetimId = currentDenetimId, forceReadOnly = false) {
  toast('Denetim Formu özelliği bu uygulamadan kaldırıldı. Modül G kayıtları checklist üzerinden yürütülür.');
  return;
  const d = await DB.get('denetimler', denetimId);
  const modul = denetimFormModulu(d);
  if (!d || !modul) return;
  const formLib = AVES_TEKNIK_DOSYA_FORM;
  const setLib = AVES_DENETIM_FORM_SETI;
  const canEdit = !forceReadOnly && denetimId === currentDenetimId && currentCanEdit && !inspectionReadOnly && canEditDenetim(d);
  const originalInspectionUpdatedAt = d.updated_at || null;
  const original = setLib.normalize(d.denetim_form_kayitlari, d.teknik_dosya_kayitlari);
  const ownFormDraft = AVES_FORM_DRAFT_JOURNAL.readForm(localStorage, denetimId, API.email);
  const ownDraftRecord = ownFormDraft
    ? setLib.normalize(ownFormDraft.payload, d.teknik_dosya_kayitlari)
    : null;
  const formDraftConflict = !!(ownFormDraft && ownFormDraft.baseUpdatedAt &&
    String(ownFormDraft.baseUpdatedAt) !== String(originalInspectionUpdatedAt || '') && ownDraftRecord &&
    stableStringify(ownDraftRecord.forms) !== stableStringify(original.forms));
  const legacyOriginal = formLib.normalize({ fr65: original.forms.FR65, rp14: original.forms.RP14 });
  const applicableForms = setLib.formsFor(modul, d.ana_standart, d.tahrik_tipi);
  const formPrefills = {
    FR30: { work_file_no: d.dosya_no, inspection_address: d.denetim_adresi, scope_module_type: d.denetim_turu },
    FR32: { client_name: d.musteri_unvani, inspection_address: d.denetim_adresi, scope: d.modul, audit_type: d.denetim_turu },
    FR47: { capacity: d.beyan_yuku_kg, passenger_capacity: d.kapasite_kisi, speed: d.beyan_hizi_ms, stops: d.durak_sayisi },
    FR48: { capacity: d.beyan_yuku_kg, passenger_capacity: d.kapasite_kisi, speed: d.beyan_hizi_ms, stops: d.durak_sayisi },
    FR50: {
      client_name: d.musteri_unvani, work_file_no: d.dosya_no, installation_address: d.denetim_adresi,
      capacity_load: d.beyan_yuku_kg && d.kapasite_kisi ? `${d.beyan_yuku_kg} kg / ${d.kapasite_kisi} kişi` : '',
      serial_no: d.asansor_seri_no, stops: d.durak_sayisi, speed: d.beyan_hizi_ms,
      suspension: d.aski_tipi, drive_type: [d.tahrik_tipi, d.makine_dairesi_tipi].filter(Boolean).join(' · '),
    },
  };
  const fr65Sections = formLib.visibleFr65Sections(d.tahrik_tipi);
  const disabled = canEdit ? '' : 'disabled';
  const fr65Statuses = ['', 'Eşleşti', 'Fark var', 'Uygulanmaz'];
  const rp14Statuses = ['', 'İncelendi', 'Eksik / açıklama gerekli', 'Uygulanmaz'];
  const makeStatus = (name, value, values) => `<select data-tech-prop="${name}" ${disabled}>
      ${values.map(option => `<option value="${esc(option)}" ${value === option ? 'selected' : ''}>${esc(option || 'Durum seçin')}</option>`).join('')}
    </select>`;
  const makeText = (name, value, placeholder = '', multiline = false, type = 'text') => multiline
    ? `<textarea data-tech-prop="${name}" placeholder="${esc(placeholder)}" ${disabled}>${esc(value || '')}</textarea>`
    : `<input type="${type}" data-tech-prop="${name}" value="${esc(value || '')}" placeholder="${esc(placeholder)}" ${disabled}>`;
  const fieldControl = (field, value, dataAttrs) => {
    const attrs = `${dataAttrs} ${disabled} placeholder="${esc(field.placeholder || '')}"`;
    if (field.type === 'textarea') return `<textarea ${attrs}>${esc(value || '')}</textarea>`;
    if (field.type === 'select') return `<select ${attrs}><option value="">Seçin</option>${(field.options || []).filter(Boolean).map(option => `<option value="${esc(option)}" ${String(value) === option ? 'selected' : ''}>${esc(option)}</option>`).join('')}</select>`;
    return `<input type="${esc(field.type || 'text')}" ${attrs} value="${esc(value ?? '')}">`;
  };
  const genericInput = (code, field, value) => {
    const prefilled = value ?? formPrefills[code]?.[field.key] ?? '';
    return `<label>${esc(field.label)}${fieldControl(field, prefilled, `data-form-code="${esc(code)}" data-form-field="${esc(field.key)}"`)}</label>`;
  };
  const genericRow = (code, group, fields, value = {}) => `<div class="tech-component form-repeat-card" data-form-row-card data-form-code="${esc(code)}" data-form-group="${esc(group)}">
      ${canEdit ? '<button type="button" class="tech-remove form-row-remove" aria-label="Satırı kaldır">×</button>' : ''}
      <div class="tech-component-fields">${fields.map(field => `<label>${esc(field.label)}${fieldControl(field, value[field.key], `data-form-row-field="${esc(field.key)}"`)}</label>`).join('')}</div>
    </div>`;

  const fr65Html = fr65Sections.map((section, index) => `
      <details class="tech-section" ${index === 0 ? 'open' : ''}>
        <summary>${esc(section.title)} <span>${section.fields.length} alan</span></summary>
        <div class="tech-section-body">
          ${section.fields.map(([key, label]) => {
            const value = legacyOriginal.fr65.values[key] || {};
            return `<article class="tech-field" data-tech-fr65="${esc(key)}">
              <b>${esc(label)}</b>
              <div class="tech-pair">
                <label>Teknik dosyadaki değer${makeText('file_value', value.file_value, 'Dosya / çizim / tablo referansı veya beyan edilen değer', true)}</label>
                <label>Sahada görülen / ölçülen / doğrulanan bilgi${makeText('field_value', value.field_value, 'Saha değeri veya gözlem; ölçümse birimiyle birlikte', true)}</label>
              </div>
              <div class="tech-pair tech-status-row">
                <label>Kayıt durumu${makeStatus('status', value.status || '', fr65Statuses)}</label>
                <label>Açıklama / kanıt referansı${makeText('note', value.note, 'Örn. fotoğraf adı, çizim no veya fark açıklaması', true)}</label>
              </div>
            </article>`;
          }).join('')}
        </div>
      </details>`).join('');

  const rp14 = legacyOriginal.rp14;
  const rp14ChecksHtml = formLib.RP14.reviewSections.map((section, index) => `
      <details class="tech-section" ${index === 0 ? 'open' : ''}>
        <summary>${esc(section.title)} <span>${section.items.length} kayıt</span></summary>
        <div class="tech-section-body">
          ${section.items.map(([key, label]) => {
            const value = rp14.checks[key] || {};
            return `<article class="tech-check" data-tech-check="${esc(key)}">
              <b>${esc(label)}</b>
              <div class="tech-pair">
                <label>İnceleme kaydı${makeStatus('status', value.status || '', rp14Statuses)}</label>
                <label>Dosya / sayfa / not${makeText('evidence', value.evidence, 'Kısa kanıt veya açıklama', true)}</label>
              </div>
            </article>`;
          }).join('')}
        </div>
      </details>`).join('');
  const characteristicHtml = formLib.RP14.characteristics.map(([key, label]) => `
      <label class="tech-characteristic">${esc(label)}<input data-tech-characteristic="${esc(key)}" value="${esc(rp14.characteristics[key] || '')}" placeholder="Beyan edilen değer / varyant farkı" ${disabled}></label>`).join('');
  const instrumentHtml = formLib.RP14.instruments.map(([key, label]) => {
    const value = rp14.instruments[key] || {};
    return `<article class="tech-instrument" data-tech-instrument="${esc(key)}">
        <b>${esc(label)}</b><div class="tech-pair">
          <label>Seri / kimlik no${makeText('serial_no', value.serial_no, 'Cihaz seri numarası')}</label>
          <label>Kalibrasyon tarihi${makeText('calibration_date', value.calibration_date, '', false, 'date')}</label>
          <label>Kalibrasyon sertifika no${makeText('certificate_no', value.certificate_no, 'Sertifika numarası')}</label>
        </div>
      </article>`;
  }).join('');
  const componentFields = (value, safety) => `
      <label>Model / varyant kodları${makeText('variants', value.variants, 'İlgili model veya varyant kodları')}</label>
      <label>Üretici / imalatçı${makeText('manufacturer', value.manufacturer, 'Üretici adı')}</label>
      <label>Tip / model${makeText('type', value.type, 'Bileşen tipi / modeli')}</label>
      <label>Seri numarası${makeText('serial_no', value.serial_no, 'Etiketteki seri numarası')}</label>
      ${safety ? `<label>Tip inceleme sertifika no${makeText('certificate_no', value.certificate_no, 'Varsa sertifika numarası')}</label>
        <label>Onaylanmış kuruluş no${makeText('notified_body', value.notified_body, 'Varsa kuruluş numarası')}</label>` : ''}
      <label>Uyumluluk / dosya referansı${makeText('compatibility_note', value.compatibility_note, 'Teknik dosya referansı veya gözlem')}</label>`;
  const componentCards = (key, label, safety) => {
    const [area, itemKey] = key.split(':');
    const list = Array.isArray(rp14[area] && rp14[area][itemKey]) && rp14[area][itemKey].length ? rp14[area][itemKey] : [{}];
    return `<section class="tech-component-group" data-tech-component-list="${key}">
        <div class="tech-component-head"><b>${esc(label)}</b>${canEdit ? `<button type="button" class="tech-add" data-tech-add-component="${key}" data-tech-kind="${safety ? 'safety' : 'other'}">+ Ekle</button>` : ''}</div>
        ${list.map((value, index) => `<article class="tech-component" data-tech-component="${key}" data-tech-index="${index}">
          ${canEdit && list.length > 1 ? '<button type="button" class="tech-remove" aria-label="Bileşen kaydını kaldır">×</button>' : ''}
          <div class="tech-component-fields">${componentFields(value || {}, safety)}</div>
        </article>`).join('')}
      </section>`;
  };
  const safetyComponentsHtml = formLib.RP14.safetyComponents.map(([key, label]) => componentCards(`safety_components:${key}`, label, true)).join('');
  const otherComponentsHtml = formLib.RP14.otherComponents.map(([key, label]) => componentCards(`other_components:${key}`, label, false)).join('');

  const genericFormsHtml = applicableForms.map((definition, index) => {
    const entry = original.forms[definition.key] || {};
    if (definition.special === 'legacyFR65') return `<details class="tech-section" data-form-section="FR65" ${index === 0 ? 'open' : ''}>
        <summary>ÜB.FR.65 · ${esc(definition.title)} <span>${fr65Sections.reduce((total, section) => total + section.fields.length, 0)} alan</span></summary>
        <div class="tech-section-body"><p class="photo-help">Her satıra dosyadaki beyanı, sahada görülen/ölçülen değeri ve kanıt referansını yazın. Otomatik karşılaştırma yapılmaz.</p>${fr65Html}</div>
      </details>`;
    if (definition.special === 'legacyRP14') return `<details class="tech-section" data-form-section="RP14">
        <summary>ÜB.RP.14 · ${esc(definition.title)} <span>Modül B</span></summary>
        <div class="tech-section-body">
          ${rp14ChecksHtml}
          <details class="tech-section"><summary>Model ve varyant özellikleri</summary><div class="tech-section-body"><div class="tech-characteristics">${characteristicHtml}</div></div></details>
          <details class="tech-section"><summary>Güvenlik bileşenleri</summary><div class="tech-section-body">${safetyComponentsHtml}</div></details>
          <details class="tech-section"><summary>Diğer ana bileşenler</summary><div class="tech-section-body">${otherComponentsHtml}</div></details>
          <details class="tech-section"><summary>C.1 Muayene cihazları ve kalibrasyon</summary><div class="tech-section-body">${instrumentHtml}</div></details>
          <details class="tech-section"><summary>C.2.4 Sapma ve saha doğrulama notu</summary><div class="tech-section-body"><label class="tech-characteristic">Sapmalar / yerinde doğrulanan çözümler${makeText('deviations', rp14.deviations, 'Gözlem ve dosya referansını yazın', true)}</label></div></details>
          <p class="photo-help">RP.14’ün resmî sonuç / belgelendirme önerisi bölümü bu ekrana alınmamıştır.</p>
        </div>
      </details>`;
    const fieldHtml = (definition.fields || []).map(field => genericInput(definition.key, field, entry.fields?.[field.key])).join('');
    const afterRatingsHtml = (definition.fieldsAfterRatings || []).map(field => genericInput(definition.key, field, entry.fields?.[field.key])).join('');
    const ratingsHtml = (definition.ratings || []).map(([key, label]) => `<label class="tech-characteristic">${esc(label)}<select data-form-code="${esc(definition.key)}" data-form-rating="${esc(key)}" ${disabled}><option value="">Puan seçin</option>${[1, 2, 3, 4, 5].map(score => `<option value="${score}" ${String(entry.ratings?.[key] ?? '') === String(score) ? 'selected' : ''}>${score}</option>`).join('')}</select></label>`).join('');
    const checksHtml = (definition.checklistSections || []).map(section => `<details class="tech-section" ${definition.checklistSections.length === 1 ? 'open' : ''}>
        <summary>${esc(section.title)} <span>${section.items.length} kayıt</span></summary><div class="tech-section-body">
          ${section.items.map(check => {
            const value = entry.items?.[section.key]?.[check.key] || {};
            return `<article class="tech-check" data-form-check-row data-form-code="${esc(definition.key)}" data-form-section-key="${esc(section.key)}" data-form-item-key="${esc(check.key)}"><b>${esc(check.label)}</b>
              <div class="tech-pair"><label>Kayıt durumu<select data-form-item-status ${disabled}>${setLib.FORM_STATUS_OPTIONS.map(option => `<option value="${esc(option)}" ${value.status === option ? 'selected' : ''}>${esc(option || 'Durum seçin')}</option>`).join('')}</select></label>
              <label>Belge / kanıt referansı<input data-form-item-reference value="${esc(value.reference || '')}" ${disabled}></label></div>
              <label>Açıklama / not<textarea data-form-item-note ${disabled}>${esc(value.note || '')}</textarea></label>
            </article>`;
          }).join('')}
        </div></details>`).join('');
    const repeatersHtml = (definition.repeaters || []).map(group => {
      const rows = Array.isArray(entry.rows?.[group.key]) && entry.rows[group.key].length ? entry.rows[group.key] : [{}];
      return `<section class="tech-component-group" data-form-repeater="${esc(definition.key)}:${esc(group.key)}">
          <div class="tech-component-head"><b>${esc(group.title)}</b>${canEdit ? `<button type="button" class="tech-add" data-form-add-row data-form-code="${esc(definition.key)}" data-form-group="${esc(group.key)}">+ Satır ekle</button>` : ''}</div>
          ${rows.map(row => genericRow(definition.key, group.key, group.fields, row)).join('')}
        </section>`;
    }).join('');
    const content = definition.special === 'mainChecklist'
      ? `<div class="photo-help">${esc(definition.description)} Sonuç ve madde notları mevcut denetim checklist’inde tutulur.</div>`
      : `${fieldHtml ? `<div class="tech-component-fields">${fieldHtml}</div>` : ''}${ratingsHtml ? `<h4>Değerlendirme puanları</h4><div class="tech-characteristics">${ratingsHtml}</div>` : ''}${afterRatingsHtml ? `<div class="tech-component-fields">${afterRatingsHtml}</div>` : ''}${checksHtml}${repeatersHtml}`;
    return `<details class="tech-section" data-form-section="${esc(definition.key)}" ${index === 0 ? 'open' : ''}>
        <summary>ÜB.${esc(definition.key)} · ${esc(definition.title)} <span>${setLib.formHasData(original, definition.key) ? 'kayıt var' : 'kayıt yok'}</span></summary>
        <div class="tech-section-body"><p class="photo-help">${esc(definition.description)}</p>${content}</div>
      </details>`;
  }).join('');

  const ov = document.createElement('div');
  ov.className = 'overlay tech-overlay';
  ov.innerHTML = `<div class="modal tech-modal">
      <div class="tech-modal-head"><div><h3>Modül ${modul} · Denetim Formu</h3>
        <small>${esc(d.musteri_unvani)} · ${esc(d.asansor_seri_no)}</small></div>
        <button class="close" aria-label="Kapat">×</button></div>
      <div class="photo-help">Bu ekran, modülün form setinde istenen saha verilerini bir arada kaydeder. Resmî formların, teknik incelemenin veya uygunluk / belgelendirme kararının yerine geçmez; uygulama otomatik hesap ya da karar üretmez.</div>
      ${formDraftConflict ? '<div class="integrity-card error"><b>Bu cihazda eski bir form taslağı korunuyor</b><small>Denetim başka bir oturumda değiştiği için taslak otomatik uygulanmadı. Güncel kayıt aşağıda; kaydetmek veya taslağı silerek kapatmak eski yerel taslağı kaldırır.</small></div>' : ''}
      <div class="integrity-card pending"><b>Kaynak revizyonu teyidi gerekli</b><small>${esc(setLib.referenceWarning)}</small></div>
      ${modul === 'E' ? '<div class="integrity-card pending"><b>FR.65 isteğe bağlı saha desteği</b><small>E modülünün mevcut gözetim form setinde FR.65 zorunlu olarak işaretli değildir; bu kayıt kullanıcı tercihiyle eklenen destek alanıdır.</small></div>' : ''}
      <div class="tech-source"><b>Bu denetimin form seti</b><span>${applicableForms.map(definition => `ÜB.${definition.key}`).join(' · ')}</span><small>${modul === 'G' ? 'FR.38 / FR.39 sonuçları ana checklist’te tutulur; burada ikinci bir sonuç listesi açılmaz.' : 'Bu modülde G tipi ana checklist kullanılmaz; saha bilgileri form seti ve ilgili saha kayıt alanlarında tutulur.'}</small></div>
      ${genericFormsHtml}
      ${canEdit ? '<button class="btn btn-primary tech-save" id="denetimFormSave">Denetim formu kayıtlarını kaydet</button>' : '<button class="btn btn-primary" id="denetimFormClose">Kapat</button>'}
    </div>`;
  document.body.appendChild(ov);

  const componentRecordHtml = (key, kind) => {
    const safety = kind === 'safety';
    const labels = formLib.RP14[safety ? 'safetyComponents' : 'otherComponents'];
    const label = (labels.find(item => item[0] === key) || [key, key])[1];
    const target = safety ? 'safety_components' : 'other_components';
    return `<article class="tech-component" data-tech-component="${target}:${key}">
        <button type="button" class="tech-remove" aria-label="Bileşen kaydını kaldır">×</button>
        <b>${esc(label)}</b><div class="tech-component-fields">${componentFields({}, safety)}</div>
      </article>`;
  };
  const collectLegacy = () => {
    const next = formLib.normalize(legacyOriginal);
    ov.querySelectorAll('[data-tech-fr65]').forEach(row => {
      const value = {};
      row.querySelectorAll('[data-tech-prop]').forEach(input => { value[input.dataset.techProp] = input.value.trim(); });
      if (Object.values(value).some(Boolean)) next.fr65.values[row.dataset.techFr65] = value;
      else delete next.fr65.values[row.dataset.techFr65];
    });
    if (applicableForms.some(definition => definition.key === 'RP14')) {
      ov.querySelectorAll('[data-tech-check]').forEach(row => {
        const value = {};
        row.querySelectorAll('[data-tech-prop]').forEach(input => { value[input.dataset.techProp] = input.value.trim(); });
        if (Object.values(value).some(Boolean)) next.rp14.checks[row.dataset.techCheck] = value;
        else delete next.rp14.checks[row.dataset.techCheck];
      });
      ov.querySelectorAll('[data-tech-characteristic]').forEach(input => {
        const value = input.value.trim();
        if (value) next.rp14.characteristics[input.dataset.techCharacteristic] = value;
        else delete next.rp14.characteristics[input.dataset.techCharacteristic];
      });
      ov.querySelectorAll('[data-tech-instrument]').forEach(row => {
        const value = {};
        row.querySelectorAll('[data-tech-prop]').forEach(input => { value[input.dataset.techProp] = input.value.trim(); });
        if (Object.values(value).some(Boolean)) next.rp14.instruments[row.dataset.techInstrument] = value;
        else delete next.rp14.instruments[row.dataset.techInstrument];
      });
      ['safety_components', 'other_components'].forEach(area => {
        next.rp14[area] = {};
        ov.querySelectorAll(`[data-tech-component^="${area}:"]`).forEach(card => {
          const key = card.dataset.techComponent.slice(area.length + 1);
          const value = {};
          card.querySelectorAll('[data-tech-prop]').forEach(input => { value[input.dataset.techProp] = input.value.trim(); });
          if (Object.values(value).some(Boolean)) {
            if (!next.rp14[area][key]) next.rp14[area][key] = [];
            next.rp14[area][key].push(value);
          }
        });
      });
      const deviations = ov.querySelector('[data-tech-prop="deviations"]');
      next.rp14.deviations = deviations ? deviations.value.trim() : next.rp14.deviations;
    }
    return next;
  };
  const collectAll = () => {
    const next = setLib.normalize(original);
    const legacy = collectLegacy();
    next.forms.FR65 = legacy.fr65;
    next.forms.RP14 = legacy.rp14;
    applicableForms.forEach(definition => {
      if (definition.special) return;
      const entry = next.forms[definition.key] || { fields: {}, items: {}, ratings: {}, rows: {} };
      entry.fields = entry.fields || {}; entry.items = entry.items || {}; entry.ratings = entry.ratings || {}; entry.rows = entry.rows || {};
      (definition.fields || []).concat(definition.fieldsAfterRatings || []).forEach(field => {
        const input = [...ov.querySelectorAll('[data-form-field]')].find(node => node.dataset.formCode === definition.key && node.dataset.formField === field.key);
        const value = input ? input.value.trim() : '';
        const savedValue = original.forms[definition.key]?.fields?.[field.key];
        const defaultValue = formPrefills[definition.key]?.[field.key];
        if (value && ((savedValue != null && savedValue !== '') || value !== String(defaultValue ?? ''))) entry.fields[field.key] = value;
        else delete entry.fields[field.key];
      });
      (definition.ratings || []).forEach(([key]) => {
        const input = [...ov.querySelectorAll('[data-form-rating]')].find(node => node.dataset.formCode === definition.key && node.dataset.formRating === key);
        const value = input ? input.value : '';
        if (value) entry.ratings[key] = value; else delete entry.ratings[key];
      });
      (definition.checklistSections || []).forEach(section => {
        entry.items[section.key] = entry.items[section.key] || {};
        section.items.forEach(item => {
          const row = [...ov.querySelectorAll('[data-form-check-row]')].find(node => node.dataset.formCode === definition.key && node.dataset.formSectionKey === section.key && node.dataset.formItemKey === item.key);
          const value = row ? {
            status: row.querySelector('[data-form-item-status]')?.value || '',
            reference: row.querySelector('[data-form-item-reference]')?.value.trim() || '',
            note: row.querySelector('[data-form-item-note]')?.value.trim() || '',
          } : {};
          if (Object.values(value).some(Boolean)) entry.items[section.key][item.key] = value;
          else delete entry.items[section.key][item.key];
        });
        if (!Object.keys(entry.items[section.key]).length) delete entry.items[section.key];
      });
      (definition.repeaters || []).forEach(group => {
        const rows = [...ov.querySelectorAll('[data-form-row-card]')]
          .filter(card => card.dataset.formCode === definition.key && card.dataset.formGroup === group.key)
          .map(card => Object.fromEntries([...card.querySelectorAll('[data-form-row-field]')].map(input => [input.dataset.formRowField, input.value.trim()]).filter(([, value]) => value)));
        if (rows.length) entry.rows[group.key] = rows; else delete entry.rows[group.key];
      });
      next.forms[definition.key] = entry;
    });
    return setLib.normalize(next);
  };
  let closing = false;
  let formDraftWarningShown = false;
  const formDraftFields = '[data-tech-prop],[data-tech-characteristic],[data-form-field],[data-form-rating],[data-form-item-status],[data-form-item-reference],[data-form-item-note],[data-form-row-field]';
  const writeFormDraft = () => {
    if (!canEdit) return true;
    const next = collectAll();
    if (stableStringify(next) === stableStringify(original)) {
      // Alanı eski değere döndürmek, çakışmalı bir taslağı açık onay olmadan
      // silemez; bu durumda yalnız save/close onay akışı temizleyebilir.
      if (!formDraftConflict) AVES_FORM_DRAFT_JOURNAL.clearFormIfOwner(localStorage, denetimId, API.email);
      return true;
    }
    next.form_seti_gozden_gecirildi_at = null;
    next.form_seti_gozden_geciren_email = null;
    next.form_seti_gozden_geciren_ad = null;
    next.updated_at = new Date().toISOString();
    const saved = AVES_FORM_DRAFT_JOURNAL.writeForm(localStorage, denetimId, next, API.email, Date.now(), originalInspectionUpdatedAt);
    if (!saved && !formDraftWarningShown) {
      formDraftWarningShown = true;
      toast('Acil form taslağı cihaza yazılamadı; Kaydet düğmesine basıp kaydın tamamlandığını bekleyin');
    } else if (saved) formDraftWarningShown = false;
    return saved;
  };
  ov.addEventListener('input', event => { if (event.target.matches(formDraftFields)) writeFormDraft(); });
  ov.addEventListener('change', event => { if (event.target.matches(formDraftFields)) writeFormDraft(); });
  const close = async (force = false) => {
    if (closing) return;
    const changed = stableStringify(collectAll()) !== stableStringify(original);
    if (canEdit && formDraftConflict && !confirm(force && changed
      ? 'Bu denetim başka bir oturumda değişmiş ve eski cihaz taslağı korunuyor. Açık ekrandaki güncel kaydı kaydetmek eski taslağı silecek. Devam edilsin mi?'
      : 'Bu denetim başka bir oturumda değişmiş ve eski cihaz taslağı korunuyor. Kapatmak eski taslağı silecek. Devam edilsin mi?')) return;
    if (canEdit && changed && !force && !confirm('Kaydedilmemiş denetim formu kayıtları var. Kaydetmeden kapatılsın mı?')) return;
    if (force && changed) {
      const next = collectAll();
      const now = new Date().toISOString();
      next.updated_at = now;
      next.form_seti_gozden_gecirildi_at = null;
      next.form_seti_gozden_geciren_email = null;
      next.form_seti_gozden_geciren_ad = null;
      d.denetim_form_kayitlari = next;
      // Önceki FR.65/RP.14 alanı kullanan yerel sürümler için geriye uyumlu ayna.
      d.teknik_dosya_kayitlari = { schema_version: 1, updated_at: now, fr65: next.forms.FR65, rp14: next.forms.RP14 };
      d.updated_at = now;
      closing = true;
      const save = ov.querySelector('#denetimFormSave');
      if (save) { save.disabled = true; save.textContent = 'Kaydediliyor…'; }
      try {
        await localWrite('denetimler', d, 'denetimler');
        AVES_FORM_DRAFT_JOURNAL.clearFormIfOwner(localStorage, denetimId, API.email);
        const button = document.getElementById('btnDenetimFormu');
        const stats = denetimFormIstatistikleri(d);
        if (button && stats) button.textContent = `📄 Denetim Formu${stats.ozet.started ? ` · ${stats.ozet.started} formda kayıt` : ''}`;
        ov.remove();
        toast('Denetim formu kayıtları cihaza kaydedildi');
        const rows = denetimId === currentDenetimId ? await DB.allByIndex('saha', 'byDenetim', denetimId) : [];
        if (denetimId === currentDenetimId && formOdakliDenetimMi(d, rows)) await renderDenetim();
      } catch (error) {
        closing = false;
        if (save) { save.disabled = false; save.textContent = 'Denetim formu kayıtlarını kaydet'; }
        console.error('Denetim formu kaydı başarısız', error);
        toast('Kayıt cihazda tamamlanamadı; ekran açık bırakıldı');
      }
      return;
    }
    // Salt-okunur modalın kapatılması başka bir kullanıcının kurtarılabilir
    // taslağına dokunmamalı. Düzenleyebilir kullanıcı da yalnız kendi
    // taslağını discard/revert sırasında temizleyebilir.
    if (canEdit) AVES_FORM_DRAFT_JOURNAL.clearFormIfOwner(localStorage, denetimId, API.email);
    ov.remove();
  };
  ov.addEventListener('click', event => {
    const add = event.target.closest('[data-tech-add-component]');
    if (add) {
      const area = add.dataset.techAddComponent;
      const kind = add.dataset.techKind;
      const key = add.dataset.techComponentKey || '';
      const list = ov.querySelector(`[data-tech-component-list="${area}:${key}"]`);
      if (list) { list.insertAdjacentHTML('beforeend', componentRecordHtml(key, kind)); writeFormDraft(); }
    }
    const addRow = event.target.closest('[data-form-add-row]');
    if (addRow) {
      const definition = applicableForms.find(item => item.key === addRow.dataset.formCode);
      const group = (definition?.repeaters || []).find(item => item.key === addRow.dataset.formGroup);
      const list = ov.querySelector(`[data-form-repeater="${addRow.dataset.formCode}:${addRow.dataset.formGroup}"]`);
      if (group && list) { list.insertAdjacentHTML('beforeend', genericRow(definition.key, group.key, group.fields)); writeFormDraft(); }
    }
    const remove = event.target.closest('.tech-remove');
    if (remove) {
      const card = remove.closest('.tech-component');
      if (card) { card.remove(); writeFormDraft(); }
    }
  });
  ov.querySelectorAll('[data-tech-add-component]').forEach(button => {
    const value = button.dataset.techAddComponent.split(':');
    button.dataset.techComponentKey = value[1] || '';
    button.dataset.techAddComponent = value[0];
  });
  ov.querySelector('.close').onclick = () => close();
  ov.onclick = event => { if (event.target === ov) close(); };
  const save = ov.querySelector('#denetimFormSave');
  if (save) save.onclick = () => close(true);
  const closeButton = ov.querySelector('#denetimFormClose');
  if (closeButton) closeButton.onclick = () => close();
}
