// FR.65 saha kayıtlarının güvenli sürüm uzlaştırması ve yazdırılabilir veri özeti.
(function expose(root) {
  'use strict';

  function object(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  function stable(value) {
    if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
    if (value && typeof value === 'object') {
      return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value ?? null);
  }

  function captureProjection(record) {
    const source = object(record);
    const capture = object(object(source.forms).FR65);
    if (source.saha_veri_akisi !== 'fr65_saha_v1' || !capture || !Object.keys(capture).length) return null;
    return {
      saha_veri_akisi: source.saha_veri_akisi,
      source_form: source.source_form || null,
      source_revision: source.source_revision || null,
      values: object(capture.values),
    };
  }

  function sameCapture(left, right) {
    const a = captureProjection(left);
    const b = captureProjection(right);
    return !!a && !!b && stable(a) === stable(b);
  }

  function mergeCapture(serverRecord, submittedRecord) {
    const server = object(serverRecord);
    const submitted = object(submittedRecord);
    const serverForms = object(server.forms);
    const submittedForms = object(submitted.forms);
    if (!submittedForms.FR65) return { ...server };
    return {
      ...server,
      saha_veri_akisi: submitted.saha_veri_akisi,
      source_form: submitted.source_form,
      source_revision: submitted.source_revision,
      updated_at: submitted.updated_at,
      forms: { ...serverForms, FR65: submittedForms.FR65 },
    };
  }

  function mergeTechnicalRecord(serverRecord, submittedRecord, mergedCapture) {
    const server = object(serverRecord);
    const submitted = object(submittedRecord);
    const capture = object(mergedCapture);
    return {
      ...server,
      schema_version: 1,
      updated_at: submitted.updated_at,
      fr65: object(capture.forms).FR65 || object(submitted.forms).FR65,
    };
  }

  function rebaseFollowingUpdates(items, acknowledgedItem, serverUpdatedAt) {
    const clientUpdatedAt = acknowledgedItem?.rows?.[0]?.updated_at;
    const inspectionId = acknowledgedItem?.inspection_id;
    if (!clientUpdatedAt || !inspectionId || !serverUpdatedAt || clientUpdatedAt === serverUpdatedAt) return [];
    const rebased = [];
    for (const item of items || []) {
      const condition = item?.conditional_update;
      if (item.seq <= acknowledgedItem.seq || item.inspection_id !== inspectionId ||
          item.table !== 'denetimler' || !condition || condition.expected_updated_at !== clientUpdatedAt) continue;
      condition.expected_updated_at = serverUpdatedAt;
      if (item.sync_status === 'conflict' && item.last_error_code === 409) {
        item.sync_status = 'retry';
        item.last_error_code = null;
        item.last_error_message = null;
      }
      rebased.push(item);
    }
    return rebased;
  }

  function text(value) {
    return String(value ?? '').trim();
  }

  function buildReport(inspection, values, sections, fieldConditions = {}) {
    const d = object(inspection);
    const formValues = object(values);
    const metadata = [
      ['Müşteri / asansör firması', d.musteri_unvani],
      ['Firma adresi', d.firma_adresi],
      ['Asansörün bulunduğu adres', d.denetim_adresi],
      ['Asansör seri no', d.asansor_seri_no],
      ['Dosya no', d.dosya_no],
      ['Asansör kimlik no', d.asansor_kimlik_no],
      ['Denetim tarihi', d.denetim_tarihi],
      ['Modül', d.modul],
      ['Tahrik tipi', d.tahrik_tipi],
      ['Denetimi yapan', d.denetimi_yapan || d.olusturan_ad],
    ].map(([label, value]) => ({ label, value: text(value) })).filter(item => item.value);

    const reportSections = (sections || []).map(section => {
      const fields = (section.fields || []).flatMap(([key, label, fieldType]) => {
        const condition = fieldConditions[key];
        if (condition && text(formValues[condition.key]?.field_value) !== condition.value) return [];
        const value = object(formValues[key]);
        const isSerial = section.kind === 'serial' || ['serial', 'electric', 'gsm', 'optional_serial'].includes(fieldType);
        const parts = [];
        if (isSerial) {
          const thirdKey = fieldType === 'gsm' ? 'imei' : 'seri_no';
          const thirdLabel = thirdKey === 'imei' ? 'IMEI' : 'Seri no';
          if (fieldType === 'optional_serial' && text(value.var_mi)) parts.push(`Durum: ${text(value.var_mi)}`);
          if (text(value.marka)) parts.push(`Marka / üretici: ${text(value.marka)}`);
          if (text(value.tip)) parts.push(`Tip: ${text(value.tip)}`);
          if (text(value[thirdKey])) parts.push(`${thirdLabel}: ${text(value[thirdKey])}`);
          if (!parts.length && text(value.field_value)) parts.push(text(value.field_value));
          if (!parts.length && text(value.var_mi)) parts.push(text(value.var_mi));
        } else if (text(value.field_value)) {
          parts.push(text(value.field_value));
        }
        if (text(value.note)) parts.push(`Not: ${text(value.note)}`);
        return parts.length ? [{ key, label, value: parts.join(' · ') }] : [];
      });
      return fields.length ? [{ key: section.key, title: section.title, fields }] : [];
    }).flat();

    return {
      title: 'FR.65 Saha Veri Özeti',
      metadata,
      sections: reportSections,
      fieldCount: reportSections.reduce((sum, section) => sum + section.fields.length, 0),
    };
  }

  root.AVES_FR65_SAHA_TOOLS = Object.freeze({
    sameCapture,
    mergeCapture,
    mergeTechnicalRecord,
    rebaseFollowingUpdates,
    buildReport,
  });
})(globalThis);
