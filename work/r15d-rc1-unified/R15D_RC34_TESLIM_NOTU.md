# AVES Saha R15D-rc3.4 — Ekipman Seri Numaraları

Hazırlanma tarihi: 19 Ağustos 2026

## Amaç

Denetçinin asansörün farklı bölgelerinde gördüğü zorunlu ekipman seri numaralarını, denetim akışından kopmadan ve internet bağlantısı olmadan kaydedebilmesini sağlamak.

## Uygulanan yapı

- Denetim ekranının alt çubuğuna her zaman erişilebilir **Seri No** düğmesi eklendi.
- Kayıtlar fiziksel çalışma bölgesine göre ayrıldı:
  - Kuyu dibi: kabin tamponu ve elektrikli asansörlerde karşı ağırlık tamponu.
  - Kabin/kabin üstü: paraşüt fren-güvenlik tertibatı ve kat kapıları.
  - MRL makine alanı: regülatör ve motor/tahrik makinesi.
  - Elektrik/pano: kumanda kartı.
- Aynı türden birden fazla ekipman için satır eklenebilir. Kat kapılarında kat/durak ve giriş bilgisi ayrıca tutulur.
- MRL'ye özgü regülatör ve motor alanları yalnız MRL denetimlerinde görünür.
- Seri kayıtları denetimle birlikte IndexedDB'ye ve senkronizasyon kuyruğuna atomik olarak yazılır. İnternet hiç gelmese de cihazdaki denetime bağlı kalır.
- Seri kayıtları değişiklik geçmişine ve denetim kapanış bütünlük özetine dahil edildi.
- Zorunlu seri grupları eksikse denetim kapatılamaz; uygulama doğrudan seri numarası ekranını açar.
- Teknik müdür İnceleme Modu'nda seri numaralarını görebilir fakat değiştiremez.

## Fotoğraf yaklaşımı

Uygulama fotoğraf saklamaz, fotoğraf yükleme alanı ve “çekildi” işareti içermez. Bunun yerine ilgili bölüm tamamlanırken yalnız bir hatırlatma gösterilir:

- Kuyu dibi: tampon etiketleri.
- Kabin/kabin üstü: paraşüt fren ve kat kapısı etiketleri.
- MRL makine alanı: regülatör ve motor etiketleri.
- Elektrik/test: kumanda kartı etiketi.

Hatırlatma herhangi bir fotoğraf durumu kaydetmez ve bölüm geçişini engellemez.

## Veritabanı

`database/40_r15d_rc34_ekipman_seri_numaralari.sql` dosyası `denetimler` tablosuna `seri_numaralari jsonb` alanını güvenli biçimde ekler.

- Mevcut denetim veya checklist cevaplarını silmez/değiştirmez.
- Yalnız `NULL` eski kayıtları boş seri şemasıyla doldurur.
- Alanın JSON nesnesi olmasını doğrular.
- İşlem hata halinde bütünüyle geri alınır.

Canlı kurulum sırası: güncel yedek ve salt okunur kontrol → migration 40 → sütun/RLS/senkron doğrulaması → uygulama deploy → çevrimdışı ve çevrimiçi smoke test.

## Doğrulama

- JavaScript sözdizimi: geçti.
- Service Worker sözdizimi: geçti.
- Statik/regresyon testleri: **157/157 geçti**.
- Telefon boyutunda yerel açılış ve sürüm etiketi: doğrulandı.
- Canlı Supabase ve Cloudflare kurulumu: henüz yapılmadı; kontrollü kurulum onayı bekliyor.

Cloudflare uygulama paketi: `release/AVES_Saha_R15D_rc3_4_20260819.zip`

SHA-256: `4CAAC5F534051BCE97FC51EA9757F1061F93B0A5E55F30495B6E38C2F62A4F6D`
