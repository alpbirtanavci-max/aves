# AVES Saha — Native Kabuk Fizibilite Denemesi

**Durum: DENEME, üretim değil.** Bu klasör, sahada "sinyalsiz bölgede uygulama
hiç açılmıyor" sorununu (bkz. `docs/degerlendirme/` ve
`work/r15d-rc1-unified/R15D_RC3956_ACIK_TUT_UYARISI_NOTU.md`) kökten çözüp
çözemeyeceğimizi kanıtlamak için [Capacitor](https://capacitorjs.com) ile
mevcut web uygulamasını (`work/r15d-rc1-unified/app`, **hiç değiştirilmeden**)
bir native kabuğa sarmalıyor.

## Neden bu kökten çözer

PWA'da (mevcut yaklaşım) uygulama kabuğu (index.html/app.js/...) tarayıcının
Service Worker'ı + Cache Storage'ı üzerinden servis edilir; iOS Safari'nin
bunları temizleyebildiği/soğuk-başlangıçta devreye giremeyebildiği bilinen bir
platform kısıtı var (bkz. teslim notu). Native kabukta aynı dosyalar
**doğrudan uygulama paketinin içinden** (ağ/Service Worker'a hiç
uğramadan) yüklenir — bu adım tamamen ortadan kalkar.

**Değişmeyen:** Denetim verisi/senkron mantığı (IndexedDB + outbox) zaten
aynı web kodunda çalışıyor, dokunulmadı. Telefonun donması native'de de
çözülmez — bu donanım/işletim sistemi sorunu.

## Bu denemede ne yapıldı

- `native/capacitor.config.json` — `webDir` doğrudan
  `../work/r15d-rc1-unified/app`'i gösteriyor; ayrı bir kopya tutulmuyor,
  `cap sync` her seferinde oradan taze kopyalar.
- `native/android/` — Capacitor'ın ürettiği Android Gradle projesi (git'e
  eklendi; kopyalanan web varlıkları ve derleme çıktıları `.gitignore`'da).
- `.github/workflows/native-android-spike.yml` — GitHub Actions'ta (yerel
  Android SDK gerekmeden) gerçek bir debug APK derler.
- `.github/workflows/native-ios-spike.yml` — GitHub Actions'ın macOS
  runner'ında (gerçek Xcode ile) iOS platformunu `cap add ios` ile üretip
  **imzasız simülatör derlemesi** yapar (Apple Developer hesabı gerekmez).
  `ios/` klasörü bu yüzden git'e eklenmedi — her CI çalışmasında tazeden
  üretiliyor.

Bu iki workflow yalnız `claude/native-feasibility-spike` dalında ve elle
tetiklemede (`workflow_dispatch`) çalışır; production CI zincirini
etkilemez.

## ⚠️ Senkronizasyon kuralı (Codex incelemesi, PR #27 sonrası — zorunlu)

`webDir` doğrudan `../work/r15d-rc1-unified/app`'i gösterdiği için ayrı bir
kopya YOK — ama bu yalnız bu dal (`claude/native-feasibility-spike`) o
klasörün **o anki production sürümüyle birebir aynı commit'ini** taşıyorsa
doğru. Bu dal production'dan (`claude/aves-saha-denetim-brief-4x9wxx`) geri
kalırsa (bir PR orada merge edilip burada rebase edilmezse), paketlenen APK
**sessizce eskir** — tam olarak bu oldu: PR #27 (rc3.9.63, `isNativeApp()`)
production'a merge edildikten sonra bu dal senkronlanmadan APK derlenirse,
o APK hâlâ eski sürümü taşır.

Bu yüzden her iki workflow'a da **zorunlu bir doğrulama adımı** eklendi:
derleme başlamadan önce `work/r15d-rc1-unified/app`'in production'daki
hâliyle `git diff --quiet` ile birebir eşleştiği kontrol edilir; eşleşmezse
derleme **kırmızı** olur (önce bu dalı production'a merge/rebase etmeden
APK üretilemez). Derleme sonunda ayrıca paketlenen `app.js`'in
`APP_VERSION`'ı ve SHA-256 hash'i loglanır — hangi APK'nın hangi web
sürümünü taşıdığı her zaman denetlenebilir.

**Yeni bir APK istemeden önce:** bu dalı production'a senkronlayın
(`git merge origin/claude/aves-saha-denetim-brief-4x9wxx`), push edin,
CI'ın "Web kaynağının production ile eş olduğunu doğrula" adımının yeşil
geçtiğini görün — ancak o zaman derlenen APK güncel demektir.

## Zorunlu gerçek cihaz test protokolü (Codex, saha dağıtımından önce)

Bu, PWA için tanımlanan cihaz testinin native karşılığı — otomatik testin
yerine geçmez, sandbox'tan fiziksel cihaza erişim olmadığı için **kullanıcı
tarafından gerçek bir Android telefonda çalıştırılmalı**:

1. Uygulamayı (native ikon üzerinden) aç.
2. Bir denetimde veriyi cihazda hazırla (birkaç madde doldur).
3. Uygulamayı görev listesinden tamamen kapat.
4. Uçak modunu aç.
5. Native ikon üzerinden yeniden aç.
6. Denetime ve fotoğraf ekranına eriş.
7. Fotoğraf çek, bir madde açıklaması yaz, uygulamayı tekrar kapat/aç.
8. Verilerin ve fotoğrafların cihazda kaldığını doğrula.

Bu protokol geçmeden native paket "saha dağıtımına hazır" kabul edilmez.

## Kanıtlanan / kanıtlanacak olan

CI sonucu: [teslim notuna veya PR açıklamasına bakın]. **Not:** CI'da
derlemenin başarılı olması yalnız "paket derlenebiliyor" demektir — yukarıdaki
8 adımlık cihaz testi ayrı ve zorunludur.

## Bundan sonrası — gerçek dağıtım için gereken (kullanıcı kararı/işlemi)

1. **Apple Developer Program** (yıllık 99$) — TestFlight ile saha ekibine
   dağıtım için zorunlu. Kayıt kullanıcının kendi kimliği/ödemesiyle yapılır.
2. **Google Play Console** (tek seferlik 25$) — Android dahili test kanalı
   için.
3. **Kod imzalama** — iOS için gerçek cihazda çalıştırmak (yalnız simülatör
   değil) provisioning profile + sertifika gerektirir; bu Apple Developer
   kaydından sonraki adım.
4. ~~**SW/PWA temizliği**~~ — **YAPILDI** (PR #27, rc3.9.63): `isNativeApp()`
   ile native'de SW kaydı hiç yapılmıyor, "Sahaya Hazırla" kontrolleri
   native'de yanlış uyarı vermiyor. Bu dalın production'a senkron kalması
   şart (yukarıya bakın).
5. **Native kamera değerlendirmesi** — Capacitor'ın Camera eklentisi,
   mevcut `getUserMedia` yerine kullanılabilir; ayrı karar (şu anki
   getUserMedia yaklaşımı zaten native'de de çalışıyor, izinler tanımlı).

Bu klasör hiçbir üretim akışına dahil değildir; production dalına
(`claude/aves-saha-denetim-brief-4x9wxx`) merge edilmeden önce yukarıdaki
kararlar netleşmelidir.
