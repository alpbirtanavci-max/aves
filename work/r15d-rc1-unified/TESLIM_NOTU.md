# AVES R15D-rc2.3 — Son Revize Teslimi

Hazırlanma tarihi: 12 Ağustos 2026

## Paket içeriği

- `app/`: Güncel Cloudflare Pages uygulama kaynakları (`R15D-rc2.3`).
- `release/AVES_Saha_R15D_rc2_3_20260811.zip`: Cloudflare Pages'e yüklenebilir uygulama paketi.
- `database/00_r15d_canli_on_kontrol.sql`: Canlı sistem için salt okunur ön kontrol.
- `database/21_r15d_guvenli_gecis.sql`: Kaydı koruyan ana R15D geçiş migration'ı.
- `database/22_r15d_rc2_saha_akisi_ve_kuyu_dibi.sql`: Son saha akışı ve içerik düzeltmeleri.
- `data/`: Kontrollü madde kütüphanesi geliştirme kaynakları. Cloudflare yayın paketine yüklenmez.
- `tests/`: Statik test ve smoke test raporu.
- `qa/`: Kütüphane kalite taraması ve düzeltilmiş veri çıktısı.
- `tools/`: Kontrollü kütüphane üretim/düzeltme araçları.
- `CLAUDE_CODE_AVES_MASTER_BRIEF.md`: Projenin kapsamlı devir brifi.

## Önemli güvenlik notları

- Bu paket canlı Supabase yedeklerini, kullanıcı profillerini veya denetim verilerini içermez.
- Eski temiz kurulum SQL'leri ve canlıda kullanılmaması gereken eski R15C migration'ı pakete dahil edilmemiştir.
- `data/madde_kutuphanesi.json` geliştirme kaynağıdır; herkese açık Cloudflare paketine eklenmemelidir.
- Canlı sistemde işlem sırası: salt okunur ön kontrol → güncel yedek → geçici kopyada prova → migration → RLS ve satır sayısı doğrulaması → uygulama deploy ve smoke test.
- Türkiye'deki `pages.dev` erişim problemi nedeniyle production için özel alan adı kullanılmalıdır.

## Mevcut uygulama sürümü

`R15D-rc2.3`

Cloudflare uygulama ZIP'inin daha önce doğrulanan SHA-256 değeri:

`9D44C48B835E1F09C656C274B9F0019EA42B3C390BFF46CED560D1E1AF804495`
