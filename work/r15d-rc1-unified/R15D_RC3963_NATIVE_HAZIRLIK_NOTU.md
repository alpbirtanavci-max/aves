# R15D-rc3.9.63 — Native Kabuk Farkındalığı (Teslim Notu)

Değerlendirme: iOS'ta "sinyalsiz bölgede kurulu uygulama bile açılmayabiliyor"
sorununun kesin çözümü native uygulama (bkz. `native/README.md` fizibilite
denemesi — Android + iOS ikisi de CI'da başarıyla derlendi). Kullanıcı
Apple Developer hesabından önce **kodun bu tarafını hazırlamamı** istedi.

Bu PR, PWA'nın paylaşılan `app.js`'ini native kabukta (Capacitor) doğru
davranacak hâle getiriyor — DB yok, yalnız app-only.

## Ne değişti

**`isNativeApp()`** — yeni yardımcı fonksiyon: `window.Capacitor &&
window.Capacitor.isNativePlatform()`. Yalnız native kabukta (Capacitor'ın
kendi enjekte ettiği global) `true` döner; normal tarayıcıda/PWA'da
`window.Capacitor` hiç tanımlı olmadığından her zaman `false`.

1. **`registerServiceWorkerWithUpdateChoice()`** — native kabukta Service
   Worker artık hiç kaydedilmiyor. Native'de uygulama kabuğu zaten pakete
   gömülü dosyalardan yükleniyor; SW kaydı hem gereksiz hem Capacitor'ın
   kendi dosya şemasıyla (`capacitor://`) gereksiz yere çakışabilir.
2. **"Sahaya Hazırla" — "Ana ekrana eklenmiş uygulama olarak açık"** —
   native'de otomatik geçer ("Native uygulama olarak çalışıyor — en
   güvenilir mod"). Önceki kontrol yalnız PWA sinyallerine
   (`display-mode: standalone`, `navigator.standalone`) bakıyordu; bunlar
   native kabukta anlamlı değil, yanlışlıkla "kurulu değil" gösterirdi —
   halbuki native native'in ta kendisi kurulum sinyalinden daha güvenilir.
3. **"Sahaya Hazırla" — "Uygulama ve gerekli görseller çevrimdışı hazır"**
   — native'de `caches.match` kontrolü atlanıp otomatik geçiyor. Native
   kabukta Cache Storage/Service Worker hiç kullanılmadığından bu kontrol
   her zaman boş dönüp yanlışlıkla "hazır değil" gösterirdi; oysa native'de
   varlıklar zaten paketin içinde, kontrol edilecek bir şey yok.

## Neden şimdi (hesap çıkmadan)

Kod tarafı hesaptan bağımsız — Apple Developer/Google Play hesabı yalnız
imzalama ve mağaza dağıtımı için gerekiyor. Bu değişiklikler şimdiden
`claude/aves-saha-denetim-brief-4x9wxx`'e (PWA'nın canlı kaynağı) girip
test edilebilir; native kabuk hangi gün devreye alınırsa alınsın, `app.js`
o günü beklemeden hazır olur.

## Test

`node work/r15d-rc1-unified/tests/r15d-static-test.mjs` → 378/378 (+1 kontrol).
`node --check app/app.js` başarılı.

## Ayrıca (bu PR'a dahil değil, `native/` dalında yapıldı)

- Android'e kamera izni (`CAMERA` + donanım feature'ları) — `getUserMedia`
  izinsiz çalışmaz.
- iOS CI workflow'una `NSCameraUsageDescription`/`NSMicrophoneUsageDescription`
  Info.plist enjeksiyonu (`ios/` her CI koşusunda tazeden üretildiği için
  kalıcı değil, adım olarak eklendi).
- AVES marka ikonu + açılış ekranı (`icon-512.png` kaynağından
  `@capacitor/assets` ile üretildi) — hem Android hem iOS'ta CI'da
  doğrulandı, güncel APK kullanıcıya gönderildi.
