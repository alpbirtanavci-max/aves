# Codex Brief — FR.65 ölçü birimleri ve saha alanları

Tarih: 13.10.2026  
İş dalı: `codex/fr65-cm-measurements`

## Kanıt ve kapsam

- `work/r15d-rc1-unified/app/teknik-dosya-formlari.js:20-106`: genel, elektrikli tahrik, kabin/kapı, ray, kuyu ve hidrolik saha alanları.
- `work/r15d-rc1-unified/app/app.js:3300-3435`: FR.65 alan çizimi, birim/legacy gösterimi ve bölüm düzeni.
- `work/r15d-rc1-unified/tests/r15d-static-test.mjs:575-750`: FR.65 alan şeması ve ölçüm davranış kontrolleri.
- Kullanıcı kararı: doğrusal ölçüler cm, halat çapı mm ve sabit seçenekli; tampon türü hidrolik/poliüretan; ölçüm değeri/kapı bilgileri kontrollü alanlar; GSM Var/Yok seçimi kaldırılacak.

## İstenen çıktı

FR.65 saha veri toplama ekranında doğrusal ölçüleri cm standardına getir; eski mm/m alan değerlerini dönüştürmeden koruyup görünür uyarıyla yeniden girişe yönlendir. Tampon türü/stroku, kapı yönü/tipi/paneli ve halat adedi/çapını yapılandırılmış alanlarla topla. GSM modülü alanlarında Var/Yok ayrımını kaldırıp kimlik kutularını doğrudan göster. G modülü ve diğer denetim akışlarına, veritabanı şemasına dokunma.

## Doğrulama

- `npm test` (r15d statik testleri) yeşil.
- `node --check` değişen JavaScript dosyalarında ve `git diff --check` temiz.
- Bağımsız diff incelemesi.
- PR/CI yeşil olduktan sonra üretimde sürüm ve alan etiketlerini doğrula.

## Ürün sınırları

Bu ekran yalnızca sahada veri toplar; uygunluk sonucu üretmez. Migration gerekmemeli. Üretime geçiş, kullanıcının bu işteki açık talebine göre PR incelemesi ve CI sonrası yapılır.
