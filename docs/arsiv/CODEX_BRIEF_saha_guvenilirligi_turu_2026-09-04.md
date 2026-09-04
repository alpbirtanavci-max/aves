# Codex Brifi — Saha Güvenilirliği Turu (2026-09-04)

Devir/kapanış brifi. Değerlendirme (`docs/degerlendirme/2026-09_saha_guvenilirligi_4-6-7-10.md`)
seçilen alanlar **4, 6, 7, 10** için ilk uygulama paketi.

---

## 1. Tamamlananlar (6 PR, hepsi merge, canlıda)

| PR | Alan | İş | Sürüm | DB |
|---|---|---|---|---|
| #11 | 4a | `sync_warning` kalıcı kilidi kırıldı — `Sync.reviewWarning`→`syncCenter` | rc3.9.42 | — |
| #12 | 7a | `navigator.storage.persist()` başlangıçta + hazırlık kontrolü advisory satır | rc3.9.43 | — |
| #13 | 6a | Kaldığı yere dönüş — `last_inspection` kv + liste kartı + kayıtlı maddeye scroll | rc3.9.44 | — |
| #14 | 4b | **Senkron Merkezi** — tüm denetimlerin outbox + bekleyen fotoğraf durumu tek modalda; 4 kopya filtre → `Sync.denetimSyncOzeti` | rc3.9.45 | — |
| #15 | 10a | Resmî çıktı üretim kaydı — `btnYazdir` sonrası tarih + belge SHA + snapshot özeti | rc3.9.46 | **migration 81** |
| #16 | 7c | Toplu "Sahaya Hazırlık · N/M hazır" rozeti + "Tümünü doğrula" | rc3.9.47 | — |

**Canlı: app `R15D-rc3.9.47`, DB migration 79 + 80 + 81 uygulanmış. Açık kod/özellik PR'ı yok
(bu devir belgesinin kendi PR'ı hariç). CI yeşil.**

## 2. Kalıcı davranış kararları

### Senkron (4a + 4b)
- `sync_warning` KV artık `syncCenter`'dan temizleniyor; `reviewWarning()` = `syncCenter()` aliası (export korundu).
- `manual()` ve `updatePill()` yalnız KV'ye değil **gerçek outbox durumuna** bakar (`korunanKalemler`, `KORUNAN_DURUMLAR = ['conflict','forbidden']`).
- **409 (conflict) kalemleri körlemesine gönderilmez** — sunucudaki değişikliği ezmemek için korunur (karşılaştırma akışı = gelecekteki 4d). Yalnız 403 (forbidden) kullanıcı isteğiyle `retry`'a çevrilir.
- Bekleyen fotoğraflar (`fotograflar` store, `sync_status='pending'` + `blob`) `syncCenter`'da denetime göre sayılıyor; "Şimdi senkronize et" `full()` + `UI.bekleyenFotograflariYukle()` çağırır.
- `updatePill` fotoğraf saymıyor (blob'lu `DB.all('fotograflar')` hot-path regresyonu olurdu).

### Hazırlık (7a + 7c)
- `ensurePersistentStorage()` her uygulama başlangıcında çağrılır: `navigator.storage.persisted()`
  ile bakılır, izin yoksa `navigator.storage.persist()` denenir (yani izin verilene kadar her
  açılışta tekrar denenir). Sonuç `kv.storage_persist = {supported, granted, checked_at}`.
- Hazırlık kontrolü `add()` helper'ında `advisory` bayrağı: kırmızı gösterilir ama `ready = every(ok || advisory)` — "Kalıcı depolama izni" hazırlığı engellemez (`persist()` çoğu masaüstünde yalnız PWA kurulumunda verilir).
- Toplu rozet: yalnız `!Çalışma Tamamlandı && canEditDenetim(d)` denetimler; batch = mevcut `sahayaHazirla` sarmalayıcısı, bir denetimin hatası diğerlerini durdurmaz.

### Çıktı (10a)
- `denetimler`'e 3 nullable kolon: `resmi_cikti_uretildi_at`, `resmi_cikti_snapshot_ozeti`, `resmi_cikti_hash`. RLS/trigger yok.
- `form-output.js` `download()` → `{ filename, bytes, form }`. `app.js` `sha256HexBytes()` gerçek belge baytlarından hash.
- `GECMIS_ALANLARI.denetimler`'e eklendi (değişim geçmişi sync tutarlılığı).
- Tamamlanmış denetim özetinde "Resmî çıktı" satırı.
- **Geri dönüş sınırı:** kullanım başladıktan sonra kolon düşürmek çıktı geçmişini kaybettirir → o durumda app yazımını devre dışı bırak, kolonları yerinde bırak.

## 3. Kalan yol haritası (bu turun dışı, opsiyonel)

| Kalem | Not |
|---|---|
| 10b | Yazdır'ı çevrimdışı çalıştır (`FormOutput.download` `navigator.onLine` engelini kaldır — üretim istemci tarafında) |
| 10c | Üretilen PDF/Word'e doğrulanabilir künye (form kodu/revizyon/hash alt bilgisi) |
| 10d | Kurumsal arşiv durumu — `denetimler`'e `arsive_aktarildi_at` + `arsive_aktaran_email` + işaretleme akışı (DB migration + RLS) |
| online-event fotoğraf | `window 'online'` yalnız `Sync.full()` çağırıyor, fotoğraf yüklemiyor. "Bağlantı geldikçe fotoğraflar otomatik gönderilir" ifadesi merkezdeki düğme için kesin. `online` handler'a `bekleyenFotograflariYukle` eklenebilir (10b ile birlikte uygun) |
| 4d | İki-cihaz çakışma karşılaştırma/çözüm akışı (`API.upsert` şu an `merge-duplicates` = sessiz son-yazan-kazanır; 409 nadir) |

## 4. Yayın öncesi smoke (henüz yapılmadı)

- **10a:** sahip / yönetici / teknik müdür ile bir tamamlanmış denetimden PDF ve Word üret → "Resmî çıktı" satırı dolmalı, outbox'a takılan kayıt olmamalı.
- **4a:** gerçek cihazda 403/409 üret → `syncCenter` modalı, retry yalnız 403, 409 korumada.
- **6a:** madde cevapla → listeye dön → "Kaldığın yerden devam et" → o bölüm + satır.
- **7c:** birden çok aktif denetimle rozet doğru N/M, "Tümünü doğrula" sıralı.

## 5. Çalışma düzeni (AGENTS.md — değişmedi)

Tek iş/tek branch/PR · production'a doğrudan yazma yok · sürüm 4 dosya birlikte ·
statik test + CI RLS testi her PR'da yeşil · migration numarasını `ls database/ | sort | tail -1`
ile doğrula (son: **81**) · DB'ye dokunan PR canlıya yalnız kullanıcının açık onayıyla.
