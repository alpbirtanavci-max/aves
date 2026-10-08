# CODEX BRIEF — Savera Super ray kataloğunun hesap motoruna aktarılması

Tarih: 2026-10-08
Kaynak dal: `claude/hesap-motoru-cekirdek` (`232066f`)
Çalışma dalı: `codex/savera-rail-catalog`
Durum: Uygulama ve testler tamamlandı; Claude bağımsız kod/teknik incelemesi ve PR onayı bekleniyor.

## İstenen çıktı

Önceki AVES-HESAP Savera Super ray revizyonunu Claude'nin `hesap-motoru/` yapısına taşımak: denetçi yalnız üretici üzerindeki ray profil kodunu seçsin; kesit özellikleri ve birim kütle katalogdan çözülsün; 5 m'lik stok parça sayısı seyirden hesaplansın; üretici hız kapsamı ayrı raporlansın. Kaynak ve hesap girdileri izlenebilir olmalı; katalog verisi bitmiş rayın partiye özel Rm/A5 belgesi gibi sunulmamalı.

## Uygulama

- `hesap-motoru/data/components/rails/savera-super-series.json`: Savera Super Rev. 08/26, 23 profil, resmî PDF URL ve SHA-256, doğrulama tarihi ve bağımsız inceleme durumu.
- `hesap-motoru/src/rail-catalog.mjs:13-200`: katalog seçimi, profil alanlarının motor şemasına aktarılması, `ceil(seyir/5)` stok hesabı, izlenebilirlik ve ayrı üretici hız-kapsamı sonucu.
- `hesap-motoru/src/engine.mjs:8-50`, `src/rails.mjs:157`: katalog çözümünün hesap akışına bağlanması; doğrulanmayan seçimde bloke.
- `hesap-motoru/src/catalog.mjs:28,32`: `RAIL-C-06` ve `RAIL-W-06`; ikinci kişi incelemesi `PENDING`.
- `hesap-motoru/examples/ornek-proje.sentetik.json`: manuel kesit/kütle yerine Savera profil seçimi örneği.
- `hesap-motoru/tests/rail-catalog.test.mjs:1-125`: 23 profil için üretici kesit modülü dönüşüm kontrolü, stok sayısı sınırları, seçimin motor girdisine etkisi, hız kapsamı, hatalı seçim ve elle veri çakışması.
- `hesap-motoru/docs/KAYNAK_NOTLARI.md:176-199`, `hesap-motoru/README.md:67-89`: kaynak, sınırlar ve girdi açıklaması.

## Teknik kararlar / açık sınırlar

1. `rails.n`, EN 81-50 yük dağılımındaki paralel ray hattı sayısıdır. Hat başına fiziksel 5 m parça adedi farklıdır ve `ceil(Hseyir / 5 m)` ile türetilir; ikisi birbirine karıştırılmaz.
2. Katalog mekanik özelliklerinde `Wxx/Wyy` cm³ → mm³ dönüşümü `×1.000` olarak yeniden yapıldı. Önceki AVES-HESAP veri dosyasında bu değerlerin çoğu 10 kat büyüktü. Yeni motor kaydı üretici PDF'sindeki 23 satırın beklenen değerleriyle test edilir.
3. Savera katalog aralıkları partiye özgü bitmiş ray `Rm/A5` ve deney izlenebilirliği sağlamıyor; bu yüzden `material.RmN_mm2/A5pct` yerine kullanılmaz. Eksik `c`/`f` ölçüsü tahmin edilmez, yalnız yerel flanş sonucu bloke olur.
4. Hız sınırı içinde sonuç `TEKNİK İNCELEME` olarak kalır; üstünde üretici kapsam kriteri sağlanmadı. Bu üretici kapsam kontrolü genel asansör uygunluğu değildir.
5. Katalog sabit bir son geçerlilik tarihi yayınlamıyor; `valid_until: null` bırakıldı. Resmî indirme ve dosya özeti saklandı; yeni sürüm yayınından önce resmî kaynaktan tekrar doğrulanmalı.
6. `ceil(seyir/5 m)` hesabı kuyu üstü/altı ray uzantılarını içermez. Bu mevcut AVES kullanıcı girdisi kararına göre stok metrajı kestirimidir; gerçek kurulu uzunluk gerektiğinde ayrıca doğrulanmalı.
7. Savera kaydı için bağımsız teknik inceleme tamamlanmadı. İlgili motor kuralları `PENDING` kalır.

## Kaynak kanıtı

- Savera resmî ürün sayfası: https://saveragroup.com/en/home/products-and-services/ (Super ürün satırı ve katalog indirme bağlantısı).
- Üretici PDF: https://saveragroup.com/wp-content/uploads/2026/09/GUIA-SUPER_Rev08.26.pdf (Rev. 08/26; profil ölçüleri s. 3, teknik kesit tablosu s. 6, 5 m tedarik bilgisi s. 7).
- İncelenen PDF SHA-256: `4e630bafce661b9c7722d0e42d79715b79c79837d50abbc56db64128b23ed2c7`.

## Doğrulama

- `npm run test:hesap` — 111/111 geçti.
- `npm test` — 408/408 geçti.
- Sentetik örnek JSON/Markdown/HTML raporu üretildi; Savera revizyonu, kaynak karması, hız kapsamı, 5 m stok sayısı ve nominal hat kütlesi raporda göründü.
- `git diff --check` — temiz.
- Canlı Site/Cloudflare/Supabase değişikliği yapılmadı.

## Claude için inceleme talebi

Özellikle üretici tablosundaki `Wxx/Wyy` dönüşümlerini ve 5 m parça/metraj anlamını kaynak PDF ile bağımsız kontrol et. Kabulden önce değişiklikler PR içinde incelenmeli; doğrudan hedef dal veya production üzerinde uygulanmamalı. Bu brief sonradan `docs/arsiv/` altına taşınabilir.

## Ayrı takip gereği

`D:\AVES\AVES-HESAP` ve yayımlanmış AVES-HESAP v35 bu devir PR'ında değiştirilmedi; ikisinde de eski 10× kesit modülü değerleri halen bulunuyor. Bu nedenle v35'te Savera profili seçilerek üretilen ray gerilme/flanş sonuçları kullanılmamalı. Kullanıcı onayıyla ayrı kaynak düzeltmesi ve kontrollü yeniden yayın planlanmalı.
