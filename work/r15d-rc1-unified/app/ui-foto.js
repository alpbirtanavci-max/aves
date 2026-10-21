/* ============================================================
   AVES Saha Denetim — fotoğraf
   Fotoğraf sıkıştırma, yükleme, silme ve Fotoğraf sekmesi.
   (Eski UI kapanışının parçasıdır: ui-durum → ui-foto → ui-yonetim → ui-kayit → ui-liste → ui-yeni →
   ui-fr65 → ui-denetim → ui-taslak → ui-form → ui-madde → ui-kapanis → ui-son; ortak global kapsam.)
   ============================================================ */
'use strict';

async function fotografOnbellekYenile(denetimId) {
  if (navigator.onLine && API.loggedIn) {
    try {
      const remote = await API.select('denetim_fotograflari', `select=*&denetim_id=eq.${denetimId}&order=created_at.asc`);
      const local = await DB.allByIndex('fotograflar', 'byDenetim', denetimId);
      const pending = local.filter(f => f.sync_status === 'pending');
      await DB.replaceByIndex('fotograflar', 'byDenetim', denetimId, [...remote, ...pending.filter(p => !remote.some(r => r.id === p.id))]);
    } catch (error) {
      console.warn('Fotoğraf listesi çevrimdışı kopyadan gösteriliyor', error);
    }
  }
  const all = await DB.allByIndex('fotograflar', 'byDenetim', denetimId);
  fotografSayilari = new Map();
  all.filter(f => !f.deleted_at).forEach(f => fotografSayilari.set(f.kategori, (fotografSayilari.get(f.kategori) || 0) + 1));
  fotografBekleyenSayisi = all.filter(f => f.sync_status === 'pending').length;
}

function fotografToplamSayisi() {
  let toplam = 0;
  fotografSayilari.forEach(n => toplam += n);
  return toplam;
}

async function fotografSikistir(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Fotoğraf sıkıştırılamadı')), 'image/jpeg', .82));
  return { blob, width: canvas.width, height: canvas.height };
}

async function fotografYukle(foto) {
  if (!navigator.onLine || !foto.blob) return false;
  // x-upsert:true — metadata yazımı bir önceki denemede başarısız olup obje storage'da
  // yetim kalmışsa (örn. yetki hatası), yeniden deneme aynı object_path'i sorunsuz üstüne yazabilsin.
  const upload = await API.authFetch(`/storage/v1/object/denetim-fotograflari/${foto.object_path}`, {
    method: 'POST', headers: { 'Content-Type': 'image/jpeg', 'x-upsert': 'true' }, body: foto.blob,
  });
  if (!upload.ok) throw new Error(`Fotoğraf yüklenemedi (${upload.status})`);
  const meta = { ...foto, blob: undefined, sync_status: undefined };
  await API.upsert('denetim_fotograflari', meta);
  foto.blob = undefined;
  foto.sync_status = 'synced';
  await DB.put('fotograflar', foto);
  return true;
}

async function bekleyenFotograflariYukle() {
  if (!navigator.onLine) return;
  const all = await DB.all('fotograflar');
  let degisti = false;
  for (const foto of all.filter(f => f.sync_status === 'pending' && f.blob)) {
    try { await fotografYukle(foto); degisti = true; } catch (error) { console.warn('Fotoğraf daha sonra yeniden yüklenecek', error); }
  }
  if (degisti && currentDenetimId) {
    await fotografOnbellekYenile(currentDenetimId);
    await refreshSyncState();
  }
}

async function fotografBlob(foto) {
  if (foto.blob) return foto.blob;
  const resp = await API.authFetch(`/storage/v1/object/authenticated/denetim-fotograflari/${foto.object_path}`, { method: 'GET' });
  if (!resp.ok) throw new Error(`Fotoğraf açılamadı (${resp.status})`);
  return resp.blob();
}

async function fotografDepodanSil(objectPath) {
  if (!objectPath) throw new Error('Fotoğrafın sunucu yolu bulunamadı');
  // Supabase Storage silme API'si bucket endpoint'ine JSON prefixes listesi ister.
  // Dosya yoluna boş gövdeli DELETE, Content-Type: application/json nedeniyle 400 döner.
  const response = await API.authFetch('/storage/v1/object/denetim-fotograflari', {
    method: 'DELETE',
    body: JSON.stringify({ prefixes: [objectPath] }),
  });
  if (!response.ok && response.status !== 404) {
    let detail = '';
    try { detail = await response.text(); } catch {}
    throw new Error(`Storage silme hatası (${response.status})${detail ? `: ${detail.slice(0, 180)}` : ''}`);
  }
}

async function fotografSekmesi() {
  await fotografOnbellekYenile(currentDenetimId);
  const denetim = await DB.get('denetimler', currentDenetimId);
  // Fotoğraf ekleme atanan takip mühendisine açık; silme değil (RLS DELETE
  // politikası genişletilmedi, migration 79 kararı D2). Sunucudan 403 almadan
  // önce düğmeyi de gizle. Koşul RLS DELETE politikasıyla (68/75) hizalı:
  // sahip · yönetici/teknik müdür · fotoğraf arşiv yetkisi.
  const fotoSilebilir = currentCanEdit && (denetimSahibiMi(denetim) || Profile.canSeeAllInspections || Profile.canArchivePhotos);
  let tumFotograflar = (await DB.allByIndex('fotograflar', 'byDenetim', currentDenetimId))
    .filter(f => !f.deleted_at).sort((a,b) => a.created_at.localeCompare(b.created_at));
  const ov = document.createElement('div');
  ov.className = 'overlay';
  const kategoriFotograflari = (kat) => tumFotograflar.filter(f => f.kategori === kat);
  // Fotoğraf ekleme ortak yolu: hem "Galeriden ekle" hem uygulama içi kamera
  // aynı sıkıştırma + kayıt + yükleme akışını kullanır.
  const fotografKaydet = async (kat, blob) => {
    const { blob: sikistirilmis, width, height } = await fotografSikistir(blob);
    const id = crypto.randomUUID();
    const foto = { id, denetim_id: currentDenetimId, kategori: kat,
      object_path: `${currentDenetimId}/${kat}/${id}.jpg`, mime_type: 'image/jpeg', size_bytes: sikistirilmis.size,
      width, height, created_by: API.email, created_at: new Date().toISOString(), blob: sikistirilmis, sync_status: 'pending' };
    await DB.put('fotograflar', foto);
    try { await fotografYukle(foto); } catch (error) { console.warn(error); }
    tumFotograflar.push(foto);
    return foto;
  };
  // Uygulama içi kamera (getUserMedia): saha güvenilirliği — native kamera
  // uygulamasına geçmek AVES'i tamamen arka plana atıp iOS'ta bellek
  // baskısı altında kapanma riskini büyütüyordu (bkz. R15D_RC3956 notu).
  // Sayfadan hiç çıkılmadığı için bu risk oluşmaz. Çözünürlük native
  // kameradan düşük olabilir ama fotografSikistir zaten her şeyi 1600px'e
  // indirdiğinden pratik farkın azı kalıyor.
  const kameraIleFotografCek = async (kat) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast('Bu cihazda/tarayıcıda uygulama içi kamera desteklenmiyor — Galeriden ekle\'yi kullanın');
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1440 } },
        audio: false,
      });
    } catch (error) {
      toast('Kameraya erişilemedi: ' + (error && error.message ? error.message : 'izin reddedildi'));
      return;
    }
    const camOv = document.createElement('div');
    camOv.className = 'overlay camera-overlay';
    camOv.innerHTML = `<div class="camera-modal">
        <video autoplay playsinline muted></video>
        <div class="camera-controls">
          <button type="button" class="btn btn-ghost" id="camKapat">Kapat</button>
          <button type="button" class="btn btn-primary" id="camCek">📷 Çek</button>
          <span class="camera-count">0 fotoğraf</span>
        </div>
      </div>`;
    document.body.appendChild(camOv);
    const video = camOv.querySelector('video');
    video.srcObject = stream;
    let cekilen = 0;
    let kapandi = false;
    const kapat = async () => {
      if (kapandi) return;
      kapandi = true;
      stream.getTracks().forEach(track => track.stop());
      camOv.remove();
      if (cekilen) await ciz();
    };
    camOv.querySelector('#camKapat').onclick = kapat;
    camOv.onclick = e => { if (e.target === camOv) kapat(); };
    camOv.querySelector('#camCek').onclick = async () => {
      const cekBtn = camOv.querySelector('#camCek');
      cekBtn.disabled = true;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 960;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Kare yakalanamadı')), 'image/jpeg', .92));
        await fotografKaydet(kat, blob);
        cekilen++;
        camOv.querySelector('.camera-count').textContent = `${cekilen} fotoğraf`;
        toast('Fotoğraf kaydedildi');
      } catch (error) {
        console.error('Uygulama içi çekim başarısız', error);
        toast('Fotoğraf kaydedilemedi, tekrar deneyin');
      } finally {
        cekBtn.disabled = false;
      }
    };
  };
  const ciz = async () => {
    ov.innerHTML = `<div class="modal photo-modal"><div class="photo-modal-head"><h3>Fotoğraflar <span class="photo-total">${tumFotograflar.length}</span></h3><button class="close" aria-label="Kapat">×</button></div>
        <p class="photo-help"><b>Bu yönergeler sınırlayıcı bir liste değil, asgari kapsam için hatırlatmadır.</b> Genel durumu göstermek için geniş açı kullanın; tek kare yeterli değilse istediğiniz kadar fotoğraf çekin veya galeriden seçin. Farklı uygulamaları, kritik bağlantıları, kuşkulu durumları ve uygunsuzlukları ayrıca kaydedin. Uygulama fotoğrafları yorumlamaz ve uygunluk kararı vermez.</p>
        <details class="photo-video-plan">
          <summary>🎥 İşlev testleri için video kayıt planı</summary>
          <p>Videolar bu AVES fotoğraf alanına yüklenmez. Kurumun belirlediği ayrı aktarım ve arşiv yöntemiyle saklayın; bu liste kayıt hatırlatıcısıdır, zorunlu test veya uygunluk kararı değildir.</p>
          <ul>${SAHA_KANIT_PLANI.videolar.map(item => `<li>${esc(item)}</li>`).join('')}</ul>
          <small>Kaynak statüsü: ${esc(SAHA_KANIT_PLANI.kaynak)}</small>
        </details>
        ${tumFotograflar.length ? '<button type="button" class="btn btn-ghost photo-download-all">⇩ Tüm fotoğrafları indir</button>' : ''}
        <div class="photo-kategoriler"></div>
      </div>`;
    const kategoriler = ov.querySelector('.photo-kategoriler');
    for (const [kat, baslik, rehber] of FOTOGRAF_KATEGORILERI) {
      const fotograflar = kategoriFotograflari(kat);
      const section = document.createElement('div');
      section.className = 'photo-kategori';
      section.innerHTML = `<h4>${esc(baslik)} <span class="photo-total">${fotograflar.length}</span></h4>
          <p class="photo-help">${esc(rehber)}</p>
          <div class="photo-grid"></div>
          ${currentCanEdit ? `<div class="photo-add-row">
            <button type="button" class="btn btn-ghost photo-add-camera" data-kat="${kat}">📷 Fotoğraf çek</button>
            <label class="photo-add">🖼 Galeriden ekle<input type="file" accept="image/*" multiple hidden data-kat="${kat}"></label>
          </div>` : ''}`;
      const grid = section.querySelector('.photo-grid');
      for (const foto of fotograflar) {
        const card = document.createElement('div'); card.className = 'photo-card';
        try {
          const url = URL.createObjectURL(await fotografBlob(foto));
          const fotoTarihi = foto.created_at ? new Date(foto.created_at).toLocaleString('tr-TR') : 'Tarih yok';
          card.innerHTML = `<button class="photo-open"><img src="${url}" alt="Denetim fotoğrafı"></button>${fotoSilebilir ? `<button class="photo-remove" aria-label="Fotoğrafı kaldır">×</button>` : ''}${foto.sync_status === 'pending' ? '<span class="photo-pending">Bekliyor</span>' : ''}<div class="photo-meta"><span>${esc(fotoTarihi)}</span><span>${esc(foto.created_by || 'Kullanıcı bilgisi yok')}</span></div>`;
          card.querySelector('.photo-open').onclick = () => window.open(url, '_blank');
          const remove = card.querySelector('.photo-remove');
          // Onaydan sonra ağ isteği (senkron olmuş fotoğraf için) veya RLS
          // reddi başarısız olursa hiçbir hata yakalanmıyordu — kullanıcı
          // "onay verdim ama kaldırmadı" görüyordu, uygulama sessizce
          // duruyordu. Artık her hata toast ile bildiriliyor; senkron
          // olmuş bir fotoğrafı silmek internet gerektirir (offline
          // kuyruklanmaz — bkz. migration 79 D2 kararı), bu da önceden
          // açıkça söyleniyor.
          if (remove) remove.onclick = async () => {
            if (!confirm('Bu fotoğraf kaldırılsın mı?')) return;
            if (foto.sync_status !== 'pending' && !navigator.onLine) {
              toast('Bu fotoğraf zaten sunucuya yüklenmiş — silmek için internet gerekiyor, bağlantı gelince tekrar deneyin');
              return;
            }
            remove.disabled = true;
            try {
              if (foto.sync_status !== 'pending') {
                await fotografDepodanSil(foto.object_path);
                await API.del('denetim_fotograflari', `id=eq.${foto.id}`);
              }
              await DB.del('fotograflar', foto.id);
              tumFotograflar = tumFotograflar.filter(f => f.id !== foto.id);
              await ciz();
            } catch (error) {
              console.error('Fotoğraf kaldırılamadı', error);
              toast('Fotoğraf kaldırılamadı: ' + (error && error.message ? error.message : 'bilinmeyen hata'));
              remove.disabled = false;
            }
          };
        } catch { card.innerHTML = '<div class="photo-error">Fotoğraf çevrimdışı açılamadı</div>'; }
        grid.appendChild(card);
      }
      kategoriler.appendChild(section);
    }
    ov.querySelector('.close').onclick = async () => { ov.remove(); await renderDenetim(); };
    const downloadAll = ov.querySelector('.photo-download-all');
    if (downloadAll) downloadAll.onclick = async () => {
      if (!window.JSZip) { toast('Toplu indirme bileşeni yüklenemedi'); return; }
      const original = downloadAll.textContent;
      downloadAll.disabled = true;
      try {
        const zip = new JSZip();
        for (let i = 0; i < tumFotograflar.length; i += 1) {
          const foto = tumFotograflar[i];
          downloadAll.textContent = `Hazırlanıyor ${i + 1}/${tumFotograflar.length}`;
          const blob = await fotografBlob(foto);
          const tarih = (foto.created_at || new Date().toISOString()).replace(/[:.]/g, '-');
          zip.folder(foto.kategori || 'diger').file(`${String(i + 1).padStart(3, '0')}_${tarih}.jpg`, blob);
        }
        const arsiv = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
        const url = URL.createObjectURL(arsiv);
        const link = document.createElement('a');
        link.href = url;
        const denetim = await DB.get('denetimler', currentDenetimId);
        const arsivKimligi = safeFilePart(denetim?.asansor_seri_no || denetim?.musteri_unvani || currentDenetimId);
        const arsivTarihi = safeFilePart(denetim?.denetim_tarihi || localDateISO());
        link.download = `AVES_${arsivKimligi}_${arsivTarihi}_fotograflar.zip`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
        const indirmeKaydi = await DB.get('denetimler', currentDenetimId);
        if (indirmeKaydi) {
          indirmeKaydi.fotograf_arsiv_son_indirme_at = new Date().toISOString();
          indirmeKaydi.fotograf_arsiv_son_indirme_by = Profile.name || API.email || null;
          indirmeKaydi.updated_at = new Date().toISOString();
          await localWrite('denetimler', indirmeKaydi, 'denetimler');
        }
        toast(`${tumFotograflar.length} fotoğraf arşivlendi`);
        if (Profile.canArchivePhotos && confirm('İndirilen fotoğraf arşivini güvenli bir yerde depoladınız mı? Depoladıysanız sunucudaki kopyaları silebilirim.')) {
          const silinecek = tumFotograflar.length;
          if (confirm(`${silinecek} fotoğrafın sunucu ve cihaz kopyaları kalıcı olarak silinecek. Bu işlem geri alınamaz. Emin misiniz?`)) {
            downloadAll.textContent = `Siliniyor 0/${silinecek}`;
            let silinen = 0;
            let basarisiz = 0;
            for (const foto of [...tumFotograflar]) {
              try {
                if (foto.sync_status !== 'pending') {
                  await fotografDepodanSil(foto.object_path);
                  await API.del('denetim_fotograflari', `id=eq.${foto.id}`);
                }
                await DB.del('fotograflar', foto.id);
                tumFotograflar = tumFotograflar.filter(item => item.id !== foto.id);
                silinen += 1;
              } catch (error) {
                basarisiz += 1;
                console.error('Arşivlenmiş fotoğraf silinemedi', foto.id, error);
              }
              downloadAll.textContent = `Siliniyor ${silinen + basarisiz}/${silinecek}`;
            }
            await fotografOnbellekYenile(currentDenetimId);
            if (!basarisiz && silinen === silinecek) {
              const temizlemeKaydi = await DB.get('denetimler', currentDenetimId);
              if (temizlemeKaydi) {
                temizlemeKaydi.fotograf_arsiv_temizlendi_at = new Date().toISOString();
                temizlemeKaydi.fotograf_arsiv_temizlendi_by = Profile.name || API.email || null;
                temizlemeKaydi.fotograf_arsiv_temizlenen_adet = silinen;
                temizlemeKaydi.updated_at = new Date().toISOString();
                await localWrite('denetimler', temizlemeKaydi, 'denetimler');
              }
            }
            await ciz();
            toast(basarisiz ? `${silinen} fotoğraf silindi · ${basarisiz} kayıt korundu` : `${silinen} fotoğraf güvenle silindi`);
          }
        }
      } catch (error) {
        console.error('Fotoğraf arşivi hazırlanamadı', error);
        toast('Fotoğraf arşivi hazırlanamadı');
      } finally {
        downloadAll.disabled = false;
        downloadAll.textContent = original;
      }
    };
    ov.querySelectorAll('input[type=file]').forEach(input => {
      input.onchange = async () => {
        const files = [...input.files];
        if (!files.length) return;
        const kat = input.dataset.kat;
        toast(`${files.length} fotoğraf hazırlanıyor…`);
        for (const file of files) await fotografKaydet(kat, file);
        await ciz();
      };
    });
    ov.querySelectorAll('.photo-add-camera').forEach(btn => {
      btn.onclick = () => kameraIleFotografCek(btn.dataset.kat);
    });
  };
  document.body.appendChild(ov); await ciz();
}
