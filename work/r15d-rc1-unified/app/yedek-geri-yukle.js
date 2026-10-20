// Cihaz yedeğinden (aves-cihaz-yedek) güvenli geri yükleme: doğrulama ve plan.
// Yalnız cihazda bulunmayan FR.65 kayıtları geri yüklenir; var olan hiçbir kayıt ezilmez.
(function expose(root) {
  'use strict';

  const FORMAT = 'aves-cihaz-yedek';

  // Dosyanın AVES yedeği olduğunu ve indirildikten sonra değişmediğini doğrular.
  async function dogrula(paket, { sha256Hex, stableStringify }) {
    if (!paket || typeof paket !== 'object' || Array.isArray(paket)) return { ok: false, hata: 'Seçilen dosya bir AVES yedeği değil.' };
    if (paket.format !== FORMAT) return { ok: false, hata: 'Seçilen dosya bir AVES yedeği değil.' };
    if (paket.surum !== 1) return { ok: false, hata: 'Bu yedek sürümü bu uygulamada desteklenmiyor.' };
    if (!Array.isArray(paket.denetimler)) return { ok: false, hata: 'Yedekte denetim listesi yok.' };
    const { paket_hash: hash, ...govde } = paket;
    if (!hash || await sha256Hex(stableStringify(govde)) !== hash) {
      return { ok: false, hata: 'Yedek dosyası bozulmuş ya da sonradan değiştirilmiş (özet uyuşmuyor). Hiçbir şey geri yüklenmedi.' };
    }
    return { ok: true };
  }

  // Her kayıt için geri yüklenebilir mi, değilse neden.
  // ctx: { yerelIdler:Set, bekleyenSilme:Set, gorunebilir(d), fr65Mi(d) }
  function planla(paket, ctx) {
    const gorulen = new Set();
    const kayitlar = (paket.denetimler || []).map(d => {
      const id = d && d.id;
      const bas = { id: id || null, denetim: d };
      if (!id || typeof id !== 'string') return { ...bas, durum: 'gecersiz', neden: 'Kayıt kimliği yok', yuklenebilir: false };
      if (gorulen.has(id)) return { ...bas, durum: 'tekrar', neden: 'Yedekte aynı kayıt iki kez var', yuklenebilir: false };
      gorulen.add(id);
      if (!ctx.fr65Mi(d)) return { ...bas, durum: 'desteklenmiyor', neden: 'Modül G / eski kayıt: sunucuda tutulur, bu sürümde yedekten geri yüklenmez', yuklenebilir: false };
      if (ctx.yerelIdler.has(id)) return { ...bas, durum: 'zaten_var', neden: 'Cihazda zaten var; üzerine yazılmaz', yuklenebilir: false };
      if (ctx.bekleyenSilme.has(id)) return { ...bas, durum: 'silme_bekliyor', neden: 'Bu kaydın silme işlemi senkron bekliyor; önce senkronu tamamlayın', yuklenebilir: false };
      if (!ctx.gorunebilir(d)) return { ...bas, durum: 'yetki', neden: 'Bu hesabın bu kaydı görme yetkisi yok', yuklenebilir: false };
      return { ...bas, durum: 'geri_yuklenebilir', neden: 'Cihazda yok; geri yüklenebilir', yuklenebilir: true };
    });
    return { kayitlar, yuklenebilirSayisi: kayitlar.filter(k => k.yuklenebilir).length };
  }

  // Seçilen kaydın değişiklik geçmişi satırları (yalnız o denetime ait).
  function gecmisSatirlari(paket, denetimId) {
    return (Array.isArray(paket.gecmis) ? paket.gecmis : []).filter(row => row && row.denetim_id === denetimId && row.id);
  }

  root.AVES_YEDEK = Object.freeze({ FORMAT, dogrula, planla, gecmisSatirlari });
})(globalThis);
