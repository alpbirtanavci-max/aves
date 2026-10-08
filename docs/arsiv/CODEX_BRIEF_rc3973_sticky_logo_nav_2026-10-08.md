# RC3.9.73 — Denetim ekranından logo ile dönüş

## Amaç

Denetçi uzun bir denetim ekranında aşağıya indikten sonra listenin başına dönmek zorunda kalmadan AVES başlığı/logosu üzerinden denetim listesine dönebilsin. Başlık kaydırma boyunca sabit kalır.

## Uygulanan davranış

- Logo alanı erişilebilir, en az 44 px dokunma yüksekliğine sahip bir düğmeye dönüştürüldü.
- Düğme yalnız açık denetimde etkin; giriş, liste ve yeni denetim ekranlarında devre dışı.
- Logoya basıldığında odaktaki alan blur edilir; madde/seçim ve alan değişikliği yazımları tamamlanmadan denetim listesi açılmaz.
- Kayıt başarısız olursa denetim ekranı korunur ve kullanıcıya tekrar deneme mesajı gösterilir.
- Çıkış sırasında denetim içi etkileşimler kısa süreliğine engellenir. Tamamlanan kayıt sonrasında bekleyen otomatik madde geçişi iptal edilir; listeden geri dönünce beklenmedik ekran yenilemesi olmaz.
- Veritabanı şeması ve mevcut kayıtlar değişmez.

## Değişen alanlar

- `app/index.html`: sabit üst başlık, dokunma alanı ve erişilebilir logo düğmesi.
- `app/app.js`: logo üzerinden listeye dönüş, yazım kuyruğunu bekleme ve hata halinde ekranda kalma.
- `app/manifest.json`, `app/sw.js`: sürüm/cache `R15D-rc3.9.73`.
- Statik regresyon testleri: gezinme, kaydı bekleme ve başarısız çıkışı koruma kontrolleri.

## Doğrulama

- `node --check work/r15d-rc1-unified/app/app.js` başarılı.
- `npm test`: 411/411 kontrol başarılı.
- `git diff --check` başarılı.

## Yayın öncesi cihaz kontrolü

iPhone Safari/PWA'da uzun bir denetim açıp aşağı kaydırın; logo görünür kalmalı. Bir madde açıklaması, ölçüm veya bölüm notu yazıp logoya dokunun. Denetim listesi açılmalı; aynı denetime yeniden girince son değerler korunmalı. Ayrıca yeni denetim ve giriş ekranlarında logonun gezinme düğmesi olarak etkin olmadığını kontrol edin.

Bu değişiklik henüz merge edilmedi veya canlıya alınmadı.
