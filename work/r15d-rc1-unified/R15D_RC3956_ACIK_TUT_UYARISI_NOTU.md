# R15D-rc3.9.56/57/58 — "Açık Tut" Uyarısı + Senkron Taslak Günlüğü (Teslim Notu)

PR #25'in (rc3.9.55) merge'inden hemen sonra, kullanıcının kendi iPhone'unda
yaptığı test PR #25'teki bilinçli sınırı somut biçimde doğruladı:

- Ana ekrana kurulu AVES **açık tutularak** internet kesilirse → denetime
  sorunsuz devam edilebiliyor (JS zaten çalışıyor, IndexedDB'den okuyup
  yazıyor, ağa/Service Worker'a hiç ihtiyaç yok).
- Aynı cihazda uygulama **tamamen kapatılıp** internet kesikken yeniden
  açılmaya çalışılırsa → denetim açılmıyor.

Bu, Codex'in PR #25 incelemesinde işaret ettiği WebKit kısıtının doğrudan
sahada gözlemlenmiş hâli: kurulum (Ana Ekrana Ekle) çevrimdışı soğuk açılışı
**garanti etmiyor**, yalnız riski azaltıyor. Kullanıcının testi, tek gerçek
güvenilir yolu da gösterdi: **uygulamayı kapatmamak**.

## Ne değişti (app-only, DB yok)

**`app/app.js`** `sahayaHazirlikSonucuGoster()` — "Çevrimdışı çalışmaya
hazır" sonuç ekranındaki metin düzeltildi:

- Eski, yanıltıcı cümle kaldırıldı: *"Bu denetim bu cihazda internet
  olmadan açılıp tamamlanabilir."* (Bu, yalnız uygulama açık kalırsa
  doğrudur — cümle bunu belirtmiyordu.)
- Yeni uyarı eklendi: **"Sinyalsiz bölgeye girmeden önce uygulamayı açın ve
  kapatmayın."** Açık/arka planda kalan uygulamanın sorunsuz çalıştığı,
  ama tamamen kapatılmış bir uygulamanın — ana ekrana eklenmiş olsa bile —
  sinyalsiz bir yerde yeniden açılmasının garanti olmadığı açıkça yazıldı.

## Saha prosedürü — güncellenmiş öncelik sırası

1. **En güvenilir: uygulamayı sinyal varken açın ve kapatmadan sinyalsiz
   bölgeye girin.** Arka plana atmak sorun değil (görev listesinden
   *atmamak* kaydıyla); tamamen kapatmayın.
2. Ana ekrana kurulum + soğuk-açılış testi (PR #25) hâlâ geçerli ve
   yapılmalı — ama bu 1. maddenin **yerine değil, ek güvence** olarak.
3. "Sahaya Hazırla" yeşil onayı yalnız cihazdaki verinin/önbelleğin o an
   dolu olduğunu doğrular; uygulamanın sinyalsiz yeniden açılacağını değil.

## rc3.9.57 eki — uyarı yeterli değil, kod tarafında da kapatılan bir açık

Kullanıcı haklı olarak itiraz etti: bir uyarı metni "denetçi yanlışlıkla
kapatabilir / telefon donabilir / kamera için sayfadan çıkarken tekrar
açılmayabilir" gerçeğini değiştirmez. Bunu iki gerçek koddan kaynaklanan
riske ayırdık:

1. **Kesin kod açığı, düzeltildi:** Odaktaki bir yazı alanında (açıklama,
   ölçüm değeri) 700ms'lik yazım gecikmesi dolmadan uygulama arka plana
   alınırsa/kapatılırsa hiçbir dinleyici bunu yakalamıyordu — o alan
   kaybolabilirdi. `app.js`'e `visibilitychange` (`hidden`) ve `pagehide`
   dinleyicileri eklendi; ikisi de `UI.flushPendingEdits()` (mevcut
   `flushEditorWrites()`, artık dışa açık) çağırıp odaktaki alanı `blur()`
   ile tetikleyerek **anında** (700ms beklemeden) kaydeder. Fotoğraflar
   zaten çekildikleri an `DB.put` ile IndexedDB'ye yazılıyordu, bu değişmedi.
2. **Platform kısıtı, kodla tam kapatılamıyor:** Uygulamanın **hiç
   açılmaması** (soğuk çevrimdışı başlangıç) WebKit'e özgü bir sınır;
   rc3.9.55/56'daki kurulum + "açık tut" önerileri riski azaltır ama sıfıra
   indirmez. Bunun tek kesin çözümü web teknolojisinin dışında (native
   uygulama kabuğu) — ayrı, büyük bir girişim gerektirir, bu PR'ın kapsamı
   dışında. Kamera çekimi için native kamera uygulamasına geçmenin
   (`capture="environment"`) sayfayı arka plana attığı ve bu riski
   büyüttüğü ayrıca tespit edildi; uygulama içi kamera (getUserMedia)
   alternatifi görüntü kalitesi/güvenlik dengesi gerektirdiğinden ayrı bir
   karar olarak değerlendiriliyor.

## rc3.9.58 eki — Codex incelemesi: rc3.9.57 yetersizdi

Kullanıcı rc3.9.56/57'yi Codex'e ilettikten sonra gelen inceleme, rc3.9.57'nin
"koruma iyileştirmesi" olduğunu ama tek başına yeterli bir güvenilirlik
standardı olmadığını doğru şekilde tespit etti. Dört somut bulgu, dördü de
kabul edilip düzeltildi:

1. **`data-bolumnot` (Bölüm açıklaması) kapsam dışıydı — doğru.** rc3.9.57'nin
   `flushEditorWrites()`'ı yalnız `data-diger/aciklama/olcum-id` alanlarını
   blur ediyordu; bölüm açıklaması hiçbir debounce/draft mekanizmasına da
   girmiyordu (yalnız `change`/blur'da doğrudan yazılıyordu). Artık dahil.
2. **IndexedDB yazımı asenkron, `pagehide`/`visibilitychange` tamamlanmayı
   garanti etmez — doğru.** Bunun tek gerçek çözümü **senkron** bir yazma
   yoludur. `localStorage.setItem` senkrondur; artık her tuş vuruşunda
   (debounce beklemeden) odaktaki alanın değeri oraya da yazılıyor
   (`taslakYaz`). Yaşam-döngüsü dinleyicileri (rc3.9.57) artık ana mekanizma
   değil, ek bir güvence.
3. **367/367 yalnız metin varlığını doğruluyor, gerçek cihaz senaryosunu
   test etmiyor — doğru, hâlâ öyle.** Bu proje app.js için DOM/IndexedDB'siz
   bir davranış test harness'i kurmuyor (bkz. `tests/r15d-static-test.mjs`
   mimarisi); otomatik test yalnız kodun *varlığını* doğrular. Gerçek
   doğrulama, aşağıdaki **zorunlu cihaz testi**yle yapılmalıdır.
4. **Uygulama içi kamera kök çözüm değil, katkı sağlar — doğru, henüz
   yapılmadı.** Kullanıcıyla görüntü kalitesi/güvenlik dengesi ayrıca karara
   bağlanacak (bu PR'da yok).

### Nasıl çalışır — senkron taslak günlüğü

- `taslakAnahtari(target)`: `data-bolumnot` → `bolum:<ad>`; `data-olcum-id` →
  `saha:<rowId>:olcum:<id>`; `data-diger`/`data-aciklama` → `saha:<rowId>:<alan>`.
- `taslakYaz(target)`: her `input` olayında `localStorage['aves_taslak_<denetimId>']`
  içine `{key: {value, ts}}` yazar — senkron, IndexedDB'yi beklemez.
- `taslakSil(target)`: değer IndexedDB'ye durduğunda (4 commit noktası: bölüm
  notu, ölçüm, diğer bulgu, açıklama) o anahtarı günlükten siler.
- `taslaklariKurtar(denetimId)` / `taslaklariTaraVeKurtar()`: uygulama her
  açılışında (girişten önce) `aves_taslak_*` anahtarlarını tarar, her birini
  ilgili `denetimler`/`saha_kontrol` kaydına `localWrite` ile uygular, günlüğü
  temizler; kurtarma olduysa toast gösterir.
- `localStorage` dolu/kapalı olsa bile best-effort'tur (`try/catch`); IndexedDB
  hâlâ asıl kayıt kaynağıdır, bu yalnız ek bir güvence katmanıdır.

### Zorunlu cihaz testi (bu PR'ın kabul kriteri — otomatik test yerine geçmez)

Codex'in önerdiği gerçek senaryo; sandbox'tan fiziksel cihaza erişim olmadığı
için **kullanıcı tarafından çalıştırılıp sonucu bildirilmelidir**:

1. Ana ekran ikonundan uygulamayı aç, bir madde açıklamasına/ölçüm alanına
   yaz — **odağı hiç değiştirmeden** (blur etmeden).
2. Uygulamayı görev listesinden tamamen kapat (force-quit).
3. Uçak modunu aç.
4. Uygulamayı ikondan tekrar aç.
5. Aynı denetime gir, aynı maddeye git: yazdığın son değer orada mı? "N
   kaydedilmemiş değişiklik kurtarıldı" bildirimini gördün mü?
6. Ayrıca: bir kategoride "Fotoğraf ekle" ile native kamerayı aç, birkaç
   saniye bekle, çek, geri dön — sayfa sorunsuz mu devam ediyor, yoksa
   yeniden mi yükleniyor? (Bu, uygulama içi kamera kararını etkiler.)

## Test

`node work/r15d-rc1-unified/tests/r15d-static-test.mjs` → 369/369 (+7 kontrol, DB değişikliği yok).
