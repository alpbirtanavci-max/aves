/* ============================================================
   AVES Saha Denetim — denetim ekranı (Modül G)
   showDenetim ve renderDenetim.
   (Eski UI kapanışının parçasıdır: ui-durum → ui-foto → ui-yonetim → ui-kayit → ui-liste → ui-yeni →
   ui-fr65 → ui-denetim → ui-taslak → ui-form → ui-madde → ui-kapanis → ui-son; ortak global kapsam.)
   ============================================================ */
'use strict';

async function showDenetim(id, forceReadOnly = false, initialFilter = 'all') {
  const denetim = await DB.get('denetimler', id);
  if (!denetimGorunebilirMi(denetim)) {
    toast('Bu denetimi görüntüleme yetkiniz yok');
    return;
  }
  if (fr65SahaKaydiMi(denetim)) {
    currentView = 'inspection';
    currentDenetimId = id;
    setBrandHomeEnabled(true);
    inspectionReadOnly = !!forceReadOnly;
    await renderFr65SahaKaydi(denetim);
    return;
  }
  if (!sahaUygulamaModuluGMi(denetim)) {
    toast('Bu eski kayıt Modül G değil. B/E/H1 formları Form Doldurucu programında yürütülür.');
    return;
  }
  currentView = 'inspection';
  currentDenetimId = id;
  setBrandHomeEnabled(true);
  inspectionReadOnly = !!forceReadOnly;
  filter = initialFilter; search = ''; openBolums = new Set();
  let rows = await DB.allByIndex('saha', 'byDenetim', id);
  const pending = await DB.outboxCount();
  if (navigator.onLine && pending === 0) {
    if (!rows.length) toast('Maddeler indiriliyor…');
    try {
      // Sunucudaki cevaplar ve kimlik geçmişi, bekleyen yerel işlem yoksa alınır.
      await Sync.pullSaha(id);
      await Sync.pullGecmis(id);
      rows = await DB.allByIndex('saha', 'byDenetim', id);
    } catch {
      if (!rows.length) toast('İndirilemedi — internet bağlantısını kontrol edin');
    }
  }
  const savedPosition = await DB.kvGet(`last_position_${id}`);
  const positionValid = savedPosition && rows.some(r => r.id === savedPosition.item_id && r.bolum === savedPosition.bolum);
  if (positionValid) {
    openBolums = new Set([savedPosition.bolum]);
    const bolumRows = rows.filter(r => r.bolum === savedPosition.bolum).sort(siraKarsilastir);
    cursors[savedPosition.bolum] = bolumRows.findIndex(r => r.id === savedPosition.item_id);
  }
  // "En son açtığın denetim" işaretçisi — listedeki devam et kartı için.
  await DB.kvSet('last_inspection', { id, at: new Date().toISOString() });
  await renderDenetim();
  if (positionValid && openBolums.has(savedPosition.bolum)) {
    requestAnimationFrame(() => {
      const el = document.querySelector(`.madde[data-id="${(window.CSS && CSS.escape ? CSS.escape(savedPosition.item_id) : savedPosition.item_id)}"]`);
      if (el) el.scrollIntoView({ block: 'center' });
    });
  }
}

async function rememberPosition(bolum, itemId) {
  if (!currentDenetimId || !bolum || !itemId) return;
  await DB.kvSet(`last_position_${currentDenetimId}`, {
    bolum,
    item_id: itemId,
    saved_at: new Date().toISOString(),
  });
}

const KUTUPHANE_META_ALANLARI = [
  'kontrol_basligi', 'denetci_yonlendirmesi', 'resmi_madde_metni',
  'standart_madde_no', 'kaynak_turu', 'dogrulama_yontemi', 'yontem_kodu',
  'aranmaz_kosulu', 'gorsel_referansi', 'olcum_tanimlari', 'hazir_secenekler',
  'esik_deger', 'esik_operator', 'otomatik_aranmaz_kurali',
];

async function guncelKutuphaneMetadatasi(rows) {
  const library = await DB.all('kutuphane');
  const byId = new Map(library.map(item => [item.madde_id, item]));
  return rows.map(row => {
    const latest = byId.get(row.madde_id);
    // Denetim satırı tarihsel snapshot'tır. Kütüphanede sonradan değişen veya
    // pasifleştirilen bir madde bu kopyayı değiştiremez ve denetimden düşüremez.
    if (!latest) return { ...row, kutuphane_pasif: true };
    const merged = { ...row };
    // Yalnız eski sürümlerde hiç üretilmemiş alanlara geriye uyumluluk
    // desteği verilir. Bilerek null bırakılmış ya da dolu hiçbir alanın
    // üzerine güncel kütüphane değeri yazılmaz.
    KUTUPHANE_META_ALANLARI.forEach(field => {
      if (typeof merged[field] === 'undefined') merged[field] = latest[field] ?? null;
    });
    return merged;
  }).filter(Boolean);
}

async function guncelSahaSatiri(id) {
  const row = await DB.get('saha', id);
  if (!row) return row;
  return (await guncelKutuphaneMetadatasi([row]))[0];
}

async function renderDenetim() {
  const d = await DB.get('denetimler', currentDenetimId);
  if (!d) { showList(); return; }
  if (fr65SahaKaydiMi(d)) {
    await renderFr65SahaKaydi(d);
    return;
  }
  if (!sahaUygulamaModuluGMi(d)) {
    toast('Bu uygulama yalnız Modül G denetimlerini açar.');
    await showList();
    return;
  }
  await fotografOnbellekYenile(currentDenetimId);
  bekleyenFotograflariYukle();
  const normaldeDuzenleyebilir = canEditDenetim(d);
  currentCanEdit = normaldeDuzenleyebilir && !inspectionReadOnly;
  const rows = (await guncelKutuphaneMetadatasi(
    await DB.allByIndex('saha', 'byDenetim', currentDenetimId)
  )).sort(siraKarsilastir);
  const denetimFormDurumu = denetimFormIstatistikleri(d);
  const formOnly = formOdakliDenetimMi(d, rows);
  const formDefinitions = formOnly ? modulFormSeti(d) : [];
  const formRecord = formOnly ? denetimFormKaydi(d) : null;
  const offlineState = await cevrimdisiHazirlikDurumu(d, rows);
  const { items: inspectionOutbox, cakisma: conflictSync, korunan: protectedSync, bekleyen: waitingSync } = await Sync.denetimSyncOzeti(currentDenetimId);
  const done = rows.filter(isFlowComplete).length;
  const bad = rows.filter(r => r.durum === 'Olumsuz bulgu').length;
  const icNot = rows.filter(icKontrolNotuVar).length;
  const bakilmadiSayisi = rows.filter(r => !isFlowComplete(r)).length;
  const tamamlandi = d.denetim_durumu === 'Çalışma Tamamlandı';
  const gozden = d.denetim_durumu === 'Gözden Geçirme';

  const bolums = [];
  const byBolum = {};
  for (const r of rows) {
    if (!byBolum[r.bolum]) { byBolum[r.bolum] = []; bolums.push(r.bolum); }
    byBolum[r.bolum].push(r);
  }

  const matches = (r) => {
    if (search) {
      const hay = `${r.standart_madde_no} ${r.kontrol_basligi} ${r.resmi_madde_metni || ''} ${r.denetci_yonlendirmesi}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    if (filter === 'all') return true;
    if (filter === 'empty') return !r.durum || r.denetci_gordu === false;
    if (filter === 'bad') return r.durum === 'Olumsuz bulgu';
    if (filter === 'internal') return icKontrolNotuVar(r);
    if (filter === 'previous_bad') return r.takip_onceki_durum === 'Olumsuz bulgu';
    return true;
  };

  let html = `
    <div class="screen" style="padding-bottom:0">
      <div class="inspection-toolbar">
        <button class="backlink" id="back">‹ Denetimler</button>
        <div class="inspection-actions">
          ${denetimFormDurumu ? `<button class="delbtn" id="btnDenetimFormu" title="Modül ${denetimFormDurumu.modul} için form seti veri kayıtları">📄 Denetim Formu${denetimFormDurumu.ozet.started ? ` · ${denetimFormDurumu.ozet.started} formda kayıt` : ''}</button>` : ''}
          ${currentCanEdit && !tamamlandi ? '<button class="delbtn" id="btnSahayaHazirla" title="Bu cihazdaki çevrimdışı hazırlığı doğrula">📱 Çevrimdışı Kontrol</button>' : ''}
          ${canReopenDenetim(d) ? '<button class="delbtn" id="btnYenidenAc" title="Düzenlemeye aç">↻ Düzenlemeye Aç</button>' : ''}
          ${tamamlandi && !formOnly ? '<button class="delbtn" id="btnYazdir" title="Resmî formu PDF veya Word olarak hazırla">Yazdır</button>' : ''}
          ${d.takip_onceki_denetim_id ? '<button class="delbtn" id="btnTakipCikti" title="Yalnız takip maddelerini yazdır">Takip Çıktısı</button>' : ''}
          ${d.takip_onceki_denetim_id && Profile.canCorrectInspections ? '<button class="delbtn" id="btnTakipAta" title="Takip mühendisi ata">Takip Ata</button>' : ''}
          ${canDeleteDenetim(d) ? '<button class="delbtn" id="btnSil" title="Denetimi sil">🗑 Sil</button>' : ''}
        </div>
      </div>
      ${currentCanEdit ? (gozden ? '<div class="readonly-banner">Gözden Geçirme · Sahadaki işaretleri kontrol edip düzeltebilirsiniz.</div>' : '') : `<div class="readonly-banner">${inspectionReadOnly
        ? `İnceleme Modu · Maddeler salt okunur gösteriliyor.${normaldeDuzenleyebilir ? ' <button type="button" class="inline-review-exit" id="btnDuzenlemeyeDon">Düzenlemeye dön</button>' : ''}`
        : (tamamlandi
          ? 'Çalışma tamamlandı · Yalnız denetimin sahibi veya yönetici yeniden düzenlemeye açabilir.'
          : 'Salt okunur · Teknik müdür maddeleri inceleyebilir ve bütün denetimi silebilir; içerik veya sonuç değiştiremez.')}</div>`}
      <div class="det-head">
        <div class="inspection-eyebrow">${esc(standartOzeti(d))}</div>
        <div class="dtitle">${esc(d.musteri_unvani)}</div>
        <div class="dmeta"><b>Asansör seri no:</b> ${esc(d.asansor_seri_no)}</div>
        <div class="dmeta"><b>Firma adresi:</b> ${esc(d.firma_adresi || '—')}</div>
        <div class="dmeta"><b>Asansörün bulunduğu adres:</b> ${esc(d.denetim_adresi || '—')}</div>
        ${d.asansor_kimlik_no ? `<div class="dmeta" style="margin-top:2px"><b>Kimlik no:</b> ${esc(d.asansor_kimlik_no)}</div>` : ''}
        ${d.ana_tip || d.tip_varyant_kodu ? `<div class="dmeta" style="margin-top:2px"><b>Tip:</b> ${esc([d.ana_tip, d.tip_varyant_kodu].filter(Boolean).join(' · '))}</div>` : ''}
        ${d.denetimi_yapan ? `<div class="dmeta" style="margin-top:2px"><b>Denetimi yapan:</b> ${esc(d.denetimi_yapan)}</div>` : ''}
        ${d.bina_asansor_sayisi || d.kabin_giris_duzeni || d.kabin_kapi_acilma_tipi ? `<div class="dmeta" style="margin-top:2px"><b>Yerleşim:</b> ${esc([
          d.bina_asansor_sayisi ? `${d.bina_asansor_sayisi} asansör` : null,
          d.kabin_giris_duzeni,
          d.kabin_kapi_acilma_tipi,
        ].filter(Boolean).join(' · '))}</div>` : ''}
        <div class="dmeta" style="margin-top:4px"><b>Durum:</b> ${tamamlandi ? '✓ Çalışma Tamamlandı' : (gozden ? 'Gözden Geçirme' : 'Devam Ediyor')}</div>
        ${currentCanEdit && !tamamlandi ? `<aside class="saha-guvenlik" role="note">
          <b>⚠ Denetim öncesi saha güvenliği</b>
          <ul>${SAHA_KANIT_PLANI.guvenlik.map(item => `<li>${esc(item)}</li>`).join('')}</ul>
          <small>Kaynak statüsü: ${esc(SAHA_KANIT_PLANI.kaynak)}. Bu hatırlatma şirketin onaylı risk analizi ve güvenli çalışma prosedürünün yerini almaz.</small>
        </aside>` : ''}
        <div class="offline-ready ${offlineState.ready ? 'ok' : 'pending'}"><b>${offlineState.ready
          ? '✓ Bu cihaz çevrimdışı çalışmaya hazır'
          : '⚠ Bu cihaz çevrimdışı çalışmaya hazır değil'}</b><small>${esc(offlineState.detail)}</small></div>
        <div class="local-sync-state ${protectedSync ? 'error' : (inspectionOutbox.length || fotografBekleyenSayisi ? 'pending' : 'ok')}" id="localSyncState">${protectedSync
          ? `⚠ ${protectedSync} işlem cihazda korumada · ${conflictSync ? 'Çakışma veya yetki' : 'Yetki'} incelemesi gerekiyor`
          : waitingSync || fotografBekleyenSayisi
            ? `✓ Cihaza kaydedildi · ${[waitingSync ? `${waitingSync} işlem` : null, fotografBekleyenSayisi ? `${fotografBekleyenSayisi} fotoğraf` : null].filter(Boolean).join(', ')} sunucu aktarımı bekliyor`
            : '✓ Cihaz ve sunucu eşit · Bekleyen işlem yok'}</div>
        ${formOnly
          ? `<div class="form-record-progress"><b>${denetimFormDurumu.ozet.started}/${denetimFormDurumu.ozet.total} formda veri kaydı var</b><small>Bu sayaç kayıt varlığını gösterir; form tamlığı veya uygunluk değerlendirmesi değildir.</small></div>`
          : `<div class="progressbar"><div style="width:${rows.length ? done/rows.length*100 : 0}%"></div></div>
             <div class="pnums"><span>${done} / ${rows.length} madde</span><span>${bad} uygun değil${bakilmadiSayisi ? ` · ${bakilmadiSayisi} bakılmadı` : ''}</span></div>`}
      </div>
      ${formOnly ? `<section class="form-set-overview">
        <div class="form-set-overview-head"><div><h3>Modül ${denetimFormDurumu.modul} · Denetim form seti</h3>
          <p>Bu akışta G modülünün madde checklisti kullanılmaz. Her formun saha verisini aşağıdaki form ekranında kaydedin.</p></div>
          <button type="button" class="btn btn-primary" id="btnFormSetMain">Form setini aç</button></div>
        <div class="form-set-list">${formDefinitions.map(definition => {
          const hasData = AVES_DENETIM_FORM_SETI.formHasData(formRecord, definition.key);
          return `<div class="form-set-row ${hasData ? 'has-data' : ''}"><span class="form-set-mark">${hasData ? '✓' : '○'}</span>
            <div><b>ÜB.${esc(definition.key)} · ${esc(definition.title)}</b><small>${esc(definition.description)}</small></div>
            <span class="form-set-status">${hasData ? 'Kayıt var' : 'Henüz kayıt yok'}</span></div>`;
        }).join('')}</div>
        ${formOdakli && !formSetiGozdenGecirildiMi(d) ? '<div class="form-set-note">Kapanışta form setini ayrıca gözden geçirmeniz istenir. Veri girilmemiş alanlar otomatik olarak tamamlanmış sayılmaz.</div>' : ''}
      </section>` : `<input class="searchbox" id="srch" placeholder="Madde no veya kelime ara…" value="${esc(search)}">
      <div class="filters">
        <button class="chip ${filter==='all'?'on':''}" data-f="all">Tümü</button>
        ${d.takip_onceki_denetim_id ? `<button class="chip ${filter==='previous_bad'?'on':''}" data-f="previous_bad">Önceki Uygun Değil</button>` : ''}
        <button class="chip ${filter==='empty'?'on':''}" data-f="empty">Bakılmadı</button>
        <button class="chip ${filter==='bad'?'on':''}" data-f="bad">Uygun Değil</button>
        ${icNot ? `<button class="chip ${filter==='internal'?'on':''}" data-f="internal">İç kontrol notu</button>` : ''}
      </div><div id="bolums">`}`;

  const notlar = d.bolum_aciklamalari || {};
  // sıralı akış: tamamlanmamış ilk bölümü bul; ilk açılışta o bölüm açık gelsin
  let firstIncompleteBolum = null;
  for (const b of (formOnly ? [] : bolums)) {
    if (byBolum[b].some(r => !isFlowComplete(r))) { firstIncompleteBolum = b; break; }
  }
  if (openBolums.size === 0 && !search && filter === 'all' && bolums.length) {
    openBolums.add(firstIncompleteBolum || bolums[0]);
  }
  const reviewMode = gozden;
  const freeMode = !!search || filter !== 'all'; // arama/filtre modunda klasik liste

  let lockActive = false; // firstIncomplete'ten SONRAKİ bölümler kilitli
  let stickyNav = null; // step modda aktif bölümün prev/next durumu
  for (const b of bolums) {
    const list = byBolum[b].filter(matches);
    const all = byBolum[b];
    const bd = all.filter(isFlowComplete).length;
    const bbad = all.filter(r => r.durum === 'Olumsuz bulgu').length;
    const bComplete = all.every(isFlowComplete);
    const locked = !freeMode && !reviewMode && currentCanEdit && lockActive;
    if (!freeMode && !reviewMode && currentCanEdit && b === firstIncompleteBolum) lockActive = true;
    if (!list.length) continue;
    const isOpen = !locked && (openBolums.has(b) || freeMode);

    let bodyHtml = '';
    if (isOpen && freeMode) {
      // arama/filtre: klasik liste
      bodyHtml = list.map(maddeHTML).join('');
    } else if (isOpen) {
      // ADIM ADIM MOD: tek madde göster
      let idx = cursors[b];
      if (idx === undefined || idx < 0 || idx >= all.length) {
        idx = currentCanEdit ? all.findIndex(r => !isFlowComplete(r)) : 0;
        if (idx === -1) idx = all.length - 1; // bölüm bitti: son madde
        cursors[b] = idx;
      }
      const cur = all[idx];
      const canNext = currentCanEdit ? canAdvanceFromItem(cur) : true;
      const isLast = idx === all.length - 1;
      const nextLabel = currentCanEdit
        ? (isLast ? 'Bölümü tamamla' : 'Sonraki ›')
        : (isLast ? 'Sonraki bölüm ›' : 'Sonraki ›');
      stickyNav = { b, idx, total: all.length, canPrev: idx > 0, canNext, isLast, nextLabel };
      bodyHtml = `
        <div class="stepnav">
          <button class="stepbtn" data-step="prev" data-b="${esc(b)}" ${idx===0?'disabled':''}>‹ Önceki</button>
          <span class="stepcount">${idx+1} / ${all.length}</span>
          <button class="stepbtn" data-step="next" data-b="${esc(b)}" ${canNext?'':'disabled'}>${nextLabel}</button>
        </div>
        ${maddeHTML(cur)}
        ${((bComplete || idx === all.length - 1) && (currentCanEdit || notlar[b])) ? `
        <div class="bolum-not"><label>Bölüm açıklaması (opsiyonel)</label>
        <textarea class="diger" data-bolumnot="${esc(b)}" placeholder="Bu bölümle ilgili genel not…" ${currentCanEdit?'':'disabled'}>${esc(notlar[b] || '')}</textarea></div>` : ''}`;
    }

    html += `
      <div class="bolum ${isOpen?'open':''} ${locked?'locked':''}">
        <button class="bolum-head" data-b="${esc(b)}" data-locked="${locked?1:0}">
          <span class="btitle">${locked?'🔒 ':''}${bComplete?'✅ ':''}${esc(b)}</span>
          <span class="bstat">${bbad ? `<span class="bbadge">${bbad}</span>` : ''}<span class="bcount">${bd}/${all.length}</span><span class="chev"></span></span>
        </button>
        <div class="bolum-body">${bodyHtml}${freeMode ? '' : ''}</div>
      </div>`;
  }
  html += `${formOnly ? '' : '</div>'}<div style="height:8px"></div></div>
    ${stickyNav ? `<div class="stickynav">
      <button class="sn-prev" data-sn="prev" ${stickyNav.canPrev?'':'disabled'}>‹ Önceki</button>
      <button class="sn-next" data-sn="next" ${stickyNav.canNext?'':'disabled'}>${stickyNav.nextLabel}</button>
    </div>` : ''}
    <div class="footbar">
      ${formOnly ? '<button class="btn btn-ozet" id="btnFormSetBottom">📄 Form setini aç</button>' : `<button class="btn btn-ozet" id="btnOzet">İnceleme Modu (${rows.length})</button>`}
      <button class="btn btn-serial ${seriEksikleri(d).length ? 'pending' : 'ready'}" id="btnSeriler">Seri No · ${seriNumarasiSayisi(d)}/${seriBeklenenMinimum(d)}</button>
      <button class="btn btn-serial ready" id="btnFotograflar">📷 Fotoğraflar${fotografToplamSayisi() ? ` · ${fotografToplamSayisi()}` : ''}</button>
      ${inspectionReadOnly && normaldeDuzenleyebilir ? '<button class="btn btn-finish ready" id="btnDenetimeDon">↩ Denetime Geri Dön</button>' : ''}
      ${currentCanEdit && !tamamlandi ? `<button class="btn btn-finish ${bakilmadiSayisi === 0 ? 'ready' : ''}" id="btnBitirGlobal">${bakilmadiSayisi === 0
        ? (gozden ? 'Çalışmayı Tamamla' : formOnly ? 'Form Seti Gözden Geçirme' : 'Saha Kontrolünü Bitir')
        : 'Denetimi Bitir'}</button>` : ''}
    </div>`;
  document.getElementById('app').innerHTML = html;

  if (stickyNav) {
    const sn = stickyNav;
    document.querySelector('[data-sn="prev"]').onclick = () => moveStep(sn.b, sn.idx, -1);
    const nx = document.querySelector('[data-sn="next"]');
    nx.onclick = () => { if (!nx.disabled) moveStep(sn.b, sn.idx, 1); };
  }

  document.getElementById('back').onclick = showList;
  const btnDuzenlemeyeDon = document.getElementById('btnDuzenlemeyeDon');
  if (btnDuzenlemeyeDon) btnDuzenlemeyeDon.onclick = () => { inspectionReadOnly = false; renderDenetim(); };
  const btnDenetimeDon = document.getElementById('btnDenetimeDon');
  if (btnDenetimeDon) btnDenetimeDon.onclick = () => { inspectionReadOnly = false; renderDenetim(); };
  const btnSahayaHazirla = document.getElementById('btnSahayaHazirla');
  if (btnSahayaHazirla) btnSahayaHazirla.onclick = async () => {
    btnSahayaHazirla.disabled = true;
    btnSahayaHazirla.textContent = 'Doğrulanıyor…';
    try {
      const result = await sahayaHazirla(d, rows);
      sahayaHazirlikSonucuGoster(result);
      if (result.ready) await renderDenetim();
    } catch (error) {
      sahayaHazirlikSonucuGoster({ ready: false, checks: [{ name: 'Hazırlık kontrolü', ok: false, detail: error.message }] });
      btnSahayaHazirla.disabled = false;
      btnSahayaHazirla.textContent = '📱 Çevrimdışı Kontrol';
    }
  };
  const btnSil = document.getElementById('btnSil');
  const btnTakipCikti = document.getElementById('btnTakipCikti');
  if (btnTakipCikti) btnTakipCikti.onclick = () => takipKisaCiktiYazdir(d, rows);
  const btnTakipAta = document.getElementById('btnTakipAta');
  if (btnTakipAta) btnTakipAta.onclick = () => takipMuehendisiniAta(d);
  const btnYazdir = document.getElementById('btnYazdir');
  if (btnYazdir) btnYazdir.onclick = async () => {
    try {
      const forms = await FormOutput.formsForInspection(d);
      if (!forms.length) { toast('Bu denetim için resmî form tanımlı değil'); return; }
      const ov = document.createElement('div');
      ov.className = 'overlay';
      ov.innerHTML = `<div class="modal">
          <button class="close" aria-label="Kapat">×</button>
          <h3>Yazdır</h3>
          <div class="photo-help">Denetim verileri, denetim tarihinde kilitlenen resmî form revizyonuna aktarılır. Kaynak denetim kaydı değiştirilmez. Çevrimdışıyken de üretebilirsiniz; form şablonu bu cihazda yoksa bir kez internete bağlanın.</div>
          <div class="print-form-list">${forms.map(form => `<div class="print-form-card ${form.available ? '' : 'print-pending'}">
            <b>${esc(form.code)} · ${esc(form.revision)}</b>
            <small>${form.legacy_inferred ? 'Eski denetim · ana standarda göre mevcut resmî revizyon' : 'Denetime kilitli revizyon'}${form.available ? '' : ` · ${esc(form.reason)}`}</small>
          </div>`).join('')}</div>
          <div class="print-actions">
            <button class="btn btn-primary" data-print="pdf" ${forms.some(f => f.available) ? '' : 'disabled'}>PDF indir</button>
            <button class="btn btn-ghost" data-print="docx" ${forms.some(f => f.available) ? '' : 'disabled'}>Word indir</button>
          </div>
        </div>`;
      document.body.appendChild(ov);
      const close = () => ov.remove();
      ov.querySelector('.close').onclick = close;
      ov.onclick = event => { if (event.target === ov) close(); };
      ov.querySelectorAll('[data-print]').forEach(button => button.onclick = async () => {
        const original = button.textContent; button.disabled = true; button.textContent = 'Hazırlanıyor…';
        try {
          const format = button.dataset.print;
          const { filename, bytes, form } = await FormOutput.download(format, d, rows);
          toast(`${filename} hazırlandı`);
          // 10a: resmî çıktı üretim kaydı (yalnız yerel + sync; belge değişmez).
          try {
            const guncel = await DB.get('denetimler', d.id) || d;
            const now = new Date().toISOString();
            guncel.resmi_cikti_uretildi_at = now;
            guncel.resmi_cikti_hash = await sha256HexBytes(bytes);
            guncel.resmi_cikti_snapshot_ozeti = `${form.code} · ${form.revision} · ${format.toUpperCase()}`
              + (guncel.kutuphane_content_hash ? ` · kütüphane ${String(guncel.kutuphane_content_hash).slice(0, 12)}` : '')
              + (guncel.butunluk_hash ? ` · bütünlük ${String(guncel.butunluk_hash).slice(0, 12)}` : '');
            guncel.updated_at = now;
            await localWrite('denetimler', guncel, 'denetimler');
          } catch (kayitHatasi) {
            console.warn('Resmî çıktı üretim kaydı yazılamadı', kayitHatasi);
          }
        } catch (error) {
          console.error('Form çıktısı üretilemedi', error);
          toast(error.message || 'Form çıktısı üretilemedi');
        } finally { button.disabled = false; button.textContent = original; }
      });
    } catch (error) { toast(error.message || 'Yazdırma seçenekleri açılamadı'); }
  };
  if (btnSil) btnSil.onclick = async () => {
    if (!canDeleteDenetim(d)) { toast('Denetim silme yetkiniz yok'); return; }
    const bagliTakipler = (await DB.all('denetimler')).filter(item =>
      item.id !== d.id && (item.takip_onceki_denetim_id === d.id || item.takip_ana_denetim_id === d.id)
    );
    if (bagliTakipler.length) {
      toast(`Bu denetime bağlı ${bagliTakipler.length} takip denetimi var; zincirin ana kaydı silinemez`);
      return;
    }
    if (!confirm(`"${d.musteri_unvani} · ${d.asansor_seri_no}" denetimi ve tüm maddeleri silinecek. Emin misiniz?`)) return;
    if (!confirm('Bu işlem geri alınamaz. Silinsin mi?')) return;
    const sahaRows = await DB.allByIndex('saha', 'byDenetim', currentDenetimId);
    for (const r of sahaRows) await DB.del('saha', r.id);
    await DB.del('denetimler', currentDenetimId);
    await DB.kvDel(`offline_ready_${currentDenetimId}`);
    await DB.outboxAdd({ op: 'delete', table: 'denetimler', filter: `id=eq.${currentDenetimId}`, ts: Date.now() });
    const deleted = (await DB.kvGet('deleted_ids')) || [];
    deleted.push(currentDenetimId);
    await DB.kvSet('deleted_ids', deleted);
    Sync.updatePill();
    Sync.schedulePush();
    toast('Denetim silindi');
    showList();
  };
  const btnYenidenAc = document.getElementById('btnYenidenAc');
  if (btnYenidenAc) btnYenidenAc.onclick = async () => {
    if (!canReopenDenetim(d)) return;
    duzeltmeNedeniSec(d);
  };
  const btnDenetimFormu = document.getElementById('btnDenetimFormu');
  if (btnDenetimFormu) btnDenetimFormu.onclick = () => denetimFormuGoster();
  const btnFormSetMain = document.getElementById('btnFormSetMain');
  if (btnFormSetMain) btnFormSetMain.onclick = () => denetimFormuGoster();
  const btnFormSetBottom = document.getElementById('btnFormSetBottom');
  if (btnFormSetBottom) btnFormSetBottom.onclick = () => denetimFormuGoster();
  const searchInput = document.getElementById('srch');
  if (searchInput) searchInput.oninput = (e) => { search = e.target.value.trim().toLowerCase(); renderDenetim(); };
  document.querySelectorAll('.chip').forEach(c => c.onclick = () => { filter = c.dataset.f; renderDenetim(); });
  document.querySelectorAll('.bolum-head').forEach(h => h.onclick = () => {
    if (h.dataset.locked === '1') {
      toast('Önce açık bölümdeki maddeleri tamamlayın');
      const firstEmpty = document.querySelector('.bolum.open .madde:not(.done)');
      if (firstEmpty) firstEmpty.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const b = h.dataset.b;
    if (openBolums.has(b)) openBolums.delete(b); else openBolums.add(b);
    renderDenetim();
  });
  const btnOzet = document.getElementById('btnOzet');
  if (btnOzet) btnOzet.onclick = showOzet;
  document.getElementById('btnSeriler').onclick = seriNumaralariGoster;
  document.getElementById('btnFotograflar').onclick = fotografSekmesi;
  const btnBitirGlobal = document.getElementById('btnBitirGlobal');
  if (btnBitirGlobal) btnBitirGlobal.onclick = async () => {
    const latestRows = (await DB.allByIndex('saha', 'byDenetim', currentDenetimId)).sort(siraKarsilastir);
    const firstPending = latestRows.find(r => !isFlowComplete(r));
    if (!firstPending) {
      await kapanisOzetiniGoster(gozden ? 'Çalışma Tamamlandı' : 'Gözden Geçirme');
      return;
    }
    search = ''; filter = 'all';
    openBolums = new Set([firstPending.bolum]);
    const bolumRows = latestRows.filter(r => r.bolum === firstPending.bolum);
    cursors[firstPending.bolum] = bolumRows.findIndex(r => r.id === firstPending.id);
    await rememberPosition(firstPending.bolum, firstPending.id);
    toast(`${latestRows.filter(r => !isFlowComplete(r)).length} madde henüz sonuçlandırılmadı`);
    await renderDenetim();
    const opened = document.querySelector('.bolum.open');
    if (opened) opened.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  bindMaddeEvents();
}
