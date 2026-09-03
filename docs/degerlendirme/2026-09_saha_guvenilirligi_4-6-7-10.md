# Saha Güvenilirliği Değerlendirmesi — Alan 4, 6, 7, 10

**Tarih:** 2026-09-03 · **Kapsam:** mevcut sistem değiştirilmeden, kanıta dayalı eksik listesi + küçük-PR yol haritası
**İnceleme temeli:** `work/r15d-rc1-unified/app/app.js` (3774 satır), `sw.js`, `form-output.js`, `index.html`
**Öncelik ilkesi:** "Hiçbir saha cevabı sessizce kaybolmamalı." Yeni özellik değil, güvence.

Seçilen alanlar: **4** (Senkron merkezi), **6** (Saha kullanım hızı), **7** (Denetim öncesi hazırlık), **10** (Kurumsal çıktı ve arşiv).

---

## Alan 4 — Senkronizasyon Merkezi

### Mevcut durum (kanıt)

- Outbox modeli sağlam: `sync_status` (`pending`/`retry`/`sending`/`forbidden`/`conflict`), `attempt_count`,
  `last_attempt_at`, `last_error_code`, `last_error_message` (`app.js:443-502`).
- Üstel geri çekilme, 60 sn tavan (`app.js:522-526`).
- 403 → `forbidden`, 409 → `conflict`; her ikisinde yerel kayıt korunur, `sync_warning` KV yazılır, sıra durur (`app.js:464-495`).
- Denetim başına "yerel işlem durumu" kartı 4 ayrı render noktasında gösteriliyor (`app.js:2254`, `2499`, `3324`, `3573`).
- Sync pill: toplam bekleyen sayısı + çevrimdışı/çakışma/yetki durumu (`app.js:404-423`).

### Boşluklar (kanıt)

1. **`sync_warning` hiç temizlenmiyor — kalıcı kilit.** `kvSet('sync_warning', …)` yalnız `app.js:474` ve `490`'da;
   `kvDel('sync_warning')` veya null yazımı **kodun hiçbir yerinde yok**. Bir kez 403/409 olunca:
   - `manual()` her çağrıda `if (warning) { toast(...); return; }` → **elle senkron kalıcı ölü** (`app.js:650-654`).
   - `full()` yalnız `online` olayında ve `manual()`'dan tetikleniyor → **çakışma sonrası cihaz sunucudan PULL yapmayı durduruyor** (yeni cevaplar 20 sn'lik `pushOutbox` ile hâlâ gidiyor, ama sunucu güncellemeleri inmiyor).
   - Kullanıcının uyarıyı kabul edecek / temizleyecek **hiçbir arayüz eylemi yok.**
2. **`conflict`/`forbidden` kalemleri asla yeniden denenmiyor.** Push filtresi yalnız `pending`/`retry`/`sending` alıyor
   (`app.js:443-445`). Bu kalemler outbox'ta sonsuza dek kalır; kullanıcı için tek "çözüm" yok.
3. **Global senkron merkezi yok.** Durum yalnız tek tek denetim ekranlarında; "hangi denetimde kaç bekleyen/hata/çakışma var"
   tek ekranda görülemiyor. Aynı `inspectionOutbox` filtre bloğu 4 kez kopyalanmış (bakım riski).
4. **Oturum süresi dolması sessiz.** `authFetch` 401 → 1 kez refresh; refresh de başarısızsa 401 döner,
   `pushOutbox` bunu `retry` sayar ve geri çekilmeyle sonsuz dener (`app.js:246-256`, `496-502`). Kullanıcıya
   "oturumun doldu, tekrar giriş yap" denmiyor; "oturum X'te dolacak" göstergesi yok.
5. **İki-cihaz düzenlemesi zaten sessiz "son yazan kazanır".** `API.upsert` `resolution=merge-duplicates` kullanır,
   `If-Match`/sürüm kontrolü yok (`app.js:311-320`). 409 satır düzenlemede pratikte oluşmaz (yalnız gerçek
   unique-constraint ihlalinde). Yani mevcut `conflict` yolu büyük ölçüde teorik; asıl risk **görünmeyen üzerine yazma**.

### PR yol haritası (küçük, bağımsız)

| PR | Kapsam | Risk |
|---|---|---|
| **4a** | `sync_warning`'i temizleme yolu: pill'e "Uyarıyı incele" → modal (uyarı metni + etkilenen denetim listesi + "Anladım, tekrar dene" butonu). "Anladım" → `conflict`/`forbidden` kalemlerini `retry`'a çevir, `sync_warning`'i sil, `full()` çağır. | Düşük — yalnız KV + outbox status |
| **4b** | Bağımsız "Senkron Merkezi" ekranı: outbox'ı denetime göre grupla, her satırda bekleyen/hata/çakışma sayısı + son hata mesajı + "bu denetimi şimdi dene". 4 yerdeki kopyalanmış filtre bloğunu tek yardımcıya indir. | Düşük — salt okuma + mevcut `pushOutbox` |
| **4c** | Oturum durumu: `session.expires_at` sakla, pill/merkez ekranında "Oturum ~N dk" göster; refresh başarısızsa `sync_warning`'e `kind:'auth'` yaz + "Tekrar giriş yap" akışı (yerel veriye dokunmadan). | Orta — auth akışına yakın |
| **4d** *(opsiyonel, alan 3'e köprü)* | `denetimler`/`saha_kontrol`'e `updated_at` tabanlı yumuşak sürüm damgası + push sırasında sunucu `updated_at` daha yeniyse kalemi `conflict`'e al (gerçek iki-cihaz tespiti). Yalnız tespit + 4b'de gösterim; otomatik birleştirme yok. | Orta-yüksek — ayrı değerlendirme |

---

## Alan 6 — Saha Kullanım Hızı

### Mevcut durum (kanıt)

- Otomatik ilerleme: cevap sonrası bölüm içi sıradaki boş maddeye geç (`autoAdvanceTimer`, `app.js:3142-3149`).
- Adım (step) modu: tamamlanmamış ilk bölüm açık gelir, sonrası kilitli (`app.js:2273-2287`).
- `firstEmpty` / açılan madde `scrollIntoView` (`app.js:2459`, `2485`).
- `env(safe-area-inset-*)` kullanımı — çentik farkında (`index.html:38,53,145`).
- Filtre çipleri: Bakılmadı / Uygun Değil / Önceki Uygun Değil (`app.js:2263-2268`).

### Boşluklar (kanıt)

1. **Kaldığı yere dönüş yok.** Uygulama açılışta **denetim listesine** düşer (`app.js:3771` `UI.afterLogin`);
   en son çalışılan denetime dönmüyor. Denetim açılınca "ilk tamamlanmamış bölüm" açılıyor — kaba bir tahmin,
   ama gerçek kaldığın madde/scroll konumu değil. `openBolums` bellekte bir `Set`; `sessionStorage`/`localStorage`
   veya `kvSet('son_konum'…)` **hiç kullanılmıyor** (grep: 0 sonuç). Telefon kilidi / sekme öldürme sonrası
   büyük bölümde yeniden yukarıdan başlıyorsun.
2. **Küçük dokunma alanları / küçük yazı.** `index.html` CSS'inde `min-height:42px` (`:142`), `46px` (`:152`) —
   önerilen 44–48px eşiğinin altında yerler var; birçok kritik metin `font-size:9-11px` (`:42,61,83,173,197`).
   Güneş altında okunabilirlik için ayrı yüksek-kontrast / parlaklık modu yok; `prefers-color-scheme` /
   `prefers-contrast` desteği **yok**.
3. **Tek elle kullanım düşünülmemiş.** Ana eylemler (Yazdır, Sil, Takip Ata, Çevrimdışı Kontrol) üstte/dağınık
   (`app.js:2220-2226`); baş parmak erişim bölgesi (alt) için düzenlenmemiş. Alt sabit çubuk yalnız step-nav
   prev/next için (`stickyNav`, `app.js:2286`).
4. **Hızlı seri cevaplama sınırlı.** Otomatik ilerleme yalnız "sıradaki madde `denetci_gordu === false` ve `durum`
   dolu değilse" çalışıyor (`app.js:3148-3149`) — ölçüm/açıklama gereken maddede duruyor, "hepsi uygun" gibi toplu
   işaretleme yok. Klavye/donanım butonu ile ilerleme yok.
5. **Haptik / sesli geri bildirim yok.** Cevap kaydı yalnız görsel (toast + renk). Eldivenli/güneşli sahada
   dokunmanın kaydedildiğini anlamak zor.

### PR yol haritası

| PR | Kapsam | Risk |
|---|---|---|
| **6a** | Kaldığı yere dönüş: denetim ekranından çıkarken `kvSet('son_konum', {denetim_id, bolum, madde_id, scrollY})`; açılışta son_konum varsa "Kaldığın yerden devam et →" kartı listenin üstünde; denetim açılışında o bölüm+scroll geri yüklenir. | Düşük — salt KV + scroll |
| **6b** | Dokunma/okunabilirlik geçişi: tüm interaktif öğelere `min-height:48px`; 9-13px metinleri ≥14px'e çıkar; `prefers-contrast: more` ve isteğe bağlı "Güneş modu" (yüksek kontrast + kalın) toggle'ı `kv`'de. Yalnız CSS + tek toggle. | Düşük |
| **6c** | Baş parmak bölgesi: denetim ekranında sık eylemleri (kaydet/sonraki, seri no, fotoğraf) alt sabit çubuğa taşı; nadir eylemler (Sil, Yazdır) "…" menüsüne. | Orta — layout |
| **6d** | Hızlı cevaplama: bölüm başlığında "kalan uygun maddeleri işaretle" (ölçüm/açıklama gerekmeyenler için, tek onayla); cevap kaydında kısa `navigator.vibrate(15)`. | Orta — toplu yazma dikkatli test |

---

## Alan 7 — Denetim Öncesi Hazırlık Kontrolü

### Mevcut durum (kanıt) — kısmen var, iyi temel

`btnSahayaHazirla` / "📱 Çevrimdışı Kontrol" (`app.js:2225`, `2365-2376`, kontrol gövdesi ~`2000-2090`) şunları doğruluyor:
- Madde snapshot alanları (`id`, `denetim_id`, `bolum`, `kontrol_basligi`) (`app.js:2020`)
- Kütüphane manifesti: sayı + içerik hash (`app.js:2021`)
- Kullanıcı yetkisi çevrimiçiyken doğrulanmış (`profile_verified_at` + email) (`app.js:2033-2035`)
- Yerel DB yazma testi (probe yaz/oku/sil) (`app.js:2037-2044`)
- Depolama kotası ≥ 5 MB boş (`navigator.storage.estimate`) (`app.js:2047-2055`)
- Uygulama + gerekli görseller önbellekte (`caches.match`, `cachedCount === assets.length`) (`app.js:2057-2064`)
- Başarılıysa `offline_hazir_at`, `expected_item_count`, `item_set_hash`, `app_build_id`, `kutuphane_content_hash` damgalanır (`app.js:2067-2085`)
- Denetim liste kartında `offline-card-state` (✓/⚠) gösterimi (`app.js:1362`)

### Boşluklar (kanıt)

1. **Tek "sahaya çıkış" güven göstergesi yok.** Kontrol **denetim başına** ve **elle tetikli** — her denetimi açıp
   butona basmak gerek. "Ofisten çıkmadan, yarınki tüm atanmış denetimlerim hazır mı" özeti yok.
2. **Form çıktı şablonları kontrole dahil değil.** `form-output.js` şablon dosyaları manifest + SHA ile
   doğrulanabiliyor (`form-output.js:80-100`) ama hazırlık kontrolü bunları **kontrol etmiyor**. Sahada
   "Yazdır"a basınca şablon eksik/bozuksa geç kalınmış olur.
3. **`navigator.storage.persist()` hiç çağrılmıyor** (grep: 0). IndexedDB "best-effort" — tarayıcı depolama
   baskısında **uyarısız temizleyebilir**. Kalıcı depolama izni istenmiyor.
4. **Sürüm kayması sessiz.** Kontrol `app_build_id`'yi damgalıyor ama denetim açılırken damgalı sürüm ile
   çalışan sürüm farklıysa kullanıcı açıkça uyarılmıyor.
5. **Proaktif dürtme yok.** "3 gün içinde 5 atanmış denetim var, hiçbiri çevrimdışı hazırlanmadı" bildirimi yok.

### PR yol haritası

| PR | Kapsam | Risk |
|---|---|---|
| **7a** | Başlangıçta bir kez `navigator.storage.persist()` çağır; sonucu `kv`'ye yaz; hazırlık kontrolüne "Kalıcı depolama izni" satırı ekle. | Düşük |
| **7b** | Hazırlık kontrolüne form-çıktı şablon bütünlüğü satırı: `FormOutput` manifesti + ilgili şablonların SHA doğrulaması. | Düşük — mevcut `verifiedBytes` |
| **7c** | Liste ekranının üstünde toplu "Sahaya Hazırlık" rozeti: atanmış/devam eden denetimler için `offline-card-state` özetle (`N/M hazır`), tek dokunuşla hepsini sırayla doğrula. | Orta — mevcut kontrolü döngüye al |
| **7d** | Denetim açılışında `d.app_build_id !== APP_VERSION` veya `kutuphane_content_hash` farkı → belirgin "Bu denetim eski sürümle hazırlandı, yeniden doğrula" uyarısı. | Düşük |

---

## Alan 10 — Kurumsal Çıktı ve Arşiv

### Mevcut durum (kanıt)

- `form_cikti_snapshot`: denetim tarihinde kilitlenen form/revizyon (`app.js:1550`, `form-output.js:101-116`).
- Şablon dosyaları manifest + SHA doğrulaması (`form-output.js:80-100`, `verifiedBytes`).
- PDF (`pdf-lib`) ve Word (`docx` XML) istemci tarafında üretiliyor (`form-output.js:249-343`).
- Dosya adı seri no + tarih içeriyor (`safeName`, `app.js` ZIP: `_fotograflar.zip`).
- "Devir Teslim" akışı (`denetimDevirTesliminiGoster`, `devir_edilen_email`) — tamamlanmış denetim için.
- Fotoğraf arşivi: `fotograf_arsiv_son_indirme_at`, `fotograf_arsiv_temizlendi_at`, yetki bazlı temizleme.
- Bütünlük özeti / parmak izi: `butunluk_hash`, `butunluk_ozeti` çalışma tamamlanınca (`app.js:3475-3478`, `3572`).

### Boşluklar (kanıt)

1. **Üretilen resmî çıktının kaydı yok.** `btnYazdir` (`app.js:2385-2420`) PDF/Word üretip **indiriyor**, `toast` atıyor.
   `yazdir_at` / çıktı hash'i / hangi snapshot'tan üretildiği **hiçbir yere yazılmıyor** — ne yerelde ne sunucuda.
   "Bu denetimin resmî çıktısı üretildi mi, ne zaman, hangi revizyondan" sorusunun cevabı yok.
2. **Kurumsal arşive aktarım durumu izlenmiyor.** Fotoğraf arşivinde durum alanları var; **resmî PDF/Word
   çıktısı için yok**. "Bu denetimin dosyası kurumsal arşive kondu" işareti/alanı bulunmuyor.
3. **Yazdır çevrimdışı çalışmıyor.** `if (!navigator.onLine) { toast(...); return; }` (`app.js:2386-2388`) —
   oysa üretim tamamen istemci tarafında (`form-output.js`). Sahada internet yokken resmî çıktı alınamıyor.
4. **Kaynak revizyon çıktı üstünde görünür değil.** Snapshot revizyonu kilitleniyor ama üretilen belgede
   "kaynak: ÜB.FR.xx R.yy, kütüphane hash …" gibi doğrulanabilir künye garanti edilmiyor (şablona bağlı).
5. **Çıktı bütünlüğü ile denetim bütünlük özeti bağlı değil.** `butunluk_hash` denetim kaydında; üretilen
   belgeye gömülmüyor / eşleştirilmiyor.

### PR yol haritası

| PR | Kapsam | Risk |
|---|---|---|
| **10a** | Çıktı üretim kaydı (yalnız yerel + sync): `denetimler`'e `resmi_cikti_uretildi_at`, `resmi_cikti_snapshot_ozeti`, `resmi_cikti_hash` (üretilen bytes'ın SHA'sı). `btnYazdir` başarıdan sonra yazar. DB migration = 3 nullable kolon. | Düşük |
| **10b** | Yazdır'ı çevrimdışı çalıştır: `navigator.onLine` engelini kaldır (üretim istemci tarafında). Yalnız "resmî süreç bağlamı" uyarısını koru. | Düşük |
| **10c** | Üretilen belgeye doğrulanabilir künye: her PDF/Word'e sabit alt bilgi — kaynak form kodu+revizyon, kütüphane content hash, denetim `butunluk_hash` (varsa), üretim zamanı. | Orta — şablon dolgu |
| **10d** | Kurumsal arşiv durumu: `denetimler`'e `arsive_aktarildi_at` + `arsive_aktaran_email`; tamamlanmış denetim ekranında "Arşive aktarıldı olarak işaretle" (fotoğraf arşiv deseniyle aynı). DB migration = 2 nullable kolon + RLS. | Orta — RLS |

---

## Önerilen ilk paket

Kullanıcının "hiçbir cevap kaybolmamalı" hedefine en doğrudan katkı:

1. **4a** — `sync_warning` kilidini kırma (şu an gerçek, kullanıcıyı senkrondan tamamen koparan bir hata).
2. **7a** — `navigator.storage.persist()` (tek satır, uyarısız veri kaybı riskini azaltır).
3. **6a** — kaldığı yere dönüş (saha güveni + veri değil ama en görünür günlük sürtünme).

Sonra: 4b (senkron merkezi ekranı), 7c (toplu hazırlık rozeti), 10a (çıktı kaydı).

Her PR: statik test + RLS testi yeşil, tek konu, `AGENTS.md` düzeni. DB'ye dokunanlar (10a, 10d) ayrı
migration + `RLS_TEST_CHECKLIST` + canlı öncesi yapısal doğrulama.
