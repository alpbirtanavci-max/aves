# R15D-rc3.9.56 — "Açık Tut" Uyarısı (Teslim Notu)

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

## Test

`node work/r15d-rc1-unified/tests/r15d-static-test.mjs` → 366/366 (+2 kontrol).
