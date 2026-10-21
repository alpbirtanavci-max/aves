/* ============================================================
   AVES Saha Denetim — yeni denetim
   Yeni denetim formu, onay ekranı, denetim oluşturma, sahaya hazırlık.
   (Eski UI kapanışının parçasıdır: ui-durum → ui-foto → ui-yonetim → ui-kayit → ui-liste → ui-yeni →
   ui-fr65 → ui-denetim → ui-taslak → ui-form → ui-madde → ui-kapanis → ui-son; ortak global kapsam.)
   ============================================================ */
'use strict';

function showYeniForm() {
  if (!Profile.canCreate) { toast('Yeni denetim oluşturma yetkiniz yok'); showList(); return; }
  currentView = 'new-inspection';
  currentDenetimId = null;
  setBrandHomeEnabled(false);
  const seg = (id, opts, multi) => `<div class="segs" id="${id}">${opts.map(o =>
      `<button type="button" class="seg" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
  app.innerHTML = `
    <div class="screen">
      <button type="button" class="backlink" id="back">‹ Denetimler</button>
      <div class="form-card"><h3>Denetim bilgileri</h3>
        <div class="field full"><label for="fMuhendis">Denetimi gerçekleştiren mühendis</label><input id="fMuhendis" class="readonly-field" value="${esc(Profile.name)}" readonly></div>
      </div>
      <div class="form-card"><h3>Asansör bilgileri</h3>
        <div class="grid2">
          <div class="field full"><label for="fMusteri">Asansör firması adı *</label><input id="fMusteri" autocomplete="organization" list="firmaListesi"><datalist id="firmaListesi"></datalist></div>
          <div class="field full"><label for="fFirmaAdres">Asansör firmasının adresi *</label><input id="fFirmaAdres" autocomplete="street-address"></div>
          <div class="field" id="fSeriWrap"><label for="fSeri">Asansör seri no *</label><input id="fSeri" autocomplete="off"></div>
          <div class="field" id="fDosyaWrap"><label for="fDosya">Dosya no</label><input id="fDosya" autocomplete="off"></div>
          <div class="field" id="fKimlikWrap"><label for="fKimlikNo">Asansör kimlik no</label><input id="fKimlikNo" autocomplete="off"></div>
          <div class="field full" id="fAdresWrap"><label for="fAdres">Asansörün bulunduğu adres *</label><input id="fAdres" autocomplete="street-address"></div>
        </div>
      </div>
      <div class="form-card"><h3>Denetim modülü</h3>
        ${seg('sModul', ['G','B','E','H1'])}
        <p style="font-size:11.5px;color:var(--muted);margin:8px 2px 0">G modülü tam saha checklistidir. B, E ve H1 için yalnız FR.65 referanslı ölçü ve kimlik verileri kaydedilir; uygunluk kararı verilmez.</p>
      </div>
      <div id="captureFields" class="form-card hidden"><h3>FR.65 saha veri toplama</h3>
        <p style="font-size:11.5px;color:var(--muted);margin:0 2px 10px">Yalnız sahada görülen bilgileri ve ölçüleri kaydedin. Ana tip ve tip varyant kodu istenmez. Bu akışta TS EN 81-1/2+A3 kullanılmaz.</p>
        <div class="field full"><label>Tahrik tipi *</label>${seg('sCaptureTahrik', ['Elektrikli','Hidrolik'])}</div>
        <div class="field full"><label>Makine dairesi tipi *</label>${seg('sCaptureMD', ['MR','MRL'])}</div>
        <div class="grid2">
          <div class="field"><label for="fCaptureYuk">Sahada görülen anma yükü (kg) *</label><input id="fCaptureYuk" type="number" min="1" step="1" inputmode="numeric"></div>
          <div class="field"><label for="fCaptureKapasite">Kişi kapasitesi *</label><input id="fCaptureKapasite" type="number" min="1" step="1" inputmode="numeric"></div>
          <div class="field"><label for="fCaptureHiz">Sahada görülen hız (m/s) *</label><input id="fCaptureHiz" type="number" min="0.01" step="0.01" inputmode="decimal"></div>
          <div class="field"><label for="fCaptureDurak">Durak sayısı *</label><input id="fCaptureDurak" type="number" min="1" step="1" inputmode="numeric"></div>
          <div class="field"><label for="fCaptureKat">Kat sayısı</label><input id="fCaptureKat" type="number" min="1" step="1" inputmode="numeric"></div>
          <div class="field"><label for="fCaptureBinaAsansorSayisi">Binadaki toplam asansör sayısı</label><input id="fCaptureBinaAsansorSayisi" type="number" min="1" step="1" inputmode="numeric"></div>
        </div>
      </div>
      <div id="moduleGFields">
      <div class="form-card"><h3>Denetim kapsamı</h3>
        <b>${esc(DENETIM_TURLERI.MODUL_G)}</b>
      </div>
      <div class="form-card" id="standartCard"><h3>Ana standart *</h3>
        <div class="segs" id="sAna">
          <button type="button" class="seg" data-v="81-20">TS EN 81-20</button>
          <button type="button" class="seg" data-v="81-1/2+A3">TS EN 81-1/2+A3</button>
        </div>
        <p id="standartAciklama" style="font-size:11.5px;color:var(--muted);margin:8px 2px 0">Modül G için TS EN 81-20 veya TS EN 81-1/2+A3 seçilir. TS EN 81-70, TS EN 81-20 akışına otomatik ve zorunlu olarak eklenir.</p>
      </div>
      <div class="form-card"><h3>Bina ve kabin düzeni *</h3>
        <div class="grid2">
          <div class="field full"><label>Binadaki toplam asansör sayısı *</label><input id="fBinaAsansorSayisi" type="number" min="1" step="1" inputmode="numeric"></div>
          <div class="field full"><label>Kabin giriş düzeni *</label>${seg('sKabinGiris', ['Tek giriş','Karşılıklı giriş','Bitişik duvarlarda giriş'])}</div>
          <div class="field full"><label>Kabin kapısı açılma biçimi *</label>${seg('sKapiAcilma', ['Teleskopik','Merkezi'])}</div>
        </div>
      </div>
      <div class="form-card"><h3>Teknik *</h3>
        <div class="grid2">
          <div class="field full"><label>Tahrik tipi *</label>${seg('sTahrik', ['Elektrikli','Hidrolik'])}</div>
          <div class="field full"><label>Makine dairesi *</label>${seg('sMD', ['MR','MRL'])}</div>
          <div class="field full"><label>Askı tipi</label>${seg('sAski', ['1:1','2:1','4:1'])}</div>
          <div class="field"><label>Beyan yükü (kg) *</label><input id="fYuk" type="number" inputmode="numeric"></div>
          <div class="field"><label>Beyan hızı (m/s) *</label><input id="fHiz" type="number" step="0.01" inputmode="decimal"></div>
          <div class="field"><label>Kapasite (kişi) *</label><input id="fKapasite" type="number" inputmode="numeric"></div>
          <div class="field"><label>Durak sayısı *</label><input id="fDurak" type="number" inputmode="numeric"></div>
        </div>
      </div>
      <div class="form-card"><h3>İtfaiyeci Asansörü</h3>
        <div class="segs" id="sItfaiyeci">
          <button type="button" class="seg on" data-v="hayir">Hayır</button>
          <button type="button" class="seg" data-v="evet">Evet — TS EN 81-72</button>
        </div>
        <p style="font-size:11.5px;color:var(--muted);margin:8px 2px 0">Bu asansör itfaiyeci asansörü olarak tasarlanmışsa "Evet" seçin; TS EN 81-72 maddeleri checklist'e eklenir. Kasıtlı tahribata dayanıklılık (TS EN 81-71) ve yangın anında davranış (TS EN 81-73) maddeleri her denetimde otomatik yer alır; uygulanmadıkları durum ilgili maddede belirlenir.</p>
      </div>
      </div>
      <button type="button" class="btn btn-primary" id="fKaydet">Denetimi başlat</button>
      <div style="height:20px"></div>
    </div>`;
  // Daha önce çalışılan firmalar: yazarken öneri çıkar; tam eşleşince boş firma adresi kendiliğinden dolar.
  (async () => {
    try {
      const norm = value => String(value || '').trim().toLocaleLowerCase('tr').replace(/\s+/g, ' ');
      const rows = (await DB.all('denetimler')).filter(denetimGorunebilirMi).filter(r => r.musteri_unvani && r.firma_adresi)
        .sort((a, b) => String(b.created_at || b.denetim_tarihi || '').localeCompare(String(a.created_at || a.denetim_tarihi || '')));
      const firmalar = new Map();
      rows.forEach(r => { if (!firmalar.has(norm(r.musteri_unvani))) firmalar.set(norm(r.musteri_unvani), { ad: r.musteri_unvani, adres: r.firma_adresi }); });
      const liste = document.getElementById('firmaListesi');
      if (!liste) return;
      liste.innerHTML = [...firmalar.values()].map(f => `<option value="${esc(f.ad)}"></option>`).join('');
      const musteri = document.getElementById('fMusteri');
      const adres = document.getElementById('fFirmaAdres');
      const doldur = () => {
        const bulunan = firmalar.get(norm(musteri.value));
        if (bulunan && !adres.value.trim()) { adres.value = bulunan.adres; toast('Firma adresi önceki kayıttan dolduruldu'); }
      };
      musteri.addEventListener('input', doldur);
      musteri.addEventListener('change', doldur);
    } catch (error) { console.warn('Firma önerileri hazırlanamadı', error); }
  })();
  document.getElementById('back').onclick = showList;

  // seçim davranışı
  const single = { module: 'G', sDenetimTuru: DENETIM_TURLERI.MODUL_G, sItfaiyeci: 'hayir' };
  const moduleTypes = {
    G: { modul: 'Modül G', tur: DENETIM_TURLERI.MODUL_G, profil: KONTROL_PROFILLERI.TAM },
    B: { modul: 'Modül B', tur: DENETIM_TURLERI.MODUL_B, profil: KONTROL_PROFILLERI.MODUL_B },
    E: { modul: 'Modül E', tur: DENETIM_TURLERI.MODUL_E, profil: KONTROL_PROFILLERI.SAHA_TEYIDI_E },
    H1: { modul: 'Modül H1', tur: DENETIM_TURLERI.MODUL_H1, profil: KONTROL_PROFILLERI.SAHA_TEYIDI_H1 },
  };
  const updateModuleFields = () => {
    const isG = single.module === 'G';
    document.getElementById('moduleGFields').classList.toggle('hidden', !isG);
    document.getElementById('captureFields').classList.toggle('hidden', isG);
    // B/E/H1: seri no ve sahanın adresi kayıt açıldıktan sonra, sahada istenir.
    document.getElementById('fSeriWrap').classList.toggle('hidden', !isG);
    document.getElementById('fAdresWrap').classList.toggle('hidden', !isG);
    document.getElementById('fDosyaWrap').classList.toggle('hidden', !isG);
    document.getElementById('fKimlikWrap').classList.toggle('hidden', !isG);
    document.getElementById('fKaydet').textContent = isG ? 'Denetimi başlat' : 'Saha veri kaydını başlat';
    single.sDenetimTuru = moduleTypes[single.module].tur;
  };
  ['sModul','sAna','sKabinGiris','sKapiAcilma','sTahrik','sMD','sAski','sItfaiyeci','sCaptureTahrik','sCaptureMD'].forEach(id => {
    document.getElementById(id).addEventListener('click', (e) => {
      const b = e.target.closest('.seg'); if (!b) return;
      document.querySelectorAll(`#${id} .seg`).forEach(x => x.classList.remove('on'));
      b.classList.add('on'); single[id] = b.dataset.v;
      if (id === 'sModul') { single.module = b.dataset.v; updateModuleFields(); }
    });
  });
  document.querySelector('#sModul [data-v="G"]').classList.add('on');

  document.getElementById('fKaydet').onclick = async () => {
    const muhendis = Profile.name;
    const musteri = document.getElementById('fMusteri').value.trim();
    const firmaAdresi = document.getElementById('fFirmaAdres').value.trim();
    const seri = document.getElementById('fSeri').value.trim();
    const adres = document.getElementById('fAdres').value.trim();
    const yuk = denetimSayisiOku(document.getElementById('fYuk'));
    const hiz = denetimSayisiOku(document.getElementById('fHiz'));
    const kapasite = denetimSayisiOku(document.getElementById('fKapasite'));
    const durak = denetimSayisiOku(document.getElementById('fDurak'));
    const kimlikNo = document.getElementById('fKimlikNo').value.trim() || null;
    const binaAsansorSayisi = denetimSayisiOku(document.getElementById('fBinaAsansorSayisi'));
    const captureYuk = denetimSayisiOku(document.getElementById('fCaptureYuk'));
    const captureKapasite = denetimSayisiOku(document.getElementById('fCaptureKapasite'));
    const captureHiz = denetimSayisiOku(document.getElementById('fCaptureHiz'));
    const captureDurak = denetimSayisiOku(document.getElementById('fCaptureDurak'));
    const captureKat = denetimSayisiOku(document.getElementById('fCaptureKat'));
    const captureBinaAsansorSayisi = denetimSayisiOku(document.getElementById('fCaptureBinaAsansorSayisi'));
    if (!muhendis) { toast('Mühendis profili bulunamadı'); return; }
    const sahaKaydi = single.module !== 'G';
    if (!musteri || (!sahaKaydi && !seri)) { toast(sahaKaydi ? 'Asansör firması adı zorunlu' : 'Asansör firması adı ve seri no zorunlu'); return; }
    if (!firmaAdresi || (!sahaKaydi && !adres)) { toast(sahaKaydi ? 'Firma adresi zorunlu' : 'Firma adresi ve asansörün bulunduğu adres zorunlu'); return; }
    if (single.module !== 'G') {
      const module = moduleTypes[single.module];
      if (!module || !['B','E','H1'].includes(single.module)) { toast('Bu modül için saha veri kaydı açılamaz'); return; }
      if (!single.sCaptureTahrik) { toast('Tahrik tipini seçin'); return; }
      if (!single.sCaptureMD) { toast('Makine dairesi tipini (MR/MRL) seçin'); return; }
      if (!fr65SahaSayisalAlanlariGecerliMi({
        yuk: captureYuk, kapasite: captureKapasite, hiz: captureHiz, durak: captureDurak,
        kat: captureKat, binaAsansorSayisi: captureBinaAsansorSayisi,
      })) {
        toast('Yük, kapasite ve durak tam sayı olmalı; hız alanını kontrol edin'); return;
      }
      showFr65OnayEkrani({
        akış: 'fr65_saha_v1', muhendis, musteri, firmaAdresi, seri: '', adres: '',
        dosya: null,
        kimlikNo: null, modul: module.modul, denetimTuru: module.tur,
        kontrolProfili: module.profil, tahrik: single.sCaptureTahrik, md: single.sCaptureMD || null,
        yuk: captureYuk, kapasite: captureKapasite, hiz: captureHiz, durak: captureDurak,
        kat: captureKat, binaAsansorSayisi: captureBinaAsansorSayisi,
      });
      return;
    }
    if (!single.sAna) { toast('Ana standart seçin'); return; }
    if (!Number.isInteger(binaAsansorSayisi) || binaAsansorSayisi < 1) { toast('Binadaki toplam asansör sayısını tam sayı olarak girin'); return; }
    if (!single.sKabinGiris) { toast('Kabin giriş düzenini seçin'); return; }
    if (!single.sKapiAcilma) { toast('Kabin kapısı açılma biçimini seçin'); return; }
    if (!single.sTahrik) { toast('Tahrik tipi seçin'); return; }
    if (!single.sMD) { toast('Makine dairesi tipini (MR/MRL) seçin'); return; }
    if (!genelDenetimSayisalAlanlariGecerliMi({ yuk, hiz, kapasite, durak, binaAsansorSayisi })) {
      toast('Yük, kapasite, durak ve bina asansör sayısı tam sayı olmalı; hız sıfırdan büyük olmalı'); return;
    }

    // Devam eden kayıt varken yeni denetim açılmaz. Tamamlanan denetimlerden
    // sonra 365 gün geçince yeni, bağımsız denetim açılabilir. Takip denetimi
    // bu formdan değil, bağlı takip akışından üretildiği için bu kuralı aşar.
    if (!await yeniDenetimSeriNoUygunMu(seri)) return;

    const ekStandartlar = single.sItfaiyeci === 'evet' ? ['81-72'] : [];
    const kontrolProfil = KONTROL_PROFILLERI.TAM;
    let tahmini = 0;
    // Eski kütüphane önbelleği yeni G denetimini yanlış fiziksel bölümlere ayırmamalı.
    const lib = (await DB.all('kutuphane')).map(avesFizikselBolumUygula);
    const secili = seciliStandartGruplari(single.sAna, ekStandartlar);
    tahmini = lib.filter(m =>
      m.aktif && secili.has(m.standart_grubu) && maddeKontrolProfilineUygun(m, kontrolProfil)
    ).length;

    const formVals = {
      muhendis, musteri, firmaAdresi, seri, adres,
      dosya: document.getElementById('fDosya').value.trim() || null,
      kimlikNo,
      denetimTuru: single.sDenetimTuru,
      kontrolProfili: kontrolProfil,
      modul: 'Modül G',
      anaTip: null, tipVaryantKodu: null,
      anaStandart: single.sAna,
      ekStandartlar,
      binaAsansorSayisi,
      kabinGirisDuzeni: single.sKabinGiris,
      kabinKapiAcilmaTipi: single.sKapiAcilma,
      tahrik: single.sTahrik,
      md: single.sMD,
      yuk, hiz, kapasite,
      durak,
      aski: single.sAski || null,
    };
    showOnayEkrani(formVals, tahmini);
  };
}

function showOnayEkrani(f, tahmini) {
  if (!f || f.modul !== 'Modül G' || f.kontrolProfili !== KONTROL_PROFILLERI.TAM) {
    toast('Bu uygulamada yalnız Modül G denetimi başlatılabilir');
    return;
  }
  const ov = document.createElement('div');
  ov.className = 'overlay';
  const satir = (k, v) => v ? `<div class="onay-satir"><span>${esc(k)}</span><b>${esc(v)}</b></div>` : '';
  ov.innerHTML = `<div class="modal">
      <h3>Denetimi başlatmadan önce kontrol edin</h3>
      <div class="onay-box">
        ${satir('Mühendis', f.muhendis)}
        ${satir('Asansör firması', f.musteri)}
        ${satir('Firma adresi', f.firmaAdresi)}
        ${satir('Asansörün bulunduğu adres', f.adres)}
        ${satir('Asansör seri no', f.seri)}
        ${satir('Asansör kimlik no', f.kimlikNo)}
        ${satir('Denetim türü', f.denetimTuru)}
        ${satir('Kontrol profili', 'Tam Modül G saha kontrolü')}
        ${satir('Ana standart', f.anaStandart)}
        ${satir('Zorunlu erişilebilirlik', f.anaStandart === '81-20' ? 'TS EN 81-70' : null)}
        ${satir('Zorunlu ek standartlar', 'TS EN 81-71 + TS EN 81-73')}
        ${satir('İtfaiyeci Asansörü', f.ekStandartlar.includes('81-72') ? 'Evet — TS EN 81-72' : null)}
        ${satir('Binadaki asansör sayısı', f.binaAsansorSayisi)}
        ${satir('Kabin giriş düzeni', f.kabinGirisDuzeni)}
        ${satir('Kapı açılma biçimi', f.kabinKapiAcilmaTipi)}
        ${satir('Tahrik tipi', f.tahrik)}
        ${satir('Makine dairesi', f.md)}
        ${satir('Beyan yükü', f.yuk ? f.yuk + ' kg' : null)}
        ${satir('Beyan hızı', f.hiz ? f.hiz + ' m/s' : null)}
        ${satir('Kapasite', f.kapasite ? f.kapasite + ' kişi' : null)}
        ${satir('Durak sayısı', f.durak)}
        ${satir('Oluşturulacak madde', tahmini + ' madde')}
      </div>
      <button class="btn btn-ghost" id="onDuzelt" style="margin-bottom:8px">‹ Bilgileri düzelt</button>
      <button class="btn btn-primary" id="onBaslat">Denetimi başlat</button>
    </div>`;
  document.body.appendChild(ov);
  ov.querySelector('#onDuzelt').onclick = () => ov.remove();
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  ov.querySelector('#onBaslat').onclick = async () => {
    const btn = ov.querySelector('#onBaslat');
    btn.disabled = true; btn.textContent = 'Maddeler hazırlanıyor…';
    await olustur(f);
    ov.remove();
  };
}

async function olustur(f) {
    if (!f || f.modul !== 'Modül G' || f.kontrolProfili !== KONTROL_PROFILLERI.TAM) {
      toast('Bu uygulamada yalnız Modül G denetimi oluşturulabilir');
      return;
    }
    const d = {
      id: crypto.randomUUID(),
      dosya_no: f.dosya,
      musteri_unvani: f.musteri,
      firma_adresi: f.firmaAdresi,
      denetim_adresi: f.adres,
      asansor_seri_no: f.seri,
      asansor_kimlik_no: f.kimlikNo,
      modul: f.modul,
      denetim_turu: f.denetimTuru,
      kontrol_profili: f.kontrolProfili,
      ana_tip: f.anaTip || null,
      tip_varyant_kodu: f.tipVaryantKodu || null,
      ana_standart: f.anaStandart,
      ek_standartlar: f.ekStandartlar,
      bina_asansor_sayisi: f.binaAsansorSayisi,
      kabin_giris_duzeni: f.kabinGirisDuzeni,
      kabin_kapi_acilma_tipi: f.kabinKapiAcilmaTipi,
      tahrik_tipi: f.tahrik,
      makine_dairesi_tipi: f.md,
      beyan_yuku_kg: f.yuk,
      beyan_hizi_ms: f.hiz,
      kapasite_kisi: f.kapasite,
      durak_sayisi: f.durak,
      aski_tipi: f.aski,
      denetim_form_kayitlari: null,
      denetimi_yapan: f.muhendis,
      denetim_tarihi: localDateISO(),
      denetim_durumu: 'Devam Ediyor',
      saha_tamamlandi_at: null,
      gozden_gecirme_at: null,
      calisma_tamamlandi_at: null,
      offline_hazir_at: null,
      offline_hazirlayan_email: null,
      expected_item_count: null,
      expected_item_set_hash: null,
      app_build_id: null,
      kutuphane_content_hash: null,
      snapshot_kilitli_at: null,
      snapshot_app_build_id: APP_VERSION,
      snapshot_kutuphane_hash: null,
      snapshot_bolum_surumleri: null,
      snapshot_madde_sayisi: null,
      snapshot_madde_set_hash: null,
      snapshot_content_hash: null,
      butunluk_ozeti: null,
      butunluk_hash: null,
      butunluk_hesaplandi_at: null,
      offline_check: null,
      seri_numaralari: { schema_version: 1 },
      form_cikti_snapshot: await FormOutput.createSnapshot(f.anaStandart, f.modul),
      olusturan_email: Profile.email,
      olusturan_ad: Profile.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // maddeleri CİHAZDA üret (offline-first'in kalbi)
    const lib = await DB.all('kutuphane');
    const secili = seciliStandartGruplari(d.ana_standart, d.ek_standartlar);
    const sahaRows = lib
      .filter(m =>
        m.aktif && m.madde_id !== 'MAD-1010' && secili.has(m.standart_grubu) &&
        maddeKontrolProfilineUygun(m, kontrolProfili(d))
      )
      .sort(siraKarsilastir)
      .map(m => {
        // konfigürasyon uyuşmazlığı → otomatik Uygulanmaz
        let otoSebep = null;
        if (m.tahrik_kosulu && d.tahrik_tipi && m.tahrik_kosulu !== d.tahrik_tipi)
          otoSebep = `${m.tahrik_kosulu} asansörlere özgü madde (bu asansör: ${d.tahrik_tipi})`;
        else if (m.md_kosulu && d.makine_dairesi_tipi && m.md_kosulu !== d.makine_dairesi_tipi)
          otoSebep = `${m.md_kosulu} asansörlere özgü madde (bu asansör: ${d.makine_dairesi_tipi})`;
        return {
          id: crypto.randomUUID(),
          denetim_id: d.id,
          madde_id: m.madde_id, sira_no: m.sira_no, bolum: m.bolum,
          standart_grubu: m.standart_grubu, kaynak_turu: m.kaynak_turu,
          standart_madde_no: m.standart_madde_no, kontrol_basligi: m.kontrol_basligi,
          denetci_yonlendirmesi: m.denetci_yonlendirmesi,
          resmi_madde_metni: m.resmi_madde_metni ?? null,
          kaynak_form_kodu: m.kaynak_form_kodu ?? null,
          kaynak_form_revizyonu: m.kaynak_form_revizyonu ?? null,
          kaynak_form_tablo_no: m.kaynak_form_tablo_no ?? null,
          kaynak_form_satir_no: m.kaynak_form_satir_no ?? null,
          kaynak_form_bolumu: m.kaynak_form_bolumu ?? null,
          kaynak_form_alt_grubu: m.kaynak_form_alt_grubu ?? null,
          yontem_kodu: m.yontem_kodu, dogrulama_yontemi: m.dogrulama_yontemi,
          hazir_secenekler: m.hazir_secenekler,
          olcu1_adi: m.olcu1_adi, olcu1_birimi: m.olcu1_birimi, olcu1_degeri: null,
          olcu2_adi: m.olcu2_adi, olcu2_birimi: m.olcu2_birimi, olcu2_degeri: null,
          esik_deger: m.esik_deger ?? null, esik_operator: m.esik_operator ?? null,
          olcum_tanimlari: Array.isArray(m.olcum_tanimlari) ? m.olcum_tanimlari : [],
          olcum_degerleri: {},
          otomatik_aranmaz_kurali: m.otomatik_aranmaz_kurali ?? null,
          aranmaz_kosulu: m.aranmaz_kosulu ?? null,
          otomatik_gerekce: otoSebep,
          gorsel_referansi: m.gorsel_referansi ?? null,
          snapshot_madde_hash: null,
          durum: otoSebep ? 'Uygulanmaz' : null,
          otomatik_uygulanmaz: !!otoSebep,
          denetci_gordu: false,
          bulgu_secenegi: null, diger_bulgu: null,
          aciklama: null,
          ic_kontrol_notu: null,
          gozden_gecirme_nedeni: null,
          gozden_gecirme_notu: null,
          guncelleyen_email: API.email,
          olusturan_email: Profile.email,
          olusturan_ad: Profile.name,
          updated_at: new Date().toISOString(),
        };
      });

    // Denetim başladıktan sonra bu içerik yeni kütüphane sürümleriyle
    // değişmez. Hem madde bazında hem tüm seçili set için doğrulanabilir
    // SHA-256 parmak izi saklanır.
    const snapshotFields = [
      'madde_id', 'sira_no', 'bolum', 'standart_grubu', 'kaynak_turu',
      'standart_madde_no', 'kontrol_basligi', 'denetci_yonlendirmesi',
      'resmi_madde_metni', 'kaynak_form_kodu', 'kaynak_form_revizyonu',
      'kaynak_form_tablo_no', 'kaynak_form_satir_no', 'kaynak_form_bolumu',
      'kaynak_form_alt_grubu', 'yontem_kodu', 'dogrulama_yontemi',
      'hazir_secenekler', 'olcu1_adi', 'olcu1_birimi', 'olcu2_adi',
      'olcu2_birimi', 'esik_deger', 'esik_operator', 'olcum_tanimlari',
      'otomatik_aranmaz_kurali', 'aranmaz_kosulu', 'gorsel_referansi',
    ];
    for (const row of sahaRows) {
      const frozen = {};
      for (const field of snapshotFields) frozen[field] = row[field] ?? null;
      row.snapshot_madde_hash = await sha256Hex(stableStringify(frozen));
    }
    const manifest = await DB.kvGet('kutuphane_manifest');
    const itemIds = sahaRows.map(row => row.madde_id).sort();
    const contentManifest = sahaRows
      .map(row => ({ madde_id: row.madde_id, hash: row.snapshot_madde_hash }))
      .sort((a,b) => a.madde_id.localeCompare(b.madde_id, 'tr'));
    d.snapshot_kilitli_at = new Date().toISOString();
    d.snapshot_kutuphane_hash = manifest ? manifest.content_hash : null;
    d.snapshot_bolum_surumleri = manifest ? manifest.server_revision_key : null;
    d.snapshot_madde_sayisi = sahaRows.length;
    d.snapshot_madde_set_hash = await sha256Hex(itemIds.join('|'));
    d.snapshot_content_hash = await sha256Hex(stableStringify(contentManifest));

    await localWrite('denetimler', d, 'denetimler');
    // 1000+ satırı tek outbox kalemi yapmak yerine 200'lük parçalara böl (istek boyutu güvenliği)
    for (let i = 0; i < sahaRows.length; i += 200) {
      await localWrite('saha_kontrol', sahaRows.slice(i, i+200), 'saha');
    }
    toast(`${sahaRows.length} madde hazırlandı`);
    showDenetim(d.id);
}

/* ---- Denetim detay ---- */
async function sahayaHazirla(d, rows) {
  // Yeni kontrol tamamlanana kadar önceki cihaz işaretine güvenilmez (FR.65'te geçerli işaret titremesin).
  if (!fr65SahaKaydiMi(d)) await DB.kvDel(`offline_ready_${d.id}`);
  const checks = [];
  const formsOnly = formOdakliDenetimMi(d, rows);
  // advisory: kırmızı gösterilir ama "hazır" işaretini engellemez (ör. tarayıcı
  // kararına bağlı kalıcı depolama izni).
  const add = (name, ok, detail, advisory) => checks.push({ name, ok: !!ok, detail, advisory: !!advisory });
  const manifest = await DB.kvGet('kutuphane_manifest');
  const library = await DB.all('kutuphane');
  const applicableForms = formsOnly ? modulFormSeti(d) : [];
  const formKeys = applicableForms.map(form => form.key);
  const formSetKeyHash = await sha256Hex(formKeys.join('|'));
  const itemIds = rows.map(r => r.madde_id).sort();
  const uniqueIds = new Set(itemIds);
  const itemSetHash = await sha256Hex(itemIds.join('|'));
  const fr65Kaydi = fr65SahaKaydiMi(d);

  if (fr65Kaydi) {
    const fr65Outbox = (await DB.outboxAll()).filter(item => item.inspection_id === d.id);
    let fr65Okunur = false;
    try {
      const normalized = AVES_DENETIM_FORM_SETI.normalize(d.denetim_form_kayitlari, d.teknik_dosya_kayitlari);
      fr65Okunur = !!normalized.forms?.FR65 && normalized.saha_veri_akisi === 'fr65_saha_v1';
    } catch { fr65Okunur = false; }
    add('FR.65 form tanımı cihazda', typeof AVES_TEKNIK_DOSYA_FORM?.emptyFr65Capture === 'function' && typeof AVES_TEKNIK_DOSYA_FORM?.countFr65Capture === 'function', 'Alan ve bölüm tanımları uygulama dosyasında yüklü');
    add('Kayıt cihazda ve okunabilir', fr65Okunur, fr65Okunur ? 'Saha verisi cihaz veritabanından okundu' : 'Kayıt okunamadı');
    add('Cihazdaki değişiklikler sunucuya aktarıldı', fr65Outbox.length === 0,
      fr65Outbox.length ? `${fr65Outbox.length} işlem sunucu aktarımını bekliyor — çevrimdışı çalışmayı engellemez` : 'Bekleyen aktarım yok', true);
  } else if (formsOnly) {
    add(`Modül ${denetimFormModulu(d)} form seti cihazda`, formKeys.length > 0, `${formKeys.length} uygulanabilir form`);
    add('Form şemaları eksiksiz', formKeys.every(key => !!AVES_DENETIM_FORM_SETI.FORMS[key]), 'Uygulanabilir tüm form tanımları yüklü');
  } else {
    add('Denetim maddeleri cihazda', rows.length > 0, `${rows.length} madde`);
    add('Madde kimlikleri eksiksiz ve benzersiz', itemIds.every(Boolean) && uniqueIds.size === rows.length, `${uniqueIds.size}/${rows.length}`);
    add('Madde snapshot alanları hazır', rows.every(r => r.id && r.denetim_id === d.id && r.bolum && r.kontrol_basligi), 'Kimlik, bölüm ve kontrol metni');
    add('Kütüphane manifesti doğrulandı', !!manifest && manifest.count === library.length && !!manifest.content_hash, manifest ? `${library.length} madde · ${String(manifest.content_hash || '').slice(0,12)}…` : 'Manifest yok');
  }

  const profileVerifiedAt = await DB.kvGet('profile_verified_at');
  const profileVerifiedEmail = await DB.kvGet('profile_verified_email');
  add('Kullanıcı yetkisi çevrimiçiyken doğrulandı', !!profileVerifiedAt && profileVerifiedEmail === Profile.email, profileVerifiedAt ? new Date(profileVerifiedAt).toLocaleString('tr-TR') : 'Doğrulama yok');

  let storageOk = false;
  try {
    const probeKey = `offline_probe_${d.id}`;
    const probeValue = crypto.randomUUID();
    await DB.kvSet(probeKey, probeValue);
    storageOk = (await DB.kvGet(probeKey)) === probeValue;
    await DB.kvDel(probeKey);
  } catch { storageOk = false; }
  add('Yerel veritabanı yazma testi', storageOk, storageOk ? 'Yazma ve geri okuma başarılı' : 'Başarısız');

  let quotaDetail = 'Tarayıcı bilgi vermedi';
  let quotaOk = true;
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    const remaining = Math.max(0, (estimate.quota || 0) - (estimate.usage || 0));
    quotaOk = !estimate.quota || remaining >= 5 * 1024 * 1024;
    quotaDetail = `${Math.round(remaining / 1024 / 1024)} MB boş`;
  }
  add('Yerel depolama alanı', quotaOk, quotaDetail);

  const persistState = await DB.kvGet('storage_persist');
  add('Kalıcı depolama izni',
    !!persistState && persistState.granted,
    !persistState ? 'Henüz kontrol edilmedi'
      : persistState.granted ? 'Tarayıcı yerel veriyi uyarısız temizlemez'
      : persistState.supported ? 'Tarayıcı izni vermedi — depolama dolarsa veri silinebilir; uygulamayı ana ekrana ekleyin'
      : 'Tarayıcı bu özelliği desteklemiyor',
    true);

  // Ana ekrana eklenmemiş bir tarayıcı sekmesi, önbellek dolu olsa bile
  // sinyalin tamamen kesildiği bir soğuk başlangıçta açılmayabilir (özellikle
  // iOS Safari'de görülür) — bu durumda tarayıcı kendi "İnternete bağlı
  // değilsiniz" sayfasını gösterir, uygulamanın Service Worker'ı hiç
  // devreye girmez. Kurulum yolu platforma göre farklı olduğundan uyarı
  // metni buna göre değişir (Safari: Paylaş menüsü; Chrome/Android: ⋮ menüsü).
  const kuruluUygulama = isNativeApp()
    || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
    || window.navigator.standalone === true;
  const iosCihaz = /iPhone|iPad|iPod/.test(navigator.userAgent || '');
  const kurulumYolu = iosCihaz
    ? 'Safari\'de Paylaş simgesi → Ana Ekrana Ekle'
    : 'Tarayıcı menüsü (⋮) → Ana ekrana ekle / Uygulamayı yükle';
  add('Ana ekrana eklenmiş uygulama olarak açık',
    kuruluUygulama,
    isNativeApp() ? 'Native uygulama olarak çalışıyor — en güvenilir mod'
      : kuruluUygulama ? 'Kurulu uygulama modunda çalışıyor'
      : `Tarayıcı sekmesinde açık — sinyalin tamamen kesildiği bir yerde bu sekme hiç açılmayabilir; ${kurulumYolu} ile kurup bundan sonra yalnız o simgeden açın`,
    true);

  const visualAssets = [...new Set(rows.flatMap(r => gorselDosyalari(r.gorsel_referansi)).map(file => `./referans-gorseller/${file}`))];
  const assets = [...OFFLINE_CORE_ASSETS, ...visualAssets];
  let cachedCount = assets.length;
  // Native kabukta varlıklar Service Worker/Cache Storage'dan değil,
  // doğrudan pakete gömülü dosyalardan yüklenir — caches.match kontrolü
  // burada anlamsız (her zaman boş döner) ve yanlışlıkla "hazır değil"
  // gösterirdi. Native'de bu kontrol her zaman geçer.
  if (!isNativeApp() && 'caches' in window) {
    cachedCount = 0;
    for (const asset of assets) {
      if (await caches.match(new URL(asset, location.href).href)) cachedCount++;
    }
  }
  add('Uygulama ve gerekli görseller çevrimdışı hazır', cachedCount === assets.length,
    isNativeApp() ? 'Native uygulama — varlıklar pakette, ayrıca önbelleğe alınmasına gerek yok' : `${cachedCount}/${assets.length} dosya`);

  const ready = checks.every(check => check.ok || check.advisory);
  if (ready && fr65Kaydi) {
    // FR.65 kaydı koşullu senkronla yazılır; hazırlık işareti yalnız bu cihazda tutulur.
    await DB.kvSet(`offline_ready_${d.id}`, {
      fr65: true,
      device_id: await getDeviceId(),
      app_build_id: APP_VERSION,
      checked_at: new Date().toISOString(),
    });
  } else if (ready) {
    const now = new Date().toISOString();
    d.offline_hazir_at = now;
    d.offline_hazirlayan_email = Profile.email;
    d.expected_item_count = rows.length;
    d.expected_item_set_hash = itemSetHash;
    d.app_build_id = APP_VERSION;
    d.kutuphane_content_hash = manifest ? manifest.content_hash : null;
    d.offline_check = { checked_at: now, checks };
    d.updated_at = now;
    await DB.kvSet(`offline_ready_${d.id}`, {
      device_id: await getDeviceId(),
      app_build_id: APP_VERSION,
      expected_item_count: rows.length,
      item_set_hash: itemSetHash,
      forms_only: formsOnly,
      form_set_key_hash: formsOnly ? formSetKeyHash : null,
      kutuphane_content_hash: manifest ? manifest.content_hash : null,
      checked_at: now,
    });
    await localWrite('denetimler', d, 'denetimler');
  }
  return { ready, checks };
}

function sahayaHazirlikSonucuGoster(result) {
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="modal"><button class="close">×</button>
      <h3>${result.ready ? '✓ Çevrimdışı çalışmaya hazır' : '⚠ Çevrimdışı çalışmaya hazır değil'}</h3>
      <div class="preflight-list">${result.checks.map(check => {
        const cls = check.ok ? 'ok' : (check.advisory ? 'warn' : 'fail');
        const mark = check.ok ? '✓' : (check.advisory ? '⚠' : '✕');
        return `<div class="preflight-row ${cls}"><span>${mark}</span><div><b>${esc(check.name)}</b><small>${esc(check.detail || '')}</small></div></div>`;
      }).join('')}</div>
      <div class="photo-help">${result.ready ? 'Bu denetim bu cihazda hazır. Cihazdaki yerel kopya, sunucu doğrulanana kadar korunur.' : 'Kırmızı kontroller düzelmeden bu cihaz “Çevrimdışı çalışmaya hazır” olarak işaretlenmez.'} Sarı kontroller uyarıdır, hazırlığı engellemez.
      <br><br><b>⚠ Sinyalsiz bölgeye girmeden önce uygulamayı açın ve kapatmayın.</b> Uygulama açık/arka planda kalırsa (görev listesinden atılmadıysa) internet olmadan sorunsuz çalışır. Ama tamamen kapatılmış bir uygulamanın sinyalsiz bir yerde yeniden açılması — ana ekrana eklenmiş olsa bile — garanti değildir; bu bilinen bir tarayıcı kısıtıdır, hazırlık kontrolü bunu değiştiremez.
      <br><br><b>Uygulama hiç açılmazsa:</b> panik yapmayın, veri kaybolmaz. Kurumun kâğıt yedek prosedürünü izleyin (sonucu not alın), sinyale çıkınca uygulamaya işleyin.</div>
    </div>`;
  document.body.appendChild(ov);
  ov.querySelector('.close').onclick = () => ov.remove();
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
}
