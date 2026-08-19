# AVES Saha R15D-rc3.5 — 81-71 / 81-73 Fiziksel Bölüm Yerleşimi

Hazırlanma tarihi: 19 Ağustos 2026

## Yapılan değişiklik

TS EN 81-71 ve TS EN 81-73 aktif kontrol maddeleri, kullanıcıya ayrı standart bölümleri olarak gösterilmek yerine denetçinin çalıştığı fiziksel saha bölümlerine taşındı.

- `08 - TS EN 81-71 Tahribata Dayanıklı` bölümünde aktif madde kalmadı.
- `09 - TS EN 81-73 Yangın Davranışı` bölümünde aktif madde kalmadı.
- Maddelerin `standart_grubu`, kaynak formu, standart madde numarası ve resmi metni korunmuştur.
- Pasif bölüm başlığı/yöntem satırları yeniden etkinleştirilmemiştir.

## Yeni dağılım

### TS EN 81-71 — 39 aktif madde

- 01 Kuyu Dibi: 1
- 02 Kuyu Boyunca: 17
- 03 Kabin ve Kabin Üstü: 14
- 04 Makine ve Şase: 1
- 05 Elektrik ve Test: 6

### TS EN 81-73 — 31 aktif madde

- 00 Ön Kontrol: 1
- 02 Kuyu Boyunca: 8
- 03 Kabin ve Kabin Üstü: 1
- 05 Elektrik ve Test: 21

## Veri güvenliği

`database/41_r15d_rc35_81_71_81_73_fiziksel_bolum_esleme.sql` yalnız `public.madde_kutuphanesi` üzerindeki bölüm alanını değiştirir.

- `public.saha_kontrol` cevap veya snapshot satırlarını değiştirmez.
- Denetim silmez ve madde silmez.
- Beklenen 70 aktif madde bulunmazsa transaction durur ve geri alınır.
- Yeni bölüm dağılımını işlem sonunda tekrar doğrular.
- Bölüm sürümlerini artırarak çevrimdışı cihazların değişikliği algılamasını sağlar.

Bu nedenle başlamış denetimler tarihsel bölüm yapısını korur. Yeni yerleşim yeni başlatılan denetimlerde görünür.

## Geliştirme kaynakları

`data/madde_kutuphanesi.json` ve `data/madde_kutuphanesi.csv` aynı 70 maddelik eşlemeyle güncellendi. Tekrar üretilebilir eşleme aracı `tools/apply_rc35_section_mapping.mjs` dosyasındadır.

## Doğrulama

- JavaScript ve Service Worker sözdizimi geçti.
- Kütüphane toplamı 1018 olarak korundu.
- 81-71 aktif madde sayısı 39 olarak korundu.
- 81-73 aktif madde sayısı 31 olarak korundu.
- Eski özel bölümlerde aktif madde sayısı 0.
- Statik/regresyon kontrolleri: 164/164 geçti.
- Canlı Supabase migration ve Cloudflare deploy henüz yapılmadı.

Cloudflare uygulama paketi: `release/AVES_Saha_R15D_rc3_5_20260819.zip`

SHA-256: `6AB214D48B25B299FB258C8FCFD292843C4ABF2F3C8F6884174E2635C405651F`
