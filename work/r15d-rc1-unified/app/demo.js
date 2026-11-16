// Demo denetimler: yalnızca bu cihazda tutulan deneme kayıtları. Sunucuya HİÇBİR koşulda gönderilmez.
// Demo, yalnızca YETKILI_EPOSTALAR içindeki hesaplara görünür. Gerçek denetim akışını ve veriyi etkilemez.
// Demo kimlikleri IndexedDB 'kv' içinde tutulur; sunucuya dokunan her yol (yerel yazma, çekme, fotoğraf, PDF,
// silme, doğrulama) bu modüle sorarak demo kayıtları atlar.
const AVES_DEMO = (() => {
  const KV = 'demo_denetimler';
  const YETKILI_EPOSTALAR = ['aavci@avesbelgelendirme.com.tr'];
  let onbellek = null;

  const yetkili = eposta => YETKILI_EPOSTALAR.includes(String(eposta || '').trim().toLowerCase());

  async function liste() {
    if (!onbellek) onbellek = new Set((await DB.kvGet(KV)) || []);
    return onbellek;
  }
  async function mu(id) {
    return !!id && (await liste()).has(id);
  }
  async function kaydet(id) {
    const set = await liste();
    set.add(id);
    await DB.kvSet(KV, [...set]);
  }
  async function unut(id) {
    const set = await liste();
    if (set.delete(id)) await DB.kvSet(KV, [...set]);
  }
  async function idler() {
    return [...(await liste())];
  }

  // Demo kayıtlarda sunucu istekleri atlanır; hepsi demo olmayan bir toplu işlem karışık olamaz (tek denetim kimliği).
  const SAYILAR = { G: 'Modül G', B: 'Modül B', E: 'Modül E', H1: 'Modül H1' };
  let sayac = 0;
  function ornekBilgi(modul) {
    sayac++;
    const no = `${String(Date.now()).slice(-5)}${sayac}`;
    return {
      musteri: `DEMO – ${SAYILAR[modul] || modul} Firması`,
      firmaAdresi: 'Demo Mah. 1. Sk. No:1, Demo/Test',
      adres: 'Demo Bina, Demo Mah. 2. Sk. No:3',
      seri: `DEMO-${modul}-${no}`,
      yuk: 630, hiz: 1, kapasite: 8, durak: 6, kat: 6, binaAsansorSayisi: 2,
      tahrik: 'Elektrikli', md: 'MR',
    };
  }

  return Object.freeze({ yetkili, mu, kaydet, unut, idler, ornekBilgi, YETKILI_EPOSTALAR });
})();
