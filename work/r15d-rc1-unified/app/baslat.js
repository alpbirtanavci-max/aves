/* ============================================================
   AVES Saha Denetim — başlatma ve genel yardımcılar
   toast, servis çalışanı, kalıcı depolama, hata günlüğü, açılış. En son yüklenir.
   ============================================================ */
'use strict';

/* ================= Toast ================= */
let toastTimer;
function toast(msg, duration = 2200) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), duration);
}

// Native kabukta (Capacitor — bkz. native/ fizibilite denemesi) uygulama
// kabuğu (index.html/app.js/...) ağdan/Service Worker'dan değil, doğrudan
// cihaza kurulu paketin içinden yüklenir. window.Capacitor yalnız o kabukta
// enjekte edilir; normal tarayıcıda/PWA'da tanımsızdır.
function isNativeApp() {
  return !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());
}

async function registerServiceWorkerWithUpdateChoice() {
  if (!('serviceWorker' in navigator)) return;
  // Native kabukta SW kaydı hem gereksiz (varlıklar zaten pakette) hem de
  // Capacitor'ın kendi dosya şemasıyla (capacitor://) gereksiz yere
  // çakışabilir — bu yüzden hiç kaydedilmez.
  if (isNativeApp()) return;

  let reloadRequested = false;
  const showUpdateChoice = (worker) => {
    if (!worker || document.getElementById('swUpdateBanner')) return;
    const banner = document.createElement('div');
    banner.id = 'swUpdateBanner';
    banner.className = 'update-banner';
    banner.setAttribute('role', 'status');
    banner.innerHTML = `<span><b>Yeni uygulama sürümü hazır</b>Açık çalışma cihazda korunur. Güncellemeyi uygun olduğunuzda uygulayın.</span>
      <button type="button" class="update-later">Sonra</button>
      <button type="button" class="update-now">Şimdi güncelle</button>`;
    banner.querySelector('.update-later').onclick = () => banner.remove();
    banner.querySelector('.update-now').onclick = () => {
      reloadRequested = true;
      banner.querySelector('.update-now').disabled = true;
      banner.querySelector('.update-now').textContent = 'Güncelleniyor…';
      worker.postMessage({ type: 'SKIP_WAITING' });
    };
    document.body.appendChild(banner);
  };

  const registration = await navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' });
  // sw.js her açılışta ağdan doğrulanır; eski HTTP önbelleği güncellemeyi
  // geciktiremez. Güncelleme denetimi yerel denetim verilerini değiştirmez.
  registration.update().catch(() => {});
  if (registration.waiting) showUpdateChoice(registration.waiting);
  registration.addEventListener('updatefound', () => {
    const installing = registration.installing;
    if (!installing) return;
    installing.addEventListener('statechange', () => {
      if (installing.state === 'installed' && navigator.serviceWorker.controller) showUpdateChoice(installing);
    });
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadRequested) location.reload();
  });
}

// Kalıcı depolama izni: tarayıcının IndexedDB'yi depolama baskısında uyarısız
// tahliye etmesini engeller. Bir kez istenir, sonucu kv'ye yazılır (hazırlık
// kontrolü okur). İzin verilmese bile uygulama çalışır — bu yalnız güvence katmanı.
async function ensurePersistentStorage() {
  const now = new Date().toISOString();
  if (!navigator.storage || !navigator.storage.persist) {
    await DB.kvSet('storage_persist', { supported: false, granted: false, checked_at: now });
    return;
  }
  try {
    let granted = navigator.storage.persisted ? await navigator.storage.persisted() : false;
    if (!granted) granted = await navigator.storage.persist();
    await DB.kvSet('storage_persist', { supported: true, granted: !!granted, checked_at: now });
  } catch (error) {
    await DB.kvSet('storage_persist', { supported: true, granted: false, error: String((error && error.message) || error), checked_at: now });
  }
}

// Tanılama için son yakalanmamış hatalar cihazda tutulur (en fazla 30; saha cevabı içermez).
let hataGunluguYaziliyor = Promise.resolve();
function hataGunlugunaYaz(tur, mesaj, kaynak) {
  hataGunluguYaziliyor = hataGunluguYaziliyor.then(async () => {
    const log = (await DB.kvGet('hata_gunlugu')) || [];
    log.push({ t: new Date().toISOString(), tur, mesaj: String(mesaj || '').slice(0, 200), kaynak: String(kaynak || '').slice(0, 120) });
    await DB.kvSet('hata_gunlugu', log.slice(-30));
  }).catch(() => {});
}
window.addEventListener('error', event => hataGunlugunaYaz('error', event.message, `${String(event.filename || '').split('/').pop()}:${event.lineno || 0}`));
window.addEventListener('unhandledrejection', event => hataGunlugunaYaz('promise', event.reason && event.reason.message ? event.reason.message : event.reason, ''));

// Odaktaki bir alanda 700ms yazım gecikmesi dolmadan uygulama arka plana
// alınırsa/kapatılırsa (telefon donması, yanlışlıkla kapatma, işletim
// sisteminin belleği geri alması) o alan kaybolabilirdi — hiçbir dinleyici
// bu anı yakalamıyordu. visibilitychange 'hidden' ve pagehide, tarayıcının
// JS'e son bir şans tanıdığı olaylardır; ikisi de aynı yazımı tetikleyip
// aynı sonuca ulaşsa da hangisinin önce/güvenilir ateşlendiği platforma göre
// değiştiğinden ikisi birden bağlanır.
const flushOnHide = () => {
  try { UI.preserveFr65Position(); } catch {}
  try { UI.flushPendingEdits().catch(() => {}); } catch {}
};
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushOnHide(); });
window.addEventListener('pagehide', flushOnHide);

/* ================= Başlat ================= */
(async () => {
  try {
    await DB.open();
  } catch (error) {
    console.error('Yerel veritabanı açılamadı', error);
    document.getElementById('app').innerHTML = `<div class="empty" style="margin-top:24px">
      <b>Uygulama yerel veritabanını açamadı.</b><br>
      Çevrimdışı kayıtlarınızı silmeyin. Tüm AVES sekmelerini kapatıp uygulamayı yeniden açın.
    </div>`;
    return;
  }
  try { await registerServiceWorkerWithUpdateChoice(); } catch {}
  try { await ensurePersistentStorage(); } catch {}
  await API.loadSession();
  document.getElementById('btnLogout').onclick = async () => {
    if (confirm('Çıkış yapılsın mı? (Cihazdaki veriler korunur)')) { await API.logout(); Profile.clear(); UI.showLogin(); }
  };
  Sync.start();
  if (API.loggedIn) {
    await UI.afterLogin();
  } else {
    UI.showLogin();
  }
})();
