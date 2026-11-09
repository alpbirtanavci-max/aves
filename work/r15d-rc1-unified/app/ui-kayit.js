/* ============================================================
   AVES Saha Denetim — kayıt yardımcıları
   FR.65 özeti ve silme, çevrimdışı hazırlık durumu, modül/profil/form kaydı yardımcıları.
   (Eski UI kapanışının parçasıdır: ui-durum → ui-foto → ui-yonetim → ui-kayit → ui-liste → ui-yeni →
   ui-fr65 → ui-denetim → ui-taslak → ui-form → ui-madde → ui-kapanis → ui-son; ortak global kapsam.)
   ============================================================ */
'use strict';

// Girilen saha verilerinin özeti. Kayıt kapatılınca otomatik açılır; kapatılmış kayıttan da açılabilir.
async function fr65OzetiniGoster(denetimId, { onClose = null } = {}) {
  const d = await DB.get('denetimler', denetimId);
  const ctx = fr65AktifRapor && fr65AktifRapor.id === denetimId ? fr65AktifRapor : null;
  if (!d || !fr65SahaKaydiMi(d) || !ctx) { toast('Denetim özeti hazırlanamadı'); if (onClose) onClose(); return; }
  const record = AVES_DENETIM_FORM_SETI.normalize(d.denetim_form_kayitlari, d.teknik_dosya_kayitlari);
  const report = AVES_FR65_SAHA_TOOLS.buildReport(d, record.forms?.FR65?.values || {}, ctx.sections, ctx.fieldConditions);
  const arsivli = !!d.arsive_aktarildi_at;
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="modal fr65-ozet">
      <button class="close" aria-label="Kapat">×</button>
      <h3>Denetim Özeti</h3>
      <div class="fr65-ozet-meta">${report.metadata.map(item => `<div><span>${esc(item.label)}</span><b>${esc(item.value)}</b></div>`).join('')}</div>
      <div class="fr65-ozet-durum" id="fr65OzetDurum">Durum kontrol ediliyor…</div>
      ${report.sections.length ? report.sections.map(section => `<section class="fr65-ozet-bolum"><h4>${esc(section.title)}</h4>${section.fields.map(field => `<div class="fr65-ozet-satir"><span>${esc(field.label)}</span><b>${esc(field.value)}</b></div>`).join('')}</section>`).join('')
        : '<div class="empty">Bu denetimde kayıtlı saha verisi yok.</div>'}
      ${Profile.canSeeAllInspections ? `<button class="btn btn-ghost" id="fr65ArsivToggle">${arsivli ? '📁 Arşiv işaretini kaldır' : '📁 Kurumsal arşive aktarıldı olarak işaretle'}</button>` : ''}
      <button class="btn btn-primary" id="fr65OzetKapat">Tamam</button>
    </div>`;
  document.body.appendChild(ov);
  let kapandi = false;
  let durumZamani = null;
  const close = () => { if (kapandi) return; kapandi = true; clearInterval(durumZamani); ov.remove(); if (onClose) onClose(); };
  ov.querySelector('.close').onclick = close;
  ov.querySelector('#fr65OzetKapat').onclick = close;
  ov.onclick = event => { if (event.target === ov) close(); };

  // Özet açıldıktan sonra tamamlanır (açılışı geciktirmez) ve senkron bitene kadar kendini yeniler.
  const durumuYenile = async () => {
    try {
      const sync = await Sync.denetimSyncOzeti(d.id);
      const guncel = await fr65ButunlukOzetiHesapla(await DB.get('denetimler', d.id) || d);
      const sonKayit = await DB.get('denetimler', d.id) || d;
      const muhurGecerli = !!sonKayit.butunluk_hash && sonKayit.butunluk_hash === guncel.hash;
      const senkron = sync.korunan ? `⚠ ${sync.korunan} işlem cihazda korumada`
        : sync.bekleyen ? `Cihaza kaydedildi · ${sync.bekleyen} işlem sunucuyu bekliyor`
        : '✓ Cihaz ve sunucu eşit';
      const el = ov.querySelector('#fr65OzetDurum');
      if (el) {
        el.className = `fr65-ozet-durum ${sync.korunan ? 'error' : (sync.bekleyen ? 'pending' : 'ok')}`;
        el.textContent = `${senkron}${muhurGecerli ? ' · mühür geçerli' : (sonKayit.butunluk_hash ? ' · ⚠ mühür eşleşmiyor' : '')}${arsivli ? ' · arşivde' : ''}`;
      }
      if (!sync.korunan && !sync.bekleyen) clearInterval(durumZamani);
    } catch (error) { console.warn('FR.65 özet durumu okunamadı', error); }
  };
  durumuYenile();
  durumZamani = setInterval(durumuYenile, 1000);

  const arsivToggle = ov.querySelector('#fr65ArsivToggle');
  if (arsivToggle) arsivToggle.onclick = async () => {
    arsivToggle.disabled = true;
    try {
      const latest = await DB.get('denetimler', d.id) || d;
      const isaretli = !!latest.arsive_aktarildi_at;
      if (!isaretli) {
        if (latest.denetim_durumu !== 'Çalışma Tamamlandı') { toast('Arşiv işareti yalnız kapatılmış kayıtta konabilir'); arsivToggle.disabled = false; return; }
        const sonYedek = await DB.kvGet(`fr65_yedek_${latest.id}`);
        if (!sonYedek && !confirm('Bu kayıt için bu cihazdan yedek indirilmedi. Yedeksiz arşive aktarıldı olarak işaretlemek önerilmez. Yine de işaretlensin mi?')) { arsivToggle.disabled = false; return; }
      }
      const expectedUpdatedAt = latest.updated_at;
      const now = new Date().toISOString();
      latest.arsive_aktarildi_at = isaretli ? null : now;
      latest.arsive_aktaran_email = isaretli ? null : (Profile.email || API.email || null);
      latest.updated_at = now;
      await localWrite('denetimler', latest, 'denetimler', {
        conditional_update: {
          expected_updated_at: expectedUpdatedAt,
          fields: ['arsive_aktarildi_at', 'arsive_aktaran_email', 'updated_at'],
        },
      });
      toast(isaretli ? 'Arşiv işareti kaldırıldı' : 'Arşive aktarıldı olarak işaretlendi');
      arsivToggle.textContent = isaretli ? '📁 Kurumsal arşive aktarıldı olarak işaretle' : '📁 Arşiv işaretini kaldır';
      arsivToggle.disabled = false;
    } catch (error) {
      console.warn('FR.65 arşiv işareti yazılamadı', error);
      toast('İşaret kaydedilemedi');
      arsivToggle.disabled = false;
    }
  };
}

async function fr65SahaKaydiniSil(denetim, button = null) {
  if (!canDeleteDenetim(denetim) || !fr65SahaKaydiMi(denetim) || !denetimSahibiMi(denetim)) {
    toast('Yalnızca kendi oluşturduğunuz FR.65 kayıtlarını silebilirsiniz');
    return;
  }
  const id = String(denetim.id || '');
  const kimlik = `${denetim.musteri_unvani || 'Firma yok'} · ${denetim.asansor_seri_no || 'Seri no yok'}`;
  if (!confirm(`“${kimlik}” FR.65 saha kaydı ve bağlı verileri silinsin mi?`)) return;
  if (!confirm('Bu işlem geri alınamaz. Sunucudan ve bu cihazdan silinecek. Emin misiniz?')) return;
  if (!navigator.onLine || !API.loggedIn) {
    toast('Denetimi silmek için internet bağlantısı gerekli; kayıt korunuyor');
    return;
  }

  if (button) { button.disabled = true; button.textContent = 'Senkronize ediliyor…'; }
  try {
    if (currentView === 'inspection' && currentDenetimId === id && activeFr65Flush) await activeFr65Flush();
    const pendingBeforeSync = await Sync.denetimSyncOzeti(id);
    if (pendingBeforeSync.items.length) await Sync.full();
    const pendingAfterSync = await Sync.denetimSyncOzeti(id);
    if (pendingAfterSync.items.length) {
      throw new Error('Bu denetime ait bekleyen veya inceleme gereken işlemler var. Önce Senkron Merkezi’nde çözün; kayıt silinmedi.');
    }

    const latest = await DB.get('denetimler', id);
    if (!latest || !fr65SahaKaydiMi(latest) || !canDeleteDenetim(latest) || !denetimSahibiMi(latest)) {
      throw new Error('FR.65 kaydı değişmiş veya artık silme yetkiniz yok; kayıt korunuyor.');
    }
    const linkedFollowups = (await DB.all('denetimler')).filter(item =>
      item.id !== id && (item.takip_onceki_denetim_id === id || item.takip_ana_denetim_id === id)
    );
    if (linkedFollowups.length) {
      throw new Error(`Bu denetime bağlı ${linkedFollowups.length} takip kaydı var; ana kayıt silinemez.`);
    }
    const localPhotos = await DB.allByIndex('fotograflar', 'byDenetim', id);
    const remotePhotos = await API.select('denetim_fotograflari', `select=id&denetim_id=eq.${encodeURIComponent(id)}&limit=1`);
    if (localPhotos.length || remotePhotos.length) {
      throw new Error('Bu denetime bağlı fotoğraflar var. Önce fotoğrafları arşivleyip ayrı kaldırın; kayıt korunuyor.');
    }

    const serverRows = await API.select('denetimler', `select=id,updated_at&id=eq.${encodeURIComponent(id)}&limit=1`);
    // Sunucu boş yanıt verdiyse kayıt orada yoktur (başka yerden/önceki denemede silinmiş ya da hiç ulaşmamış).
    // Bekleyen işlem de yoksa cihazdaki artık kopya, kullanıcı onayıyla yalnız cihazdan kaldırılır.
    const sunucudaYok = serverRows.length === 0;
    if (sunucudaYok) {
      if (!confirm('Bu kayıt sunucuda bulunamadı (daha önce silinmiş olabilir). Yalnız bu cihazdaki kopya kaldırılsın mı? Kayıt başka yerde yoksa geri getirilemez.')) {
        if (button) { button.disabled = false; button.textContent = '🗑 Sil'; }
        return;
      }
    } else {
      if (serverRows.length !== 1 || !serverRows[0].updated_at) {
        throw new Error('Kayıt sunucuda doğrulanamadı; cihazdaki kayıt korunuyor.');
      }
      if (String(serverRows[0].updated_at) !== String(latest.updated_at || '')) {
        throw new Error('Kayıt başka bir oturumda değiştirilmiş. Listeyi yenileyip tekrar kontrol edin; silme yapılmadı.');
      }

      let deleteError = null;
      try {
        await API.del('denetimler', `id=eq.${encodeURIComponent(id)}&updated_at=eq.${encodeURIComponent(serverRows[0].updated_at)}`);
      } catch (error) { deleteError = error; }
      const remaining = await API.select('denetimler', `select=id&id=eq.${encodeURIComponent(id)}&limit=1`);
      if (remaining.length) throw deleteError || new Error('Sunucu silme işlemini doğrulamadı; kayıt cihazda korundu.');
    }

    await DB.deleteInspectionLocal(id);
    try {
      const draft = AVES_FORM_DRAFT_JOURNAL.readFr65Capture(localStorage, id, API.email);
      if (draft) AVES_FORM_DRAFT_JOURNAL.clearFr65CaptureIfOwner(
        localStorage, id, API.email, draft.ts, draft.writerId || null);
      localStorage.removeItem(`aves_fr65_active_section_v1_${encodeURIComponent(id)}`);
      localStorage.removeItem(`aves_fr65_scroll_v1_${encodeURIComponent(id)}`);
    } catch (error) { console.warn('Silinen FR.65 kaydının cihaz taslağı temizlenemedi', error); }
    if (currentDenetimId === id) {
      activeFr65Flush = null;
      stopFr65ScrollTracking();
    }
    await Sync.updatePill();
    toast('FR.65 denetim kaydı silindi');
    await showList();
  } catch (error) {
    console.error('FR.65 denetim kaydı silinemedi', error);
    toast(error.message || 'Denetim silinemedi; kayıt korunuyor');
    if (button) { button.disabled = false; button.textContent = '🗑 Denetimi sil'; }
  }
}

async function cevrimdisiHazirlikDurumu(d, rows = []) {
  if (fr65SahaKaydiMi(d)) {
    const fr65Marker = await DB.kvGet(`offline_ready_${d.id}`);
    if (!fr65Marker || fr65Marker.fr65 !== true) return { ready: false, detail: 'Bu cihazda hazırlık kontrolü yapılmadı.' };
    if (fr65Marker.device_id !== await getDeviceId()) return { ready: false, detail: 'Hazırlık başka bir cihazda yapılmış.' };
    if (fr65Marker.app_build_id !== APP_VERSION) return { ready: false, detail: 'Uygulama güncellendi; bu cihazda tekrar kontrol edilmeli.' };
    return { ready: true, detail: 'FR.65 formu ve gerekli uygulama dosyaları bu cihazda doğrulandı. Girişler her durumda önce cihaza yazılır.', checkedAt: fr65Marker.checked_at };
  }
  if (!sahaUygulamaModuluGMi(d)) {
    return { ready: false, detail: 'Bu kayıt Modül G değil; bu uygulamada açılamaz.' };
  }
  const marker = await DB.kvGet(`offline_ready_${d.id}`);
  if (!marker) return { ready: false, detail: 'Bu cihazda hazırlık kontrolü yapılmadı.' };
  if (marker.device_id !== await getDeviceId()) return { ready: false, detail: 'Hazırlık başka bir cihazda yapılmış.' };
  if (marker.app_build_id !== APP_VERSION) return { ready: false, detail: 'Uygulama güncellendi; bu cihazda tekrar kontrol edilmeli.' };
  if (!rows.length && formOdakliDenetimMi(d, rows)) {
    const formKeys = modulFormSeti(d).map(form => form.key);
    const formSetHash = await sha256Hex(formKeys.join('|'));
    if (marker.forms_only !== true) return { ready: false, detail: 'Form seti için bu cihazda çevrimdışı hazırlık kontrolü yapılmadı.' };
    if (!formKeys.length || marker.form_set_key_hash !== formSetHash) return { ready: false, detail: 'Bu modülün form seti bu cihazdaki hazırlık kaydıyla eşleşmiyor.' };
    return { ready: true, detail: `${formKeys.length} form tanımı ve gerekli uygulama dosyaları bu cihazda doğrulandı.`, checkedAt: marker.checked_at };
  }
  if (!rows.length) return { ready: false, detail: 'Checklist maddeleri bu cihazda bulunmuyor.' };
  if (rows.length !== marker.expected_item_count) return { ready: false, detail: `${rows.length}/${marker.expected_item_count} madde cihazda.` };
  const itemSetHash = await sha256Hex(rows.map(row => row.madde_id).sort().join('|'));
  if (itemSetHash !== marker.item_set_hash) return { ready: false, detail: 'Cihazdaki madde kümesi hazırlanan kopyayla eşleşmiyor.' };
  return {
    ready: true,
    detail: `${rows.length} madde ve gerekli uygulama dosyaları bu cihazda doğrulandı.`,
    checkedAt: marker.checked_at,
  };
}

// TS EN 81-70 (erişilebilirlik), TS EN 81-71 (kasıtlı tahribata dayanıklılık)
// ve TS EN 81-73 (yangın anında davranış) AVES saha denetiminin zorunlu
// katmanlarıdır. Denetçi bunları ek standart olarak seçip kaldıramaz;
// uygulanabilirlik (örn. bina yüksekliği eşiği) her bölümün kendi ilk
// maddesinde denetçi tarafından değerlendirilir. TS EN 81-72 (itfaiyeci
// asansörü) ise ayrı, kategorik bir asansör tipidir — yalnız denetçi
// açıkça işaretlerse (ek_standartlar) checklist'e eklenir.
function seciliStandartGruplari(anaStandart, ekStandartlar = []) {
  const gruplar = new Set(['Genel', anaStandart, '81-71', '81-73', ...(ekStandartlar || [])]);
  if (anaStandart === '81-20') gruplar.add('81-70');
  return gruplar;
}

function kontrolProfili(d) {
  if (d && d.kontrol_profili) return d.kontrol_profili;
  return KONTROL_PROFILLERI.TAM;
}

// Bu saha uygulaması yalnız Modül G içindir. Eski B/E/H1 kayıtları veritabanında
// korunur, ancak burada açılmaz veya düzenlenmez. Modül etiketi olmayan tarihsel
// kayıtlar, uygulamanın eski sürümlerinde yalnız G üretildiği için G kabul edilir.
function sahaUygulamaModuluGMi(d) {
  if (!d) return false;
  const profil = String(d.kontrol_profili || '');
  const etiketler = [d.modul, d.denetim_turu].filter(Boolean)
    .map(etiket => String(etiket).toLocaleLowerCase('tr-TR'));
  for (const etiket of etiketler) {
    const acikModul = etiket.match(/mod[uü]l\s*([a-z0-9]+)/i);
    if (acikModul && acikModul[1].toLocaleLowerCase('tr-TR') !== 'g') return false;
    if (/\bh1\b/i.test(etiket)) return false;
  }
  if (profil) return profil === KONTROL_PROFILLERI.TAM;
  return true;
}

function denetimTuruOzeti(d) {
  return (d && (d.denetim_turu || d.modul)) || '';
}

function maddeKontrolProfilineUygun(m, profil) {
  if (profil === KONTROL_PROFILLERI.TAM) return true;
  const profiller = Array.isArray(m.denetim_profilleri) ? m.denetim_profilleri : [];
  return profiller.includes(profil);
}

function sahaTeyidiProfiliMi(profil) {
  return profil === KONTROL_PROFILLERI.SAHA_TEYIDI_E ||
    profil === KONTROL_PROFILLERI.SAHA_TEYIDI_H1;
}

function denetimFormModulu(denetim) {
  if (!denetim || denetim.takip_onceki_denetim_id) return null;
  const profil = kontrolProfili(denetim);
  const tur = String(denetim.denetim_turu || denetim.modul || '').toLocaleLowerCase('tr-TR');
  if (profil === KONTROL_PROFILLERI.MODUL_B || tur.includes('modül b')) return 'B';
  if (profil === KONTROL_PROFILLERI.SAHA_TEYIDI_E || tur.includes('modül e')) return 'E';
  if (profil === KONTROL_PROFILLERI.SAHA_TEYIDI_H1 || tur.includes('h1')) return 'H1';
  if (profil === KONTROL_PROFILLERI.TAM || tur.includes('modül g') || !denetim.kontrol_profili) return 'G';
  return null;
}

function modulFormDenetimiMi(denetim) {
  return ['B', 'E', 'H1'].includes(denetimFormModulu(denetim));
}

function fr65SahaKaydiMi(denetim) {
  if (!denetim) return false;
  const modules = {
    B: { name: 'Modül B', type: DENETIM_TURLERI.MODUL_B, profile: KONTROL_PROFILLERI.MODUL_B },
    E: { name: 'Modül E', type: DENETIM_TURLERI.MODUL_E, profile: KONTROL_PROFILLERI.SAHA_TEYIDI_E },
    H1: { name: 'Modül H1', type: DENETIM_TURLERI.MODUL_H1, profile: KONTROL_PROFILLERI.SAHA_TEYIDI_H1 },
  };
  const moduleKey = Object.keys(modules).find(key => modules[key].name === denetim.modul);
  const expected = modules[moduleKey];
  if (!expected || denetimFormModulu(denetim) !== moduleKey ||
      denetim.denetim_turu !== expected.type || denetim.kontrol_profili !== expected.profile) return false;
  const kayit = denetim.denetim_form_kayitlari;
  return !!(kayit && typeof kayit === 'object' && kayit.saha_veri_akisi === 'fr65_saha_v1');
}

// Yeni B/E/H1 denetimleri form seti odaklıdır ve G checklist satırı üretmez.
// Eski kayıtlardaki mevcut satırlar korunur; bunları yeni ekranda gizleyip
// kapanışta sessizce yok saymamak için yalnız satırsız kayıtlar bu akıştadır.
function formOdakliDenetimMi(denetim, rows = []) {
  // Form seti girişi ayrı Form Doldurucu uygulamasına taşındı. Eski kayıtların
  // form JSON'u korunur fakat AVES Saha artık form-only denetim başlatmaz.
  return false;
}

function modulFormSeti(denetim) {
  const modul = denetimFormModulu(denetim);
  return modul && typeof AVES_DENETIM_FORM_SETI !== 'undefined'
    ? AVES_DENETIM_FORM_SETI.formsFor(modul, denetim.ana_standart, denetim.tahrik_tipi)
    : [];
}

function formSetiGozdenGecirildiMi(denetim) {
  const kayit = denetimFormKaydi(denetim);
  return !!(kayit && kayit.form_seti_gozden_gecirildi_at);
}

function denetimFormKaydi(denetim) {
  if (!denetim || typeof AVES_DENETIM_FORM_SETI === 'undefined') return null;
  return AVES_DENETIM_FORM_SETI.normalize(denetim.denetim_form_kayitlari, denetim.teknik_dosya_kayitlari);
}

function fr65SahaIstatistigi(denetim) {
  if (!fr65SahaKaydiMi(denetim)) return null;
  const record = denetimFormKaydi(denetim);
  return AVES_TEKNIK_DOSYA_FORM.countFr65Capture(record, denetim.tahrik_tipi);
}

function denetimFormIstatistikleri(denetim) {
  // Form verileri tarihsel olarak saklanır; bu uygulamada yeni form girişi yoktur.
  return null;
}

function denetimFormKaydiVarMi(denetim) {
  return !!(denetim && (denetim.denetim_form_kayitlari || denetim.teknik_dosya_kayitlari));
}

function standartOzeti(d) {
  const gruplar = [d.ana_standart];
  if (d.ana_standart === '81-20') gruplar.push('81-70 (zorunlu)');
  gruplar.push('81-71 (zorunlu)', '81-73 (zorunlu)');
  const ekStandartEtiketleri = {
    '81-72': '81-72 (İtfaiyeci)', '81-21': '81-21 (Mevcut Bina)', '81-22': '81-22 (Eğik Düzlem)',
    '81-28': '81-28 (Uzaktan Alarm)', '81-77': '81-77 (Sismik)',
  };
  gruplar.push(...(d.ek_standartlar || []).map(g => ekStandartEtiketleri[g] || g));
  return gruplar.filter(Boolean).join(' + ');
}

// Bir madde "tamamlanmış" sayılır mı? (sıralı akışın temeli)
// Not: Uygun Değil'de açıklama/bulgu seçimi ARTIK ZORUNLU DEĞİL — bazı maddelerde
// durum kendini açıklar, denetçi gerek görmeyebilir. Alanlar hâlâ mevcut ve kullanılabilir.
function effectiveDurum(r) {
  // "Veri eksik" eski sürümden gelebilen iç kontrol bilgisidir; checklist sonucu sayılmaz.
  if (r.durum === 'Veri eksik') return null;
  // Görülmemiş normal bir madde, olası eski DOM/senkron durumunu devralmaz.
  // Otomatik Uygulanmaz bunun tek bilinçli istisnasıdır.
  if (r.denetci_gordu === false && !r.otomatik_uygulanmaz) return null;
  return r.durum || null;
}
const icKontrolNotuVar = (r) => !!(r && (r.ic_kontrol_notu || r.durum === 'Veri eksik'));

function isComplete(r) {
  return DURUMLAR.includes(effectiveDurum(r));
}

const canAdvanceFromItem = (r) => isComplete(r);

// Otomatik Uygulanmaz madde, denetçinin karşısına çıkıp Sonraki ile geçilmeden
// sıralı akışta tamamlanmış sayılmaz. Eski kayıtlarda alan yoksa akış bozulmaz.
function isFlowComplete(r) {
  return isComplete(r) && r.denetci_gordu !== false;
}
