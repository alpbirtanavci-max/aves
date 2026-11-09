/* ============================================================
   AVES Saha Denetim — kapanış, devir ve özet
   Kapanış özeti, devir teslim, tamamlanmış denetim özeti, durum değişimi, özet ekranı.
   (Eski UI kapanışının parçasıdır: ui-durum → ui-foto → ui-yonetim → ui-kayit → ui-liste → ui-yeni →
   ui-fr65 → ui-denetim → ui-taslak → ui-form → ui-madde → ui-kapanis → ui-son; ortak global kapsam.)
   ============================================================ */
'use strict';

async function kapanisOzetiniGoster(yeniDurum) {
  const d = await DB.get('denetimler', currentDenetimId);
  const rows = await DB.allByIndex('saha', 'byDenetim', currentDenetimId);
  const formOnly = formOdakliDenetimMi(d, rows);
  const formStats = formOnly ? denetimFormIstatistikleri(d) : null;
  const formDefinitions = formOnly ? modulFormSeti(d) : [];
  const formKaydiOlmayanlar = formOnly ? formDefinitions.filter(form =>
    !AVES_DENETIM_FORM_SETI.formHasData(denetimFormKaydi(d), form.key)
  ) : [];
  const bakilmadi = rows.filter(r => !isFlowComplete(r));
  const eksikSeriler = seriEksikleri(d);
  if (bakilmadi.length || eksikSeriler.length) {
    await denetimDurumuDegistir(yeniDurum);
    return;
  }
  const fotograflar = (await DB.allByIndex('fotograflar', 'byDenetim', currentDenetimId)).filter(foto => !foto.deleted_at);
  const bekleyenFotograflar = fotograflar.filter(foto => foto.sync_status === 'pending').length;
  const { items: inspectionOutbox, korunan: korunanIslemler, bekleyen: bekleyenIslemler } = await Sync.denetimSyncOzeti(currentDenetimId);
  const offlineState = await cevrimdisiHazirlikDurumu(d, rows);
  const seriKayitSayisi = seriNumarasiSayisi(d);
  const seriBeklenenSayi = seriBeklenenMinimum(d);
  const guvenKartlari = AVES_KAPANIS_GUVEN_OZETI.kartlar({
    seriKayitSayisi, seriBeklenenSayi,
    offlineReady: offlineState.ready, offlineDetail: offlineState.detail,
    korunanIslemler, bekleyenIslemler,
    fotografSayisi: fotograflar.length, bekleyenFotograflar,
  });
  const sonuc = {
    uygun: rows.filter(row => row.durum === 'Kontrol tamamlandı').length,
    uygunDegil: rows.filter(row => row.durum === 'Olumsuz bulgu').length,
    uygulanmaz: rows.filter(row => row.durum === 'Uygulanmaz').length,
  };
  const sonrakiAdim = yeniDurum === 'Gözden Geçirme'
    ? 'Saha kontrolü Gözden Geçirme aşamasına alınacak; sonuçları burada gerekirse düzeltebilirsiniz.'
    : 'Çalışma tamamlanacak ve denetim listesine dönülecek. Gerekirse daha sonra yeniden düzenlemeye açabilirsiniz.';
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="modal">
      <button class="close" aria-label="Kapat">×</button>
      <h3>Kapanış öncesi denetim özeti</h3>
      <div class="onay-box">
        <div class="onay-satir"><span>Firma</span><b>${esc(d.musteri_unvani)}</b></div>
        <div class="onay-satir"><span>Asansör seri no</span><b>${esc(d.asansor_seri_no)}</b></div>
        <div class="onay-satir"><span>Denetim tarihi</span><b>${esc(d.denetim_tarihi)}</b></div>
      </div>
      ${formOnly
        ? `<div class="integrity-card pending"><b>Modül ${denetimFormModulu(d)} form seti</b><small>${formStats.ozet.started}/${formStats.ozet.total} formda veri kaydı var. Bu bir uygunluk veya tamlık sonucu değildir.</small></div>
           ${formKaydiOlmayanlar.length ? `<div class="integrity-card pending"><b>Henüz veri kaydı bulunmayan formlar (${formKaydiOlmayanlar.length})</b><small>${formKaydiOlmayanlar.map(form => `ÜB.${esc(form.key)} · ${esc(form.title)}`).join('<br>')}</small></div>` : ''}
           <label class="form-review-confirm"><input type="checkbox" id="formSetReviewConfirm"> <span>Form setini gözden geçirdim; boş bırakılan veya sonraya bırakılan kayıtları değerlendirdim.</span></label>`
        : `<div class="integrity-card ok"><b>Sonuçlar</b><small>${sonuc.uygun} Uygun · ${sonuc.uygunDegil} Uygun Değil · ${sonuc.uygulanmaz} Uygulanmaz</small></div>`}
      ${guvenKartlari.map(kart => `<div class="integrity-card ${kart.durum}"><b>${esc(kart.baslik)}</b><small>${esc(kart.detay)}</small></div>`).join('')}
      <div class="photo-help">${esc(sonrakiAdim)}</div>
      <button class="btn btn-primary" id="kapanisOnay">Devam et</button>
      <button class="btn btn-ghost" id="kapanisVazgec">Denetime dön</button>
    </div>`;
  document.body.appendChild(ov);
  const kapat = () => ov.remove();
  ov.querySelector('.close').onclick = kapat;
  ov.querySelector('#kapanisVazgec').onclick = kapat;
  ov.onclick = event => { if (event.target === ov) kapat(); };
  const confirmButton = ov.querySelector('#kapanisOnay');
  const formReviewConfirm = ov.querySelector('#formSetReviewConfirm');
  if (formReviewConfirm) {
    confirmButton.disabled = true;
    formReviewConfirm.onchange = () => { confirmButton.disabled = !formReviewConfirm.checked; };
  }
  confirmButton.onclick = async () => {
    if (formOnly) {
      if (!formReviewConfirm.checked) return;
      confirmButton.disabled = true;
      const latest = await DB.get('denetimler', currentDenetimId) || d;
      const formRecord = AVES_DENETIM_FORM_SETI.normalize(latest.denetim_form_kayitlari, latest.teknik_dosya_kayitlari);
      const now = new Date().toISOString();
      formRecord.form_seti_gozden_gecirildi_at = now;
      formRecord.form_seti_gozden_geciren_email = Profile.email || API.email || null;
      formRecord.form_seti_gozden_geciren_ad = Profile.name || null;
      formRecord.updated_at = now;
      latest.denetim_form_kayitlari = formRecord;
      latest.updated_at = now;
      try {
        await localWrite('denetimler', latest, 'denetimler');
      } catch (error) {
        confirmButton.disabled = false;
        toast('Form gözden geçirme kaydı cihazda saklanamadı');
        console.error('Form seti gözden geçirme kaydı başarısız', error);
        return;
      }
    } else confirmButton.disabled = true;
    await denetimDurumuDegistir(yeniDurum, ov, true);
  };
}

async function denetimDevirTesliminiGoster(denetim) {
  const d = await DB.get('denetimler', denetim.id) || denetim;
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="modal"><button class="close" aria-label="Kapat">×</button><h3>Devir Teslim</h3>
      <div class="photo-help">İlk denetçi, sonuçlar ve geçmiş kayıtları değişmez; yalnız tamamlanmış kaydın teslim bilgisi tutulur.</div>
      <div class="onay-satir"><span>Denetim</span><b>${esc(d.musteri_unvani)} · ${esc(d.asansor_seri_no)}</b></div>
      <label class="field full"><span>Devredilen kişi / birim *</span><input id="devirAlan" placeholder="Ad soyad veya birim"></label>
      <label class="field full"><span>E-posta veya iletişim (opsiyonel)</span><input id="devirEmail" placeholder="ornek@firma.com"></label>
      <label class="field full"><span>Devir notu (opsiyonel)</span><textarea id="devirNotu" placeholder="Teslim kapsamı veya açıklama…"></textarea></label>
      <button class="btn btn-primary" id="devirKaydet">Devir teslimi kaydet</button></div>`;
  document.body.appendChild(ov);
  const close = () => ov.remove();
  ov.querySelector('.close').onclick = close;
  ov.onclick = event => { if (event.target === ov) close(); };
  ov.querySelector('#devirKaydet').onclick = async () => {
    const alan = ov.querySelector('#devirAlan').value.trim();
    if (!alan) { toast('Devredilen kişi veya birimi girin'); return; }
    const hedef = await DB.get('denetimler', d.id);
    if (!hedef) { toast('Denetim kaydı bulunamadı'); return; }
    const now = new Date().toISOString();
    hedef.devir_edilen_ad = alan;
    hedef.devir_edilen_email = ov.querySelector('#devirEmail').value.trim() || null;
    hedef.devir_at = now;
    hedef.devir_notu = ov.querySelector('#devirNotu').value.trim() || null;
    hedef.updated_at = now;
    await localWrite('denetimler', hedef, 'denetimler');
    close();
    toast('Devir teslim bilgisi kaydedildi');
  };
}

async function takipKisaCiktiYazdir(d, rows) {
  const takipRows = rows.filter(row => row.takip_onceki_durum === 'Olumsuz bulgu');
  if (!takipRows.length) { toast('Bu takip kaydında aktarılmış uygunsuzluk bulunmuyor'); return; }
  const kaynak = await DB.get('denetimler', d.takip_onceki_denetim_id);
  const hedef = window.open('', '_blank');
  if (!hedef) { toast('Çıktı penceresi açılamadı; tarayıcı açılır pencereyi engelliyor olabilir'); return; }
  const satirlar = takipRows.map((row, index) => `<tr><td>${index + 1}</td><td><b>${esc(row.standart_madde_no || row.madde_id)}</b><br>${esc(row.kontrol_basligi || '')}</td><td>${esc(row.takip_onceki_bulgu_secenegi || 'Uygun Değil')}${row.takip_onceki_diger_bulgu || row.takip_onceki_aciklama ? `<br><small>${esc(row.takip_onceki_diger_bulgu || row.takip_onceki_aciklama)}</small>` : ''}</td><td><b>${esc(effectiveDurum(row) || 'Bakılmadı')}</b>${row.bulgu_secenegi || row.diger_bulgu || row.aciklama ? `<br><small>${esc(row.bulgu_secenegi || row.diger_bulgu || row.aciklama)}</small>` : ''}</td></tr>`).join('');
  const oncekiEtiketi = kaynak ? `${kaynak.musteri_unvani || ''} · ${kaynak.asansor_seri_no || ''} · ${kaynak.denetim_tarihi || 'tarih yok'}` : `Önceki kayıt bulunamadı (${d.takip_onceki_denetim_id})`;
  hedef.document.write(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>AVES Takip Çıktısı</title><style>body{font-family:Arial,sans-serif;color:#20235b;margin:28px;font-size:12px}h1{font-size:20px;margin:0 0 4px}h2{font-size:14px;margin:24px 0 8px;border-bottom:2px solid #e90048;padding-bottom:5px}p{margin:4px 0;color:#444}.meta{display:grid;grid-template-columns:130px 1fr;gap:4px;margin-top:16px}.meta b{color:#555}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #cfd3df;padding:7px;vertical-align:top;text-align:left}th{background:#f1f3f8}small{color:#555}.footer{margin-top:24px;color:#666;font-size:10px}@media print{body{margin:14mm}button{display:none}}</style></head><body><h1>AVES — Takip Denetimi Kısa Çıktısı</h1><p>Yalnız önceki denetimde Uygun Değil bulunan maddeler gösterilmiştir.</p><div class="meta"><b>Firma</b><span>${esc(d.musteri_unvani || '')}</span><b>Asansör seri no</b><span>${esc(d.asansor_seri_no || '')}</span><b>Önceki denetim</b><span>${esc(oncekiEtiketi)}</span><b>Takip tarihi</b><span>${esc(d.denetim_tarihi || '')}</span><b>Takip mühendisi</b><span>${esc(d.takip_atanan_ad || d.denetimi_yapan || '')}</span></div><h2>Takip edilecek maddeler (${takipRows.length})</h2><table><thead><tr><th>#</th><th>Madde</th><th>Önceki bulgu</th><th>Takip sonucu</th></tr></thead><tbody>${satirlar}</tbody></table><div class="footer">Bu çıktı saha takip çalışmasına yardımcı kısa listedir; resmî denetim formunun yerine geçmez.</div><script>window.onload=()=>setTimeout(()=>window.print(),150);</script></body></html>`);
  hedef.document.close();
}

async function takipMuehendisiniAta(denetim) {
  if (!Profile.canCorrectInspections) { toast('Takip mühendisi atama yetkiniz yok'); return; }
  let profiller = [];
  try { profiller = await API.select('kullanici_profilleri', 'select=email,ad_soyad&aktif=eq.true&rol=eq.muhendis&order=ad_soyad.asc'); } catch (_) { toast('Mühendis listesi alınamadı'); return; }
  const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="modal"><button class="close" aria-label="Kapat">×</button><h3>Takip Mühendisi Ata</h3>
      <div class="photo-help">Atama yalnız yönetim tarafından yapılabilir. Önceki denetim ve uygunsuzluk geçmişi korunur.</div>
      <select id="takipMuhendis" class="field full"><option value="">Mühendis seçin</option>${profiller.map(p => `<option value="${esc(p.email)}" ${normEmail(p.email) === normEmail(denetim.takip_atanan_email) ? 'selected' : ''}>${esc(p.ad_soyad || p.email)} · ${esc(p.email)}</option>`).join('')}</select>
      <button class="btn btn-primary" id="takipAtaKaydet">Atamayı kaydet</button></div>`;
  document.body.appendChild(ov); const close = () => ov.remove();
  ov.querySelector('.close').onclick = close; ov.onclick = e => { if (e.target === ov) close(); };
  ov.querySelector('#takipAtaKaydet').onclick = async () => {
    const email = ov.querySelector('#takipMuhendis').value; const p = profiller.find(item => normEmail(item.email) === normEmail(email));
    if (!p) { toast('Bir mühendis seçin'); return; }
    const hedef = await DB.get('denetimler', denetim.id); const now = new Date().toISOString();
    hedef.takip_atanan_email = p.email; hedef.takip_atanan_ad = p.ad_soyad || p.email; hedef.takip_atama_at = now; hedef.updated_at = now;
    await localWrite('denetimler', hedef, 'denetimler'); close(); toast(`Takip ${hedef.takip_atanan_ad} kişisine atandı`); await renderDenetim();
  };
}

async function tamamlanmisDenetimOzetiniGoster(denetim, kaynakSatirlar = []) {
  await fotografOnbellekYenile(denetim.id);
  const d = await DB.get('denetimler', denetim.id) || denetim;
  const rows = (kaynakSatirlar.length ? kaynakSatirlar : await DB.allByIndex('saha', 'byDenetim', d.id)).sort(siraKarsilastir);
  const fotograflar = (await DB.allByIndex('fotograflar', 'byDenetim', d.id)).filter(foto => !foto.deleted_at);
  const bekleyenFotograflar = fotograflar.filter(foto => foto.sync_status === 'pending').length;
  const uygunsuzluklar = rows.filter(row => row.durum === 'Olumsuz bulgu');
  const denetimFormDurumu = denetimFormIstatistikleri(d);
  const formOnly = formOdakliDenetimMi(d, rows);
  const takipVar = !!d.takip_onceki_denetim_id || (await DB.all('denetimler')).some(item => item.takip_onceki_denetim_id === d.id);
  const tarihGoster = (value) => value ? new Date(value).toLocaleString('tr-TR') : '';
  const arsivDurumu = d.fotograf_arsiv_temizlendi_at
    ? `Sunucu ve cihaz kopyaları temizlendi · ${d.fotograf_arsiv_temizlenen_adet || 0} fotoğraf · ${tarihGoster(d.fotograf_arsiv_temizlendi_at)}${d.fotograf_arsiv_temizlendi_by ? ` · ${d.fotograf_arsiv_temizlendi_by}` : ''}`
    : `${fotograflar.length} fotoğraf kayıtlı${bekleyenFotograflar ? ` · ${bekleyenFotograflar} aktarım bekliyor` : ''}`;
  const sonIndirme = d.fotograf_arsiv_son_indirme_at
    ? `Son ZIP indirme: ${tarihGoster(d.fotograf_arsiv_son_indirme_at)}${d.fotograf_arsiv_son_indirme_by ? ` · ${d.fotograf_arsiv_son_indirme_by}` : ''}`
    : 'Bu denetim için kayıtlı ZIP indirme bilgisi yok';
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="modal">
      <button class="close" aria-label="Kapat">×</button>
      <h3>Tamamlanmış Denetim Özeti</h3>
      <div class="onay-box">
        <div class="onay-satir"><span>Firma</span><b>${esc(d.musteri_unvani)}</b></div>
        <div class="onay-satir"><span>Asansör seri no</span><b>${esc(d.asansor_seri_no)}</b></div>
        <div class="onay-satir"><span>Denetim tarihi</span><b>${esc(d.denetim_tarihi || '')}</b></div>
        <div class="onay-satir"><span>Denetimi yapan</span><b>${esc(d.denetimi_yapan || d.olusturan_ad || d.olusturan_email || 'Kayıt yok')}</b></div>
      </div>
      ${formOnly
        ? `<div class="integrity-card pending"><b>Form seti · Modül ${denetimFormDurumu.modul}</b><small>${denetimFormDurumu.ozet.started}/${denetimFormDurumu.ozet.total} formda veri kaydı var. Bu sayı uygunluk veya form tamlığı anlamına gelmez.</small></div>`
        : `<div class="integrity-card ok"><b>Sonuç özeti</b><small>${rows.filter(row => row.durum === 'Kontrol tamamlandı').length} Uygun · ${uygunsuzluklar.length} Uygun Değil · ${rows.filter(row => row.durum === 'Uygulanmaz').length} Uygulanmaz</small></div>`}
      <div class="integrity-card ${d.fotograf_arsiv_temizlendi_at ? 'pending' : (bekleyenFotograflar ? 'pending' : 'ok')}"><b>Fotoğraf arşiv durumu</b><small>${esc(arsivDurumu)}<br>${esc(sonIndirme)}</small></div>
      <div class="integrity-card ${d.resmi_cikti_uretildi_at ? 'ok' : 'pending'}"><b>Resmî çıktı</b><small>${d.resmi_cikti_uretildi_at
        ? `${esc(d.resmi_cikti_snapshot_ozeti || 'Üretildi')} · ${tarihGoster(d.resmi_cikti_uretildi_at)}${d.resmi_cikti_hash ? `<br>Belge parmak izi: ${esc(String(d.resmi_cikti_hash).slice(0, 16))}…` : ''}`
        : 'Bu denetim için resmî PDF/Word henüz üretilmedi'}</small></div>
      ${denetimFormDurumu ? `<div class="integrity-card"><b>Denetim Formu · Modül ${denetimFormDurumu.modul}</b><small>${denetimFormDurumu.ozet.started} formda veri kaydı var; bu sayı tamamlanma veya uygunluk göstergesi değildir.</small><button type="button" class="btn btn-ghost" id="completedDenetimForm">Denetim formunu aç</button></div>` : ''}
      <div class="integrity-card ${d.arsive_aktarildi_at ? 'ok' : 'pending'}"><b>${d.arsive_aktarildi_at ? '✓ Kurumsal arşive aktarıldı' : 'Kurumsal arşive aktarılmadı'}</b><small>${d.arsive_aktarildi_at
        ? `${tarihGoster(d.arsive_aktarildi_at)}${d.arsive_aktaran_email ? ` · ${esc(d.arsive_aktaran_email)}` : ''}`
        : 'Resmî dosya arşive konduğunda yönetim burada işaretler'}</small></div>
      <div class="onay-satir"><span>Takip denetimi</span><b>${takipVar ? 'İlişkili takip kaydı var' : 'Takip kaydı yok'}</b></div>
      ${Profile.canSeeAllInspections ? `<button class="btn btn-ghost" id="arsivToggle">${d.arsive_aktarildi_at ? 'Arşiv işaretini kaldır' : 'Arşive aktarıldı olarak işaretle'}</button>` : ''}
      ${uygunsuzluklar.length ? `<button class="btn btn-ghost" id="completedBadList">Uygunsuzluk listesini aç (${uygunsuzluklar.length})</button>` : '<div class="oz-hazir ok">✓ Uygun Değil sonucu yok</div>'}
    </div>`;
  document.body.appendChild(ov);
  const close = () => ov.remove();
  ov.querySelector('.close').onclick = close;
  ov.onclick = event => { if (event.target === ov) close(); };
  const completedForm = ov.querySelector('#completedDenetimForm');
  if (completedForm) completedForm.onclick = () => { close(); denetimFormuGoster(d.id, true); };
  const badList = ov.querySelector('#completedBadList');
  if (badList) badList.onclick = () => { close(); uygunsuzlukListesiniGoster(d, uygunsuzluklar); };
  const arsivToggle = ov.querySelector('#arsivToggle');
  if (arsivToggle) arsivToggle.onclick = async () => {
    arsivToggle.disabled = true;
    const guncel = await DB.get('denetimler', d.id) || d;
    const isaretli = !!guncel.arsive_aktarildi_at;
    const now = new Date().toISOString();
    guncel.arsive_aktarildi_at = isaretli ? null : now;
    guncel.arsive_aktaran_email = isaretli ? null : (Profile.email || API.email || null);
    guncel.updated_at = now;
    try {
      await localWrite('denetimler', guncel, 'denetimler');
      toast(isaretli ? 'Arşiv işareti kaldırıldı' : 'Arşive aktarıldı olarak işaretlendi');
    } catch (e) {
      console.warn('Arşiv işareti yazılamadı', e);
      toast('İşaret kaydedilemedi');
    }
    close();
    await tamamlanmisDenetimOzetiniGoster(guncel);
  };
}

async function denetimDurumuDegistir(yeniDurum, overlay, kapanisOzetiOnaylandi = false) {
  await flushEditorWrites();
  const d = await DB.get('denetimler', currentDenetimId);
  if (!sahaUygulamaModuluGMi(d)) { toast('Bu uygulamada yalnız Modül G denetimi tamamlanabilir'); return; }
  const rows = await DB.allByIndex('saha', 'byDenetim', currentDenetimId);
  const formOnly = formOdakliDenetimMi(d, rows);
  const bakilmadi = rows.filter(r => !isFlowComplete(r));
  if (bakilmadi.length) {
    toast(`${bakilmadi.length} sonuçsuz madde var`);
    search = '';
    filter = 'empty';
    await renderDenetim();
    return;
  }
  const eksikSeriler = seriEksikleri(d);
  if (eksikSeriler.length) {
    toast(`Seri numarası kayıtlarında ${eksikSeriler.length} eksik grup var`);
    await seriNumaralariGoster();
    return;
  }
  if (!canEditDenetim(d)) { toast('Bu çalışma üzerinde değişiklik yetkiniz yok'); return; }
  if (formOnly && !formSetiGozdenGecirildiMi(d)) {
    toast('Çalışma durumunu değiştirmeden önce form seti gözden geçirilmeli');
    await kapanisOzetiniGoster(yeniDurum);
    return;
  }
  const now = new Date().toISOString();
  if (yeniDurum === 'Gözden Geçirme') {
    if (!kapanisOzetiOnaylandi && !confirm('Saha kontrolü tamamlandı. Gözden Geçirme aşamasına geçilsin mi? Sonuçları bu aşamada düzeltebilirsiniz.')) return;
    d.denetim_durumu = 'Gözden Geçirme';
    d.saha_tamamlandi_at = d.saha_tamamlandi_at || now;
    d.gozden_gecirme_at = now;
    toast('Gözden Geçirme aşamasına geçildi');
  } else if (yeniDurum === 'Çalışma Tamamlandı') {
    if (!kapanisOzetiOnaylandi && !confirm('Gözden geçirme tamamlandı mı? Çalışma “Çalışma Tamamlandı” durumuna alınacak. Daha sonra gerekirse yeniden düzenlemeye açabilirsiniz.')) return;
    d.denetim_durumu = 'Çalışma Tamamlandı';
    d.calisma_tamamlandi_at = now;
    toast('Çalışma tamamlandı');
  } else return;
  const integrity = await butunlukOzetiHesapla(d, rows, yeniDurum);
  d.butunluk_ozeti = integrity.summary;
  d.butunluk_hash = integrity.hash;
  d.butunluk_hesaplandi_at = now;
  d.updated_at = now;
  await localWrite('denetimler', d, 'denetimler');
  if (overlay) overlay.remove();
  // Çalışma Tamamlandı sahanın son adımıdır; denetçiyi otomatik olarak
  // denetim listesine döndürür. Gözden Geçirme aşaması aynı ekranda kalır.
  if (yeniDurum === 'Çalışma Tamamlandı') showList();
  else await renderDenetim();
}

async function showOzet() {
  const d = await DB.get('denetimler', currentDenetimId);
  const rows = (await guncelKutuphaneMetadatasi(
    await DB.allByIndex('saha', 'byDenetim', currentDenetimId)
  )).sort(siraKarsilastir);
  const { items: inspectionOutbox, cakisma: conflictSync, korunan: protectedSync } = await Sync.denetimSyncOzeti(currentDenetimId);
  const bad = rows.filter(r => r.durum === 'Olumsuz bulgu');
  const bakilmadi = rows.filter(r => !isFlowComplete(r));
  const icNotlar = rows.filter(icKontrolNotuVar);
  const hazir = bakilmadi.length === 0;
  const eksikSeriler = seriEksikleri(d);
  const durum = d.denetim_durumu || 'Devam Ediyor';
  const currentIntegrity = await butunlukOzetiHesapla(d, rows, durum);
  const denetimFormDurumu = denetimFormIstatistikleri(d);
  const integrityMatches = !!d.butunluk_hash && d.butunluk_hash === currentIntegrity.hash;
  const history = (await DB.allByIndex('gecmis', 'byDenetim', currentDenetimId))
    .sort((a,b) => (b.created_at || '').localeCompare(a.created_at || ''));
  const takipteKapatilanlar = rows.filter(row =>
    row.takip_kaynak_saha_kontrol_id && row.takip_onceki_durum === 'Olumsuz bulgu' && row.durum === 'Kontrol tamamlandı'
  ).map(row => ({
    row,
    event: history.find(event => event.saha_kontrol_id === row.id && event.yeni_deger?.durum === 'Kontrol tamamlandı'),
  }));
  const reviewPosition = await DB.kvGet(`review_position_${currentDenetimId}`);
  const reviewPositionRow = reviewPosition && rows.find(r => r.id === reviewPosition.item_id);
  const lastActor = history[0]
    ? (history[0].degistiren_ad || history[0].degistiren_email)
    : (d.son_degistiren_ad || d.son_degistiren_email);
  const kapanis = hazir
    ? '<div class="oz-hazir ok">✓ Tüm checklist maddelerine Uygun / Uygun Değil / Uygulanmaz sonucu verilmiş</div>'
    : `<div class="oz-hazir no">⚠ <b>${bakilmadi.length} madde</b> henüz sonuçlandırılmadı.</div>`;
  const compactStatus = (r) => {
    if (!isFlowComplete(r)) return ['pending', '○', 'Bakılmadı'];
    if (r.durum === 'Olumsuz bulgu') return ['bad', '✕', 'Uygun Değil'];
    if (r.durum === 'Uygulanmaz') return ['na', '—', 'Uygulanmaz'];
    return ['ok', '✓', 'Uygun'];
  };
  const compactRowHtml = (r) => {
    const [status, icon, label] = compactStatus(r);
    const hasNote = !!(r.aciklama || r.diger_bulgu || icKontrolNotuVar(r));
    const hasMeasurement = olcumTanimlari(r).some(def => olcumDegeri(r, def) !== '');
    return `<button type="button" class="compact-row ${status}" data-go-row="${esc(r.id)}" data-review-status="${status}" data-has-note="${hasNote?1:0}" data-has-measurement="${hasMeasurement?1:0}">
        <span class="compact-icon">${icon}</span><span class="compact-ref">${esc(r.standart_madde_no || r.madde_id)}</span>
        <span class="compact-title">${esc(r.kontrol_basligi)}</span><span class="compact-result">${label}${hasNote?' · ✎':''}${hasMeasurement?' · ◫':''}</span>
      </button>`;
  };
  const compactBolumler = [];
  const compactByBolum = {};
  rows.forEach(r => {
    if (!compactByBolum[r.bolum]) { compactByBolum[r.bolum] = []; compactBolumler.push(r.bolum); }
    compactByBolum[r.bolum].push(r);
  });
  const firstReviewBolum = (reviewPositionRow || rows.find(r => !isFlowComplete(r)) || rows[0] || {}).bolum;
  const compactRows = compactBolumler.map(bolum => {
    const bolumRows = compactByBolum[bolum];
    const tamamlanan = bolumRows.filter(isFlowComplete).length;
    return `<details class="compact-section" ${bolum === firstReviewBolum ? 'open' : ''}>
        <summary><span>${esc(bolum)}</span><span class="compact-section-count">${tamamlanan}/${bolumRows.length}</span></summary>
        <div class="compact-section-rows">${bolumRows.map(compactRowHtml).join('')}</div>
      </details>`;
  }).join('');
  const item = (r, cls) => `<button type="button" class="oz-item ${cls}" data-go-row="${esc(r.id)}" style="display:block;width:100%;text-align:left"><b>${esc(r.standart_madde_no || r.madde_id)} · ${esc(r.bolum)}</b>
      ${esc(r.kontrol_basligi)}${r.bulgu_secenegi ? `<div class="not">Bulgu: ${esc(r.bulgu_secenegi)}${r.diger_bulgu ? ' — ' + esc(r.diger_bulgu) : ''}</div>` : ''}
      ${olcumTanimlari(r).map(def => {
        const value = olcumDegeri(r, def);
        return value !== '' ? `<div class="not">${esc(def.etiket)}: ${esc(value)} ${esc(def.birim || '')}</div>` : '';
      }).join('')}</button>`;
  const notlar = d.bolum_aciklamalari || {};
  // Kaldırılan fotoğraf kategori notu alanının bıraktığı eski "Fotoğraf: …"
  // kayıtları artık gösterilmez; yalnız bölüm açıklamaları listelenir.
  const notEntries = Object.entries(notlar).filter(([k, v]) => v && !k.startsWith('Fotoğraf: '));
  const seriData = seriNumaralariNormalize(d.seri_numaralari);
  const seriEntries = SERI_GRUPLARI.flatMap(([key, label]) => seriData[key]
    .filter(item => item.seri_no)
    .map(item => [label, item]));
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="modal">
      <button class="close">×</button>
      <h3>İnceleme Modu — ${esc(d.musteri_unvani)} · ${esc(d.asansor_seri_no)}</h3>
      <div class="photo-help">Bu ekran salt okunurdur. Arama veya filtreyle herhangi bir maddeye doğrudan ulaşabilirsiniz.</div>
      <div class="onay-satir"><span>Çalışma durumu</span><b>${esc(durum)}</b></div>
      <div class="onay-satir"><span>Oluşturan</span><b>${esc(d.olusturan_ad || d.denetimi_yapan || d.olusturan_email || 'Kayıt yok')}</b></div>
      <div class="onay-satir"><span>Son değiştiren</span><b>${esc(lastActor || 'Kayıt yok')}</b></div>
      ${durum === 'Çalışma Tamamlandı' ? `<div class="integrity-card ok"><b>Sonuç özeti</b><small>${currentIntegrity.summary.uygun} Uygun · ${currentIntegrity.summary.uygun_degil} Uygun Değil · ${currentIntegrity.summary.uygulanmaz} Uygulanmaz</small></div>` : ''}
      <div class="integrity-card ${integrityMatches ? 'ok' : 'pending'}"><b>${integrityMatches ? '✓ Bütünlük özeti doğrulandı' : 'Bütünlük özeti henüz kesinleşmedi'}</b><small>${d.butunluk_hash ? esc(d.butunluk_hash.slice(0,16)) + '…' : 'Çalışma tamamlanınca parmak izi kaydedilir'} · ${currentIntegrity.summary.uygun}/${rows.length} uygun · ${currentIntegrity.summary.uygun_degil} uygun değil · ${currentIntegrity.summary.uygulanmaz} uygulanmaz</small></div>
      <div class="local-sync-state ${protectedSync ? 'error' : (inspectionOutbox.length ? 'pending' : 'ok')}">${protectedSync
        ? `⚠ ${protectedSync} yerel işlem ${conflictSync ? 'çakışma/yetki' : 'yetki'} incelemesinde; hiçbir kayıt silinmedi`
        : inspectionOutbox.length
          ? `✓ Tüm yanıtlar cihazda · ${inspectionOutbox.length} işlem sunucu aktarımı bekliyor`
          : '✓ Tüm yanıtlar cihazda · Sunucuyla tamamen eşitlendi'}</div>
      ${denetimFormDurumu ? `<div class="integrity-card"><b>Denetim Formu · Modül ${denetimFormDurumu.modul}</b><small>${denetimFormDurumu.ozet.started} formda veri kaydı var; bu sayı tamamlanma veya uygunluk göstergesi değildir.</small><button type="button" class="btn btn-ghost" id="ozDenetimFormu">Denetim formunu aç</button></div>` : ''}
      ${kapanis}
      <div class="oz-hazir ${eksikSeriler.length ? 'no' : 'ok'}">${eksikSeriler.length
        ? `⚠ <b>${eksikSeriler.length} seri numarası grubu eksik:</b> ${esc(eksikSeriler.join(' · '))}`
        : `✓ Seri numarası kayıtları tamamlandı (${seriNumarasiSayisi(d)}/${seriBeklenenMinimum(d)})`}</div>
      <details class="compact-review" open>
        <summary>Tüm maddeler (${rows.length})</summary>
        <input class="searchbox compact-search" type="search" placeholder="Madde no, başlık veya kelime ara…">
        <div class="compact-filters">
          <button type="button" class="chip on" data-compact-filter="all">Tümü</button>
          <button type="button" class="chip" data-compact-filter="pending">Bakılmadı</button>
          <button type="button" class="chip" data-compact-filter="bad">Uygun Değil</button>
          <button type="button" class="chip" data-compact-filter="note">Notlu</button>
          <button type="button" class="chip" data-compact-filter="measurement">Ölçümlü</button>
        </div>
        <div class="compact-list">${compactRows}</div>
      </details>
      ${seriEntries.length ? `<h4>Ekipman seri numaraları</h4>${seriEntries.map(([label,item]) => `<div class="oz-item"><b>${esc(label)}${item.kat ? ` · ${esc(item.kat)}${item.giris ? ` / ${esc(item.giris)}` : ''}` : ''}</b><div class="not">${esc(item.seri_no)}</div></div>`).join('')}` : ''}
      ${bakilmadi.length ? `<div style="font-size:12px;font-weight:700;color:var(--warn);margin:12px 0 6px">BAKILMADI (${bakilmadi.length})</div>` + bakilmadi.slice(0,100).map(r => item(r,'warn')).join('') : ''}
      ${bad.length ? `<div style="font-size:12px;font-weight:700;color:var(--fuchsia);margin:12px 0 6px">UYGUN DEĞİL (${bad.length})</div>` + bad.map(r => item(r,'')).join('') : ''}
      ${takipteKapatilanlar.length ? `<div style="font-size:12px;font-weight:700;color:var(--ok);margin:12px 0 6px">TAKİPTE KAPATILAN UYGUNSUZLUKLAR (${takipteKapatilanlar.length})</div>${takipteKapatilanlar.map(({row,event}) => `<div class="oz-item" style="border-left-color:var(--ok)"><b>${esc(row.standart_madde_no || row.madde_id)} · ${esc(row.kontrol_basligi)}</b><div class="not">Önceki sonuç: Uygun Değil · Takip sonucu: Uygun</div><small>${event ? `${esc(event.degistiren_ad || event.degistiren_email || 'Kullanıcı')} · ${new Date(event.created_at).toLocaleString('tr-TR')}` : 'Kapanış geçmişi yerelde henüz indirilemedi'}</small></div>`).join('')}` : ''}
      ${icNotlar.length ? `<div style="font-size:12px;font-weight:700;color:var(--warn);margin:12px 0 6px">İÇ KONTROL NOTU (${icNotlar.length})</div>` + icNotlar.map(r => `<div class="oz-item warn"><b>${esc(r.standart_madde_no || r.madde_id)} · ${esc(r.bolum)}</b>${esc(r.ic_kontrol_notu || 'Eski sürümden kalan iç kontrol kaydı')}</div>`).join('') : ''}
      ${notEntries.length ? `<div style="font-size:12px;font-weight:700;color:var(--navy);margin:12px 0 6px">BÖLÜM AÇIKLAMALARI</div>` + notEntries.map(([b,v]) => `<div class="oz-item" style="border-left-color:var(--navy)"><b>${esc(b)}</b>${esc(v)}</div>`).join('') : ''}
      ${history.length ? `<details class="compact-review"><summary>Değişiklik geçmişi (${history.length})</summary><div class="history-list">${history.slice(0,250).map(event => `<div class="history-row"><b>${esc(event.degistiren_ad || event.degistiren_email || 'Bilinmeyen kullanıcı')}</b><span>${esc(event.madde_id || (event.islem_turu === 'denetim_olusturma' ? 'Denetim oluşturuldu' : 'Denetim bilgisi'))}</span><small>${esc(event.degistiren_rol || '')} · ${event.created_at ? new Date(event.created_at).toLocaleString('tr-TR') : ''}${event.duzeltme_nedeni ? ` · Düzeltme: ${esc(event.duzeltme_nedeni)}` : ''}</small></div>`).join('')}</div></details>` : ''}
      ${!bad.length && !bakilmadi.length && !notEntries.length && !icNotlar.length ? '<div class="empty">Açık konu yok 🎉</div>' : ''}
      ${bad.length ? '<button class="btn btn-ghost" id="ozUygunsuzluk" style="margin-top:10px">Uygunsuzluk listesini aç</button>' : ''}
      <button class="btn btn-ghost" id="ozKopya" style="margin-top:10px">Özeti panoya kopyala</button>
    </div>`;
  document.body.appendChild(ov);
  if (reviewPositionRow) {
    const rememberedButton = Array.from(ov.querySelectorAll('.compact-row'))
      .find(button => button.dataset.goRow === reviewPositionRow.id);
    if (rememberedButton) {
      rememberedButton.classList.add('review-return');
      requestAnimationFrame(() => rememberedButton.scrollIntoView({ block: 'center' }));
    }
  }
  ov.querySelector('.close').onclick = () => ov.remove();
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  let compactFilter = 'all';
  const compactSearch = ov.querySelector('.compact-search');
  const applyCompactVisibility = () => {
    const query = compactSearch ? compactSearch.value.trim().toLocaleLowerCase('tr-TR') : '';
    ov.querySelectorAll('.compact-section').forEach(section => {
      let visibleCount = 0;
      section.querySelectorAll('.compact-row').forEach(element => {
        const row = rows.find(r => r.id === element.dataset.goRow);
        const filterMatches = compactFilter === 'all' || element.dataset.reviewStatus === compactFilter ||
          (compactFilter === 'note' && element.dataset.hasNote === '1') ||
          (compactFilter === 'measurement' && element.dataset.hasMeasurement === '1');
        const haystack = row
          ? `${row.madde_id || ''} ${row.standart_madde_no || ''} ${row.bolum || ''} ${row.kontrol_basligi || ''} ${row.denetci_yonlendirmesi || ''}`.toLocaleLowerCase('tr-TR')
          : '';
        const visible = filterMatches && (!query || haystack.includes(query));
        element.classList.toggle('hidden', !visible);
        if (visible) visibleCount += 1;
      });
      section.classList.toggle('hidden', visibleCount === 0);
      if (query && visibleCount) section.open = true;
    });
  };
  ov.querySelectorAll('[data-compact-filter]').forEach(btn => btn.onclick = () => {
    ov.querySelectorAll('[data-compact-filter]').forEach(other => other.classList.toggle('on', other === btn));
    compactFilter = btn.dataset.compactFilter;
    applyCompactVisibility();
  });
  if (compactSearch) compactSearch.oninput = applyCompactVisibility;
  ov.querySelectorAll('[data-go-row]').forEach(btn => btn.onclick = async () => {
    const hedef = rows.find(r => r.id === btn.dataset.goRow);
    if (!hedef) return;
    const denetimId = currentDenetimId;
    await DB.kvSet(`review_position_${currentDenetimId}`, {
      item_id: hedef.id,
      bolum: hedef.bolum,
      updated_at: new Date().toISOString(),
    });
    ov.remove();
    await rememberPosition(hedef.bolum, hedef.id);
    await showDenetim(denetimId, true);
    const opened = document.querySelector('.bolum.open');
    if (opened) opened.scrollIntoView({ block: 'start' });
  });
  ov.querySelector('#ozKopya').onclick = () => {
    const lines = [`AVES SAHA ÇALIŞMA ÖZETİ — ${d.musteri_unvani} · ${d.asansor_seri_no} · ${d.denetim_tarihi}`, `Durum: ${durum}`];
    if (bakilmadi.length) { lines.push('', `BAKILMADI (${bakilmadi.length}):`); bakilmadi.forEach(r => lines.push(`- [${r.standart_madde_no||r.madde_id}] ${r.kontrol_basligi}`)); }
    if (bad.length) { lines.push('', `UYGUN DEĞİL BULUNAN MADDELER (${bad.length}):`);
      bad.forEach(r => lines.push(`- [${r.standart_madde_no||r.madde_id}] ${r.kontrol_basligi}${r.bulgu_secenegi ? ' — ' + r.bulgu_secenegi : ''}${r.diger_bulgu ? ' (' + r.diger_bulgu + ')' : ''}`)); }
    notEntries.forEach(([b,v]) => { lines.push('', `${b} — AÇIKLAMA:`, v); });
    navigator.clipboard.writeText(lines.join('\n')).then(() => toast('Panoya kopyalandı'));
  };
  const uygunsuzlukBtn = ov.querySelector('#ozUygunsuzluk');
  if (uygunsuzlukBtn) uygunsuzlukBtn.onclick = () => uygunsuzlukListesiniGoster(d, bad);
  const denetimFormBtn = ov.querySelector('#ozDenetimFormu');
  if (denetimFormBtn) denetimFormBtn.onclick = () => { ov.remove(); denetimFormuGoster(d.id); };
}

function uygunsuzlukListesiniGoster(d, bad) {
  const ov = document.createElement('div');
  ov.className = 'overlay';
  const satirlar = bad.map(row => `<div class="oz-item"><b>${esc(row.standart_madde_no || row.madde_id)} · ${esc(row.kontrol_basligi)}</b>${row.bulgu_secenegi ? `<div class="not">${esc(row.bulgu_secenegi)}</div>` : ''}${row.diger_bulgu ? `<div class="not">${esc(row.diger_bulgu)}</div>` : ''}${row.aciklama ? `<div class="not">${esc(row.aciklama)}</div>` : ''}</div>`).join('');
  ov.innerHTML = `<div class="modal"><button class="close">×</button><h3>Uygunsuzluk Listesi</h3><div class="onay-satir"><span>Firma</span><b>${esc(d.musteri_unvani)}</b></div><div class="onay-satir"><span>Asansör</span><b>${esc(d.asansor_seri_no)}</b></div><div class="onay-satir"><span>Tarih</span><b>${esc(d.denetim_tarihi)}</b></div><div class="photo-help">Bu liste yalnız Uygun Değil bulunan maddeleri içerir; fotoğraf içermez.</div>${satirlar}<button class="btn btn-ghost" id="uygKopya">Panoya kopyala</button></div>`;
  document.body.appendChild(ov);
  ov.querySelector('.close').onclick = () => ov.remove();
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
  ov.querySelector('#uygKopya').onclick = () => {
    const lines = [`AVES UYGUNSUZLUK LİSTESİ`, `Firma: ${d.musteri_unvani}`, `Asansör seri no: ${d.asansor_seri_no}`, `Denetim tarihi: ${d.denetim_tarihi}`, ''];
    bad.forEach((row, index) => lines.push(`${index + 1}. [${row.standart_madde_no || row.madde_id}] ${row.kontrol_basligi}${row.bulgu_secenegi ? ` — ${row.bulgu_secenegi}` : ''}${row.diger_bulgu ? `: ${row.diger_bulgu}` : ''}${row.aciklama ? ` (${row.aciklama})` : ''}`));
    navigator.clipboard.writeText(lines.join('\n')).then(() => toast('Uygunsuzluk listesi panoya kopyalandı'));
  };
}
