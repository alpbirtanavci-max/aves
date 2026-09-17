# R15D-rc3.9.56–61 — "Açık Tut" Uyarısı + Senkron Taslak Günlüğü + Uygulama İçi Kamera (Teslim Notu)

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

## rc3.9.59 eki — Codex incelemesi: rc3.9.58'in taslak günlüğünde 3 P1 hatası

Kullanıcı rc3.9.58'i Codex'e ilettikten sonra gelen ikinci inceleme, taslak
günlüğü fikrinin doğru yönde olduğunu ama üç veri güveni hatası taşıdığını
tespit etti. Üçü de kabul edilip düzeltildi:

1. **Kurtarma başarısız olsa bile tüm günlük siliniyordu — doğru, P1.**
   `taslaklariKurtar()` artık yalnız **başarıyla uygulanan** (veya zaten
   güncel olduğu için uygulanacak bir şeyi kalmayan) anahtarları günlükten
   çıkarır; bir `localWrite` hata verirse (ör. yerel veritabanı geçici
   olarak açılamazsa) o anahtar **cihazda kalır** ve bir sonraki açılışta
   yeniden denenir.
2. **Eski bir 700ms kaydı bitince yeni taslağı silebiliyordu — doğru, P1.**
   Artık her taslak kendi zaman damgasını (`ts`) taşıyor. Bir input olayı
   hem `taslakYaz(target, ts)` hem `scheduleEditorDraft(target, ts)`'i AYNI
   `ts` ile çağırıyor; 700ms sonra yazım bitince `taslakSilEger(target,
   snapshot.ts)` yalnız günlükteki taslağın damgası **kendi damgasına eşit
   veya öncesiyse** siler. Bu süre içinde yeni bir tuş vuruşu geldiyse
   (daha yeni `ts`), o taslak dokunulmadan kalır — kendi 700ms döngüsü onu
   ayrıca işleyecektir.
3. **Kurtarma oturum yüklenmeden, kimlik doğrulanmadan yapılıyordu — doğru,
   P1.** Artık her taslak yazıldığı andaki oturum e-postasıyla
   (`ownerEmail: normEmail(API.email)`) damgalanıyor. `taslaklariTaraVeKurtar
   (ownerEmail)` boot sırasında `API.loadSession()` + `if (API.loggedIn)`
   bloğunun İÇİNDE, `API.email` ile çağrılıyor; kimlik yoksa (`!ownerEmail`)
   hiçbir şey uygulanmaz. `taslaklariKurtar()` içinde her taslağın
   `ownerEmail`'i güncel oturumla eşleşmiyorsa o taslak **dokunulmadan**
   cihazda kalır — ortak cihazda önceki kullanıcının taslağı asla başka bir
   hesaba otomatik uygulanmaz.

Statik test: 3 düzeltme de ayrı ayrı doğrulanıyor (#2, #3, #4 numaralı
Codex testleri). 371/371.

## rc3.9.60 eki — uygulama içi kamera + kâğıt yedek prosedürü

Kullanıcı gerçek saha akışını hatırlattı: denetçi sinyalsiz bölgede sadece
AVES'i değil, telefonu genel amaçlı kullanıyor — fotoğraf/video çekiyor,
standart dokümanına bakıyor, mesaj/arama alıyor. "Uygulamayı açık tutup
telefona dokunmayın" talebi bu yüzden **gerçekçi değil**; asıl hedef,
AVES'in **kendi kendine** sebep olduğu arka-plana-atılmaları en aza indirmek.

- **Uygulama içi kamera** (`getUserMedia`): "Fotoğraf ekle" artık native
  kamera uygulamasını açmıyor (`capture="environment"` kaldırıldı).
  Sayfadan hiç çıkılmadan, canlı kamera görüntüsü üzerinden çekim yapılıyor
  — bu, AVES'i tamamen arka plana atıp iOS'ta bellek baskısı altında
  kapanma riskini büyüten en sık tekrarlanan tetikleyiciyi ortadan
  kaldırıyor. Çözünürlük native kameradan düşük olabilir ama mevcut
  `fotografSikistir` zaten her fotoğrafı 1600px'e indirip %82 kalitede
  sıkıştırdığından pratik fark küçük.
  - "🖼 Galeriden ekle" ayrı bir seçenek olarak kaldı (mevcut/önceden
    çekilmiş fotoğraflar için).
  - Her iki yol da aynı ortak `fotografKaydet()` işlevini kullanıyor.
- **Video çekimi** kapsam dışı bırakıldı — uygulama içi video kaydı
  (MediaRecorder) teknik olarak daha ağır ve kalite/güvenilirlik dengesi
  daha belirsiz; native kamerada kalıyor.
- **Kâğıt yedek prosedürü** (kullanıcı kararı — "3 numaralı seçenek"):
  `docs/SAHA_PROSEDURU_SINYALSIZ_YEDEK.md` — düşük teknoloji okuryazarlığına
  uygun, sade dilde, "uygulama açılmazsa ne yapılır" adımları. Bu bir kod
  değişikliği değil, **kurumsal prosedür**; mühendislik bu riski tamamen
  gideremediği için (native uygulama + Apple Developer 99$/yıl bütçesi
  onaylanana kadar) telafi edici kontrol olarak eklendi.
- Hazırlık sonucu ekranına ("Sahaya Hazırla") kısa bir yönlendirme satırı
  eklendi: "Uygulama hiç açılmazsa: panik yapmayın, veri kaybolmaz. Kurumun
  kâğıt yedek prosedürünü izleyin."

**Önemli — dürüst sınır:** Bu değişiklikler riski **azaltır**, iOS'ta
**gidermez**. Tam giderme yalnız native uygulama (bkz. `native/README.md`
fizibilite denemesi) + Apple Developer Program ile mümkün; bu bütçe kararı
netleşene kadar kâğıt yedek prosedürü fiilen zorunlu telafi edici kontroldür.

## rc3.9.61 eki — fotoğraf silme sessizce başarısız oluyordu

Kullanıcı yeni uygulama içi kamerayı denerken bir fotoğrafı "×" ile
kaldırmaya çalıştı, onay verdi, ama fotoğraf kaldırılmadı — hiçbir hata
mesajı da görmedi. Kök neden: senkron olmuş bir fotoğrafı silmek sunucuya
istek (Storage DELETE + tablo DELETE) atıyor; bu istek ağ hatası, RLS reddi
veya (kullanıcının o sırada test ettiği) çevrimdışılık yüzünden başarısız
olursa **hiçbir `catch` yoktu** — fonksiyon sessizce reddoluyor, kullanıcı
hiçbir şey görmüyordu.

Düzeltme:
- Senkron olmuş bir fotoğrafı silmeye çalışırken **çevrimdışıysa**, ağ
  isteğini hiç denemeden önce açık bir mesaj gösteriliyor: "Bu fotoğraf
  zaten sunucuya yüklenmiş — silmek için internet gerekiyor, bağlantı
  gelince tekrar deneyin." (Bu, migration 79 D2 kararıyla tutarlı: fotoğraf
  silme offline kuyruklanmaz, kasıtlı olarak.)
- Diğer tüm hatalar (RLS reddi, sunucu hatası vb.) artık `catch` ile
  yakalanıp toast ile bildiriliyor; düğme işlem sırasında devre dışı
  bırakılıp hata olursa tekrar etkinleştiriliyor.

## Test

`node work/r15d-rc1-unified/tests/r15d-static-test.mjs` → 375/375 (+13 kontrol, DB değişikliği yok).
