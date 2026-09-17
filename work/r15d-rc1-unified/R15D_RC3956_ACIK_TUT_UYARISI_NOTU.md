# R15D-rc3.9.56/57 — "Açık Tut" Uyarısı + Anlık Kayıt Güvencesi (Teslim Notu)

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

## Test

`node work/r15d-rc1-unified/tests/r15d-static-test.mjs` → 367/367 (+3 kontrol).
