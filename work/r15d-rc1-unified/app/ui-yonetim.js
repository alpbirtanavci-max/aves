/* ============================================================
   AVES Saha Denetim — yedek, tanılama ve yönetim araçları
   Dosya indirme, yedek al/geri yükle, tanılama paylaşımı, cihaz senkron durumları.
   (Eski UI kapanışının parçasıdır: ui-durum → ui-foto → ui-yonetim → ui-kayit → ui-liste → ui-yeni →
   ui-fr65 → ui-denetim → ui-taslak → ui-form → ui-madde → ui-kapanis → ui-son; ortak global kapsam.)
   ============================================================ */
'use strict';

/* ---- FR.65 saha kaydı: bütünlük mührü, yedek, denetim özeti, kurumsal arşiv ---- */
async function fr65ButunlukOzetiHesapla(d, hedefDurum) {
  const record = AVES_DENETIM_FORM_SETI.normalize(d.denetim_form_kayitlari, d.teknik_dosya_kayitlari);
  const count = AVES_TEKNIK_DOSYA_FORM.countFr65Capture(record, d.tahrik_tipi);
  const summary = {
    surum: 1,
    tur: 'fr65_saha_v1',
    denetim_id: d.id,
    durum: hedefDurum || d.denetim_durumu || 'Devam Ediyor',
    modul: d.modul || null,
    firma: d.musteri_unvani || null,
    seri_no: d.asansor_seri_no || null,
    denetim_tarihi: d.denetim_tarihi || null,
    denetimi_yapan: d.denetimi_yapan || d.olusturan_ad || null,
    alan_sayisi: count.recorded,
    alan_toplam: count.total,
    degerler: record.forms?.FR65?.values || {},
  };
  return { summary, hash: await sha256Hex(stableStringify(summary)) };
}

async function dosyaIndir(file) {
  // iOS ana ekran uygulamasında <a download> güvenilir değil; paylaşım sayfası dosyayı Dosyalar'a kaydettirir.
  if (/iPhone|iPad|iPod/.test(navigator.userAgent || '') && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: file.name }); return; }
    catch (error) { if (error && error.name === 'AbortError') throw error; }
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url; link.download = file.name;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

async function yedekDosyasiIndir(dosyaAdi, nesne) {
  await dosyaIndir(new File([JSON.stringify(nesne, null, 2)], dosyaAdi, { type: 'application/json' }));
}

// Yedek: seçilen denetimlerin cihazdaki tüm verisi (fotoğraf dosyaları hariç).
async function yedekPaketiOlustur(idler) {
  const secili = new Set(idler);
  const denetimler = (await DB.all('denetimler')).filter(item => secili.has(item.id) && denetimGorunebilirMi(item));
  const gecerli = new Set(denetimler.map(item => item.id));
  const saha = (await DB.all('saha')).filter(row => gecerli.has(row.denetim_id));
  const gecmis = (await DB.all('gecmis')).filter(row => gecerli.has(row.denetim_id));
  const bekleyen = (await DB.outboxAll()).filter(item => gecerli.has(item.inspection_id));
  const fotografSayisi = (await DB.all('fotograflar')).filter(foto => gecerli.has(foto.denetim_id) && !foto.deleted_at).length;
  const govde = {
    format: 'aves-cihaz-yedek', surum: 1,
    olusturuldu: new Date().toISOString(), uygulama: APP_VERSION,
    olusturan: Profile.email || API.email || null,
    not: 'Fotoğraf dosyaları bu yedeğe dahil değildir; fotoğraflar Fotoğraf Arşivi (ZIP) ile ayrıca indirilir.',
    fotograf_sayisi: fotografSayisi,
    denetimler, saha_kontrol: saha, gecmis, bekleyen_senkron: bekleyen,
  };
  return { ...govde, paket_hash: await sha256Hex(stableStringify(govde)) };
}

async function yedekIndir(idler, button = null) {
  if (button) button.disabled = true;
  try {
    const paket = await yedekPaketiOlustur(idler);
    if (!paket.denetimler.length) { toast('Yedeklenecek denetim bulunamadı'); return; }
    const ad = paket.denetimler.length === 1
      ? `AVES_${String(paket.denetimler[0].asansor_seri_no || 'denetim').replace(/[^A-Za-z0-9._-]+/g, '_')}_${paket.olusturuldu.slice(0, 10)}_yedek.json`
      : `AVES_cihaz_yedegi_${paket.olusturuldu.slice(0, 10)}.json`;
    await yedekDosyasiIndir(ad, paket);
    for (const item of paket.denetimler) await DB.kvSet(`fr65_yedek_${item.id}`, { at: paket.olusturuldu, paket_hash: paket.paket_hash });
    toast(`${paket.denetimler.length} denetimlik yedek hazırlandı`);
  } catch (error) {
    if (!(error && error.name === 'AbortError')) {
      console.error('Yedek oluşturulamadı', error);
      toast('Yedek oluşturulamadı; veriler cihazda korunuyor');
    }
  } finally { if (button) button.disabled = false; }
}

// Seçim ekranı anında açılır; yalnız cihazdaki kayıt listesini okur.
async function yedekSecimiGoster() {
  const denetimler = (await DB.all('denetimler')).filter(denetimGorunebilirMi)
    .sort((a, b) => String(b.denetim_tarihi || '').localeCompare(String(a.denetim_tarihi || '')));
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="modal">
      <button class="close" aria-label="Kapat">×</button>
      <h3>Yedek al</h3>
      ${denetimler.length ? `<label class="backup-all"><input type="checkbox" id="yedekTumu"> Tümünü seç (${denetimler.length})</label>
      <div class="backup-list">${denetimler.map(item => `<label class="backup-row"><input type="checkbox" class="yedek-sec" value="${esc(item.id)}"><span><b>${esc(item.musteri_unvani || 'Firma yok')}</b><small>${esc(item.asansor_seri_no || '')} · ${esc(item.modul || '')} · ${esc(item.denetim_tarihi || '')}</small></span></label>`).join('')}</div>
      <button class="btn btn-primary" id="yedekIndir" disabled>Yedeği indir</button>
      <small class="backup-note">Veriler girdikçe ve bağlantı varken sunucuya zaten yedeklenir. Bu dosya ek bir güvenlik kopyasıdır; fotoğraf dosyaları dahil değildir.</small>`
        : '<div class="empty">Yedeklenecek denetim yok.</div>'}
    </div>`;
  document.body.appendChild(ov);
  const close = () => ov.remove();
  ov.querySelector('.close').onclick = close;
  ov.onclick = event => { if (event.target === ov) close(); };
  const download = ov.querySelector('#yedekIndir');
  if (!download) return;
  const boxes = [...ov.querySelectorAll('.yedek-sec')];
  const refresh = () => {
    const n = boxes.filter(box => box.checked).length;
    download.disabled = n === 0;
    download.textContent = n ? `Yedeği indir (${n})` : 'Yedeği indir';
    ov.querySelector('#yedekTumu').checked = n === boxes.length;
  };
  ov.querySelector('#yedekTumu').onchange = event => { boxes.forEach(box => { box.checked = event.target.checked; }); refresh(); };
  boxes.forEach(box => { box.onchange = refresh; });
  download.onclick = async () => {
    await yedekIndir(boxes.filter(box => box.checked).map(box => box.value), download);
    close();
  };
}

// Tanılama paylaşımı: cihazın teknik durumu tek dosyada (saha cevabı, firma adı, parola içermez).
async function tanilamaGirdisiTopla() {
  const outbox = await DB.outboxAll();
  const denetimler = await DB.all('denetimler');
  const fotolar = (await DB.all('fotograflar')).filter(f => f.sync_status === 'pending' && f.blob).length;
  const hazirIdler = [];
  for (const d of denetimler) {
    const marker = await DB.kvGet(`offline_ready_${d.id}`);
    if (marker) hazirIdler.push(d.id);
  }
  const persist = await DB.kvGet('storage_persist');
  let bosAlanMb = null;
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate();
      if (est.quota) bosAlanMb = Math.round(Math.max(0, est.quota - (est.usage || 0)) / 1024 / 1024);
    }
  } catch { bosAlanMb = null; }
  return {
    simdi: new Date().toISOString(), uygulama: APP_VERSION,
    eposta: Profile.email || API.email || null, rol: Profile.role || null,
    cihazId: await getDeviceId(), userAgent: navigator.userAgent, cevrimici: navigator.onLine,
    kuruluUygulama: isNativeApp() || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true,
    serviceWorker: !('serviceWorker' in navigator) ? 'desteklenmiyor' : navigator.serviceWorker.controller ? 'etkin' : 'kontrol yok',
    kaliciDepolama: !persist ? 'bilinmiyor' : persist.granted ? 'verildi' : persist.supported ? 'verilmedi' : 'desteklenmiyor',
    bosAlanMb, outbox, denetimler, hazirIdler, bekleyenFotograf: fotolar,
    senkronUyarisi: await DB.kvGet('sync_warning'),
    hatalar: (await DB.kvGet('hata_gunlugu')) || [],
  };
}

async function tanilamaPaylas() {
  try {
    const rapor = AVES_TANILAMA.olustur(await tanilamaGirdisiTopla());
    const ad = `AVES_tanilama_${rapor.olusturuldu.slice(0, 16).replace(/[-:T]/g, '')}.json`;
    await dosyaIndir(new File([JSON.stringify(rapor, null, 2)], ad, { type: 'application/json' }));
    toast('Tanılama dosyası hazırlandı; destek ekibine gönderin');
  } catch (error) {
    if (!(error && error.name === 'AbortError')) {
      console.error('Tanılama hazırlanamadı', error);
      toast('Tanılama dosyası hazırlanamadı');
    }
  }
}

// Yönetici / teknik müdür: hangi cihaz neyi sunucuya gönderemedi. Cihazlar durumlarını kendileri bildirir
// (çevrimdışı cihaz son bildirdiği durumu gösterir; "haber yok" süresi görünür).
async function cihazDurumlariniGoster() {
  if (!Profile.canSeeAllInspections) { toast('Bu görünüm yalnız yönetici ve teknik müdür içindir'); return; }
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="modal fr65-ozet">
      <button class="close" aria-label="Kapat">×</button>
      <h3>Cihaz senkron durumları</h3>
      <div id="cihazIcerik" class="photo-help">Yükleniyor…</div>
    </div>`;
  document.body.appendChild(ov);
  const close = () => ov.remove();
  ov.querySelector('.close').onclick = close;
  ov.onclick = event => { if (event.target === ov) close(); };
  const icerik = ov.querySelector('#cihazIcerik');
  try {
    const kayitlar = await API.select('cihaz_senkron_durumu', 'select=*&order=bildirildi_at.desc&limit=300');
    const kisiler = new Map();
    try { (await API.select('kullanici_profilleri', 'select=email,ad_soyad')).forEach(p => kisiler.set(String(p.email).toLowerCase(), p.ad_soyad)); }
    catch (error) { console.warn('Kullanıcı adları okunamadı', error); }
    const idler = [...new Set(kayitlar.flatMap(k => (k.denetimler || []).map(d => d.id)))].filter(id => AVES_CIHAZ_DURUMU.UUID.test(id)).slice(0, 80);
    const denetimAdlari = new Map();
    if (idler.length) {
      try { (await API.select('denetimler', `select=id,musteri_unvani,asansor_seri_no&id=in.(${idler.join(',')})`)).forEach(d => denetimAdlari.set(d.id, `${d.musteri_unvani || 'Firma yok'} · ${d.asansor_seri_no || '-'}`)); }
      catch (error) { console.warn('Denetim adları okunamadı', error); }
    }
    const simdi = Date.now();
    const sirali = AVES_CIHAZ_DURUMU.sirala(kayitlar, simdi);
    const etiket = { sorunlu: ['Sorunlu', 'bad'], sessiz: ['Haber yok', 'bad'], bekliyor: ['Bekliyor', 'pending'], temiz: ['Eşitlenmiş', 'ok'] };
    if (!sirali.length) { icerik.innerHTML = 'Henüz hiçbir cihaz durum bildirmedi. Mühendislerin uygulamayı güncelleyip açması gerekir.'; return; }
    const sorunSayisi = sirali.filter(x => x.seviye !== 'temiz').length;
    icerik.className = '';
    icerik.innerHTML = `<div class="photo-help">${sorunSayisi ? `${sorunSayisi} cihazda eşitlenmemiş iş var` : 'Tüm cihazlar eşitlenmiş görünüyor'}. Her cihaz durumunu açıkken ve bağlantı varken bildirir; yaşı satırda yazar.</div>` +
      sirali.map(({ satir, seviye, nedenler, bekleSaat }) => {
        const ad = kisiler.get(String(satir.email).toLowerCase()) || satir.email;
        const [metin, css] = etiket[seviye];
        const kayitlarHtml = (satir.denetimler || []).map(d => `<div class="sync-review-row ${d.cakisma ? 'is-conflict' : ''}"><b>${esc(denetimAdlari.get(d.id) || `Denetim ${String(d.id).slice(0, 8)}`)}</b><small>${[d.bekleyen && `${d.bekleyen} işlem`, d.cakisma && `${d.cakisma} çakışma`, d.yetki && `${d.yetki} yetki incelemesi`].filter(Boolean).join(' · ')}</small></div>`).join('');
        return `<section class="fr65-ozet-bolum"><h4>${esc(ad)} <span class="pill ${css}">${metin}</span></h4>
            <div class="fr65-ozet-satir"><span>Cihaz · sürüm</span><b>${esc(String(satir.cihaz_id).slice(0, 8))} · ${esc(satir.uygulama_surumu || '-')}</b></div>
            <div class="fr65-ozet-satir"><span>Son bildirim</span><b>${esc(AVES_CIHAZ_DURUMU.gecenSure(satir.bildirildi_at, simdi))}${satir.cevrimici ? '' : ' (çevrimdışıydı)'}</b></div>
            ${nedenler.length ? `<div class="fr65-ozet-satir"><span>Durum</span><b>${esc(nedenler.join(' · '))}</b></div>` : ''}
            ${bekleSaat >= 1 ? `<div class="fr65-ozet-satir"><span>En eski bekleyen</span><b>${esc(String(bekleSaat))} saattir</b></div>` : ''}
            ${satir.son_hata ? `<div class="fr65-ozet-satir"><span>Son hata</span><b>${esc(satir.son_hata)}</b></div>` : ''}
            ${kayitlarHtml}</section>`;
      }).join('');
  } catch (error) {
    icerik.textContent = error && error.status === 404
      ? 'Sunucuda cihaz durumu tablosu henüz kurulmamış (migration 87 uygulanmalı).'
      : 'Cihaz durumları okunamadı. Bağlantıyı kontrol edip tekrar deneyin.';
  }
}

// Yedek dosyasından geri yükleme: yalnız cihazda olmayan FR.65 kayıtları eklenir; var olan hiçbir kayıt ezilmez.
// Eklenen kayıt normal "yeni kayıt" gibi sunucuya gönderilir (var olan satır sunucuda da ezilmez).
async function yedekGeriYuklemePlani(paket) {
  const yerel = await DB.all('denetimler');
  const bekleyenSilme = new Set((await DB.outboxAll()).filter(item => item.op === 'delete' && item.table === 'denetimler')
    .map(item => ((item.filter || '').match(/id=eq\.(.+)/) || [])[1]).filter(Boolean));
  return AVES_YEDEK.planla(paket, {
    yerelIdler: new Set(yerel.map(item => item.id)),
    bekleyenSilme,
    gorunebilir: denetimGorunebilirMi,
    fr65Mi: fr65SahaKaydiMi,
  });
}

async function yedekGeriYukle(paket, secilenIdler) {
  const secili = new Set(secilenIdler);
  const plan = await yedekGeriYuklemePlani(paket); // yükleme anında yeniden denetlenir
  let eklenen = 0;
  for (const kayit of plan.kayitlar) {
    if (!kayit.yuklenebilir || !secili.has(kayit.id)) continue;
    const d = JSON.parse(JSON.stringify(kayit.denetim));
    const silinenler = (await DB.kvGet('deleted_ids')) || [];
    if (silinenler.includes(d.id)) await DB.kvSet('deleted_ids', silinenler.filter(x => x !== d.id));
    await localWrite('denetimler', d, 'denetimler', { insert_only: true });
    for (const row of AVES_YEDEK.gecmisSatirlari(paket, d.id)) await DB.put('gecmis', row);
    eklenen++;
  }
  return eklenen;
}

function yedekGeriYuklemeGoster() {
  if (!Profile.canCreate) { toast('Geri yükleme için denetim oluşturma yetkisi gerekir'); return; }
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="modal">
      <button class="close" aria-label="Kapat">×</button>
      <h3>Yedekten geri yükle</h3>
      <div id="geriIcerik">
        <p class="backup-note">Daha önce “Yedek al” ile indirdiğiniz .json dosyasını seçin. Yalnız bu cihazda bulunmayan B / E / H1 kayıtları eklenir; cihazdaki hiçbir kayıt değiştirilmez.</p>
        <input type="file" id="geriDosya" accept=".json,application/json">
      </div>
    </div>`;
  document.body.appendChild(ov);
  const close = () => ov.remove();
  ov.querySelector('.close').onclick = close;
  ov.onclick = event => { if (event.target === ov) close(); };
  const icerik = ov.querySelector('#geriIcerik');
  ov.querySelector('#geriDosya').onchange = async event => {
    const dosya = event.target.files && event.target.files[0];
    if (!dosya) return;
    let paket;
    try { paket = JSON.parse(await dosya.text()); }
    catch { icerik.innerHTML = '<div class="empty">Dosya okunamadı; geçerli bir AVES yedeği değil. Hiçbir şey geri yüklenmedi.</div>'; return; }
    const dogru = await AVES_YEDEK.dogrula(paket, { sha256Hex, stableStringify });
    if (!dogru.ok) { icerik.innerHTML = `<div class="empty">${esc(dogru.hata)}</div>`; return; }
    const plan = await yedekGeriYuklemePlani(paket);
    icerik.innerHTML = `<div class="backup-list">${plan.kayitlar.map((k, i) => `<label class="backup-row"><input type="checkbox" class="geri-sec" value="${esc(k.id || '')}" ${k.yuklenebilir ? 'checked' : 'disabled'}><span><b>${esc(k.denetim?.musteri_unvani || 'Firma yok')}</b><small>${esc(k.denetim?.asansor_seri_no || '')} · ${esc(k.denetim?.modul || '')} · ${esc(k.neden)}</small></span></label>`).join('')}</div>
        <button class="btn btn-primary" id="geriYukle" ${plan.yuklenebilirSayisi ? '' : 'disabled'}>Seçilenleri geri yükle</button>
        <small class="backup-note">Yedek ${esc(String(paket.olusturuldu || '').slice(0, 10))} tarihli. Fotoğraf dosyaları yedekte yoktur.</small>`;
    const dugme = icerik.querySelector('#geriYukle');
    const kutular = [...icerik.querySelectorAll('.geri-sec:not([disabled])')];
    const yenile = () => {
      const n = kutular.filter(kutu => kutu.checked).length;
      dugme.disabled = n === 0;
      dugme.textContent = n ? `Seçilenleri geri yükle (${n})` : 'Seçilenleri geri yükle';
    };
    kutular.forEach(kutu => { kutu.onchange = yenile; });
    yenile();
    dugme.onclick = async () => {
      dugme.disabled = true;
      try {
        const eklenen = await yedekGeriYukle(paket, kutular.filter(kutu => kutu.checked).map(kutu => kutu.value));
        toast(eklenen ? `${eklenen} denetim geri yüklendi` : 'Geri yüklenecek kayıt kalmadı');
        close();
        showList();
      } catch (error) {
        console.error('Geri yükleme başarısız', error);
        toast('Geri yükleme tamamlanamadı; cihazdaki kayıtlar değişmedi');
        dugme.disabled = false;
      }
    };
  };
}
