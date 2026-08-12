# AVES R15D-rc3.2 — Güncel Teslim Notu (birleşik paket)

Hazırlanma tarihi: 12 Ağustos 2026. Bu paket iki paralel çalışmanın birleşimidir:
- Claude Code oturumu: kütüphane içerik/kaynak eşlemesi (tüm bölümler) ve itfaiyeci asansörü (81-72) mimarisi.
- Codex oturumu: rc3.2 denetim snapshot kilidi, İnceleme Modu ve rol yetkilendirmesi.

## rc3.2'de ne değişti (rc3.0'a göre)

### A) Kütüphane içerik/kaynak eşlemesi (Claude Code)

00-10 arası tüm bölümlerdeki (Ön Kontrol, Kuyu Dibi, Kuyu Boyunca, Kabin ve Kabin Üstü, Makine ve Şase, Elektrik ve Test, Saha Kapanışı, İtfaiyeci Asansörü, Tahribata Dayanıklılık, Yangın Davranışı, Erişilebilirlik) `resmi_madde_metni` (resmi gereklilik metni) boşlukları AVES'in kendi ÜB.FR checklist formları kaynak alınarak dolduruldu:

- ÜB.FR.38 R.04 (TS EN 81-20 Test Kontrol Formu) — modern standart maddeleri.
- ÜB.FR.39 R.02 (TS EN 81.1-2+A3 Test Kontrol Formu) — eski/mevcut bina standardı maddeleri.
- ÜB.FR.40 R.04 (TS EN 81-72 İtfaiyeci Asansörü) — 132/132 madde.
- ÜB.FR.41 R.04 (TS EN 81-71 Kasıtlı Tahribata Dayanıklılık) — tam.
- ÜB.FR.42 R.04 (TS EN 81-73 Yangın Anında Davranış) — tam.

Bu süreçte ayrıca:
- DOCX çıkarımından kalan "kalıtsal genel başlık" hatası (birçok satırın aynı jenerik `kontrol_basligi`'ni paylaşması) tek tek özel başlıklarla düzeltildi.
- Non-actionable satırlar (bölüm başlığı, yöntem kodu/legend, kısa teknik açıklama metinleri) `aktif = false` ile pasifleştirildi (silinmedi).
- 25 adet "aynı resmi metne sahip madde çifti" tek tek incelendi: tamamı meşru paralel gereklilik olduğu doğrulandı (aynı fiziksel gerekliliğin kuyu dibi/kabin üstü/makine dairesi gibi farklı konumlarda, veya 81-20/81-1/2+A3 gibi farklı standartlar altında bağımsız denetlenmesi). 10 tanesinin kalıtsal genel başlığı da özelleştirildi.
- Kalan boş `resmi_madde_metni` alanları (~25 madde) yalnızca AVES'in dahili süreç/ölçüm kodlarına ait (EK-M-xxx, KAP-xx, "Muayene öncesi", ÜB.FR.65/ÜB.RP.08 saha-ölçüm tabloları) — bunların harici bir standart metni yok, tasarım gereği bu alan boş kalıyor.
- **İtfaiyeci asansörü mimarisi**: TS EN 81-71 ve TS EN 81-73 artık her denetimde otomatik olarak zorunlu checklist'e dahil ediliyor; TS EN 81-72 (itfaiyeci asansörü) ise ayrı, açık bir "İtfaiyeci Asansörü: Evet/Hayır" seçimiyle devreye giriyor (`app.js` — `seciliStandartGruplari`, yeni form alanı).

Migration dosyaları: `database/26` – `database/37` (bkz. dosya isimleri).

### B) Denetim snapshot kilidi, İnceleme Modu ve rol yetkilendirmesi (Codex)

- Denetim başladığı anda seçili checklist metinleri, rehberleri, koşulları, ölçüm tanımları ve görsel referansları tarihsel snapshot olarak kilitlenir; sonraki kütüphane değişiklikleri başlamış denetimi etkilemez.
- Seçili madde kümesi ve içerik için SHA-256 parmak izleri saklanır; kapanışta bütünlük özeti oluşur.
- Mühendis kendi denetimini oluşturur/düzenler; yönetici düzenleyebilir; **teknik müdür salt okunur İnceleme Modu**'yla inceler ve yalnız bütün denetimi silebilir (yeni denetim/cevap/yeniden-açma yapamaz).
- Denetim silme olayı sunucu tetikleyicisiyle, gerçek DELETE işlemine bağlı olarak kaydedilir.
- Denetim listesinde "Çevrimdışı çalışmaya hazır / hazır değil" durumu cihaz bazında gösterilir.

Migration dosyaları: `database/01_r15d_rc32_kurulum_kontrol.sql`, `database/28_r15d_rc32_snapshot_inceleme_yetki.sql`. Detay: `R15D_RC32_TESLIM_NOTU.md`, `tests/SMOKE_TEST_REPORT_RC32.md`.

## Paket içeriği

- `app/`: Güncel Cloudflare Pages uygulama kaynakları (`R15D-rc3.2`).
- `release/AVES_Saha_R15D_rc3_2_20260812.zip`: **Güncel** Cloudflare Pages'e yüklenebilir uygulama paketi (içerik + rc3.2 özellikleri birleşik).
- `release/AVES_Saha_R15D_rc3_0_20260812.zip`, `release/AVES_Saha_R15D_rc2_3_20260811.zip`: Tarihsel referans — artık deploy edilmemeli.
- `database/00_r15d_canli_on_kontrol.sql`, `01_r15d_rc32_kurulum_kontrol.sql`: Canlı sistem için salt okunur ön kontroller.
- `database/21`–`25`: rc3.0 geçiş ve düzeltme migration'ları (bkz. önceki teslim notu tarihçesi).
- `database/26`–`37`: rc3.1/rc3.2 kütüphane içerik/kaynak eşlemesi migration'ları (itfaiyeci asansörü mimarisi dahil).
- `database/28_r15d_rc32_snapshot_inceleme_yetki.sql`: Snapshot kilidi, İnceleme Modu, rol yetkilendirmesi.
- `data/`: Kontrollü madde kütüphanesi geliştirme kaynakları (JSON/CSV). Cloudflare yayın paketine yüklenmez.
- `tests/`: Statik test (143/143 geçiyor) ve smoke test raporları.
- `qa/`, `tools/`: Kütüphane kalite taraması ve üretim araçları.
- `CLAUDE_CODE_AVES_MASTER_BRIEF.md`: Projenin kapsamlı devir brifi.

## Önemli güvenlik notları

- Bu paket canlı Supabase yedeklerini, kullanıcı profillerini veya denetim verilerini içermez.
- `data/madde_kutuphanesi.json` geliştirme kaynağıdır; herkese açık Cloudflare paketine eklenmemelidir.
- Canlı sistemde işlem sırası: salt okunur ön kontrol → güncel yedek → migration → RLS/rol/satır sayısı doğrulaması → uygulama deploy → smoke test.
- Türkiye'deki `pages.dev` erişim problemi nedeniyle production için özel alan adı (`saha.avesbelgelendirme.com.tr`) kullanılmalıdır.
- Sızıntı taraması temiz: service_role, parola veya özel anahtar yok; yalnız `sb_publishable_...` (public/anon) anahtar var.

## Mevcut uygulama sürümü

`R15D-rc3.2`

Cloudflare uygulama ZIP'inin SHA-256 değeri (`AVES_Saha_R15D_rc3_2_20260812.zip`):

`927FFEE7607018182F33BB90ACB74CCB9BD768BF3B90FD5AD957AB49647C1C20`

## Henüz yapılmadı

Bu paket **Cloudflare Pages'e deploy edilmedi**. Deploy, ayrı bir onay ve şu sırayı gerektirir: preview/test alanında yayım → temiz cihaz, eski Service Worker'lı cihaz ve tamamen offline cihazda smoke test → mühendis/yönetici/teknik müdür test hesaplarıyla rol matrisi doğrulaması → kullanıcı kabulü → production.

Canlı Supabase'e rc3.2'nin veritabanı tarafı (`database/28_r15d_rc32_snapshot_inceleme_yetki.sql`) zaten uygulanmış durumda (bkz. `tests/SMOKE_TEST_REPORT_RC32.md`); uygulama (frontend) paketi henüz production alan adına yayımlanmadı.
