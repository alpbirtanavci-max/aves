/* ============================================================
   AVES Saha Denetim — kullanıcı profili
   Rol ve yetki bilgisi (Profile).
   ============================================================ */
'use strict';

/* ================= Kullanıcı profili ================= */
const Profile = (() => {
  let current = null;

  function normalize(profile) {
    if (!profile) return null;
    const email = (profile.email || '').toLowerCase();
    return Object.assign({}, profile, {
      email,
      // Yetki kaynağı yalnız sunucudaki profil kaydıdır. Eski çevrimdışı
      // önbelleklerde rol yoksa güvenli varsayılan mühendis olur.
      rol: ['yonetici','teknik_mudur','muhendis'].includes(profile.rol) ? profile.rol : 'muhendis',
    });
  }

  async function load() {
    const cached = normalize(await DB.kvGet('user_profile'));
    try {
      const email = (API.email || '').toLowerCase();
      const rows = await API.select(
        'kullanici_profilleri',
        `select=email,ad_soyad,aktif,rol,fotograf_arsiv_temizleme_yetkisi&email=eq.${encodeURIComponent(email)}&aktif=eq.true&limit=1`
      );
      if (!rows.length) throw new Error('PROFILE_NOT_FOUND');
      current = normalize(rows[0]);
      await DB.kvSet('user_profile', current);
      await DB.kvSet('profile_verified_at', new Date().toISOString());
      await DB.kvSet('profile_verified_email', current.email);
      return current;
    } catch (e) {
      if (e.message !== 'PROFILE_NOT_FOUND' && cached && cached.aktif !== false &&
          (cached.email || '').toLowerCase() === (API.email || '').toLowerCase()) {
        current = cached;
        return current;
      }
      throw e;
    }
  }

  function clear() { current = null; }

  return {
    load, clear,
    get name() { return current ? current.ad_soyad : ''; },
    get email() { return current ? current.email : ''; },
    get role() { return current ? current.rol : 'muhendis'; },
    get isAdmin() { return !!current && current.rol === 'yonetici'; },
    get isTechnicalManager() { return !!current && current.rol === 'teknik_mudur'; },
    // Teknik müdür sahaya çıkıp kendi denetimini oluşturabilir; sistem içeriğini
    // yönetemez. Tüm denetimleri görme, düzeltme ve silme yetkileri ayrıca tanımlıdır.
    get canManage() { return !!current && current.rol === 'yonetici'; },
    get canSeeAllInspections() { return !!current && (current.rol === 'yonetici' || current.rol === 'teknik_mudur'); },
    get canCorrectInspections() { return !!current && (current.rol === 'yonetici' || current.rol === 'teknik_mudur'); },
    get canCreate() { return !!current && ['yonetici','teknik_mudur','muhendis'].includes(current.rol); },
    get canDelete() { return !!current && (current.rol === 'yonetici' || current.rol === 'teknik_mudur'); },
    get canArchivePhotos() { return !!current && current.fotograf_arsiv_temizleme_yetkisi === true; },
  };
})();

