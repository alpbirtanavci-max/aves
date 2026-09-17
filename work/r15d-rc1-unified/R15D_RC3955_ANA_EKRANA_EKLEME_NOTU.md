# R15D-rc3.9.55 — Ana Ekrana Ekleme Uyarısı (Teslim Notu)

Sahada yaşanan gerçek olay: telefonda "Sahaya Hazırla" yeşil onay vermişti,
uygulama daha önce de o cihazda açılmıştı; ama sinyalsiz kuyu dibinde Safari
sekmesi yeniden açılmaya çalışıldığında site **hiç açılmadı** — Safari kendi
"İnternete bağlı değilsiniz" sayfasını gösterdi, AVES'in çevrimdışı Service
Worker'ı hiç devreye girmedi.

## Olası/kuvvetli etken (kesin kök neden değil)

Uygulama, iPhone'da Safari **adres çubuğu/yer imiyle** açılıyordu — "Ana
Ekrana Ekle" ile kurulmamıştı. Bu, Codex incelemesinde de doğrulanan bilinen
bir WebKit davranışıyla örtüşüyor: Service Worker ve önbellek kayıtları
WebKit tarafından temizlenebilir, ve bu yalnız kurulu olmayan sekmelerle
sınırlı değil — Ana Ekrana Ekle ile kurulmuş uygulamalarda da çevrimdışı
açılış hatası bildirilmiştir (bkz. WebKit blog ve bugs.webkit.org #225083).
Bu nedenle "kurulu mod" olayı **kesin açıklamıyor**, yalnızca açılış
bağlamını (sekme vs. bağımsız pencere) doğruluyor; Service Worker kaydının
veya önbelleğin o an hâlâ mevcut olduğunu kanıtlamıyor. "Sahaya Hazırla"
kontrolü o anki önbellek durumunu doğru söylüyordu; sorun muhtemelen
aradan geçen sürede (kuyu dibine inişte) tarayıcının bu kayıtları temizlemiş
olmasıydı — kurulu olmayan sekmelerde bu daha sık görülür, ama garantili
tek etken bu değildir.

## Ne değişti (app-only, DB yok)

**`app/app.js`** `sahayaHazirla()` — yeni advisory (hazırlığı engellemeyen)
kontrol satırı: `Ana ekrana eklenmiş uygulama olarak açık`.
`window.matchMedia('(display-mode: standalone)')` — Android Chrome dahil her
tarayıcıda çalışır — veya iOS'a özgü `window.navigator.standalone` ile kurulu
mod tespit edilir; kurulu değilse kontrol "Sahaya Hazırla" ekranında sarı
görünür ve **platforma göre doğru kurulum yolunu** anlatır: iOS'ta "Safari'de
Paylaş simgesi → Ana Ekrana Ekle", diğerlerinde "Tarayıcı menüsü (⋮) → Ana
ekrana ekle / Uygulamayı yükle" (Android Chrome'da "Paylaş" bu işi yapmaz).

**`app/index.html`** — iOS'un web app manifest'i tam desteklememesi nedeniyle
eklenen 4 etiket: `apple-mobile-web-app-capable`,
`apple-mobile-web-app-status-bar-style`, `apple-mobile-web-app-title`,
`apple-touch-icon`. Bunlar olmadan "Ana Ekrana Ekle" ekran görüntüsünü ikon
yapar ve durum çubuğunu Safari rengiyle bırakır — kurulumu daha az "gerçek
uygulama" gibi hissettirir.

## Kapsam dışı — bilinçli karar

Kontrol **advisory**'dir, "hazır" işaretini engellemez (persist izni kontrolü
gibi). Zorunlu kılmak, mevcut kurulu-olmayan-sekme kullanıcılarını aniden
"hazır değil" durumuna düşürürdü. Amaç: riski **azaltmak** ve görünür
kılmak — hiçbir kurulum yolu çevrimdışı açılışı %100 garanti etmez (WebKit
kurulu uygulamalarda da hata bildiriyor); bu yüzden "önler" değil "riski
azaltır" ifadesi kullanılıyor.

## Saha prosedürü (kod dışı, bugün uygulanabilir — iPhone ve Android)

1. Tüm saha telefonlarında (iPhone **ve Android**) AVES ana ekrana kurulmalı;
   bundan sonra yalnız o ikondan açılmalı, adres çubuğundan/yer iminden değil.
2. Sinyalsiz bölgeye inmeden önce "Sahaya Hazırla" kontrolünde bu yeni satırın
   da yeşil olduğu doğrulanmalı.
3. **Gerçek soğuk-açılış testi** (Codex önerisi, bunu doğrulamanın tek
   güvenilir yolu): ana ekran ikonundan uygulamayı aç, **uçak modunu aç**,
   uygulamayı tamamen kapat (görev yöneticisinden kaldır), **uçak modu
   açıkken** ikondan tekrar aç. Açılıyorsa o cihaz o an için hazır demektir —
   ama bu tek seferlik bir doğrulamadır, her saha çıkışında tekrarlanmalıdır;
   geçmişte açılmış olması gelecekte açılacağını garanti etmez.

Android'de risk iOS kadar sık görülmez (Chrome'un Service Worker
soğuk-başlangıç davranışı daha güvenilir) ama veri temizleme veya bellek
baskısı altında aynı risk oluşabilir — kurulum önerisi ve soğuk-açılış testi
her iki platform için de geçerli.

## Test

`node work/r15d-rc1-unified/tests/r15d-static-test.mjs` → 365/365 (+4 kontrol).
