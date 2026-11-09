/* ============================================================
   AVES Saha Denetim — giriş, liste ve takip
   Giriş, denetim listesi, tamamlanan denetim seçimi, takip denetimi, FR.65 kayıt oluşturma.
   (Eski UI kapanışının parçasıdır: ui-durum → ui-foto → ui-yonetim → ui-kayit → ui-liste → ui-yeni →
   ui-fr65 → ui-denetim → ui-taslak → ui-form → ui-madde → ui-kapanis → ui-son; ortak global kapsam.)
   ============================================================ */
'use strict';

/* ---- Login ---- */
function showLogin(err) {
  stopFr65ScrollTracking();
  setBrandHomeEnabled(false);
  currentView = 'login';
  currentDenetimId = null;
  document.getElementById('btnLogout').classList.add('hidden');
  app.innerHTML = `
    <div class="login-wrap"><div class="login-card">
      <div class="login-kicker">AVES Saha Denetim</div><h1>Hoş geldiniz</h1>
      <p>AVES saha denetim hesabınızla devam edin.</p>
      ${err ? `<div class="err">${esc(err)}</div>` : ''}
      <div class="field"><label>E-posta</label><input id="lgEmail" type="email" autocomplete="username" autocapitalize="off"></div>
      <div class="field"><label>Şifre</label><input id="lgPass" type="password" autocomplete="current-password"></div>
      <button class="btn btn-primary" id="lgBtn">Giriş yap</button>
    </div>
    <div class="about-note">Bu uygulama saha kontrol yardımcısıdır; resmi muayene formu veya rapor yerine geçmez.</div>
    </div>`;
  document.getElementById('lgBtn').onclick = async () => {
    const b = document.getElementById('lgBtn');
    b.disabled = true; b.textContent = 'Giriş yapılıyor…';
    try {
      await API.login(document.getElementById('lgEmail').value.trim(), document.getElementById('lgPass').value);
      toast('Hoş geldiniz');
      await afterLogin();
    } catch (e) {
      showLogin(e.message.includes('Invalid') ? 'E-posta veya şifre hatalı' : e.message);
    }
  };
}

async function afterLogin() {
  document.getElementById('btnLogout').classList.remove('hidden');
  try {
    await Profile.load();
  } catch (e) {
    await API.logout();
    Profile.clear();
    const msg = e.message === 'PROFILE_NOT_FOUND'
      ? 'Bu e-posta için aktif AVES kullanıcı profili tanımlanmamış. Yöneticiyle görüşün.'
      : 'Kullanıcı profili alınamadı. İlk giriş için internet bağlantısını kontrol edin.';
    showLogin(msg);
    return;
  }
  // Form taslaklarını yalnız Profile.load() tamamlandıktan sonra kurtar:
  // canEditDenetim() rol/atanmış denetçi yetkisini Profile.current üzerinden
  // değerlendirir. Login oturumu var ama profil henüz yüklenmemişse form
  // taslağını atlamak, sonraki düzenlemede eski kayıtla ezilmesine yol açar.
  try { await UI.recoverDrafts(API.email); } catch {}
  try { await Sync.pullKutuphane(); } catch (e) {
    // çevrimdışı ilk giriş: kütüphane yoksa uyar
    const have = await DB.kvGet('kutuphane_ok');
    if (!have) { showLogin('İlk giriş için internet gerekli (madde kütüphanesi indirilecek)'); return; }
  }
  Sync.full();
  showList();
}

/* ---- Denetim listesi ---- */
function setBrandHomeEnabled(enabled) {
  const button = document.getElementById('brandHome');
  if (!button) return;
  button.disabled = !enabled;
  button.setAttribute('aria-label', enabled ? 'Denetimler listesine dön' : 'AVES Saha Denetim');
  button.title = enabled ? 'Denetimler listesine dön' : 'AVES Saha Denetim';
}

// arkaPlan: senkronun tetiklediği yenileme. Veri okunurken kullanıcı başka ekrana geçtiyse (ör. bir denetim açtıysa)
// ekranı listeyle ezmez.  Elle çağrılar (geri, giriş vb.) her zaman listeyi gösterir.
async function showList({ arkaPlan = false } = {}) {
  if (activeFr65VersionListener) {
    window.removeEventListener('aves:fr65-server-version', activeFr65VersionListener);
    activeFr65VersionListener = null;
  }
  const leavingInspection = currentView === 'inspection' && !!currentDenetimId;
  let denetimler, sahaAll;
  if (leavingInspection) app.style.pointerEvents = 'none';
  if (leavingInspection) {
    try { await flushEditorWrites(); }
    catch (error) {
      app.style.pointerEvents = '';
      console.error('Denetimden çıkış öncesi kayıt tamamlanamadı:', error);
      toast('Son kayıt tamamlanamadı; denetim ekranında kaldınız. Tekrar deneyin.');
      return false;
    }
  }
  try {
    denetimler = (await DB.all('denetimler'))
      .filter(denetimGorunebilirMi)
      .sort((a,b) => (b.denetim_tarihi || b.created_at || '').localeCompare(a.denetim_tarihi || a.created_at || ''));
    sahaAll = await DB.all('saha');
  } catch (error) {
    if (leavingInspection) {
      app.style.pointerEvents = '';
      console.error('Denetimler listesi okunamadı:', error);
      toast('Denetimler listesi açılamadı; denetim ekranında kaldınız. Tekrar deneyin.');
      return false;
    }
    throw error;
  }
  if (arkaPlan && currentView !== 'list') return false;
  if (leavingInspection) {
    if (autoAdvanceTimer) { clearTimeout(autoAdvanceTimer); autoAdvanceTimer = null; }
    transitioningId = null;
    activeFr65Flush = null;
    stopFr65ScrollTracking();
  }
  currentView = 'list';
  currentDenetimId = null;
  setBrandHomeEnabled(false);
  const statsBy = {};
  const rowsBy = {};
  for (const s of sahaAll) {
    (rowsBy[s.denetim_id] || (rowsBy[s.denetim_id] = [])).push(s);
    const st = statsBy[s.denetim_id] || (statsBy[s.denetim_id] = { toplam:0, ok:0, bad:0, na:0, ic:0 });
    st.toplam++;
    if (s.denetci_gordu !== false) {
      if (s.durum === 'Kontrol tamamlandı') st.ok++;
      else if (s.durum === 'Olumsuz bulgu') st.bad++;
      else if (s.durum === 'Uygulanmaz') st.na++;
    }
    if (icKontrolNotuVar(s)) st.ic++;
  }
  app.innerHTML = `
    <div class="screen">
      <div class="list-head"><h2>Denetimler</h2>${Profile.canCreate ? '<button class="btn-new" id="btnYeni">+ Yeni denetim</button>' : ''}</div>
      <div class="scope-note"><b>Modül G:</b> tam saha checklisti. <b>B / E / H1:</b> FR.65 referanslı ölçü ve kimlik veri kaydı. Eski B/E/H1 kayıtları açılmaz; resmî form üretimi Form Doldurucu’da kalır.</div>
      <div class="inspection-list-tools">
        <input class="searchbox" id="listSearch" type="search" placeholder="Müşteri, adres, seri veya dosya no ara…" value="${esc(listSearch)}">
        <div class="inspection-date-filter">
          <label for="listDate">Denetim tarihi</label>
          <input id="listDate" type="date" value="${listDateFilter === 'all' ? '' : esc(listDateFilter)}">
          <button type="button" class="btn btn-ghost" id="listClear">Tümünü göster</button>
        </div>
      </div>
      <div id="dlist">${denetimler.length ? '' : '<div class="empty">Görüntüleyebileceğiniz denetim yok.<br>Denetçiler yalnızca kendi denetimlerini görür.</div>'}</div>
      <div class="empty hidden" id="listNoResult">Arama ölçütlerine uyan denetim bulunamadı.</div>
      <div class="backup-bar"><button type="button" class="backup-link" id="btnYedekSec">💾 Yedek al…</button><button type="button" class="backup-link" id="btnYedekGeri">📂 Yedekten geri yükle…</button><button type="button" class="backup-link" id="btnTanilama">🩺 Tanılama bilgisini paylaş</button>${Profile.canSeeAllInspections ? '<button type="button" class="backup-link" id="btnCihazDurum">📡 Cihaz senkron durumları</button>' : ''}</div>
      <div class="about-note">Bu uygulama saha kontrol yardımcısıdır; resmi muayene formu veya rapor yerine geçmez.</div>
    </div>`;
  app.style.pointerEvents = '';
  const dl = document.getElementById('dlist');

  // "Kaldığın yerden devam et" — en son açılan, tamamlanmamış, görünür denetim.
  const sonKayit = await DB.kvGet('last_inspection');
  const sonDenetim = sonKayit && denetimler.find(d => d.id === sonKayit.id && d.denetim_durumu !== 'Çalışma Tamamlandı' && (sahaUygulamaModuluGMi(d) || fr65SahaKaydiMi(d)));
  if (sonDenetim) {
    const sonPozisyon = await DB.kvGet(`last_position_${sonDenetim.id}`);
    const resume = document.createElement('button');
    resume.className = 'resume-card';
    resume.innerHTML = `<div><b>Kaldığın yerden devam et</b>` +
      `<small>${esc(sonDenetim.musteri_unvani)} · ${esc(sonDenetim.asansor_seri_no || 'seri no girilmedi')}` +
      `${sonPozisyon && sonPozisyon.bolum ? ` · ${esc(sonPozisyon.bolum)}` : ''}</small></div><span>→</span>`;
    resume.onclick = () => showDenetim(sonDenetim.id, Profile.isTechnicalManager && !denetimSahibiMi(sonDenetim));
    dl.appendChild(resume);
  }

  const hazirlikAktif = [];   // sahaya çıkılabilecek denetimler {d, ready}
  for (const d of denetimler) {
    const st = statsBy[d.id];
    const denetimRows = rowsBy[d.id] || [];
    const modulG = sahaUygulamaModuluGMi(d);
    const fr65Capture = fr65SahaKaydiMi(d);
    const supported = modulG || fr65Capture;
    const formOnly = formOdakliDenetimMi(d, denetimRows);
    const formStats = formOnly ? denetimFormIstatistikleri(d) : null;
    const fr65Stats = fr65Capture ? fr65SahaIstatistigi(d) : null;
    const offlineState = (modulG || fr65Capture)
      ? await cevrimdisiHazirlikDurumu(d, denetimRows)
      : { ready: false, detail: 'Saha verisi cihazda yerel olarak saklanır; çevrimdışı yazılabilir.' };
    const canEdit = supported && canEditDenetim(d);
    const tamamlandi = d.denetim_durumu === 'Çalışma Tamamlandı';
    const gozden = d.denetim_durumu === 'Gözden Geçirme';
    if ((modulG || fr65Capture) && !tamamlandi && canEdit) hazirlikAktif.push({ d, ready: offlineState.ready });
    const cardRow = document.createElement('div');
    cardRow.className = 'inspection-card-row';
    const card = document.createElement('button');
    card.className = `dcard${supported ? '' : ' unsupported'}`;
    card.disabled = !supported;
    card.dataset.search = `${d.musteri_unvani || ''} ${d.firma_adresi || ''} ${d.asansor_seri_no || ''} ${d.asansor_kimlik_no || ''} ${d.dosya_no || ''} ${d.denetim_adresi || ''} ${d.denetimi_yapan || ''}`.toLocaleLowerCase('tr-TR');
    card.dataset.date = d.denetim_tarihi || '';
    cardRow.dataset.search = card.dataset.search;
    cardRow.dataset.date = card.dataset.date;
    card.innerHTML = `
        <div class="drow1"><span class="dtitle">${esc(d.musteri_unvani)} · ${esc(d.asansor_seri_no || 'seri no girilmedi')}</span>
        <span class="ddate">${esc(d.denetim_tarihi || '')}</span></div>
        <div class="dmeta"><b>Asansör adresi:</b> ${esc(d.denetim_adresi || '')} ${denetimTuruOzeti(d) ? '· ' + esc(denetimTuruOzeti(d)) : ''} · ${fr65Capture ? 'FR.65 saha veri kaydı' : esc(standartOzeti(d))}</div>
        ${d.firma_adresi ? `<div class="dmeta"><b>Firma adresi:</b> ${esc(d.firma_adresi)}</div>` : ''}
        ${d.asansor_kimlik_no ? `<div class="dmeta"><b>Kimlik no:</b> ${esc(d.asansor_kimlik_no)}</div>` : ''}
        ${Profile.canSeeAllInspections ? `<div class="dmeta"><b>Denetçi:</b> ${esc(d.denetimi_yapan || d.olusturan_ad || d.olusturan_email || 'Kayıt yok')}</div>` : ''}
        ${d.takip_sira_no ? `<div class="dmeta"><b>Takip denetimi:</b> T${esc(d.takip_sira_no)}</div>` : ''}
        <div class="dstats">${!supported
          ? '<span class="pill na">Bu uygulama yalnız Modül G içindir</span>'
          : fr65Capture
          ? `<span class="pill total">${fr65Stats.recorded}/${fr65Stats.total} FR.65 alanında veri</span>
             <span class="pill ${tamamlandi ? 'ok' : 'total'}">${tamamlandi ? 'Saha kaydı kapatıldı' : (gozden ? 'Düzenleme açık' : 'Veri toplama sürüyor')}</span>
             ${tamamlandi && d.arsive_aktarildi_at ? '<span class="pill ok">📁 arşivde</span>' : ''}
             ${canEdit ? '' : '<span class="pill readonly">Salt okunur</span>'}
             <span class="pill cached">📱 cihazda</span>`
          : formOnly
          ? `<span class="pill total">${formStats.ozet.started}/${formStats.ozet.total} formda kayıt</span>
             <span class="pill na">Madde checklisti kullanılmıyor</span>
             <span class="pill ${tamamlandi ? 'ok' : 'total'}">${tamamlandi ? 'Çalışma tamamlandı' : (gozden ? 'Gözden geçirme' : 'Devam ediyor')}</span>
             ${tamamlandi && d.arsive_aktarildi_at ? '<span class="pill ok">📁 arşivde</span>' : ''}
             ${canEdit ? '' : '<span class="pill readonly">Salt okunur</span>'}
             <span class="pill cached">📱 cihazda</span>`
          : st
          ? `<span class="pill total">${st.ok + st.bad + st.na}/${st.toplam}</span>
             <span class="pill ok">${st.ok} uygun</span>
             ${st.bad ? `<span class="pill bad">${st.bad} uygun değil</span>` : ''}
             ${st.ic ? `<span class="pill warn">${st.ic} iç kontrol notu</span>` : ''}
             <span class="pill ${tamamlandi ? 'ok' : 'total'}">${tamamlandi ? 'Çalışma tamamlandı' : (gozden ? 'Gözden geçirme' : 'Devam ediyor')}</span>
             ${tamamlandi && d.arsive_aktarildi_at ? '<span class="pill ok">📁 arşivde</span>' : ''}
             ${canEdit ? '' : '<span class="pill readonly">Salt okunur</span>'}
             <span class="pill cached">📱 cihazda</span>`
          : `<span class="pill na">maddeler cihazda değil — açınca iner</span>${canEdit ? '' : '<span class="pill readonly">Salt okunur</span>'}`}</div>
        ${(modulG || fr65Capture)
          ? `<div class="offline-card-state ${offlineState.ready ? 'ok' : 'no'}"><b>${offlineState.ready ? '✓ Çevrimdışı çalışmaya hazır' : '⚠ Çevrimdışı çalışmaya hazır değil'}</b><small>${esc(offlineState.detail)}</small></div>`
          : '<div class="unsupported-card-note">Eski kayıt korundu; bu uygulamada açılmaz. B/E/H1 formları Form Doldurucu programında yürütülür.</div>'}`;
    if (supported) card.onclick = () => fr65Capture
      ? showDenetim(d.id, Profile.isTechnicalManager && !denetimSahibiMi(d))
      : (tamamlandi ? showTamamlananDenetimSecimi(d, rowsBy[d.id] || []) : showDenetim(d.id, Profile.isTechnicalManager && !denetimSahibiMi(d)));
    cardRow.appendChild(card);
    dl.appendChild(cardRow);
  }

  // Toplu "Sahaya Hazırlık" rozeti — sahaya çıkılabilecek denetimlerin
  // çevrimdışı hazırlık özeti + tek dokunuşla hepsini doğrula.
  if (hazirlikAktif.length) {
    const hazirSayi = hazirlikAktif.filter(x => x.ready).length;
    const eksik = hazirlikAktif.filter(x => !x.ready);
    const badge = document.createElement('div');
    badge.className = `prep-badge ${eksik.length ? 'no' : 'ok'}`;
    badge.innerHTML = `<div><b>Sahaya Hazırlık · ${hazirSayi}/${hazirlikAktif.length} denetim hazır</b>` +
      `<small>${eksik.length ? `${eksik.length} denetim çevrimdışı çalışmaya hazır değil` : 'Tüm aktif denetimler bu cihazda çevrimdışı çalışmaya hazır'}</small></div>` +
      (eksik.length ? '<button class="btn btn-ghost" id="prepVerifyAll">Tümünü doğrula</button>' : '');
    dl.insertBefore(badge, dl.firstChild);
    const btnPrep = document.getElementById('prepVerifyAll');
    if (btnPrep) btnPrep.onclick = async () => {
      btnPrep.disabled = true;
      let ok = 0;
      for (let i = 0; i < eksik.length; i++) {
        btnPrep.textContent = `Doğrulanıyor ${i + 1}/${eksik.length}…`;
        try {
          const sonuc = await sahayaHazirla(eksik[i].d, rowsBy[eksik[i].d.id] || []);
          if (sonuc.ready) ok++;
        } catch (e) { console.warn('Toplu hazırlık: bir denetim doğrulanamadı', e); }
      }
      toast(`${ok}/${eksik.length} denetim hazır işaretlendi`);
      await showList();
    };
  }

  const applyListFilters = () => {
    const query = listSearch.trim().toLocaleLowerCase('tr-TR');
    let visible = 0;
    dl.querySelectorAll('.inspection-card-row').forEach(row => {
      const card = row.querySelector('.dcard');
      if (!card) return;
      const show = (!query || card.dataset.search.includes(query)) &&
        (listDateFilter === 'all' || card.dataset.date === listDateFilter);
      row.classList.toggle('hidden', !show);
      if (show) visible++;
    });
    const noResult = document.getElementById('listNoResult');
    if (noResult) noResult.classList.toggle('hidden', visible > 0 || denetimler.length === 0);
  };
  document.getElementById('listSearch').oninput = e => { listSearch = e.target.value; applyListFilters(); };
  document.getElementById('listDate').onchange = e => { listDateFilter = e.target.value || 'all'; applyListFilters(); };
  document.getElementById('listClear').onclick = () => {
    listSearch = ''; listDateFilter = 'all';
    document.getElementById('listSearch').value = '';
    document.getElementById('listDate').value = '';
    applyListFilters();
  };
  applyListFilters();
  const btnYeni = document.getElementById('btnYeni');
  if (btnYeni) btnYeni.onclick = showYeniForm;
  const btnYedekSec = document.getElementById('btnYedekSec');
  if (btnYedekSec) btnYedekSec.onclick = yedekSecimiGoster;
  const btnYedekGeri = document.getElementById('btnYedekGeri');
  if (btnYedekGeri) btnYedekGeri.onclick = yedekGeriYuklemeGoster;
  const btnTanilama = document.getElementById('btnTanilama');
  if (btnTanilama) btnTanilama.onclick = tanilamaPaylas;
  const btnCihazDurum = document.getElementById('btnCihazDurum');
  if (btnCihazDurum) btnCihazDurum.onclick = cihazDurumlariniGoster;
}

async function showTamamlananDenetimSecimi(d, rows = []) {
  if (!sahaUygulamaModuluGMi(d)) {
    toast('Bu eski kayıt Modül G değil. B/E/H1 formları Form Doldurucu programında yürütülür.');
    return;
  }
  let tamamlananRows = rows;
  if (!tamamlananRows.length && navigator.onLine) {
    try {
      await Sync.pullSaha(d.id);
      tamamlananRows = (await DB.allByIndex('saha', 'byDenetim', d.id)).sort(siraKarsilastir);
    } catch (_) {
      // İnceleme seçeneği çevrimdışıyken de kullanılabilsin; takip kararı
      // kaynak maddeler cihaza indikten sonra görünür olacaktır.
    }
  }
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="modal completed-choice">
      <button class="close">×</button>
      <h3>Tamamlanmış denetim</h3>
      <div class="onay-box">
        <div class="onay-satir"><span>Müşteri</span><b>${esc(d.musteri_unvani)}</b></div>
        <div class="onay-satir"><span>Seri no</span><b>${esc(d.asansor_seri_no)}</b></div>
        <div class="onay-satir"><span>Tarih</span><b>${esc(d.denetim_tarihi || '')}</b></div>
        <div class="onay-satir"><span>Denetçi</span><b>${esc(d.denetimi_yapan || d.olusturan_ad || d.olusturan_email || 'Kayıt yok')}</b></div>
      </div>
      <button class="mode-choice" id="completedReview"><b>İnceleme</b><span>Sonuçları, açıklamaları ve seri numaralarını salt okunur açar. Yetkiniz varsa içeriden iz bırakan düzeltme başlatabilirsiniz.</span></button>
      <button class="mode-choice" id="completedSummary"><b>Tamamlanmış Denetim Özeti</b><span>Sonuçları, uygunsuzlukları, fotoğraf arşiv durumunu ve takip bilgisini kısa özet olarak gösterir.</span></button>
      <button class="mode-choice" id="completedHandover"><b>Devir Teslim</b><span>Denetimin tamamlandığını başka bir yetkiliye bildirir; ilk denetçi ve geçmiş kayıtları değişmez.</span></button>
      ${canStartFollowup(d, tamamlananRows) ? '<button class="mode-choice followup" id="completedFollowup"><b>Takip Denetimi</b><span>Önceki sonuçlara bağlı yeni ve bağımsız bir Modül G takip denetimi oluşturur.</span></button>' : ''}
      ${kontrolProfili(d) !== KONTROL_PROFILLERI.TAM ? '<div class="photo-help">Takip denetimi yalnız Modül G için kullanılabilir.</div>' : ''}
    </div>`;
  document.body.appendChild(ov);
  const close = () => ov.remove();
  ov.querySelector('.close').onclick = close;
  ov.onclick = e => { if (e.target === ov) close(); };
  ov.querySelector('#completedReview').onclick = () => { close(); showDenetim(d.id, true); };
  ov.querySelector('#completedSummary').onclick = async () => { close(); await tamamlanmisDenetimOzetiniGoster(d, tamamlananRows); };
  ov.querySelector('#completedHandover').onclick = async () => { close(); await denetimDevirTesliminiGoster(d); };
  const followup = ov.querySelector('#completedFollowup');
  if (followup) followup.onclick = async () => {
    const takipMesaji = 'Önceki denetim değiştirilmeyecek. Ona bağlı yeni bir Modül G takip denetimi oluşturulsun mu?';
    if (!confirm(takipMesaji)) return;
    const takipKaynak = { ...d };
    if (!takipKaynak.firma_adresi) {
      takipKaynak.firma_adresi = window.prompt('Takip denetimi için asansör firmasının adresini girin:')?.trim() || '';
    }
    if (!takipKaynak.denetim_adresi) {
      takipKaynak.denetim_adresi = window.prompt('Takip denetimi için asansörün bulunduğu adresi girin:')?.trim() || '';
    }
    if (!takipKaynak.firma_adresi || !takipKaynak.denetim_adresi) {
      toast('Takip denetimi için firma ve asansör adresleri gerekli');
      return;
    }
    followup.disabled = true;
    followup.querySelector('b').textContent = 'Takip hazırlanıyor…';
    try {
      const yeniId = await takipDenetimiOlustur(takipKaynak);
      close();
      await showDenetim(yeniId, false, 'previous_bad');
    } catch (error) {
      followup.disabled = false;
      followup.querySelector('b').textContent = 'Takip Denetimi';
      toast(error.message || 'Takip denetimi oluşturulamadı');
    }
  };
}

function duzeltmeNedeniSec(d) {
  const nedenler = ['Yanlış seçim düzeltmesi', 'Eksik bilgi tamamlama', 'Saha notu düzeltmesi'];
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="modal completed-choice">
      <button class="close">×</button>
      <h3>Düzeltme başlat</h3>
      <div class="photo-help">Yapılan her değişiklik; kişi, tarih, eski değer ve yeni değerle birlikte geçmişte saklanacaktır.</div>
      ${nedenler.map(neden => `<button type="button" class="mode-choice correction-reason" data-reason="${esc(neden)}"><b>${esc(neden)}</b></button>`).join('')}
    </div>`;
  document.body.appendChild(ov);
  const close = () => ov.remove();
  ov.querySelector('.close').onclick = close;
  ov.onclick = e => { if (e.target === ov) close(); };
  ov.querySelectorAll('[data-reason]').forEach(btn => btn.onclick = async () => {
    btn.disabled = true;
    const fr65Capture = fr65SahaKaydiMi(d);
    const expectedUpdatedAt = d.updated_at;
    const now = new Date().toISOString();
    d.denetim_durumu = 'Gözden Geçirme';
    d.duzeltme_oturumu_id = crypto.randomUUID();
    d.duzeltme_nedeni = btn.dataset.reason;
    d.duzeltme_baslatildi_at = now;
    d.duzeltme_baslatan_email = Profile.email;
    d.duzeltme_baslatan_ad = Profile.name;
    d.calisma_tamamlandi_at = null;
    d.butunluk_ozeti = null;
    d.butunluk_hash = null;
    d.butunluk_hesaplandi_at = null;
    d.updated_at = now;
    await localWrite('denetimler', d, 'denetimler', fr65Capture ? {
      conditional_update: {
        expected_updated_at: expectedUpdatedAt,
        fields: [
          'denetim_durumu', 'duzeltme_oturumu_id', 'duzeltme_nedeni',
          'duzeltme_baslatildi_at', 'duzeltme_baslatan_email', 'duzeltme_baslatan_ad',
          'calisma_tamamlandi_at', 'butunluk_ozeti', 'butunluk_hash', 'butunluk_hesaplandi_at', 'updated_at',
        ],
      },
    } : undefined);
    close();
    inspectionReadOnly = false;
    toast('Denetim izlenebilir düzeltmeye açıldı');
    await renderDenetim();
  });
}

async function takipDenetimiOlustur(kaynak) {
  if (!sahaUygulamaModuluGMi(kaynak)) {
    throw new Error('Bu uygulamada yalnız Modül G denetimlerine bağlı takip kaydı oluşturulabilir');
  }
  const kaynakRows = (await DB.allByIndex('saha', 'byDenetim', kaynak.id)).sort(siraKarsilastir);
  if (!kaynakRows.length) throw new Error('Önceki denetimin maddeleri bu cihazda bulunmuyor');
  if (!canStartFollowup(kaynak, kaynakRows)) throw new Error('Takip denetimi oluşturma yetkiniz yok');
  const takipKaynakRows = kaynakRows;

  const tumDenetimler = await DB.all('denetimler');
  const anaId = kaynak.takip_ana_denetim_id || kaynak.id;
  const mevcutSiralar = tumDenetimler
    .filter(item => item.takip_ana_denetim_id === anaId)
    .map(item => Number(item.takip_sira_no) || 0);
  const takipSira = Math.max(0, ...mevcutSiralar) + 1;
  const now = new Date().toISOString();
  const d = {
    id: crypto.randomUUID(),
    dosya_no: kaynak.dosya_no || null,
    asansor_kimlik_no: kaynak.asansor_kimlik_no || null,
    musteri_unvani: kaynak.musteri_unvani,
    firma_adresi: kaynak.firma_adresi || null,
    denetim_adresi: kaynak.denetim_adresi,
    asansor_seri_no: kaynak.asansor_seri_no,
    modul: kaynak.modul,
    denetim_turu: kaynak.denetim_turu,
    kontrol_profili: kaynak.kontrol_profili,
    ana_tip: kaynak.ana_tip || null,
    tip_varyant_kodu: kaynak.tip_varyant_kodu || null,
    ana_standart: kaynak.ana_standart,
    ek_standartlar: kaynak.ek_standartlar || [],
    bina_asansor_sayisi: kaynak.bina_asansor_sayisi || null,
    kabin_giris_duzeni: kaynak.kabin_giris_duzeni || null,
    kabin_kapi_acilma_tipi: kaynak.kabin_kapi_acilma_tipi || null,
    tahrik_tipi: kaynak.tahrik_tipi,
    makine_dairesi_tipi: kaynak.makine_dairesi_tipi,
    beyan_yuku_kg: kaynak.beyan_yuku_kg || null,
    beyan_hizi_ms: kaynak.beyan_hizi_ms || null,
    kapasite_kisi: kaynak.kapasite_kisi || null,
    durak_sayisi: kaynak.durak_sayisi || null,
    aski_tipi: kaynak.aski_tipi || null,
    denetimi_yapan: Profile.name,
    denetim_tarihi: localDateISO(),
    denetim_durumu: 'Devam Ediyor',
    takip_ana_denetim_id: anaId,
    takip_onceki_denetim_id: kaynak.id,
    takip_sira_no: takipSira,
    takip_atanan_email: Profile.email,
    takip_atanan_ad: Profile.name,
    takip_atama_at: now,
    takip_onceki_seri_numaralari: seriNumaralariNormalize(kaynak.seri_numaralari),
    saha_tamamlandi_at: null,
    gozden_gecirme_at: null,
    calisma_tamamlandi_at: null,
    snapshot_kilitli_at: now,
    snapshot_app_build_id: APP_VERSION,
    snapshot_kutuphane_hash: kaynak.snapshot_kutuphane_hash || null,
    snapshot_bolum_surumleri: kaynak.snapshot_bolum_surumleri || null,
    snapshot_madde_sayisi: null,
    snapshot_madde_set_hash: null,
    snapshot_content_hash: null,
    butunluk_ozeti: null,
    butunluk_hash: null,
    butunluk_hesaplandi_at: null,
    seri_numaralari: { schema_version: 1 },
    form_cikti_snapshot: kaynak.form_cikti_snapshot || await FormOutput.createSnapshot(kaynak.ana_standart, kaynak.modul),
    olusturan_email: Profile.email,
    olusturan_ad: Profile.name,
    created_at: now,
    updated_at: now,
  };

  const sonucAlanlari = new Set([
    'id','denetim_id','durum','denetci_gordu','bulgu_secenegi','diger_bulgu','aciklama',
    'olcu1_degeri','olcu2_degeri','olcum_degerleri','ic_kontrol_notu','gozden_gecirme_nedeni',
    'gozden_gecirme_notu','guncelleyen_email','olusturan_email','olusturan_ad','son_degistiren_email',
    'son_degistiren_ad','son_degistiren_rol','son_degistiren_at','created_at','updated_at'
  ]);
  const sahaRows = takipKaynakRows.map(eski => {
    const yeni = {};
    Object.entries(eski).forEach(([key, value]) => { if (!sonucAlanlari.has(key)) yeni[key] = value; });
    return Object.assign(yeni, {
      id: crypto.randomUUID(),
      denetim_id: d.id,
      takip_kaynak_saha_kontrol_id: eski.id,
      takip_onceki_durum: effectiveDurum(eski),
      takip_onceki_aciklama: eski.aciklama || null,
      takip_onceki_bulgu_secenegi: eski.bulgu_secenegi || null,
      takip_onceki_diger_bulgu: eski.diger_bulgu || null,
      durum: eski.otomatik_uygulanmaz ? 'Uygulanmaz' : null,
      otomatik_uygulanmaz: !!eski.otomatik_uygulanmaz,
      denetci_gordu: false,
      bulgu_secenegi: null,
      diger_bulgu: null,
      aciklama: null,
      olcu1_degeri: null,
      olcu2_degeri: null,
      olcum_degerleri: {},
      ic_kontrol_notu: null,
      gozden_gecirme_nedeni: null,
      gozden_gecirme_notu: null,
      guncelleyen_email: Profile.email,
      olusturan_email: Profile.email,
      olusturan_ad: Profile.name,
      updated_at: now,
    });
  });
  const takipItemIds = sahaRows.map(row => row.madde_id).sort();
  const takipContentManifest = sahaRows
    .map(row => ({ madde_id: row.madde_id, hash: row.snapshot_madde_hash || null }))
    .sort((a,b) => a.madde_id.localeCompare(b.madde_id, 'tr'));
  d.snapshot_madde_sayisi = sahaRows.length;
  d.snapshot_madde_set_hash = await sha256Hex(takipItemIds.join('|'));
  d.snapshot_content_hash = await sha256Hex(stableStringify(takipContentManifest));

  await localWrite('denetimler', d, 'denetimler');
  for (let i = 0; i < sahaRows.length; i += 200) {
    await localWrite('saha_kontrol', sahaRows.slice(i, i + 200), 'saha');
  }
  toast(`T${takipSira} takip denetimi hazırlandı`);
  return d.id;
}

/* ---- Yeni denetim ---- */
async function yeniDenetimSeriNoUygunMu(seri) {
  const seriAnahtari = normSeriNo(seri);
  // Liste ekranı ile aynı görünürlük kuralı kullanılır. Cihazda eski bir
  // oturumdan kalmış, kullanıcıya görünmeyen kayıt yeni denetimi engellemez.
  let ayniSeriKayitlari = (await DB.all('denetimler'))
    .filter(item => denetimGorunebilirMi(item) && normSeriNo(item.asansor_seri_no) === seriAnahtari);
  if (navigator.onLine) {
    try {
      const sunucudakiKayitlar = await API.select('denetimler', `select=id,musteri_unvani,asansor_seri_no,denetim_tarihi,denetim_durumu&asansor_seri_no=ilike.${encodeURIComponent(seri)}&limit=20`);
      const birlesikKayitlar = new Map(ayniSeriKayitlari.map(item => [item.id, item]));
      sunucudakiKayitlar.filter(item => normSeriNo(item.asansor_seri_no) === seriAnahtari)
        .forEach(item => birlesikKayitlar.set(item.id, { ...birlesikKayitlar.get(item.id), ...item }));
      ayniSeriKayitlari = [...birlesikKayitlar.values()];
    } catch (error) {
      const detail = error instanceof Error
        ? `${error.name}${error.message ? `: ${error.message}` : ''}`
        : `Bilinmeyen hata: ${String(error)}`;
      console.error('[AVES] Seri no kontrol hatası', error);
      toast(`Seri no kontrol hatası: ${detail.replace(/\s+/g, ' ').slice(0, 120)}. Kayıt açılmadı.`, 10000);
      return false;
    }
  }
  const warning = seriNoTekrarUyarisi(ayniSeriKayitlari);
  if (warning) { toast(warning); return false; }
  return true;
}

function showFr65OnayEkrani(f) {
  if (!f || f.akış !== 'fr65_saha_v1' || !['Modül B','Modül E','Modül H1'].includes(f.modul)) {
    toast('FR.65 saha veri kaydı için modül seçimi doğrulanamadı');
    return;
  }
  const ov = document.createElement('div');
  ov.className = 'overlay';
  const row = (label, value) => `<div class="onay-satir"><span>${esc(label)}</span><b>${esc(value || '—')}</b></div>`;
  ov.innerHTML = `<div class="modal">
      <h3>Saha veri kaydını başlat</h3>
      <div class="onay-box">${row('Mühendis', f.muhendis)}${row('Asansör firması', f.musteri)}${row('Firma adresi', f.firmaAdresi)}${f.adres ? row('Asansörün bulunduğu adres', f.adres) : ''}${f.seri ? row('Asansör seri no', f.seri) : ''}${row('Modül', f.modul)}${row('Tahrik tipi', f.tahrik)}${row('Makine dairesi', f.md)}${row('Anma yükü', f.yuk ? `${f.yuk} kg` : '')}${row('Kişi kapasitesi', f.kapasite ? `${f.kapasite} kişi` : '')}${row('Hız', f.hiz ? `${f.hiz} m/s` : '')}${row('Durak sayısı', f.durak)}${row('Kat sayısı', f.kat)}</div>
      <div class="photo-help">Bu kayıt yalnız sahada görülen ve ölçülen bilgileri toplar. Uygunluk veya belgelendirme kararı üretmez.</div>
      <button class="btn btn-ghost" id="fr65Cancel" style="margin-bottom:8px">‹ Bilgileri düzelt</button>
      <button class="btn btn-primary" id="fr65Start">Saha kaydını başlat</button>
    </div>`;
  document.body.appendChild(ov);
  ov.querySelector('#fr65Cancel').onclick = () => ov.remove();
  ov.onclick = event => { if (event.target === ov) ov.remove(); };
  ov.querySelector('#fr65Start').onclick = async () => {
    const button = ov.querySelector('#fr65Start');
    button.disabled = true;
    button.textContent = 'Kaydediliyor…';
    try {
      const id = await olusturFr65Kaydi(f);
      // Çevrimiçiyken yeni kaydın sunucu sürümü eşlenene kadar (en çok 5 sn) bekle; kullanıcı hemen
      // seri no / alan girerse ilk düzenleme yanlış sürüme dayanıp çakışma vermesin.
      if (navigator.onLine && API.loggedIn) {
        button.textContent = 'Sunucuya kaydediliyor…';
        try { await Promise.race([Sync.pushOutbox(), new Promise(resolve => setTimeout(resolve, 5000))]); }
        catch (error) { console.warn('Yeni FR.65 kaydı hemen senkronlanamadı; arka planda denenecek', error.message); }
      }
      ov.remove();
      await showDenetim(id);
    } catch (error) {
      console.error('FR.65 saha kaydı oluşturulamadı', error);
      button.disabled = false;
      button.textContent = 'Saha kaydını başlat';
      toast(error.message || 'Saha kaydı oluşturulamadı; bilgiler korunuyor');
    }
  };
}

async function olusturFr65Kaydi(f) {
  const moduleMap = {
    'Modül B': { type: DENETIM_TURLERI.MODUL_B, profile: KONTROL_PROFILLERI.MODUL_B },
    'Modül E': { type: DENETIM_TURLERI.MODUL_E, profile: KONTROL_PROFILLERI.SAHA_TEYIDI_E },
    'Modül H1': { type: DENETIM_TURLERI.MODUL_H1, profile: KONTROL_PROFILLERI.SAHA_TEYIDI_H1 },
  };
  const module = moduleMap[f.modul];
  if (!module || f.akış !== 'fr65_saha_v1' || module.type !== f.denetimTuru || module.profile !== f.kontrolProfili) {
    throw new Error('Modül ve saha veri akışı eşleşmiyor');
  }
  const sayisalAlanlar = {
    yuk: Number(f.yuk), kapasite: Number(f.kapasite), hiz: Number(f.hiz), durak: Number(f.durak),
    kat: f.kat == null || f.kat === '' ? null : Number(f.kat),
    binaAsansorSayisi: f.binaAsansorSayisi == null || f.binaAsansorSayisi === '' ? null : Number(f.binaAsansorSayisi),
    seyirMesafesi: f.seyirMesafesi == null || f.seyirMesafesi === '' ? null : Number(f.seyirMesafesi),
    kuyuYuksekligi: f.kuyuYuksekligi == null || f.kuyuYuksekligi === '' ? null : Number(f.kuyuYuksekligi),
  };
  if (!f.musteri || !f.firmaAdresi || !['Elektrikli','Hidrolik'].includes(f.tahrik) ||
      !['MR','MRL'].includes(f.md) || !fr65SahaSayisalAlanlariGecerliMi(sayisalAlanlar)) {
    throw new Error('Firma adı ve adresi, tahrik ve makine dairesi tipi, tam sayı yük/kapasite/durak ile geçerli hız ve ölçüler gerekli');
  }
  const now = new Date().toISOString();
  const capture = AVES_TEKNIK_DOSYA_FORM.emptyFr65Capture(now);
  const fr65 = capture.forms.FR65;
  const generalValues = {
    tahrik_tipi: f.tahrik,
    makine_dairesi: f.md,
    yuk: sayisalAlanlar.yuk,
    kapasite: sayisalAlanlar.kapasite,
    hiz: sayisalAlanlar.hiz,
    durak_sayisi: sayisalAlanlar.durak,
    kat_sayisi: sayisalAlanlar.kat,
    bina_asansor_sayisi: sayisalAlanlar.binaAsansorSayisi,
    seyir_mesafesi: sayisalAlanlar.seyirMesafesi,
    kuyu_yuksekligi: sayisalAlanlar.kuyuYuksekligi,
  };
  fr65.values = Object.fromEntries(Object.entries(generalValues)
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
    .map(([key, value]) => [key, { field_value: String(value) }]));
  const d = {
    id: crypto.randomUUID(),
    dosya_no: f.dosya || null,
    musteri_unvani: f.musteri,
    firma_adresi: f.firmaAdresi,
    denetim_adresi: f.adres || null,
    // asansor_seri_no sütunu NOT NULL; seri no kayıt açıldıktan sonra sahada girilir.
    asansor_seri_no: f.seri || '',
    asansor_kimlik_no: f.kimlikNo || null,
    modul: f.modul,
    denetim_turu: module.type,
    kontrol_profili: module.profile,
    ana_tip: null,
    tip_varyant_kodu: null,
    // Mevcut DB sözleşmesinde ana_standart zorunludur. 81-20 burada yalnız
    // bu alanı karşılayan uyum değeridir; FR.65 kaydı standart checklist'i
    // veya uygunluk değerlendirmesi başlatmaz. A3 hiçbir B/E/H1 kaydına yazılmaz.
    ana_standart: '81-20',
    ek_standartlar: [],
    bina_asansor_sayisi: sayisalAlanlar.binaAsansorSayisi,
    kabin_giris_duzeni: null,
    kabin_kapi_acilma_tipi: null,
    tahrik_tipi: f.tahrik,
    makine_dairesi_tipi: f.md,
    beyan_yuku_kg: sayisalAlanlar.yuk,
    beyan_hizi_ms: sayisalAlanlar.hiz,
    kapasite_kisi: sayisalAlanlar.kapasite,
    durak_sayisi: sayisalAlanlar.durak,
    aski_tipi: null,
    denetim_form_kayitlari: capture,
    teknik_dosya_kayitlari: { schema_version: 1, updated_at: now, fr65 },
    denetimi_yapan: f.muhendis,
    denetim_tarihi: localDateISO(),
    denetim_durumu: 'Devam Ediyor',
    saha_tamamlandi_at: null,
    gozden_gecirme_at: null,
    calisma_tamamlandi_at: null,
    offline_hazir_at: null,
    offline_hazirlayan_email: null,
    expected_item_count: null,
    expected_item_set_hash: null,
    app_build_id: null,
    kutuphane_content_hash: null,
    snapshot_kilitli_at: null,
    snapshot_app_build_id: APP_VERSION,
    snapshot_kutuphane_hash: null,
    snapshot_bolum_surumleri: null,
    snapshot_madde_sayisi: null,
    snapshot_madde_set_hash: null,
    snapshot_content_hash: null,
    butunluk_ozeti: null,
    butunluk_hash: null,
    butunluk_hesaplandi_at: null,
    offline_check: null,
    seri_numaralari: { schema_version: 1 },
    form_cikti_snapshot: {},
    olusturan_email: Profile.email,
    olusturan_ad: Profile.name,
    created_at: now,
    updated_at: now,
  };
  await localWrite('denetimler', d, 'denetimler', { insert_only: true });
  toast('FR.65 saha veri kaydı cihazda oluşturuldu');
  return d.id;
}

function denetimSayisiOku(alan) {
  if (!alan || alan.value === '') return null;
  return alan.valueAsNumber;
}

function fr65SahaSayisalAlanlariGecerliMi(f) {
  const pozitifTamSayi = value => Number.isInteger(value) && value > 0;
  const opsiyonelPozitifTamSayi = value => value === null || pozitifTamSayi(value);
  const opsiyonelOlcu = value => value == null || (Number.isFinite(value) && value >= 0);
  return pozitifTamSayi(f.yuk) && pozitifTamSayi(f.kapasite) &&
    Number.isFinite(f.hiz) && f.hiz > 0 && pozitifTamSayi(f.durak) &&
    opsiyonelPozitifTamSayi(f.kat) && opsiyonelPozitifTamSayi(f.binaAsansorSayisi) &&
    opsiyonelOlcu(f.seyirMesafesi) && opsiyonelOlcu(f.kuyuYuksekligi);
}

function genelDenetimSayisalAlanlariGecerliMi(f) {
  return Number.isInteger(f.yuk) && f.yuk > 0 &&
    Number.isFinite(f.hiz) && f.hiz > 0 &&
    Number.isInteger(f.kapasite) && f.kapasite > 0 &&
    Number.isInteger(f.durak) && f.durak > 0 &&
    Number.isInteger(f.binaAsansorSayisi) && f.binaAsansorSayisi > 0;
}
