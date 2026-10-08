# RC3.9.74 — AVES Saha yalnız Modül G

## Amaç

AVES Saha uygulamasını yalnız Modül G saha kontrolü için tutmak. Modül B, E ve H1 formları ayrı Form Doldurucu programında hazırlanacak. G checklist akışı mevcut haliyle sürer; uygulamadaki ek “Denetim Formu” veri giriş özelliği kapatılır.

## Uygulanan davranış

- Yeni denetim ekranında modül seçimi yok; kapsam sabit olarak “Modül G — Birim Doğrulaması”.
- TS EN 81-20 ve TS EN 81-1/2+A3 seçimi yalnız bu G akışında kalır. Yeni denetim, onay ve oluşturma fonksiyonlarında profil Modül G değilse işlem reddedilir.
- Eski B/E/H1 kayıtları silinmez. Listede kilitli açıklama kartı olarak görünür; açma, düzenleme, devam etme ve takip oluşturma akışına alınmaz.
- Toplu çevrimdışı hazırlık rozeti yalnız Modül G kayıtlarını sayar.
- Ayrı “Denetim Formu” giriş ekranı ve form seti göstergeleri kapatıldı. FR.38/39 saha checklisti, seri numarası, fotoğraf, çevrimdışı çalışma ve Modül G için resmî PDF/Word çıktısı korunur.
- Tarihsel form JSON alanları, eski kayıtlar ve bunların senkron/veri kurtarma uyumluluğu korunur; kayıt silme veya migration yoktur.

## Değişen alanlar

- `work/r15d-rc1-unified/app/app.js`: G-only oluşturma ve açma kapıları; eski B/E/H1 kayıtlarını kilitleme; form girişini kapatma.
- `work/r15d-rc1-unified/app/index.html`: kapsam duyurusu ve kilitli eski kayıt stili.
- `work/r15d-rc1-unified/app/manifest.json`, `app/sw.js`: sürüm/cache `R15D-rc3.9.74`.
- `work/r15d-rc1-unified/tests/r15d-static-test.mjs`: G-only akış, eski kayıt koruması ve form özelliği regresyon testleri.

## Doğrulama

- `node --check work/r15d-rc1-unified/app/app.js` başarılı.
- `node --check work/r15d-rc1-unified/app/denetim-form-setleri.js` başarılı.
- `npm test`: 409/409 kontrol başarılı.
- `git diff --check` başarılı.

## Yayın durumu

Bu değişiklik PR #32 kapsamına eklenecek; henüz merge edilmedi veya canlıya alınmadı. Yayın öncesi cihaz kontrolünde yeni G denetimi başlatılıp iki ana standart seçeneği, checklist maddelerinin üretimi, eski B/E/H1 kartlarının devre dışı olması ve G form girişinin görünmemesi kontrol edilmelidir.
