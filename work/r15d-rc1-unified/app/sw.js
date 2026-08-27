// AVES Saha — uygulama kabuğunu çevrimdışı kullanım için önbelleğe alır
const CACHE = 'aves-saha-r15d-rc3911';
const ASSETS = [
  './', './index.html', './section-mapping.js', './app.js', './manifest.json', './logo.png', './aves-logo-white.png',
  './fonts/Inter-latin-ext.woff2', './fonts/Inter-latin.woff2',
  './fonts/Montserrat-latin-ext.woff2', './fonts/Montserrat-latin.woff2',
  './form-output.js', './vendor/jszip.min.js', './vendor/pdf-lib.min.js', './vendor/fontkit.umd.min.js',
  './form-assets/form-output-manifest.json', './form-assets/DejaVuSans.ttf',
  './update.html', './update.js',
  './icon-192.png', './icon-512.png',
  './referans-gorseller/G-PIT-LADDER-TYPE3-4-TR.svg',
  './referans-gorseller/G-8120-C3-S4.png',
  './referans-gorseller/G-8120-S6-S7-TR.svg',
  './referans-gorseller/G-ISO13857-C4-TR.svg',
  './referans-gorseller/G-8120-C4.png',
  './referans-gorseller/G-8120-C6.png',
  './referans-gorseller/G-8120-C7.png',
  './referans-gorseller/G-8120-S6.png',
  './referans-gorseller/G-8120-S7.png',
  './referans-gorseller/G-ISO13857-C4.png',
  './referans-gorseller/G-8170-KABIN-TIPLERI-TR.svg',
  './referans-gorseller/G-8171-KATEGORI-TR.svg'
];

self.addEventListener('install', (e) => {
  // İlk kurulum kendiliğinden etkinleşir. Mevcut bir worker güncellenirken ise
  // yenisi beklemede kalır; denetçi "Şimdi güncelle" dediğinde aşağıdaki mesaj
  // işleyicisi skipWaiting() çağırır. Böylece güncelleme seçimi gerçekten çalışır.
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // API istekleri asla önbellekten dönmez — veri katmanı IndexedDB'de
  if (url.origin !== location.origin) return;
  // Ana belge çevrimiçiyken daima ağdan doğrulanır. Böylece eski sürümün
  // index.html'i cache içinde kalıp yeni yerel veritabanıyla karışmaz.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(resp => {
        if (resp.ok) caches.open(CACHE).then(c => c.put('./index.html', resp.clone()));
        return resp;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(resp => {
      if (e.request.method === 'GET' && resp.ok) {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return resp;
    }).catch(() => caches.match('./index.html')))
  );
});
