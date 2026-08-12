# AVES R15D-rc3.0 — Güncel Teslim Notu

Hazırlanma tarihi: 12 Ağustos 2026 (rc2.3 ChatGPT worker tesliminin ardından, Claude Code oturumunda yapılan düzeltmeler).

## rc3.0'da ne değişti (rc2.3'e göre)

Bu sürüm, canlı Supabase'de (proje `jmccmkqyncunpqliqvox`) gerçek bir "Çalışma Tamamlandı" denetimin saha cevaplarının sunucuya hiç senkron olamadığının tespit edilmesi üzerine hazırlandı. Üç düzeltme:

1. **Kritik senkron hatası** — `saha_kontrol.hazir_secenekler` ve `kaynak_turu` sütunları NOT NULL idi, ancak aktif kütüphanenin büyük çoğunluğunda (hazir_secenekler için %93) bu alanlar kaynakta NULL. Bu, saha cevabı upsert isteklerinin kalıcı olarak reddedilmesine yol açıyordu (outbox'ta korunuyor ama asla sunucuya ulaşamıyordu). Kısıt kaldırıldı (`database/23_...sql`).
   - Düzeltme sonrası, gerçekten stuck durumda olan "Avm Elektrik Elektronik Asansör" denetiminin cihazı arka planda senkron olmaya başladı — canlıda doğrudan gözlemlendi.
2. **RLS policy isim temizliği** — politikalar hâlâ eski "R15C"/"R13" önekleriyle adlandırılmıştı; `ALTER POLICY RENAME TO` ile isimler temizlendi, güvenlik mantığı (qual/with_check) hiç değişmedi (`database/24_...sql`).
3. **Otomatik Uygulanmaz gerekçesi artık kaybolmuyor** — tahrik tipi / makine dairesi tipi uyuşmazlığından hesaplanan gerekçe metni önceden hiçbir yere yazılmıyordu (215/215 etkilenen aktif maddede denetçi hiçbir açıklama göremiyordu). Yeni `saha_kontrol.otomatik_gerekce` sütunu eklendi (`database/25_...sql`), `app.js` bunu artık kaydediyor ve gösteriyor.

Detaylı gerekçe, canlı doğrulama adımları ve rollback planı için ilgili `database/23_`, `24_`, `25_` dosyalarındaki yorumlara bakın.

## Paket içeriği

- `app/`: Güncel Cloudflare Pages uygulama kaynakları (`R15D-rc3.0`).
- `release/AVES_Saha_R15D_rc3_0_20260812.zip`: **Güncel** Cloudflare Pages'e yüklenebilir uygulama paketi.
- `release/AVES_Saha_R15D_rc2_3_20260811.zip`: Tarihsel referans — artık deploy edilmemeli, yalnız kayıt amaçlı korunuyor.
- `database/00_r15d_canli_on_kontrol.sql`: Canlı sistem için salt okunur ön kontrol.
- `database/21_r15d_guvenli_gecis.sql`: Kaydı koruyan ana R15D geçiş migration'ı.
- `database/22_r15d_rc2_saha_akisi_ve_kuyu_dibi.sql`: rc2 saha akışı ve içerik düzeltmeleri.
- `database/23_r15d_rc3_saha_kontrol_nullable_kaynak_alanlari.sql`: Kritik senkron hatası düzeltmesi.
- `database/24_r15d_rc3_rls_policy_isim_temizligi.sql`: RLS policy isim temizliği.
- `database/25_r15d_rc3_otomatik_gerekce_sutunu.sql`: Otomatik Uygulanmaz gerekçe sütunu.
- `data/`: Kontrollü madde kütüphanesi geliştirme kaynakları. Cloudflare yayın paketine yüklenmez.
- `tests/`: Statik test (121/121 geçiyor) ve smoke test raporu.
- `qa/`: Kütüphane kalite taraması ve düzeltilmiş veri çıktısı.
- `tools/`: Kontrollü kütüphane üretim/düzeltme araçları.
- `CLAUDE_CODE_AVES_MASTER_BRIEF.md`: Projenin kapsamlı devir brifi.

## Önemli güvenlik notları

- Bu paket canlı Supabase yedeklerini, kullanıcı profillerini veya denetim verilerini içermez.
- Eski temiz kurulum SQL'leri ve canlıda kullanılmaması gereken eski R15C migration'ı pakete dahil edilmemiştir.
- `data/madde_kutuphanesi.json` geliştirme kaynağıdır; herkese açık Cloudflare paketine eklenmemelidir.
- Canlı sistemde işlem sırası: salt okunur ön kontrol → güncel yedek → geçici kopyada prova → migration → RLS ve satır sayısı doğrulaması → uygulama deploy ve smoke test.
- Türkiye'deki `pages.dev` erişim problemi nedeniyle production için özel alan adı kullanılmalıdır.
- Yeni ZIP ile eskisi arasında **yalnız** `app.js`, `index.html`, `manifest.json`, `sw.js`, `update.js` farklıdır (byte-byte doğrulandı); `logo.png`, ikonlar, `referans-gorseller/`, `_headers`, `update.html` değişmedi.
- Sızıntı taraması temiz: service_role, parola veya özel anahtar yok; yalnız `sb_publishable_...` (public/anon) anahtar var.

## Mevcut uygulama sürümü

`R15D-rc3.0`

Cloudflare uygulama ZIP'inin SHA-256 değeri (`AVES_Saha_R15D_rc3_0_20260812.zip`):

`11C33160B0BB5FA721966070878DD923E2F569575D9E774DEA3DBCC9A3625657`

Tarihsel referans — önceki paketin (`AVES_Saha_R15D_rc2_3_20260811.zip`) SHA-256 değeri:

`9D44C48B835E1F09C656C274B9F0019EA42B3C390BFF46CED560D1E1AF804495`

## Henüz yapılmadı

Bu paket **Cloudflare Pages'e deploy edilmedi**. Deploy, ayrı bir onay ve şu sırayı gerektirir: preview/test alanında yayım → temiz cihaz, eski Service Worker'lı cihaz ve tamamen offline cihazda smoke test → kullanıcı kabulü → production.
