# R15D-rc3.9.55 — Ana Ekrana Ekleme Uyarısı (Teslim Notu)

Sahada yaşanan gerçek olay: telefonda "Sahaya Hazırla" yeşil onay vermişti,
uygulama daha önce de o cihazda açılmıştı; ama sinyalsiz kuyu dibinde Safari
sekmesi yeniden açılmaya çalışıldığında site **hiç açılmadı** — Safari kendi
"İnternete bağlı değilsiniz" sayfasını gösterdi, AVES'in çevrimdışı Service
Worker'ı hiç devreye girmedi.

## Kök neden

Uygulama, iPhone'da Safari **adres çubuğu/yer imiyle** açılıyordu — "Ana
Ekrana Ekle" ile kurulmamıştı. Kurulu olmayan bir Safari sekmesi, önbellek
dolu olsa bile, sinyalin tamamen kesildiği bir cihazda soğuk başlangıçta
(sekme kapanıp yeniden açıldığında) Service Worker'ın güvenilir şekilde
devreye girdiğini garanti etmez — bu iOS/WebKit'e özgü bir kısıt, AVES kod
hatası değil. "Sahaya Hazırla" önbelleğin dolu olduğunu doğru söylüyordu;
eksik olan, tarayıcı sekmesinin süreç/ömür güvencesiydi.

## Ne değişti (app-only, DB yok)

**`app/app.js`** `sahayaHazirla()` — yeni advisory (hazırlığı engellemeyen)
kontrol satırı: `Ana ekrana eklenmiş uygulama olarak açık`.
`window.matchMedia('(display-mode: standalone)')` veya iOS'a özgü
`window.navigator.standalone` ile kurulu mod tespit edilir; kurulu değilse
kontrol "Sahaya Hazırla" ekranında sarı görünür ve kurulum yolunu anlatır
(Paylaş → Ana Ekrana Ekle).

**`app/index.html`** — iOS'un web app manifest'i tam desteklememesi nedeniyle
eklenen 4 etiket: `apple-mobile-web-app-capable`,
`apple-mobile-web-app-status-bar-style`, `apple-mobile-web-app-title`,
`apple-touch-icon`. Bunlar olmadan "Ana Ekrana Ekle" ekran görüntüsünü ikon
yapar ve durum çubuğunu Safari rengiyle bırakır — kurulumu daha az "gerçek
uygulama" gibi hissettirir.

## Kapsam dışı — bilinçli karar

Kontrol **advisory**'dir, "hazır" işaretini engellemez (persist izni kontrolü
gibi). Zorunlu kılmak, mevcut kurulu-olmayan-sekme kullanıcılarını aniden
"hazır değil" durumuna düşürürdü. Amaç: riski görünür kılmak, saha
prosedürüne "Ana Ekrana Ekle" adımını eklemek — zorlama değil.

## Saha prosedürü (kod dışı, bugün uygulanabilir)

Tüm saha telefonlarında AVES, Safari paylaş menüsünden **Ana Ekrana Ekle**
ile kurulmalı; bundan sonra yalnız o ana ekran ikonundan açılmalı (adres
çubuğundan değil). Sinyalsiz bölgeye inmeden önce "Sahaya Hazırla"
kontrolünde bu yeni satırın da yeşil olduğu doğrulanmalı.

## Test

`node work/r15d-rc1-unified/tests/r15d-static-test.mjs` → 364/364 (+3 kontrol).
