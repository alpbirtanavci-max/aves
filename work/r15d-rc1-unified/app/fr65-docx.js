// ÜB.FR.65 Teknik Dosya–Saha Eşleşme Formu (Word) doldurma.
// Saha Kontrol sütununu uygulamadaki saha verisinden, Teknik Dosya sütununu kullanıcının girdiği
// "teknik dosya değeri"nden doldurur; S sütununa iki değerin eşitlik karşılaştırmasını yazar.
// S yalnız mekanik eşitlik sonucudur (✓ eşit, X farklı, N/A ilgisiz); standart uygunluk kararı değildir.
// Şablon: form-assets/FR65-sablon.docx (resmî formun doldurulmamış kopyası; asıl form değiştirilmez).
(function expose(root) {
  'use strict';

  const SYM = '<w:sym w:font="Wingdings" w:char="F0FC"/>';
  const esc = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const text = value => (value == null ? '' : String(value).trim());
  const PARAGRAF = /<w:p[ >][\s\S]*?<\/w:p>/;
  const KOSU = /<w:r(?: [^>]*)?>[\s\S]*?<\/w:r>/g;
  const KUTU = /<w:default w:val="[01]"\/>/g;

  /* ---------- XML modeli: tablo > satır > hücre (metin tabanlı, boş alan korunur) ---------- */
  function ayir(s, re) {
    const out = [];
    let last = 0;
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(s))) {
      out.push({ s: s.slice(last, m.index), m: false });
      out.push({ s: m[0], m: true });
      last = m.index + m[0].length;
    }
    out.push({ s: s.slice(last), m: false });
    return out;
  }

  function modelKur(xml) {
    const parts = ayir(xml, /<w:tbl>[\s\S]*?<\/w:tbl>/g);
    const tablolar = [];
    parts.forEach(part => {
      if (!part.m) return;
      part.rows = ayir(part.s, /<w:tr[ >][\s\S]*?<\/w:tr>/g);
      part.satir = part.rows.filter(row => row.m);
      part.satir.forEach(row => {
        row.cells = ayir(row.s, /<w:tc>[\s\S]*?<\/w:tc>/g);
        row.hucre = row.cells.filter(cell => cell.m);
      });
      tablolar.push(part);
    });
    return { parts, tablolar };
  }

  function serilestir(model) {
    return model.parts.map(part => (part.m
      ? part.rows.map(row => (row.m ? row.cells.map(cell => cell.s).join('') : row.s)).join('')
      : part.s)).join('');
  }

  const hucre = (model, t, r, c) => model.tablolar[t]?.satir[r]?.hucre[c] || null;

  function rprOf(p) {
    const run = p.match(/<w:r(?: [^>]*)?>\s*(<w:rPr>[\s\S]*?<\/w:rPr>)/);
    if (run) return run[1];
    const para = p.match(/<w:pPr>[\s\S]*?(<w:rPr>[\s\S]*?<\/w:rPr>)[\s\S]*?<\/w:pPr>/);
    return para ? para[1] : '';
  }

  // Hücrenin ilk paragrafındaki koşuları siler, yerine tek koşu (metin / ✓ / boş) koyar; yazı biçimi korunur.
  function yaz(cell, metin, { tik = false } = {}) {
    if (!cell) return;
    const found = cell.s.match(PARAGRAF);
    if (!found) return;
    const p = found[0];
    const rpr = rprOf(p);
    const run = tik ? `<w:r>${rpr}${SYM}</w:r>`
      : (text(metin) === '' ? `<w:r>${rpr}</w:r>` : `<w:r>${rpr}<w:t xml:space="preserve">${esc(metin)}</w:t></w:r>`);
    const yeni = p.replace(KOSU, '').replace(/<\/w:p>$/, `${run}</w:p>`);
    // Hücrede ikinci/üçüncü paragraf varsa (çok satırlı eski değer) onlar da silinir
    const idx = cell.s.indexOf(p);
    cell.s = cell.s.slice(0, idx) + yeni + cell.s.slice(idx + p.length).replace(/<w:p[ >][\s\S]*?<\/w:p>/g, '');
  }

  // Hücre (veya düz metin) içindeki onay kutularını sırayla ayarlar; null/undefined olan kutuya dokunmaz.
  function kutular(nesne, dizi) {
    if (!nesne) return;
    let i = 0;
    nesne.s = nesne.s.replace(KUTU, m => {
      const v = dizi[i++];
      return v === undefined || v === null ? m : `<w:default w:val="${v ? 1 : 0}"/>`;
    });
  }

  function paragrafBul(model, ara) {
    for (const part of model.parts) {
      if (part.m) continue;
      const bulunan = ayir(part.s, /<w:p[ >][\s\S]*?<\/w:p>/g);
      const i = bulunan.findIndex(x => x.m && x.s.includes(ara));
      if (i >= 0) return { part, bulunan, i };
    }
    return null;
  }

  function imzaSatiri(model, tarih, kisi) {
    const hit = paragrafBul(model, 'İnceleme Tarihi:');
    if (!hit) return;
    const p = hit.bulunan[hit.i].s;
    const run = t => `<w:r><w:t xml:space="preserve">${esc(t)}</w:t></w:r>`;
    const govde = run('  İnceleme Tarihi: ') + run(tarih || '…/…/……') + run('   İncelemeyi yapan Teknik Uzman (lar) :   ') +
      run(kisi || '') + '<w:r><w:tab/></w:r>' + run('      İmza(lar) :');
    hit.bulunan[hit.i].s = p.replace(KOSU, '').replace(/<\/w:p>$/, `${govde}</w:p>`);
    hit.part.s = hit.bulunan.map(x => x.s).join('');
  }

  function sonucKutulari(model, dizi) {
    let i = 0;
    model.parts.forEach(part => {
      if (part.m) return;
      part.s = part.s.replace(KUTU, m => {
        const v = dizi[i++];
        return v === undefined || v === null ? m : `<w:default w:val="${v ? 1 : 0}"/>`;
      });
    });
  }

  /* ---------- Değer yardımcıları ---------- */
  const TR_MAP = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
  const upper = value => text(value).toLocaleUpperCase('tr');
  function sayi(value) {
    const t = text(value).replace(',', '.');
    if (t === '' || !/^-?\d+(\.\d+)?$/.test(t)) return null;
    return Number(t);
  }
  function bicim(n) {
    if (n === null || !Number.isFinite(n)) return '';
    return String(Math.round(n * 1000) / 1000);
  }
  function normalize(value) {
    let t = text(value).toLocaleLowerCase('tr').replace(/\s*(mm|cm|m\/sn|m\/s|kg|kw|°)\s*$/, '').replace(/\s+/g, '').replace(',', '.');
    t = t.replace(/[çğıöşüâîû]/g, ch => TR_MAP[ch] || ch).replace(/[×*]/g, 'x');
    const n = sayi(t);
    return n === null ? t : `#${n}`;
  }
  // 'esit' | 'fark' | null (karşılaştırma için iki değer de dolu olmalı)
  function karsilastir(td, saha) {
    if (text(td) === '' || text(saha) === '') return null;
    return normalize(td) === normalize(saha) ? 'esit' : 'fark';
  }

  const SOL = { td: 1, sk: 2, s: 3 };
  const SAG = { td: 5, sk: 6, s: 7 };
  const SAG_7 = { td: 4, sk: 5, s: 6 }; // 7 hücreli satırın sağ yarısı (sol yarıda S yok)
  const SOL_7 = { td: 1, sk: 2, s: null };

  const KA_KONUM = { Arkada: 'ARKA', 'Sağda': 'SAĞ', Solda: 'SOL' };
  const KISMEN = { Var: 'EVET', Yok: 'DEĞİL' };

  // Birim sözlüğü: *_cm alanları formda mm; teknik dosya değeri de mm girilir.
  const MM = 10;

  function degerler(values) {
    const v = values && typeof values === 'object' ? values : {};
    const f = key => text(v[key]?.field_value);
    const td = key => text(v[key]?.teknik_deger);
    const alt = (key, prop) => text(v[key]?.[prop]);
    const tdAlt = (key, prop) => text(v[key]?.[`teknik_${prop === 'seri_no' ? 'seri' : prop}`]);
    const num = (key, carpan = 1, tdCarpan = 1) => () => ({
      saha: bicim(sayi(f(key)) === null ? null : sayi(f(key)) * carpan),
      td: bicim(sayi(td(key)) === null ? null : sayi(td(key)) * tdCarpan),
    });
    const ham = key => () => ({ saha: upper(f(key)), td: upper(td(key)) });
    const esle = (key, harita) => () => ({ saha: upper(harita[f(key)] || f(key)), td: upper(td(key)) });
    const seri = (key, prop) => () => ({ saha: upper(alt(key, prop)), td: upper(tdAlt(key, prop)) });
    return { f, td, alt, num, ham, esle, seri, v };
  }

  /* ---------- Eşleme: form hücresi ← uygulama alanı ---------- */
  // Her kayıt: { t: tablo, r: satır, yan: hücre dizini, hesap: () => {saha, td} }
  function tanimlar(tahrik, values) {
    const h = degerler(values);
    const { f, num, ham, esle, seri, alt, td } = h;
    const hid = tahrik === 'Hidrolik';
    const T = hid ? 4 : 3;
    const o = hid ? 1 : 0; // hidrolik tabloda kabin/ray/kuyu blokları bir satır aşağıda
    const liste = [];
    const ekle = (t, r, yan, hesap) => liste.push({ t, r, yan, hesap });

    // GENEL ÖLÇÜLER (tablo 1)
    ekle(1, 4, SAG, () => ({ saha: f('hiz') ? `${bicim(sayi(f('hiz')))} m/sn` : '', td: td('hiz') ? `${bicim(sayi(td('hiz')))} m/sn` : '' }));
    ekle(1, 5, SOL, num('yuk'));
    ekle(1, 5, SAG, num('durak_sayisi'));
    ekle(1, 6, SOL, num('seyir_mesafesi_cm', 0.01, 0.001));
    ekle(1, 6, SAG, num('kat_sayisi'));
    ekle(1, 7, SOL, num('kuyu_yuksekligi_cm', 0.01, 0.001));

    // Tahrik grubu
    if (!hid) {
      ekle(T, 4, SOL, ham('makine_konumu'));
      ekle(T, 4, SAG, ham('makine_guc'));
      ekle(T, 5, SOL, seri('elektrikli_makine', 'marka'));
      ekle(T, 6, SOL, seri('elektrikli_makine', 'tip'));
      ekle(T, 6, SAG, () => {
        const saha = f('halat_sayisi') && f('halat_capi_mm') ? `${f('halat_sayisi')}X${f('halat_capi_mm')}` : '';
        return { saha: upper(saha), td: upper(td('halat_sayisi')) };
      });
      ekle(T, 7, SOL, seri('elektrikli_makine', 'seri_no'));
      ekle(T, 7, SAG, ham('aski_duzeni'));
      ekle(T, 8, SOL, num('tahrik_kasnak_capi_cm', MM));
      ekle(T, 8, SAG, num('saptirma_kasnak_capi_cm', MM));
      ekle(T, 9, SAG, num('halat_sarma_acisi'));
    } else {
      ekle(T, 4, SOL, ham('hidrolik_unite_konumu'));
      ekle(T, 4, SAG, ham('hidrolik_motor_guc'));
      ekle(T, 5, SOL, seri('hidrolik_motor', 'marka'));
      ekle(T, 6, SOL, seri('hidrolik_motor', 'tip'));
      ekle(T, 6, SAG, () => {
        const saha = f('hidrolik_halat_sayisi') && f('hidrolik_halat_capi_mm') ? `${f('hidrolik_halat_sayisi')}X${f('hidrolik_halat_capi_mm')}` : '';
        return { saha: upper(saha), td: upper(td('hidrolik_halat_sayisi')) };
      });
      ekle(T, 7, SOL, seri('hidrolik_motor', 'seri_no'));
      ekle(T, 8, SOL, seri('hidrolik_motor', 'seri_no'));
      ekle(T, 8, SAG, num('hidrolik_makara_capi_cm', MM));
      ekle(T, 9, SOL, num('hidrolik_piston_capi_cm', MM));
      ekle(T, 9, SAG, num('hidrolik_piston_adedi'));
    }

    // Kabin bilgileri
    ekle(T, 11 + o, SOL, num('kabin_genislik_cm', MM));
    ekle(T, 11 + o, SAG, num('kabin_derinlik_cm', MM));
    ekle(T, 12 + o, SOL, num('kabin_yukseklik_cm', MM));
    ekle(T, 12 + o, SAG, num('kabin_giris_sayisi'));
    ekle(T, 13 + o, SOL, num('kabin_kat_kapi_genislik_cm', MM));
    ekle(T, 13 + o, SAG, num('kabin_kat_kapi_genislik_cm', MM));
    ekle(T, 14 + o, SOL, num('kabin_kat_kapi_yukseklik_cm', MM));
    ekle(T, 14 + o, SAG, num('kabin_kat_kapi_yukseklik_cm', MM));
    ekle(T, 15 + o, SAG, num('kilavuz_pabucu_araligi_cm', MM));
    // elektrikli tabloda bu satır 7 hücreli (sol yarıda S yok); hidrolik tabloda 8 hücreli
    ekle(T, 16 + o, hid ? SOL : SOL_7, ham('kabin_kat_kapi_yonu'));
    ekle(T, 16 + o, hid ? SAG : SAG_7, () => {
      const saha = f('kabin_kat_kapi_tipi') || f('kabin_kat_kapi_panel_sayisi')
        ? [f('kabin_kat_kapi_tipi'), f('kabin_kat_kapi_panel_sayisi')].filter(Boolean).join(' / ') : '';
      return { saha: upper(saha), td: upper(td('kabin_kat_kapi_tipi')) };
    });

    // Ray bilgileri
    ekle(T, 18 + o, SOL, ham('kabin_ray_tip_olcu'));
    ekle(T, 19 + o, SOL, ham('karsi_agirlik_ray_tip_olcu'));
    ekle(T, 20 + o, SOL, esle('karsi_agirlik_konumu', KA_KONUM));
    ekle(T, 20 + o, SAG, ham('ray_konum_aski'));
    ekle(T, 21 + o, SOL, num('ray_toplam_boy_cm', MM));

    // Kuyu bilgileri
    ekle(T, 24 + o, SOL, num('kuyu_genislik_cm', MM));
    ekle(T, 24 + o, SAG, num('kuyu_derinlik_cm', MM));
    ekle(T, 25 + o, SOL, num('kuyu_dibi_cm', MM));
    ekle(T, 25 + o, SAG, num('son_kat_yuksekligi_cm', MM));
    ekle(T, 26 + o, SAG, num('seyir_mesafesi_cm', MM));
    ekle(T, 27 + o, SOL, num('kabin_raylar_arasi_cm', MM));
    if (!hid) ekle(T, 27 + o, SAG, num('karsi_agirlik_raylar_arasi_cm', MM));
    ekle(T, 28 + o, SOL, num('ray_kapi_mesafesi_cm', MM));
    ekle(T, 28 + o, SAG, () => {
      const adet = f('karsi_agirlik_parca_sayisi');
      const ebat = ['karsi_agirlik_genislik_cm', 'karsi_agirlik_derinlik_cm', 'karsi_agirlik_yukseklik_cm']
        .map(key => (sayi(f(key)) === null ? '' : bicim(sayi(f(key)) * MM)));
      const saha = hid ? '' : [adet, ebat.every(Boolean) ? ebat.join('X') : ''].filter(Boolean).join(' / ');
      return { saha: upper(saha), td: upper(td('karsi_agirlik_parca_sayisi')) };
    });
    ekle(T, 29 + o, SOL, esle('kismen_kapali_kuyu', KISMEN));
    ekle(T, 29 + o, SAG, () => {
      const detay = text(f('kuyu_alti_kullanim_yuk_detay'));
      const secim = f('kuyu_alti_kullanim_yuk');
      return { saha: upper(detay || (secim === 'Yok' ? 'YOK' : secim)), td: upper(td('kuyu_alti_kullanim_yuk')) };
    });
    ekle(T, 30 + o, SOL, num('ana_ray_karsi_agirlik_ray_mesafesi_cm', MM));
    ekle(T, 30 + o, SAG, num('kabin_tampon_stroku_cm', MM));
    ekle(T, 31 + o, SOL, ham('kuyu_dibi_guvenlik_hacmi'));
    if (!hid) ekle(T, 31 + o, SAG, num('karsi_agirlik_tampon_stroku_cm', MM));
    ekle(T, 32 + o, SOL, ham('kabin_ustu_guvenlik_hacmi'));
    if (hid) ekle(T, 31 + o, SAG, ham('hidrolik_piston_konumu'));
    return liste;
  }

  // Güvenlik komponentleri tablosu (tablo 2): { r, anahtar, rol }
  function komponentler(tahrik) {
    const hid = tahrik === 'Hidrolik';
    return [
      { r: 4, anahtar: 'kat_kapisi_kilitleri' },
      { r: 5, anahtar: 'parasut_freni' },
      { r: 6, anahtar: 'kabin_tamponu' },
      { r: 7, anahtar: 'karsi_agirlik_tamponu', ilgisiz: hid },
      { r: 8, anahtar: 'regulator' },
      { r: 10, anahtar: 'yukari_hiz_koruma' },
      { r: 11, anahtar: 'elektrikli_makine', ilgisiz: hid },
      { r: 12, anahtar: 'hidrolik_boru_kirilma', ilgisiz: !hid },
      { r: 13, anahtar: 'hidrolik_motor', ilgisiz: !hid },
    ];
  }

  function markaTip(kayit) {
    return upper([text(kayit?.marka), text(kayit?.tip)].filter(Boolean).join(' / '));
  }

  /* ---------- Şablon temizleme (boş şablon üretimi) ---------- */
  function sablonTemizle(xml) {
    const m = modelKur(xml);
    const bos = (c) => yaz(c, '');
    // T0: yalnız değer sütunu (satır 0-3, 6); onay kutuları sıfır
    [0, 1, 2, 3, 6].forEach(r => bos(hucre(m, 0, r, 1)));
    // T1
    bos(hucre(m, 1, 1, 1));
    for (let r = 3; r <= 7; r += 1) [1, 2, 3, 5, 6, 7].forEach(c => bos(hucre(m, 1, r, c)));
    // T2 komponentler
    for (let r = 4; r <= 13; r += 1) for (let c = 1; c <= 7; c += 1) bos(hucre(m, 2, r, c));
    // T3 / T4 veri satırları: başlık satırı (Teknik Dosya yazan) ve etiket hücreleri korunur
    [3, 4].forEach(t => {
      m.tablolar[t].satir.forEach((row, r) => {
        const n = row.hucre.length;
        if (n === 1 || /Teknik Dosya/.test(row.s)) return;
        const veri = n === 8 ? [1, 2, 3, 5, 6, 7] : (n === 7 ? [1, 2, 4, 5, 6] : []);
        veri.forEach(c => bos(row.hucre[c]));
      });
    });
    // Formdaki doldurulacak yer tutucular (kapı yangın dayanıklılığı, ray ölçüsü)
    const yerTutucu = '……………….…..  (E/EI/EW)';
    [[3, 15, 18, 19], [4, 16, 19, 20]].forEach(([t, yangin, kabinRay, agirlikRay]) => {
      yaz(hucre(m, t, yangin, 1), yerTutucu); yaz(hucre(m, t, yangin, 2), yerTutucu);
      yaz(hucre(m, t, kabinRay, 5), '……X………X………'); yaz(hucre(m, t, agirlikRay, 5), '……X………X………');
    });
    // Onay kutuları: tüm tablolar ve belge gövdesi
    m.tablolar.forEach(t => t.satir.forEach(row => row.hucre.forEach(c => { c.s = c.s.replace(KUTU, '<w:default w:val="0"/>'); })));
    m.parts.forEach(part => { if (!part.m) part.s = part.s.replace(KUTU, '<w:default w:val="0"/>'); });
    // "Askı Tipi : 2 : 1" yer tutucusu
    const aski = hucre(m, 0, 5, 1);
    if (aski) {
      aski.s = aski.s.replace(/<w:t>2<\/w:t>/, '<w:t>…</w:t>').replace(/<w:t>[^<]*:\s*1<\/w:t>/, '<w:t xml:space="preserve"> : …</w:t>');
    }
    imzaSatiri(m, '', '');
    return serilestir(m);
  }

  /* ---------- Doldurma ---------- */
  function tarihBicimi(value) {
    const t = text(value);
    const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    return t;
  }

  function doldur(xml, ctx) {
    const rec = ctx.record || {};
    const tahrik = rec.tahrik_tipi || '';
    const values = ctx.values || {};
    const m = modelKur(xml);
    const h = degerler(values);
    const sayac = { uygun: 0, fark: 0, tdYok: 0 };
    const yazS = (c, sonuc) => {
      if (!c) return;
      if (sonuc === 'esit') { yaz(c, '', { tik: true }); sayac.uygun += 1; }
      else if (sonuc === 'fark') { yaz(c, 'X'); sayac.fark += 1; }
    };

    // Başlık bilgileri (Müşteri No / İş dosyası No / Rapor No elle doldurulur)
    yaz(hucre(m, 0, 0, 1), text(rec.musteri_unvani));
    const modul = text(rec.modul);
    kutular(hucre(m, 0, 4, 1), [/Modül B/.test(modul), /Modül G/.test(modul), /Modül E/.test(modul), /Modül H1/.test(modul), false]);
    if (tahrik === 'Elektrikli') {
      const md = text(rec.makine_dairesi_tipi);
      kutular(hucre(m, 0, 5, 1), [true, null, null, md === 'MR', md === 'MRL']);
      const aski = text(values.aski_duzeni?.field_value);
      const bol = aski.match(/^(\d+)\s*[:/]\s*(\d+)$/);
      const hucreAski = hucre(m, 0, 5, 1);
      if (hucreAski && aski) {
        hucreAski.s = hucreAski.s.replace(/<w:t>…<\/w:t>/, `<w:t>${esc(bol ? bol[1] : aski)}</w:t>`)
          .replace(/<w:t xml:space="preserve"> : …<\/w:t>/, `<w:t xml:space="preserve">${esc(bol ? ` : ${bol[2]}` : '')}</w:t>`);
      }
      kutular(hucre(m, 3, 1, 0), [true]);
    } else if (tahrik === 'Hidrolik') {
      kutular(hucre(m, 0, 5, 2), [true, null, null]);
      kutular(hucre(m, 4, 1, 0), [true]);
    }

    // GENEL ÖLÇÜLER: adres ve seri no (karşılaştırılmaz)
    yaz(hucre(m, 1, 1, 1), text(rec.denetim_adresi));
    yaz(hucre(m, 1, 3, 2), upper(rec.asansor_seri_no));

    // Eşlemeli hücreler
    const bekleyen = [];
    tanimlar(tahrik, values).forEach(spec => {
      const row = m.tablolar[spec.t]?.satir[spec.r];
      if (!row) return;
      const { saha, td } = spec.hesap();
      const yan = spec.yan;
      if (saha) yaz(row.hucre[yan.sk], saha);
      if (td) yaz(row.hucre[yan.td], td);
      const sonuc = karsilastir(td, saha);
      if (yan.s !== null) yazS(row.hucre[yan.s], sonuc);
      else if (sonuc === 'esit') sayac.uygun += 1;
      else if (sonuc === 'fark') sayac.fark += 1;
      if (saha && !td) bekleyen.push(spec);
    });

    // Güvenlik komponentleri
    komponentler(tahrik).forEach(k => {
      const row = m.tablolar[2].satir[k.r];
      if (!row) return;
      if (k.ilgisiz) {
        [4, 5, 6].forEach(c => yaz(row.hucre[c], '-'));
        yaz(row.hucre[7], 'N/A');
        return;
      }
      const kayit = h.v[k.anahtar] || {};
      const seriNo = upper(kayit.seri_no);
      const tdSeri = upper(kayit.teknik_seri);
      const mt = markaTip(kayit);
      if (mt) yaz(row.hucre[4], mt);
      if (seriNo) yaz(row.hucre[6], seriNo);
      if (tdSeri) yaz(row.hucre[5], tdSeri);
      yazS(row.hucre[7], karsilastir(tdSeri, seriNo));
      if (seriNo && !tdSeri) bekleyen.push(k);
    });

    // SONUÇ onay kutuları: yalnız hiç X yoksa ve saha verisi olan her hücrenin teknik değeri girilmişse "eşleşmiştir"
    const eksikVar = bekleyen.length > 0;
    sonucKutulari(m, sayac.fark > 0 ? [false, true] : (sayac.uygun > 0 && !eksikVar ? [true, false] : [false, false]));
    imzaSatiri(m, tarihBicimi(rec.denetim_tarihi), upper(rec.denetimi_yapan || rec.olusturan_ad || ''));

    return { xml: serilestir(m), ozet: { uygun: sayac.uygun, uygunDegil: sayac.fark, tdGirilmemis: bekleyen.length } };
  }

  async function build(ctx) {
    const JSZipClass = ctx.JSZip || root.JSZip;
    if (!JSZipClass) throw new Error('Word bileşeni yüklenemedi');
    const zip = await JSZipClass.loadAsync(ctx.template);
    const xml = await zip.file('word/document.xml').async('string');
    const sonuc = doldur(xml, ctx);
    zip.file('word/document.xml', sonuc.xml);
    const bytes = await zip.generateAsync({
      type: 'uint8array', compression: 'DEFLATE',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    return { bytes, ozet: sonuc.ozet };
  }

  // Arayüz için: hangi alanlara "teknik dosya değeri" girilebilir ve birimi
  function teknikAlanlari() {
    const durum = {};
    const al = (key, birim) => { if (!durum[key]) durum[key] = birim; };
    ['hiz'].forEach(k => al(k, 'm/sn'));
    ['yuk'].forEach(k => al(k, 'kg'));
    ['durak_sayisi', 'kat_sayisi', 'kabin_giris_sayisi', 'hidrolik_piston_adedi'].forEach(k => al(k, ''));
    ['makine_guc', 'hidrolik_motor_guc'].forEach(k => al(k, 'kW'));
    ['halat_sarma_acisi'].forEach(k => al(k, '°'));
    ['seyir_mesafesi_cm', 'kuyu_yuksekligi_cm', 'tahrik_kasnak_capi_cm', 'saptirma_kasnak_capi_cm', 'kabin_genislik_cm',
      'kabin_derinlik_cm', 'kabin_yukseklik_cm', 'kabin_kat_kapi_genislik_cm', 'kabin_kat_kapi_yukseklik_cm',
      'kilavuz_pabucu_araligi_cm', 'ray_toplam_boy_cm', 'kuyu_genislik_cm', 'kuyu_derinlik_cm', 'kuyu_dibi_cm',
      'son_kat_yuksekligi_cm', 'kabin_raylar_arasi_cm', 'karsi_agirlik_raylar_arasi_cm', 'ray_kapi_mesafesi_cm',
      'ana_ray_karsi_agirlik_ray_mesafesi_cm', 'kabin_tampon_stroku_cm', 'karsi_agirlik_tampon_stroku_cm',
      'hidrolik_piston_capi_cm', 'hidrolik_makara_capi_cm'].forEach(k => al(k, 'mm'));
    ['makine_konumu', 'aski_duzeni', 'kabin_kat_kapi_yonu', 'kabin_ray_tip_olcu', 'karsi_agirlik_ray_tip_olcu',
      'karsi_agirlik_konumu', 'ray_konum_aski', 'kismen_kapali_kuyu', 'kuyu_alti_kullanim_yuk',
      'kuyu_dibi_guvenlik_hacmi', 'kabin_ustu_guvenlik_hacmi', 'hidrolik_unite_konumu', 'hidrolik_piston_konumu'].forEach(k => al(k, ''));
    // Birleşik hücreler: teknik değer ilk alana yazılır
    al('halat_sayisi', 'örn. 7X6.5'); al('hidrolik_halat_sayisi', 'örn. 7X6.5');
    al('kabin_kat_kapi_tipi', 'örn. TELESKOPİK / 2');
    al('karsi_agirlik_parca_sayisi', 'örn. 2 / 500X80X1200');
    return durum;
  }

  root.AVES_FR65_DOCX = Object.freeze({
    build, doldur, sablonTemizle, karsilastir, normalize, tanimlar, komponentler, teknikAlanlari,
    _model: { modelKur, serilestir, hucre },
  });
})(globalThis);
