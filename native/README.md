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

## Kanıtlanan / kanıtlanacak olan

CI sonucu: [teslim notuna veya PR açıklamasına bakın].

## Bundan sonrası — gerçek dağıtım için gereken (kullanıcı kararı/işlemi)

1. **Apple Developer Program** (yıllık 99$) — TestFlight ile saha ekibine
   dağıtım için zorunlu. Kayıt kullanıcının kendi kimliği/ödemesiyle yapılır.
2. **Google Play Console** (tek seferlik 25$) — Android dahili test kanalı
   için.
3. **Kod imzalama** — iOS için gerçek cihazda çalıştırmak (yalnız simülatör
   değil) provisioning profile + sertifika gerektirir; bu Apple Developer
   kaydından sonraki adım.
4. **SW/PWA temizliği** — native kabukta çalışırken `sw.js` kaydı gereksiz
   (bazı davranışlarda gereksiz yere çakışabilir); `window.Capacitor` tespiti
   ile koşullu hâle getirilmeli. Bu deneme kapsamında yapılmadı.
5. **Native kamera değerlendirmesi** — Capacitor'ın Camera eklentisi,
   mevcut `<input capture>` yerine kullanılabilir; ayrı karar.

Bu klasör hiçbir üretim akışına dahil değildir; production dalına
(`claude/aves-saha-denetim-brief-4x9wxx`) merge edilmeden önce yukarıdaki
kararlar netleşmelidir.
