# AVES Saha R15D — Claude Code Test Brifi

Bu dal kararlı sürüm adayıdır. Canlı Cloudflare üretim dalı değildir.

## İncelenecek kaynak

- Uygulama: `work/r15d-rc1-unified/app/`
- Regresyon testleri: `work/r15d-rc1-unified/tests/r15d-static-test.mjs`
- Veritabanı migration'ları: `work/r15d-rc1-unified/database/`
- Referans kütüphane: `work/r15d-rc1-unified/data/madde_kutuphanesi.json`
- Kararlı paket: `work/r15d-rc1-unified/release/AVES_Saha_R15D_KARARLI_20260819.zip`
- Teslim özeti: `work/r15d-rc1-unified/R15D_KARARLI_TESLIM_NOTU.md`

## Başlangıç kontrolleri

Repo kökünden:

```bash
cd work/r15d-rc1-unified
node tests/r15d-static-test.mjs
node --check app/app.js
node --check app/section-mapping.js
node --check app/sw.js
```

Beklenen sonuç: `170/170 kontrol geçti.`

Yerel tarayıcı testi:

```bash
python -m http.server 8767 --directory app
```

Ardından `http://127.0.0.1:8767/` adresini açın. Başlıkta `R15D` görünmelidir. `section-mapping.js`, ardından `app.js` yüklenmeli; tarayıcı konsolunda hata olmamalıdır.

## Özellikle denetlenecek davranışlar

1. Yeni denetim formunda Müşteri Ünvanı alanına tıklamak formu kapatmamalıdır.
2. Sonuçlar yalnız Uygun, Uygun Değil ve Uygulanmaz olmalıdır.
3. Bölümü tamamla işlemi sıradaki fiziksel bölüme geçmelidir.
4. Yeni denetimde 08 / TS EN 81-71 ve 09 / TS EN 81-73 özel bölümleri oluşmamalıdır.
5. 81-71 ve 81-73 maddeleri 00–05 fiziksel saha bölümlerine dağılmalıdır.
6. TS EN 81-72 yalnız İtfaiyeci Asansörü seçildiğinde gelmelidir.
7. Seri numaraları alt çubuktan her aşamada açılabilmeli, çevrimdışı kaydolmalı ve MRL koşullu alanları doğru görünmelidir.
8. Denetçi checklist veya denetim silememeli; teknik müdür içerik/kütüphane değiştirememelidir.
9. İnceleme Modu salt okunur olmalı; arama ve filtreler çalışmalıdır.
10. Açıklama/bulgu alanları opsiyonel kalmalı; sonuç seçimi ilerlemeyi sağlamalıdır.
11. Çevrimdışı hazırlık durumu cihaz bazında görünmeli; açık çalışmalar uygulama güncellemesinde korunmalıdır.
12. Başlamış denetim snapshot'ları yeni kütüphane metniyle sessizce değiştirilmemelidir.

## Veri güvenliği

- Canlı Supabase üzerinde yazma, silme, migration veya RLS değişikliği yapmayın.
- Cloudflare üretim dalına deploy etmeyin.
- Canlı veri gerekiyorsa yalnız salt okunur sorgular kullanın.
- Test denetimleri dışında mevcut denetimleri değiştirmeyin veya silmeyin.
- Bulgu raporunda dosya, satır, yeniden üretme adımı ve beklenen davranışı birlikte yazın.

## Bilinen tarihsel davranış

Başlamış denetimler oluşturuldukları andaki madde snapshot'ını korur. Eski bir denetimde 08/09 bölümleri görülebilir; kararlı adayın doğrulaması yeni oluşturulan test denetiminde yapılmalıdır.
