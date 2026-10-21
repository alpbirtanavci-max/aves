/* ============================================================
   AVES Saha Denetim — arayüz kökü
   Logo düğmesi bağlantısı ve dışa açılan UI nesnesi. UI dosyalarının sonuncusu.
   (Eski UI kapanışının parçasıdır: ui-durum → ui-foto → ui-yonetim → ui-kayit → ui-liste → ui-yeni →
   ui-fr65 → ui-denetim → ui-taslak → ui-form → ui-madde → ui-kapanis → ui-son; ortak global kapsam.)
   ============================================================ */
'use strict';

const brandHomeButton = document.getElementById('brandHome');
if (brandHomeButton) {
  brandHomeButton.addEventListener('click', async () => {
    if (currentView !== 'inspection' || !currentDenetimId) return;
    brandHomeButton.disabled = true;
    brandHomeButton.setAttribute('aria-busy', 'true');
    try { await showList(); }
    catch (error) {
      console.error('Denetimler listesi açılamadı:', error);
      toast('Denetimler listesi açılamadı. Tekrar deneyin.');
    } finally {
      brandHomeButton.removeAttribute('aria-busy');
      setBrandHomeEnabled(currentView === 'inspection' && !!currentDenetimId);
    }
  });
}

const UI = {
  showLogin, afterLogin, showList, bekleyenFotograflariYukle, tanilamaPaylas,
  flushPendingEdits: flushEditorWrites,
  preserveFr65Position: () => { if (activeFr65PositionSaver) activeFr65PositionSaver(); },
  recoverDrafts: taslaklariTaraVeKurtar,
  get currentDenetimId() { return currentDenetimId; },
  refreshSyncState,
  canRefreshSafely: () => {
    const active = document.activeElement;
    return !(active && active.matches && active.matches('input,textarea,select'));
  },
  // Arka plan senkronu form doldurulurken tamamlanabilir. Yeni denetim
  // ekranını yeniden çizmek girilmiş alanları siler ve kullanıcıyı listeye
  // döndürür; bu yüzden yalnız veri listesi veya açık denetim yenilenir.
  refresh: () => {
    if (!UI.canRefreshSafely()) return;
    if (currentView === 'inspection' && currentDenetimId && activeFr65Flush) {
      flushEditorWrites().then(() => {
        if (currentView === 'inspection' && currentDenetimId) renderDenetim();
      }).catch(error => console.warn('Saha veri kaydı yenilenmeden önce kaydedilemedi', error));
    }
    else if (currentView === 'inspection' && currentDenetimId) renderDenetim();
    else if (currentView === 'list') showList({ arkaPlan: true });
  },
};
