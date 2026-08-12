/* AVES güvenli cache kurtarma aracı.
   IndexedDB, localStorage ve outbox'a kesinlikle dokunmaz. */
(function () {
  const EXPECTED_BUILD = 'R15D-rc3.3';
  const status = document.getElementById('updateStatus');
  const retry = document.getElementById('retryUpdate');

  async function run() {
    retry.hidden = true;
    status.className = 'status';
    status.textContent = 'Yeni sürüm doğrulanıyor…';
    try {
      const stamp = Date.now();
      const [indexResponse, appResponse] = await Promise.all([
        fetch(`/index.html?update_probe=${stamp}`, { cache: 'no-store' }),
        fetch(`/app.js?update_probe=${stamp}`, { cache: 'no-store' })
      ]);
      if (!indexResponse.ok || !appResponse.ok) throw new Error('Yeni dosyalar indirilemedi.');
      const [indexText, appText] = await Promise.all([indexResponse.text(), appResponse.text()]);
      if (!indexText.includes(EXPECTED_BUILD) || !appText.includes(`APP_VERSION = '${EXPECTED_BUILD}'`)) {
        throw new Error('Cloudflare henüz yeni sürümü sunmuyor.');
      }

      status.textContent = 'Yeni sürüm doğrulandı; eski uygulama önbelleği kaldırılıyor…';
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations
        .filter(registration => registration.scope.startsWith(location.origin + '/'))
        .map(registration => registration.unregister()));
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames
        .filter(name => name.startsWith('aves-saha-'))
        .map(name => caches.delete(name)));

      status.className = 'status ok';
      status.textContent = 'Güncelleme hazır. AVES Saha yeniden açılıyor…';
      setTimeout(() => location.replace(`/?updated=${Date.now()}`), 900);
    } catch (error) {
      status.className = 'status error';
      status.textContent = `${error.message} Çevrimdışı kayıtlarınıza dokunulmadı.`;
      retry.hidden = false;
    }
  }

  retry.addEventListener('click', run);
  run();
})();
