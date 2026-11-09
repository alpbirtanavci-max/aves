/* ============================================================
   AVES Saha Denetim — paylaşılan arayüz durumu
   Ekran durumu değişkenleri, FR.65 yazar kimliği, yetki/kimlik/seri numarası yardımcıları. UI dosyalarının ilki.
   (Eski UI kapanışının parçasıdır: ui-durum → ui-foto → ui-yonetim → ui-kayit → ui-liste → ui-yeni →
   ui-fr65 → ui-denetim → ui-taslak → ui-form → ui-madde → ui-kapanis → ui-son; ortak global kapsam.)
   ============================================================ */
'use strict';
const app = document.getElementById('app');
let currentDenetimId = null;
let fotografSayilari = new Map();
let fotografBekleyenSayisi = 0;
let activeFr65VersionListener = null;
const fr65WriterIds = new Map();

function fr65KimlikKilitAl(lockName) {
  return new Promise((resolve, reject) => {
    let settled = false;
    navigator.locks.request(lockName, { ifAvailable: true }, lock => {
      if (!lock) { settled = true; resolve(false); return; }
      settled = true;
      resolve(true);
      // Keep this tab's writer identity reserved until the document closes.
      return new Promise(() => {});
    }).catch(error => { if (!settled) reject(error); });
  });
}

async function fr65TaslakYazari(denetimId) {
  const owner = String(API.email || '').trim().toLowerCase();
  const mapKey = `${owner}:${denetimId}`;
  if (fr65WriterIds.has(mapKey)) return fr65WriterIds.get(mapKey);
  const storageKey = `aves_fr65_writer_${encodeURIComponent(owner)}_${encodeURIComponent(denetimId)}`;
  let writerId = '';
  let storedWriterId = '';
  try {
    storedWriterId = sessionStorage.getItem(storageKey) || '';
  } catch {
    storedWriterId = '';
  }
  const newWriterId = () => globalThis.crypto?.randomUUID?.() || `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  writerId = storedWriterId || newWriterId();
  let writerLockClaimed = false;
  try {
    if (navigator.locks && typeof navigator.locks.request === 'function') {
      for (let attempt = 0; attempt < 5; attempt++) {
        writerLockClaimed = await fr65KimlikKilitAl(`aves-fr65-writer:${mapKey}:${writerId}`);
        if (writerLockClaimed) break;
        writerId = newWriterId();
      }
    }
  } catch { writerLockClaimed = false; }
  if (!writerLockClaimed) {
    // sessionStorage can be copied by window.open. Without an exclusive
    // browser lock, use a per-document identity; prior drafts remain available
    // through the explicit protected-draft restore flow.
    writerId = newWriterId();
  }
  if (writerLockClaimed) {
    try { sessionStorage.setItem(storageKey, writerId); } catch { /* The in-memory identity still protects this document. */ }
  }
  fr65WriterIds.set(mapKey, writerId);
  return writerId;
}
let currentView = 'login';
let filter = 'all';
let search = '';
let openBolums = new Set();
let cursors = {}; // adım adım mod: bölüm -> gösterilen madde indeksi
let autoAdvanceTimer = null;
let transitioningId = null;
let currentCanEdit = false;
let inspectionReadOnly = false;
let listSearch = '';
let listDateFilter = 'all';
const pendingEditorWrites = new Set();
const editorDraftTimers = new Map();
let activeFr65Flush = null;
let fr65AktifRapor = null; // özet panelinin bölüm/koşul tanımları (render sırasında dolar)
let activeFr65PositionSaver = null;
let activeFr65ScrollHandler = null;
let activeFr65ScrollSaveTimer = null;

function stopFr65ScrollTracking() {
  if (activeFr65PositionSaver) activeFr65PositionSaver();
  if (activeFr65ScrollHandler) window.removeEventListener('scroll', activeFr65ScrollHandler);
  if (activeFr65ScrollSaveTimer) clearTimeout(activeFr65ScrollSaveTimer);
  activeFr65ScrollHandler = null;
  activeFr65ScrollSaveTimer = null;
  activeFr65PositionSaver = null;
}

const esc = (s) => (s ?? '').toString().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeFilePart = (s) => (s ?? '').toString().trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '_').slice(0, 80) || 'denetim';

const SERI_GRUPLARI = [
  ['kabin_tamponlari', 'Kabin tamponu', '01 - Kuyu Dibi'],
  ['karsi_agirlik_tamponlari', 'Karşı ağırlık tamponu', '01 - Kuyu Dibi'],
  ['parasut_frenleri', 'Paraşüt fren / güvenlik tertibatı', '03 - Kabin ve Kabin Üstü'],
  ['kat_kapilari', 'Kat kapısı', '03 - Kabin ve Kabin Üstü'],
  ['regulatorler', 'Regülatör', '04 - Makine ve Şase'],
  ['motorlar', 'Motor / tahrik makinesi', '04 - Makine ve Şase'],
  ['kumanda_kartlari', 'Kumanda kartı', '05 - Elektrik ve Test'],
  ['hidrolik_valf_grubu', 'Hidrolik valf grubu', '04 - Makine ve Şase'],
  ['boru_kirilma_valfleri', 'Boru kırılma valfi', '04 - Makine ve Şase'],
];

function seriNumaralariNormalize(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const result = { schema_version: 1 };
  for (const [key] of SERI_GRUPLARI) {
    result[key] = Array.isArray(source[key])
      ? source[key].map(item => ({
        id: item && item.id ? item.id : crypto.randomUUID(),
        seri_no: item && item.seri_no ? String(item.seri_no) : '',
        ...(key === 'kat_kapilari' ? {
          kat: item && item.kat ? String(item.kat) : '',
          giris: item && item.giris ? String(item.giris) : '',
        } : {}),
      }))
      : [];
  }
  return result;
}

// Sayaç ve eksik listesi ana ekipman GRUBU bazında tutulur (kaç ayrı parça
// türü, kaç durak/kat sayısı değil). Bir grup için tek bir seri no girilmesi
// yeterlidir; kat kapısı gibi çok sayıda kayıt alınabilen gruplarda ek
// kayıtlar (her kat için ayrı satır) denetçinin isteğine bağlı kalır.
function seriNumarasiSayisi(d) {
  const data = seriNumaralariNormalize(d && d.seri_numaralari);
  return seriGereksinimleri(d).filter(([key]) => data[key].some(item => item.seri_no.trim())).length;
}

function seriGereksinimleri(d) {
  const requirements = [
    ['kabin_tamponlari', 'Kabin tamponu', 1],
    ['parasut_frenleri', 'Paraşüt fren / güvenlik tertibatı', 1],
    ['kat_kapilari', 'Kat kapısı', 1],
    ['kumanda_kartlari', 'Kumanda kartı', 1],
  ];
  if (d && d.tahrik_tipi === 'Elektrikli') requirements.splice(1, 0, ['karsi_agirlik_tamponlari', 'Karşı ağırlık tamponu', 1]);
  if (d && d.makine_dairesi_tipi === 'MRL') {
    requirements.push(['regulatorler', 'Regülatör', 1], ['motorlar', 'Motor / tahrik makinesi', 1]);
  }
  if (d && d.tahrik_tipi === 'Hidrolik') {
    requirements.push(
      ['hidrolik_valf_grubu', 'Hidrolik valf grubu', 1],
      ['boru_kirilma_valfleri', 'Boru kırılma valfi', 1],
    );
  }
  return requirements;
}

function seriBeklenenMinimum(d) {
  return seriGereksinimleri(d).length;
}

function seriEksikleri(d) {
  const data = seriNumaralariNormalize(d && d.seri_numaralari);
  return seriGereksinimleri(d).flatMap(([key, label]) => {
    const dolu = data[key].some(item => item.seri_no.trim());
    return dolu ? [] : [`${label}: eksik`];
  });
}
// Eski kütüphane alan adları geriye uyumluluk için korunur. Denetçiye
// gösterilen AVES yönlendirmelerinde sonuç dili resmî üçlü yapıya çevrilir.
const resmiSonucDili = (s) => (s ?? '').toString()
  .replace(/\bAranmaz\b/g, 'Uygulanmaz')
  .replace(/\baranmaz\b/g, 'uygulanmaz');
const normEmail = (s) => (s || '').trim().toLowerCase();
const normSeriNo = (s) => (s || '').trim().replace(/\s+/g, ' ').toLocaleUpperCase('tr-TR');
const denetimTarihiBaslangici = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day ? date.getTime() : null;
};
const seriNoTekrarUyarisi = (kayitlar) => {
  if (!kayitlar.length) return '';
  const devamEden = kayitlar.find(item => item.denetim_durumu !== 'Çalışma Tamamlandı');
  if (devamEden) return `Bu seri no için devam eden bir denetim var: ${devamEden.musteri_unvani || 'Kayıt'} (${devamEden.denetim_tarihi || 'tarih yok'})`;
  const tarihliKayitlar = kayitlar
    .map(item => ({ item, zaman: denetimTarihiBaslangici(item.denetim_tarihi) }))
    .filter(({ zaman }) => zaman !== null)
    .sort((a, b) => b.zaman - a.zaman);
  if (!tarihliKayitlar.length) return 'Bu seri no için tarih bilgisi olmayan bir kayıt var; yeni denetim açılmadan önce kayıt kontrol edilmeli';
  const son = tarihliKayitlar[0];
  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);
  if (bugun.getTime() - son.zaman < 365 * 24 * 60 * 60 * 1000) return `Bu seri no için son denetim ${son.item.denetim_tarihi} tarihinde tamamlandı. Yeni bağımsız denetim 365 gün sonra açılabilir.`;
  return '';
};
const localDateISO = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
};
const siraKarsilastir = (a, b) => (a.sira_no - b.sira_no) || String(a.madde_id).localeCompare(String(b.madde_id), 'tr');
const denetimSahibiMi = (d) => !!d && normEmail(d.olusturan_email) !== '' && normEmail(d.olusturan_email) === normEmail(Profile.email);
const denetimGorunebilirMi = (d) => !!d && (Profile.canSeeAllInspections || denetimSahibiMi(d) || normEmail(d.takip_atanan_email) === normEmail(Profile.email));
const canEditDenetim = (d) => !!d && d.denetim_durumu !== 'Çalışma Tamamlandı' && (
  Profile.isAdmin || denetimSahibiMi(d) || normEmail(d.takip_atanan_email) === normEmail(Profile.email) ||
  (Profile.isTechnicalManager && d.denetim_durumu === 'Gözden Geçirme' && normEmail(d.duzeltme_baslatan_email) === normEmail(Profile.email))
);
const canReopenDenetim = (d) => !!d && d.denetim_durumu === 'Çalışma Tamamlandı' && (Profile.canCorrectInspections || denetimSahibiMi(d));
const canStartFollowup = (d, rows = null) => {
  if (!d || d.denetim_durumu !== 'Çalışma Tamamlandı' || !Profile.canCreate ||
      (!Profile.isAdmin && !denetimSahibiMi(d))) return false;
  return sahaUygulamaModuluGMi(d) && kontrolProfili(d) === KONTROL_PROFILLERI.TAM;
};
const canDeleteDenetim = (d) => !!d && Profile.canDelete;
