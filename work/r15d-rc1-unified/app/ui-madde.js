/* ============================================================
   AVES Saha Denetim — madde kartları ve kayıt
   Madde HTML, olay bağlama, kaydetme, adım ilerletme, bütünlük özeti.
   (Eski UI kapanışının parçasıdır: ui-durum → ui-foto → ui-yonetim → ui-kayit → ui-liste → ui-yeni →
   ui-fr65 → ui-denetim → ui-taslak → ui-form → ui-madde → ui-kapanis → ui-son; ortak global kapsam.)
   ============================================================ */
'use strict';

function gorselHTML(r) {
  const files = gorselDosyalari(r.gorsel_referansi);
  if (!files.length) return '';
  const aciklama = (r.gorsel_referansi || '').split('—').slice(1).join('—').trim();
  return `<details class="mvisual">
      <summary>Şekil / çizelgeyi aç</summary>
      ${aciklama ? `<div class="mvisual-note">${esc(aciklama)}</div>` : ''}
      ${files.map(f => `<img src="referans-gorseller/${esc(f)}" alt="${esc(aciklama || 'Standart referans görseli')}" loading="lazy">`).join('')}
    </details>`;
}

function olcumTanimlari(r) {
  if (Array.isArray(r.olcum_tanimlari) && r.olcum_tanimlari.length) return r.olcum_tanimlari;
  const legacy = [];
  const belirsizEtiket = (value) => ['Ölçü 1', 'Ölçü 2', 'Ölçülen değer'].includes((value || '').trim());
  // R6 çıkarımından kalan belirsiz alanlar yeni denetimde gösterilmez. Eski bir
  // denetimde değer girilmişse geçmiş kaydı erişilebilir tutmak için gösterilir.
  if (r.olcu1_adi && (!belirsizEtiket(r.olcu1_adi) || r.olcu1_degeri != null)) {
    legacy.push({ id: 'olcu1', etiket: r.olcu1_adi, birim: r.olcu1_birimi || null, tur: 'sayi' });
  }
  if (r.olcu2_adi && (!belirsizEtiket(r.olcu2_adi) || r.olcu2_degeri != null)) {
    legacy.push({ id: 'olcu2', etiket: r.olcu2_adi, birim: r.olcu2_birimi || null, tur: 'sayi' });
  }
  return legacy;
}

function olcumDegeri(r, tanim) {
  const values = r.olcum_degerleri && typeof r.olcum_degerleri === 'object' ? r.olcum_degerleri : {};
  if (values[tanim.id] != null) return values[tanim.id];
  if (tanim.id === 'olcu1') return r.olcu1_degeri || '';
  if (tanim.id === 'olcu2') return r.olcu2_degeri || '';
  return '';
}

function olcumHTML(r) {
  const defs = olcumTanimlari(r);
  if (!defs.length) return '';
  return `<div class="olcumler"><div class="olcum-baslik">Saha ölçüleri <span>opsiyonel</span></div>
      <div class="olcu-row">${defs.map(def => {
        const label = ['Ölçü 1', 'Ölçülen değer'].includes(def.etiket) ? 'Ölçülen değer' : def.etiket;
        const value = olcumDegeri(r, def);
        const ref = def.referans_metni ? `<div class="olcum-ref"><b>Referans:</b> ${esc(def.referans_metni)}</div>` : '';
        if (def.tur === 'secim' && Array.isArray(def.secenekler)) {
          return `<div class="olcu"><label>${esc(label)}${def.birim ? ` (${esc(def.birim)})` : ''}</label>
            <select data-olcum-id="${esc(def.id)}" ${currentCanEdit ? '' : 'disabled'}><option value="">—</option>${def.secenekler.map(o => `<option value="${esc(o)}" ${String(value) === String(o) ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>${ref}</div>`;
        }
        const inputmode = def.tur === 'metin' ? 'text' : 'decimal';
        return `<div class="olcu"><label>${esc(label)}${def.birim ? ` (${esc(def.birim)})` : ''}</label>
          <input data-olcum-id="${esc(def.id)}" value="${esc(value)}" inputmode="${inputmode}" placeholder="—" ${currentCanEdit ? '' : 'disabled'}>${ref}</div>`;
      }).join('')}</div></div>`;
}

function maddeHTML(r) {
  const durum = effectiveDurum(r);
  const cls = durum ? 's-' + DURUM_CSS[durum] : '';
  const tasarim = r.kaynak_turu === 'Ek Mühendislik';
  const avesMuhendislik = tasarim;
  const olcumKaydi = r.kaynak_turu === 'Saha Ölçümü';
  const opts = (r.hazir_secenekler || '').split('|').map(o => o.trim()).filter(Boolean);
  const ozelOpts = opts.filter(o => !GENEL_BULGULAR.includes(o));
  const uygunDegil = durum === 'Olumsuz bulgu';
  // Bulgu seçenekleri YALNIZCA Uygun Değil'de ve yalnızca özel seçenek varsa
  const showBulguOpts = uygunDegil && !avesMuhendislik && ozelOpts.length > 0;
  const showUygDegilAciklama = uygunDegil && (avesMuhendislik || ozelOpts.length === 0 || r.bulgu_secenegi === 'Diğer bulgu');
  // Eski 'Veri eksik' kaydı checklist sonucu değildir; iç kontrol notu olarak gösterilir.
  const eskiEksikKaydi = r.durum === 'Veri eksik';
  const icKontrolNotu = r.ic_kontrol_notu || (eskiEksikKaydi ? 'Önceki sürümde Veri eksik olarak işaretlenmişti; üçlü sonuçtan biriyle yeniden değerlendirin.' : '');
  const eskiOtoNot = !!r.otomatik_uygulanmaz && (r.aciklama || '').startsWith('Otomatik işaretlendi:');
  const gosterilenAciklama = eskiOtoNot ? '' : (r.aciklama || '');
  const noteOpen = !!gosterilenAciklama;
  const durumlar = DURUMLAR;
  const durumEtiketleri = DURUM_KISA;
  const baslik = r.kontrol_basligi || '';
  const rehber = rehberMetni(r.denetci_yonlendirmesi || '');
  const resmiMetin = r.resmi_madde_metni || '';
  const ayni = metinlerAyni(baslik, rehber);
  const rehberResmiyleAyni = metinlerAyni(resmiMetin, rehber);
  const hamRehberParca = resmiMetin ? { ana: '', saha: rehberResmiyleAyni ? '' : rehber } : splitRehber(rehber);
  const kaynakEtiketi = [r.kaynak_form_kodu, r.kaynak_form_revizyonu].filter(Boolean).join(' ');
  // Başlık kısa/kalıtsal görünse bile kalın gösterilen alan hep başlıktır;
  // resmi metin ve rehber gövdesi hep normal punto ile ayrı gösterilir.
  // Böylece uzun bir resmi madde metni yanlışlıkla tek bir kalın blok
  // olarak basılmaz (göz yorması ve okunabilirlik sorununa yol açardı).
  const gosterilenBaslik = baslik;
  const gosterilenResmiMetin = resmiMetin;
  const rehberParca = hamRehberParca;
  return `
    <div class="madde ${cls} ${isComplete(r)?'done':''} ${currentCanEdit?'':'readonly'}" data-id="${r.id}">
      <div class="mtop">
        ${tasarim ? '<span class="mtag muh">Tasarım İnceleme</span>' : ''}
        ${olcumKaydi ? '<span class="mtag olcum-tag">Saha Ölçümü</span>' : ''}
        ${r.dogrulama_yontemi ? `<span class="mtag yontem">${esc(r.dogrulama_yontemi)}</span>` : ''}
        <span class="mref">${esc(r.standart_madde_no || '')}</span>
      </div>
      <div class="mtitle">${esc(gosterilenBaslik)}</div>
      ${gosterilenResmiMetin ? `<div class="mrequirement">${esc(gosterilenResmiMetin)}</div>` : ''}
      ${kaynakEtiketi ? `<div class="msource">Kaynak: ${esc(kaynakEtiketi)}</div>` : ''}
      ${ayni && !resmiMetin ? '' : `${rehberParca.ana ? `<div class="mrequirement">${esc(rehberParca.ana)}</div>` : ''}
      ${rehberParca.saha ? `<div class="mguide saha-guide"><span>AVES SAHA REHBERİ</span>${esc(rehberParca.saha)}</div>` : ''}`}
      ${r.aranmaz_kosulu ? `<div class="aranmaz-note"><b>Uygulanmaz koşulu:</b> ${esc(uygulanmazKosuluMetni(r.aranmaz_kosulu))}</div>` : ''}
      ${r.otomatik_uygulanmaz && r.otomatik_gerekce ? `<div class="aranmaz-note"><b>Otomatik Uygulanmaz gerekçesi:</b> ${esc(r.otomatik_gerekce)}</div>` : ''}
      ${r.takip_kaynak_saha_kontrol_id ? `<div class="followup-previous ${r.takip_onceki_durum === 'Olumsuz bulgu' ? 'bad' : ''}">
        <b>Önceki denetim sonucu:</b> ${esc(DURUM_KISA[r.takip_onceki_durum] || r.takip_onceki_durum || 'Sonuç yok')}
        ${r.takip_onceki_bulgu_secenegi ? `<span> · ${esc(r.takip_onceki_bulgu_secenegi)}</span>` : ''}
        ${r.takip_onceki_diger_bulgu || r.takip_onceki_aciklama ? `<small>${esc(r.takip_onceki_diger_bulgu || r.takip_onceki_aciklama)}</small>` : ''}
      </div>` : ''}
      ${gorselHTML(r)}
      ${olcumHTML(r)}
      ${icKontrolNotu ? `<div class="aranmaz-note"><b>İç kontrol notu:</b> ${esc(icKontrolNotu)}</div>` : ''}
      <div class="mstates" style="margin-top:9px">
        ${durumlar.map(du => `<button class="mst ${durum===du ? 'on-'+DURUM_CSS[du] : ''}" data-durum="${esc(du)}" ${(transitioningId===r.id || !currentCanEdit)?'disabled':''}>${durumEtiketleri[du]}</button>`).join('')}
        ${currentCanEdit ? `<button class="notbtn ${gosterilenAciklama ? 'has' : ''}" data-notbtn title="Madde açıklaması">✎</button>` : ''}
      </div>
      ${showBulguOpts ? `<div class="msub"><label>Bulgu</label><div class="bulgu-opts">
        ${ozelOpts.map(o => `<button class="bopt ${r.bulgu_secenegi===o ? 'on' : ''}" data-bulgu="${esc(o)}" ${currentCanEdit?'':'disabled'}>${esc(o)}</button>`).join('')}
        <button class="bopt ${r.bulgu_secenegi==='Diğer bulgu' ? 'on' : ''}" data-bulgu="Diğer bulgu" ${currentCanEdit?'':'disabled'}>Diğer bulgu</button>
      </div><div class="optional-hint">Bulgu seçmeden Sonraki ile devam edebilirsiniz.</div></div>` : ''}
      ${showUygDegilAciklama ? `<div class="msub"><label>Uygunsuzluk açıklaması (opsiyonel)</label>
        <textarea class="diger" data-diger placeholder="Ne görüldü, neresi uygun değil…" ${currentCanEdit?'':'disabled'}>${esc(r.diger_bulgu || '')}</textarea>
        <div class="optional-hint">Açıklama yazmadan Sonraki ile devam edebilirsiniz.</div></div>` : ''}
      <div class="msub ${noteOpen ? '' : 'hidden'}" data-notwrap><label>Madde açıklaması (opsiyonel)</label>
        <textarea class="diger" data-aciklama placeholder="Bu maddeye özel not…" ${currentCanEdit?'':'disabled'}>${esc(gosterilenAciklama)}</textarea></div>
    </div>`;
}

function splitRehber(text) {
  const s = (text || '').trim();
  if (!s) return { ana: '', saha: '' };
  let m = /:\s*-\s+/.exec(s);
  if (m) {
    const colon = m.index + 1;
    return { ana: s.slice(0, colon).trim(), saha: s.slice(m.index + m[0].length).trim() };
  }
  m = /\s+-\s+/.exec(s);
  if (m) return { ana: s.slice(0, m.index).trim(), saha: s.slice(m.index + m[0].length).trim() };
  return { ana: s, saha: '' };
}

function rehberMetni(text) {
  return resmiSonucDili(text || '')
    .replace(/\s+(?:Aranmaz|Uygulanmaz)\s*:[\s\S]*$/i, '')
    .replace(/\s+Bölme\s+deliksizse\s+(?:Aranmaz|Uygulanmaz)\s+seçin\.?$/i, '')
    .replace(/\s+Bu\s+bileşen\s+yoksa\s+maddeyi\s+(?:Aranmaz|Uygulanmaz)\s+olarak\s+değerlendirin\.?$/i, '')
    .replace(/\s+Makara\s+dairesi\s+yoksa\s+(?:Aranmaz|Uygulanmaz)\s+olarak\s+değerlendirin\.?$/i, '')
    .trim();
}

function uygulanmazKosuluMetni(text) {
  let s = (text || '').trim()
    .replace(/\s+sistem\s+(?:Aranmaz|Uygulanmaz)\s+olarak\s+ön\s+işaretler;\s*mühendis\s+değiştirebilir\.?$/i, '')
    .replace(/\s+merdiven\s+için\s+(?:Aranmaz|Uygulanmaz)\.?$/i, '')
    .replace(/\s+ölçü\s+alanları\s+için\s+(?:Aranmaz|Uygulanmaz)\.?$/i, '')
    .replace(/\s+(?:Aranmaz|Uygulanmaz)\.?$/i, '')
    .trim();
  if (s && !/[.!?]$/.test(s)) s += '.';
  return s;
}

function metinlerAyni(a, b) {
  const normalize = (value) => (value || '')
    .replace(/^kontrol:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('tr-TR');
  return !!normalize(a) && normalize(a) === normalize(b);
}

function bindMaddeEvents() {
  const trackEditorEvent = (label, handler) => (event) => {
    trackedEditorWrite(handler(event)).catch(error => {
      console.error(`${label} kaydedilemedi:`, error);
      toast('Değişiklik kaydedilemedi. Lütfen tekrar deneyin.');
    });
  };
  document.getElementById('bolums').addEventListener('input', (e) => {
    if (!currentCanEdit) return;
    // Aynı tuş vuruşu için tek bir zaman damgası: 700ms sonra yazım
    // bitince yalnız BU damgayla eşleşen taslak silinir (bkz. taslakSilEger).
    const ts = Date.now();
    if (e.target.matches('[data-diger],[data-aciklama],[data-olcum-id],[data-bolumnot]')) taslakYaz(e.target, ts);
    if (e.target.matches('[data-diger],[data-aciklama],[data-olcum-id]')) scheduleEditorDraft(e.target, ts);
  });
  document.getElementById('bolums').addEventListener('click', trackEditorEvent('Denetim işlemi', async (e) => {
    const stepBtn = e.target.closest('[data-step]');
    if (stepBtn && !stepBtn.disabled) {
      const b = stepBtn.dataset.b;
      const idx = cursors[b] || 0;
      await moveStep(b, idx, stepBtn.dataset.step === 'next' ? 1 : -1);
      return;
    }
    const mEl = e.target.closest('.madde'); if (!mEl) return;
    const id = mEl.dataset.id;
    const row = await guncelSahaSatiri(id);
    if (!currentCanEdit) {
      toast('Bu denetim salt okunur');
      return;
    }

    const notBtn = e.target.closest('[data-notbtn]');
    if (notBtn) {
      const wrap = mEl.querySelector('[data-notwrap]');
      wrap.classList.toggle('hidden');
      if (!wrap.classList.contains('hidden')) wrap.querySelector('textarea').focus();
      return;
    }
    const durumBtn = e.target.closest('[data-durum]');
    if (durumBtn) {
      if (autoAdvanceTimer) { clearTimeout(autoAdvanceTimer); autoAdvanceTimer = null; transitioningId = null; }
      mEl.querySelectorAll('[data-durum]').forEach(b => { b.disabled = true; });
      const yeni = durumBtn.dataset.durum;
      row.durum = (row.durum === yeni) ? null : yeni;
      row.otomatik_uygulanmaz = false;
      row.otomatik_gerekce = null;
      if (row.durum) {
        row.gozden_gecirme_nedeni = null;
        row.gozden_gecirme_notu = null;
      }
      transitioningId = (!search && filter === 'all' && row.durum === 'Kontrol tamamlandı') ? id : null;
      if (row.durum !== 'Olumsuz bulgu' || row.kaynak_turu === 'Ek Mühendislik') {
        row.bulgu_secenegi = null; row.diger_bulgu = null;
      }
      await save(row, mEl);
      return;
    }
    const bulguBtn = e.target.closest('[data-bulgu]');
    if (bulguBtn) {
      row.bulgu_secenegi = (row.bulgu_secenegi === bulguBtn.dataset.bulgu) ? null : bulguBtn.dataset.bulgu;
      if (row.bulgu_secenegi !== 'Diğer bulgu') row.diger_bulgu = null;
      await save(row, mEl);
      return;
    }
  }));
  document.getElementById('bolums').addEventListener('change', trackEditorEvent('Denetim alanı', async (e) => {
    if (!currentCanEdit) {
      toast('Bu denetim salt okunur');
      await renderDenetim();
      return;
    }
    // bölüm notu
    if (e.target.matches('[data-bolumnot]')) {
      const d = await DB.get('denetimler', currentDenetimId);
      d.bolum_aciklamalari = d.bolum_aciklamalari || {};
      d.bolum_aciklamalari[e.target.dataset.bolumnot] = e.target.value.trim();
      d.updated_at = new Date().toISOString();
      await localWrite('denetimler', d, 'denetimler');
      taslakSil(e.target);
      toast('Bölüm notu kaydedildi');
      return;
    }
    const mEl = e.target.closest('.madde'); if (!mEl) return;
    const row = await guncelSahaSatiri(mEl.dataset.id);
    clearEditorDraft(e.target);
    if (e.target.matches('[data-olcum-id]')) {
      const olcumId = e.target.dataset.olcumId;
      row.olcum_degerleri = row.olcum_degerleri && typeof row.olcum_degerleri === 'object' ? row.olcum_degerleri : {};
      const value = e.target.value.trim();
      if (value) row.olcum_degerleri[olcumId] = value; else delete row.olcum_degerleri[olcumId];
      // Eski iki kolon, eski denetimlerin ve dışa aktarımların geriye uyumluluğu için korunur.
      if (olcumId === 'olcu1') row.olcu1_degeri = value || null;
      if (olcumId === 'olcu2') row.olcu2_degeri = value || null;
      row.guncelleyen_email = API.email;
      row.updated_at = new Date().toISOString();
      await trackedEditorWrite(localWrite('saha_kontrol', row, 'saha'));
      taslakSil(e.target);
      await uygulaOlcumeBagliAranmaz(row);
      await esikOnerisiGoster(row, olcumId, value);
      await renderDenetim();
      return;
    }
    if (e.target.matches('[data-diger]')) {
      row.diger_bulgu = e.target.value.trim() || null;
      await trackedEditorWrite(save(row, mEl));
      taslakSil(e.target);
      return;
    }
    if (e.target.matches('[data-aciklama]')) {
      row.aciklama = e.target.value.trim() || null;
      row.guncelleyen_email = API.email;
      row.updated_at = new Date().toISOString();
      await trackedEditorWrite(localWrite('saha_kontrol', row, 'saha'));
      taslakSil(e.target);
      mEl.querySelector('[data-notbtn]').classList.toggle('has', !!row.aciklama);
      toast('Madde açıklaması kaydedildi');
      return; // açıklama tamamlanmayı etkilemez, otomatik geçiş tetiklenmez
    }
    await save(row, mEl);
  }));
}

function kuralSaglanir(value, rule) {
  // Metinsel eşleşme (ör. kabin tipi seçimi gibi sayısal olmayan ortak
  // değerler) — sayısal ayrıştırmadan önce kontrol edilir.
  if (rule.operator === 'icerir') return String(value).includes(String(rule.deger));
  if (rule.operator === 'icermez') return !String(value).includes(String(rule.deger));
  const n = Number(String(value).replace(',', '.'));
  const limit = Number(rule.deger);
  if (!Number.isFinite(n) || !Number.isFinite(limit)) return false;
  if (rule.operator === '>') return n > limit;
  if (rule.operator === '>=') return n >= limit;
  if (rule.operator === '<') return n < limit;
  if (rule.operator === '<=') return n <= limit;
  if (rule.operator === '=') return n === limit;
  return false;
}

async function esikOnerisiGoster(row, olcumId, value) {
  // Eski eşik alanı yalnız olcu1 ile ilişkilidir. Yapılandırılmış çoklu
  // ölçümlerde eşik-ölçüm bağı açıkça tanımlanmadıkça tahmin yürütülmez.
  if (olcumId !== 'olcu1' || !value || row.durum === 'Olumsuz bulgu') return;
  if (Array.isArray(row.olcum_tanimlari) && row.olcum_tanimlari.length) return;
  if (row.esik_deger == null || !row.esik_operator) return;
  const numericValue = Number(String(value).replace(',', '.'));
  if (!Number.isFinite(numericValue)) return;
  if (kuralSaglanir(value, { operator: row.esik_operator, deger: row.esik_deger })) return;

  const operatorLabels = { '>': '>', '>=': '≥', '<': '<', '<=': '≤', '=': '=' };
  const operatorLabel = operatorLabels[row.esik_operator] || row.esik_operator;
  const unit = row.olcu1_birimi ? ` ${row.olcu1_birimi}` : '';
  const label = row.olcu1_adi || 'Ölçülen değer';
  await new Promise(resolve => {
    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = `<div class="modal">
        <button class="close" aria-label="Kapat">×</button>
        <h3>Ölçüm eşik önerisi</h3>
        <div class="onay-box">
          <div class="onay-satir"><span>${esc(label)}</span><b>${esc(value)}${esc(unit)}</b></div>
          <div class="onay-satir"><span>Kontrol ölçütü</span><b>${esc(operatorLabel)} ${esc(row.esik_deger)}${esc(unit)}</b></div>
        </div>
        <p style="font-size:13px;line-height:1.5;color:var(--muted);margin:0 0 14px">Girilen değer kayıtlı ölçütü karşılamıyor. Bu yalnızca bir öneridir; uygulama sonucu kendiliğinden değiştirmez. Madde metnindeki istisnaları denetçi değerlendirir.</p>
        <button class="btn btn-ghost" id="thresholdIgnore" style="margin-bottom:8px">Yoksay</button>
        <button class="btn btn-primary" id="thresholdReject">Uygun Değil işaretle</button>
      </div>`;
    document.body.appendChild(ov);
    let finished = false;
    const finish = () => { if (finished) return; finished = true; ov.remove(); resolve(); };
    ov.querySelector('.close').onclick = finish;
    ov.querySelector('#thresholdIgnore').onclick = finish;
    ov.onclick = e => { if (e.target === ov) finish(); };
    ov.querySelector('#thresholdReject').onclick = async () => {
      row.durum = 'Olumsuz bulgu';
      row.otomatik_uygulanmaz = false;
      row.denetci_gordu = true;
      row.guncelleyen_email = API.email;
      row.updated_at = new Date().toISOString();
      await localWrite('saha_kontrol', row, 'saha');
      finish();
    };
  });
}

async function uygulaOlcumeBagliAranmaz(changedRow) {
  const changedDefs = olcumTanimlari(changedRow);
  const sharedKeys = changedDefs.map(d => d.paylasimli_anahtar).filter(Boolean);
  if (!sharedKeys.length) return;
  const rows = await DB.allByIndex('saha', 'byDenetim', currentDenetimId);
  for (const key of sharedKeys) {
    const sourceDef = changedDefs.find(d => d.paylasimli_anahtar === key);
    const value = olcumDegeri(changedRow, sourceDef);
    for (const target of rows) {
      const rule = target.otomatik_aranmaz_kurali;
      if (!rule || rule.paylasimli_anahtar !== key) continue;
      const shouldBeNa = value !== '' && kuralSaglanir(value, rule);
      let changed = false;
      if (shouldBeNa && target.durum !== 'Uygulanmaz') {
        target.durum = 'Uygulanmaz';
        target.otomatik_uygulanmaz = true;
        // Bu yolun gerekçesi aranmaz_kosulu'dur; tahrik/MD yolundan kalan
        // eski gerekçe metni yanlışlıkla gösterilmesin.
        target.otomatik_gerekce = null;
        target.denetci_gordu = false;
        changed = true;
      } else if (!shouldBeNa && target.otomatik_uygulanmaz && target.durum === 'Uygulanmaz') {
        target.durum = null;
        target.otomatik_uygulanmaz = false;
        target.otomatik_gerekce = null;
        target.denetci_gordu = false;
        changed = true;
      }
      if (changed) {
        target.guncelleyen_email = API.email;
        target.updated_at = new Date().toISOString();
        await localWrite('saha_kontrol', target, 'saha');
      }
    }
  }
}

async function save(row, mEl) {
  if (!currentCanEdit) { toast('Bu denetim salt okunur'); return; }
  if (row.durum) row.denetci_gordu = true;
  row.guncelleyen_email = API.email;
  row.updated_at = new Date().toISOString();
  await localWrite('saha_kontrol', row, 'saha');
  const freeMode = !!search || filter !== 'all';

  if (freeMode) {
    const wrap = document.createElement('div');
    wrap.innerHTML = maddeHTML(row);
    mEl.replaceWith(wrap.firstElementChild);
    renderHeaderCounts();
    return;
  }

  // Uygun Değil'de açıklama/bulgu tamamen opsiyoneldir. Ekranı tam yeniden
  // çizerek hem üst hem sabit Sonraki düğmesini kesin olarak aktif tut.
  if (row.durum === 'Olumsuz bulgu') {
    await renderDenetim();
    return;
  }

  // ADIM ADIM MOD
  if (!canAdvanceFromItem(row)) {
    // sonuç seçilmediyse aynı maddede kal
    const wrap = document.createElement('div');
    wrap.innerHTML = maddeHTML(row);
    mEl.replaceWith(wrap.firstElementChild);
    renderHeaderCounts();
    // Sonraki butonunun aktifliğini tazele
    const canMove = canAdvanceFromItem(row);
    const nav = document.querySelector('.bolum.open [data-step="next"]');
    if (nav) nav.disabled = !canMove;
    const stickyNext = document.querySelector('[data-sn="next"]');
    if (stickyNext) {
      stickyNext.disabled = !canMove;
      const idx = cursors[row.bolum] || 0;
      stickyNext.onclick = () => { if (!stickyNext.disabled) moveStep(row.bolum, idx, 1); };
    }
    return;
  }

  // tamamlandı → kısa bir onay görünümü, sonra otomatik SONRAKİ madde
  const wrap = document.createElement('div');
  wrap.innerHTML = maddeHTML(row);
  mEl.replaceWith(wrap.firstElementChild);
  renderHeaderCounts();

  const rows = (await guncelKutuphaneMetadatasi(
    await DB.allByIndex('saha', 'byDenetim', currentDenetimId)
  )).sort(siraKarsilastir);
  const bolumRows = rows.filter(r => r.bolum === row.bolum);
  const idx = bolumRows.findIndex(r => r.id === row.id);

  if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
  autoAdvanceTimer = setTimeout(async () => {
    autoAdvanceTimer = null;
    transitioningId = null;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    if (idx < bolumRows.length - 1) {
      const nextRow = bolumRows[idx + 1];
      if (nextRow && nextRow.denetci_gordu === false && !nextRow.otomatik_uygulanmaz && nextRow.durum) {
        nextRow.durum = null;
        nextRow.bulgu_secenegi = null;
        nextRow.diger_bulgu = null;
        await localWrite('saha_kontrol', nextRow, 'saha');
      }
      cursors[row.bolum] = idx + 1;
      await rememberPosition(row.bolum, nextRow.id);
      await renderDenetim();
      const opened = document.querySelector('.bolum.open');
      if (opened) opened.scrollIntoView({ block: 'start' });
    } else {
      // Bölümün son maddesi tamamlandı. Kullanıcıyı otomatik olarak başka
      // bölüme taşımıyoruz; sonraki bölüm seçimini saha kullanıcısı yapar.
      const allDone = bolumRows.every(isFlowComplete);
      if (allDone) toast(`${row.bolum} tamamlandı ✓`);
      await renderDenetim();
    }
  }, 150);
}

async function moveStep(bolum, idx, delta) {
  const allRows = (await DB.allByIndex('saha', 'byDenetim', currentDenetimId))
    .sort(siraKarsilastir);
  const rows = allRows.filter(r => r.bolum === bolum);
  if (!currentCanEdit) {
    if (delta > 0 && idx >= rows.length - 1) {
      const order = [];
      allRows.forEach(r => { if (!order.includes(r.bolum)) order.push(r.bolum); });
      const bIdx = order.indexOf(bolum);
      if (bIdx >= 0 && bIdx < order.length - 1) {
        openBolums.delete(bolum);
        delete cursors[bolum];
        openBolums.add(order[bIdx + 1]);
      } else {
        toast('Son bölüm');
      }
    } else {
      cursors[bolum] = Math.max(0, Math.min(rows.length - 1, idx + delta));
    }
    await renderDenetim();
    return;
  }
  if (delta > 0) {
    const row = rows[idx];
    if (row && row.denetci_gordu === false) {
      row.denetci_gordu = true;
      row.guncelleyen_email = API.email;
      row.updated_at = new Date().toISOString();
      await localWrite('saha_kontrol', row, 'saha');
    }
    if (idx >= rows.length - 1) {
      const firstPending = rows.findIndex(r => !isFlowComplete(r));
      if (firstPending !== -1) {
        cursors[bolum] = firstPending;
        await renderDenetim();
        return;
      }
      if (!(await fotoKontrolUyarisi(bolum))) return;
      const order = [];
      allRows.forEach(r => { if (!order.includes(r.bolum)) order.push(r.bolum); });
      const bolumIndex = order.indexOf(bolum);
      if (bolumIndex >= 0 && bolumIndex < order.length - 1) {
        const sonrakiBolum = order[bolumIndex + 1];
        const sonrakiRows = allRows.filter(r => r.bolum === sonrakiBolum);
        let sonrakiIndex = sonrakiRows.findIndex(r => !isFlowComplete(r));
        if (sonrakiIndex < 0) sonrakiIndex = 0;
        openBolums.delete(bolum);
        delete cursors[bolum];
        openBolums.add(sonrakiBolum);
        cursors[sonrakiBolum] = sonrakiIndex;
        if (sonrakiRows[sonrakiIndex]) await rememberPosition(sonrakiBolum, sonrakiRows[sonrakiIndex].id);
        toast(`${bolum} tamamlandı ✓ · ${sonrakiBolum} açıldı`);
      } else {
        toast(`${bolum} tamamlandı ✓ · Son bölüm`);
      }
      await renderDenetim();
      requestAnimationFrame(() => {
        const opened = document.querySelector('.bolum.open');
        if (opened) opened.scrollIntoView({ block: 'start' });
      });
      return;
    }
  }
  cursors[bolum] = idx + delta;
  const target = rows[cursors[bolum]];
  if (target) await rememberPosition(bolum, target.id);
  await renderDenetim();
}

async function renderHeaderCounts() {
  const rows = await DB.allByIndex('saha', 'byDenetim', currentDenetimId);
  const done = rows.filter(isFlowComplete).length;
  const bad = rows.filter(r => r.durum === 'Olumsuz bulgu').length;
  const pending = rows.filter(r => !isFlowComplete(r)).length;
  const pb = document.querySelector('.progressbar>div');
  if (pb) pb.style.width = (rows.length ? done/rows.length*100 : 0) + '%';
  const pn = document.querySelector('.pnums');
  if (pn) pn.innerHTML = `<span>${done} / ${rows.length} madde</span><span>${bad} uygun değil${pending ? ` · ${pending} bakılmadı` : ''}</span>`;
  const ob = document.getElementById('btnOzet');
  if (ob) ob.textContent = `İnceleme Modu (${rows.length})`;
}

/* ---- Gözden Geçirme / kapanış ---- */
async function butunlukOzetiHesapla(d, rows, hedefDurum) {
  const sorted = rows.slice().sort(siraKarsilastir);
  const actors = [...new Set(sorted.map(row => row.son_degistiren_ad || row.son_degistiren_email).filter(Boolean))].sort();
  const summary = {
    surum: 2,
    denetim_id: d.id,
    durum: hedefDurum || d.denetim_durumu,
    madde_sayisi: sorted.length,
    uygun: sorted.filter(row => row.durum === 'Kontrol tamamlandı' && row.denetci_gordu !== false).length,
    uygun_degil: sorted.filter(row => row.durum === 'Olumsuz bulgu' && row.denetci_gordu !== false).length,
    uygulanmaz: sorted.filter(row => row.durum === 'Uygulanmaz' && row.denetci_gordu !== false).length,
    sonucsuz: sorted.filter(row => !isFlowComplete(row)).length,
    aciklamali: sorted.filter(row => !!String(row.aciklama || row.diger_bulgu || '').trim()).length,
    olcumlu: sorted.filter(row => olcumTanimlari(row).some(def => olcumDegeri(row, def) !== '')).length,
    snapshot_madde_set_hash: d.snapshot_madde_set_hash || d.expected_item_set_hash || null,
    snapshot_content_hash: d.snapshot_content_hash || null,
    snapshot_kutuphane_hash: d.snapshot_kutuphane_hash || d.kutuphane_content_hash || null,
    snapshot_app_build_id: d.snapshot_app_build_id || d.app_build_id || APP_VERSION,
    denetimi_yapan: d.denetimi_yapan || null,
    seri_numaralari: seriNumaralariNormalize(d.seri_numaralari),
    seri_numarasi_kayit_sayisi: seriNumarasiSayisi(d),
    ...(denetimFormKaydiVarMi(d)
      ? { denetim_form_kayitlari: AVES_DENETIM_FORM_SETI.normalize(d.denetim_form_kayitlari, d.teknik_dosya_kayitlari) }
      : {}),
    degistirenler: actors,
    satirlar: sorted.map(row => ({
      madde_id: row.madde_id,
      snapshot_hash: row.snapshot_madde_hash || null,
      durum: row.durum || null,
      denetci_gordu: row.denetci_gordu !== false,
      aciklama: row.aciklama || null,
      bulgu: row.bulgu_secenegi || null,
      diger_bulgu: row.diger_bulgu || null,
      olcumler: row.olcum_degerleri || null,
      olcu1: row.olcu1_degeri ?? null,
      olcu2: row.olcu2_degeri ?? null,
    })),
  };
  return { summary, hash: await sha256Hex(stableStringify(summary)) };
}
