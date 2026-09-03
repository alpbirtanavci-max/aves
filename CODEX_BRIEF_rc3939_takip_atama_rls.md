# Codex Brifi — Takip Atama Akışı RLS Boşlukları (migration 79)

**Hazırlayan:** Claude Code incelemesi + Codex geri bildirimi
**Dal:** ayrı branch `codex/r15d-rc39XX-takip-atama-rls` (production dalına doğrudan yazma)
**İnceleme kapsamı:** `c2503ed` → `3d783ba` → `8a95e3a` (rc3.9.37–rc3.9.39)
**Yeni migration:** `work/r15d-rc1-unified/database/NN_r15d_rc39XX_takip_atanan_yetki.sql`
— `NN` için başlamadan önce `ls database/ | sort | tail -1` ile sıradaki numarayı doğrula.
**Test:** `work/r15d-rc1-unified/tests/RLS_TEST_CHECKLIST.md` senaryoları, bir Supabase branch'inde üç hesapla.

Bu bir hata düzeltme brifidir. Yeni özellik yok. Amaç: yönetimin bir `muhendis`'e
atadığı takip denetiminin o mühendiste **fiilen çalışması** — görme, checklist, fotoğraf,
geçmiş kaydı — ve yetkinin aktif takip dışına taşmaması.

---

## Bağlam

`8a95e3a`'ya kadar olan çalışma:
- `denetimler`'e `takip_atanan_email`, `takip_atanan_ad`, `takip_atama_at` kolonları.
- `app.js` `takipMuehendisiniAta()` — yönetim (`canCorrectInspections` = `yonetici`/`teknik_mudur`)
  takip kaydını bir `muhendis`'e atar; yerel yazılır, sync ile gider.
- İstemci `denetimGorunebilirMi` / `canEditDenetim` artık `takip_atanan_email == Profile.email`'i kabul ediyor.
- Migration 78 yalnız `denetimler` + `saha_kontrol` için birer UPDATE politikası ekledi.

**Kök sorun:** İstemci tarafı yeni bir görünürlük yolu açtı; sunucu tarafında bu yol
`denetimler`/`saha_kontrol` SELECT, `denetim_degisim_gecmisi`, `denetim_fotograflari`
ve `storage.objects` politikalarının **hiçbirinde** yok. Bu politikaların tamamı
`olusturan_email` sahipliği veya `yonetici/teknik_mudur` rolü üzerinden çalışıyor.

Statik testler 325/325 yeşil — RLS davranışını doğrulamıyor.

---

## Değiştirilecek politikalar (tam liste)

Tümü yeni migration 79 içinde `drop policy if exists` + yeniden `create` ile. Mevcut
gövdeyi **birebir kopyala**, yalnız aşağıdaki `or (...)` dalını ekle. Ortak dal:

Okuma (SELECT) politikalarına eklenecek dal:

```sql
or (
  public.aves_aktif_kullanici_mi()
  and lower(coalesce(<denetim>.takip_atanan_email,'')) = public.aves_oturum_emaili()
)
```

Yazma politikalarında durum kısıtı **`USING` ve `WITH CHECK` tarafında farklı** olmalı
(Codex uyarısı — aksi halde atanan mühendis takibi kapatamaz):

```sql
-- denetimler UPDATE (#2):
-- USING  (eski satır): yalnız aktif kayıt güncellenebilir
or (public.aves_aktif_kullanici_mi()
    and lower(coalesce(takip_atanan_email,'')) = public.aves_oturum_emaili()
    and denetim_durumu in ('Devam Ediyor','Gözden Geçirme'))
-- WITH CHECK (yeni satır): 'Çalışma Tamamlandı'ya geçişe izin ver
or (public.aves_aktif_kullanici_mi()
    and lower(coalesce(takip_atanan_email,'')) = public.aves_oturum_emaili()
    and denetim_durumu in ('Devam Ediyor','Gözden Geçirme','Çalışma Tamamlandı'))
```

"Tamamlanmış kaydı yeniden açamaz" güvencesi `USING`'den gelir (eski satır aktif
olmalı). İleri-yön geçiş kontrolü trigger'ın işi.

| # | Tablo | Politika | Cmd | Kaynak | Not |
|---|---|---|---|---|---|
| 1 | `public.denetimler` | `denetimleri okuma` | SELECT | `42_...:225` | okuma dalı |
| 2 | `public.denetimler` | `takip atanan denetim guncelleme` | UPDATE | `78_...:10` | **USING/WITH CHECK asimetrik** (yukarı) — 78'de durum kısıtı hiç yok |
| 3 | `public.saha_kontrol` | `saha okuma` | SELECT | `42_...:247` | okuma dalı |
| 4 | `public.denetim_degisim_gecmisi` | `gecmis okuma` | SELECT | `42_...:292` | okuma dalı |
| 5 | `public.denetim_degisim_gecmisi` | `gecmis ekleme` | INSERT | `42_...:303` | `islem_turu <> 'denetim_silme'` korunur; `WITH CHECK` durum: aktif üç durum (kapatma anında geçmiş yazılabilir) |
| 6 | `public.denetim_fotograflari` | `denetim fotograflari okuma` | SELECT | `68_...` | okuma dalı |
| 7 | `public.denetim_fotograflari` | `denetim fotograflari ekleme` | INSERT | `68_...` | `WITH CHECK` durum: `<> 'Çalışma Tamamlandı'` |
| 8 | `public.denetim_fotograflari` | `denetim fotograflari guncelleme` | UPDATE | `69_...` | `x-upsert`/`merge-duplicates` bunu şart koşuyor, yoksa 403 |
| 9 | `storage.objects` | `denetim fotograf nesnesi okuma` | SELECT | `71_...` | `split_part(name,'/',1)` ile denetim eşleşmesi |
| 10 | `storage.objects` | `denetim fotograf nesnesi ekleme` | INSERT | `68_...` | `WITH CHECK` durum: `<> 'Çalışma Tamamlandı'` |
| 11 | `storage.objects` | `denetim fotograf nesnesi guncelleme` | UPDATE | `70_...` | upsert için zorunlu |

**Yeniden oluşturulan politika sayısı: 11.** `saha_kontrol` UPDATE (`takip atanan saha
guncelleme`, `78_...`) zaten atanan mühendisi kapsıyor ve durum kısıtlı — **dokunma.**
(Onu da sayarsan matriste 12 satır olur; migration 79 yalnız 11'ini yeniden yazar.)

### DELETE — karar gerekli (Codex uyarısı)

`.photo-remove` (her fotoğrafta `×`) düğmesi `app.js:886` — `currentCanEdit` doğruysa
görünür, ki atanan mühendis için artık doğru. Ama DELETE politikaları (`75_...`)
genişletilmezse mühendis düğmeyi görür, tıklar, **403** alır ("düzenleyebilir görünüp
sunucuda reddedilir").

**KARAR VERİLDİ (2026-09-03): D2 — DELETE kapsam dışı, düğme gizlenir.**

- DELETE politikaları (`denetim_fotograflari`, `storage.objects`, `75_...`) **değişmez**.
- `app.js` aynı PR'da düzeltilir: `.photo-remove` düğmesi (`app.js:886` civarı) yalnız
  fotoğrafı silmeye gerçekten yetkili kullanıcıya görünür — sahip / admin / arşiv
  temizleme yetkisi. Atanan mühendis fotoğraf **ekler** ama silemez. Öneri koşul:
  `currentCanEdit && (denetimSahibiMi(d) || Profile.isAdmin || Profile.canArchivePhotos)`.
  Mevcut `currentCanEdit` tek başına yeterli değil.
- Statik teste kontrol eklenir: `.photo-remove` render koşulu salt `currentCanEdit`
  değil, silme yetkisini de içeriyor.

**Değiştirilmeyen:** atanan mühendis yalnız **takip kaydını** görür; kaynak
(`takip_onceki_denetim_id`) denetimi göremez. `takipKisaCiktiYazdir` kaynağı `DB.get`
ile deniyor ama takip satırlarındaki `takip_onceki_*` snapshot alanları çıktı için
yeterli. Değiştirme.

---

## Üst bilgi alanı koruması — KARAR VERİLDİ: sunucu trigger'ı (seçenek A)

Yalnız RLS durum filtresi, atanan mühendisin **aktif** takip kaydının üst bilgi
alanlarını (`musteri_unvani`, `denetim_adresi`, `asansor_seri_no`, `denetim_tarihi`,
`denetimi_yapan`, `olusturan_email`, takip zinciri alanları) değiştirmesini engellemez —
`app.js` sync katmanı satırın **tamamını** PATCH ediyor. Kullanıcı kararı (2026-09-03):
**sunucu kilitlesin.**

Migration 79 şu trigger'ı içerir:

**`BEFORE UPDATE` trigger** `public.aves_takip_atanan_alan_kilidi()` on `public.denetimler`:
`aves_oturum_emaili()` = `new.takip_atanan_email` **ve** güncelleyen sahibi/yönetici
**değilse**, korunan kolonlardan herhangi biri `old`'dan farklıysa `raise exception`.

- **Korunan (C değiştiremez):** `musteri_unvani`, `denetim_adresi`, `asansor_seri_no`,
  `asansor_kimlik_no`, `dosya_no`, `denetim_tarihi`, `denetimi_yapan`, `olusturan_email`,
  `olusturan_ad`, `modul`, `denetim_turu`, `kontrol_profili`, `ana_standart`,
  `takip_ana_denetim_id`, `takip_onceki_denetim_id`, `takip_sira_no`, `takip_atanan_email`,
  `takip_atanan_ad`, `takip_atama_at` ve teknik/beyan alanları.
- **İzin verilen:** sonuç/ilerleme/sync alanları — `denetim_durumu` (yalnız ileri yön:
  'Devam Ediyor' → 'Gözden Geçirme' → 'Çalışma Tamamlandı'), `saha_tamamlandi_at`,
  `gozden_gecirme_at`, `calisma_tamamlandi_at`, `butunluk_*`, `expected_item_*`,
  `seri_numaralari`, `offline_hazir_at`, `updated_at`, `form_cikti_snapshot`.
- Precedent: `trg_aves_takip_zincir_kilidi` (`42_...:360`), `trg_aves_duzeltme_oturumu`
  (`42_...:399`) — aynı desen (`security definer`, `set search_path`, `is distinct from`).
- Kesin kolon listesini `information_schema.columns` ile doğrula; belirsiz alanda
  (yeni kolon) **korunan** tarafta bırak, notta belirt.

---

## Teslim beklentisi

1. `NN_r15d_rc39XX_takip_atanan_yetki.sql` — **11 politika** + üst bilgi koruma trigger'ı
   (seçenek A). Tek `begin/commit`, idempotent, her migration sonunda salt okunur
   `select ... from pg_policies` doğrulaması.
1b. `app.js` — `.photo-remove` düğmesi silme yetkisi kontrolüne bağlanır (D2 kararı).
2. Sürüm bumpı — dört dosya (`app.js` `APP_VERSION`, `index.html`, `manifest.json`, `sw.js` cache).
3. `tests/r15d-static-test.mjs` — 79'u oku; testler: (a) `denetimleri okuma` + `gecmis okuma`
   + `denetim fotograflari okuma` + storage okuma politikaları `takip_atanan_email` içeriyor,
   (b) `denetimler` UPDATE + foto INSERT/UPDATE politikaları `denetim_durumu in` kısıtı içeriyor,
   (c) üst bilgi koruma trigger'ı/RPC'si mevcut. Sürüm testleri güncellenir. `node ...` yeşil.
4. `tests/rls/NN_takip_atama.sql` — `RLS_TEST_CHECKLIST.md` §3–4 senaryoları, `begin/rollback`.
   Bir Supabase branch'inde koşulur, çıktı PR'a eklenir.
5. `R15D_RC39XX_TAKIP_ATAMA_RLS_NOTU.md` — ne değişti, canlı uygulama sırası, geri dönüş planı,
   (C) seçildiyse kabul edilen risk.
6. Canlıya (Supabase) uygulama **kullanıcı açıkça isteyene kadar**; yalnız dosyayı hazırla, PR aç.
7. `aves_oturum_emaili()`'nin okuduğu JWT claim'ini Supabase panelden doğrula ve nota yaz.
