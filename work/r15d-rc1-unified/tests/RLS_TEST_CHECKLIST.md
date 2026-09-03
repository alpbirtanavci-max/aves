# RLS Test Kontrol Listesi

RLS (satır güvenliği) veya istemci yetki mantığına dokunan **her** PR bu listeyi bir
Supabase branch'inde gerçek çalıştırır ve çıktı özetini PR'a ekler. Statik test
(`r15d-static-test.mjs`) bunun yerine geçmez.

---

## 1. Test edilecek roller (dört persona / dört gerçek hesap)

| Persona | `kullanici_profilleri.rol` | Rolü |
|---|---|---|
| **A — İlk denetçi** | `muhendis` | Ana denetimi oluşturur, takip kaydını açar |
| **B — Yönetim** | `yonetici` veya `teknik_mudur` | Takip mühendisi atar |
| **C — Atanmış ikinci mühendis** | `muhendis` | B tarafından takip kaydına atanır; kaydı oluşturan **değildir** |
| **D — İlgisiz mühendis** | `muhendis` | Hiçbir role atanmamış; negatif kontrol |

## 1b. Bağlayıcı kararlar (takip atama akışı, 2026-09-03)

Migration NN ve `app.js` bu kararlara göre yazılır; testler bunları doğrular.

| Konu | Karar | Sonuç |
|---|---|---|
| Üst bilgi alanları (müşteri/adres/seri no/tarih/olusturan/atama) | Atanmış mühendis **değiştiremez** | `BEFORE UPDATE` trigger `aves_takip_atanan_alan_kilidi`. **İzin-listesi mantığı** — listede olmayan her kolon (yeni kolonlar dahil) varsayılan kilitli. İzin listesi sonuç/ilerleme/sync alanları **+ `son_degistiren_email/ad/rol/at`** (bunları `trg_aves_satir_kimligini_dogrula` oturumdan yeniden yazıyor, `app.js:734` istemciden gönderiyor). Yetki `OLD.takip_atanan_email` üzerinden. RLS durum filtresi tek başına yetmez |
| Durum ilerletme | Atanmış mühendis takibi **`Çalışma Tamamlandı`ya ilerletebilir** | `denetimler` UPDATE politikası `USING` = aktif iki durum, `WITH CHECK` = + `Çalışma Tamamlandı` (asimetrik). Tamamlanmış satırdan **yeni güncelleme başlatılamaz** (`USING` engeller) |
| Fotoğraf silme | Atanmış mühendis **silemez** (D2) | DELETE politikaları değişmez **ve** `app.js` `.photo-remove` düğmesi ona gösterilmez — arayüzde silme eylemi görünmemeli, yalnız sunucudan 403 almak yetersiz |
| Kaynak denetim görünürlüğü | Atanmış mühendis **yalnız takip kaydını** görür | Kaynak (`takip_onceki_denetim_id`) denetimi görmez; takip satırındaki `takip_onceki_*` snapshot alanları çıktı için yeterli |

## 2. Harness deseni (pgTAP / düz SQL)

Testler bir Supabase branch'inde koşar; her persona için oturum taklit edilir:

Fotoğraf/storage politikaları `lower(auth.jwt() ->> 'email')` okuyor (bkz. `68_...sql`).
`aves_oturum_emaili()`'nin de aynı claim'e dayandığını Supabase panelden doğrula.

```sql
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","email":"c.muhendis@example.com"}';

-- beklenen: 1 satır
select count(*) from public.denetimler where id = :takip_denetim_id;
```

Her senaryo ayrı bir transaction'da (`begin; ... rollback;`) çalışır; test verisi kalıcı olmaz.
Dosya konumu: `work/r15d-rc1-unified/tests/rls/NN_<konu>.sql`.

## 3. Senaryo matrisi — takip atama akışı

Kurulum: A bir ana denetim + bir takip kaydı oluşturur (takip kaydında en az bir
"önceki Olumsuz bulgu" satırı). B, takip kaydını C'ye atar (`takip_atanan_email = C`).

**Fotoğraf iki katmanda test edilir:** (a) `public.denetim_fotograflari` metadata
tablosu, (b) `storage.objects` bucket `denetim-fotograflari`. Gerçek yükleme önce
Storage nesnesini yazıp sonra metadata satırını yazdığı için Storage katmanı ayrıca
kontrol edilmeli — daha önce yaşanan senkron hatası (rc3.9.15–17) tam bu katmandaydı.
`x-upsert:true` her yeni nesnede bile `storage.objects` üzerinde SELECT + UPDATE
politikası ister.

| # | Aktör | İşlem | Hedef politika | Beklenen |
|---|---|---|---|---|
| 3.1 | C | `select` takip `denetimler` satırı | `denetimleri okuma` | **görür** (1 satır) |
| 3.2 | C | `select` takip kaydının `saha_kontrol` satırları | `saha okuma` | **görür** (tümü) |
| 3.3 | C | `update saha_kontrol` — bir maddeye `durum`, `bulgu_secenegi` yaz | `takip atanan saha guncelleme` | **başarılı** (denetim_durumu 'Devam Ediyor'/'Gözden Geçirme' iken) |
| 3.4 | C | `insert denetim_degisim_gecmisi` (takip kaydı için, `islem_turu <> 'denetim_silme'`) | `gecmis ekleme` | **başarılı** — aksi halde "kim/ne zaman düzeltti" sunucuya gitmez |
| 3.5 | C | `select denetim_degisim_gecmisi` takip kaydının geçmişi | `gecmis okuma` | **görür** |
| 3.6 | C | `insert denetim_fotograflari` (takip kaydı, aktif durum) | `denetim fotograflari ekleme` | **başarılı** |
| 3.6b | C | `update` / upsert (`Prefer: resolution=merge-duplicates`) aynı `denetim_fotograflari` metadata satırı | `denetim fotograflari guncelleme` | **başarılı** — `API.upsert` tüm tablolarda merge-duplicates kullanıyor; UPDATE politikası yoksa 403 |
| 3.7 | C | `insert storage.objects` bucket `denetim-fotograflari`, path `<takip_denetim_id>/...` | `denetim fotograf nesnesi ekleme` | **başarılı** |
| 3.8 | C | `update` (upsert / `x-upsert:true`) aynı `storage.objects` nesnesi | `denetim fotograf nesnesi guncelleme` | **başarılı** — yoksa upsert 403/400 |
| 3.9 | C | `select denetim_fotograflari` + `select storage.objects` takip fotoğrafları | `... okuma` (68 / 71) | **görür** |
| 3.10 | C | takip `denetimler` `update` — `denetim_durumu = 'Çalışma Tamamlandı'` iken herhangi bir alan | `takip atanan denetim guncelleme` | **RED** (durum kısıtı; tamamlanmış kaydı yeniden açamaz) |
| 3.11 | C | `update denetimler` — `takip_atanan_email`'i D'ye değiştir | `... with check` | **RED** |
| 3.12 | C | `update denetimler` — `musteri_unvani` / `denetimi_yapan` / `denetim_tarihi` değiştir (aktif durumda) | `aves_takip_atanan_alan_kilidi` trigger | **RED** (kullanıcı kararı 2026-09-03: sunucu kilitler) |
| 3.12b | C | `update denetimler` — yalnız `denetim_durumu` 'Devam Ediyor'→'Gözden Geçirme' (aktif durumda) | aynı trigger | **başarılı** (izin verilen ileri yön) |
| 3.12c | C | `update denetimler` — `denetim_durumu` 'Gözden Geçirme'→'Çalışma Tamamlandı' (takibi kapat) | `takip atanan denetim guncelleme` `WITH CHECK` + trigger | **başarılı** — `USING` eski satırı aktifken kabul eder, `WITH CHECK` yeni 'Çalışma Tamamlandı'ya izin verir (asimetrik yazım şart) |
| 3.12d | C | `.photo-remove` (× foto sil) — aktif takip fotoğrafı | `denetim fotograflari silme` (75, değişmedi) | **RED** — D2 kararı; app.js düğmeyi C'ye göstermemeli (statik test) |
| 3.13 | D | `select` aynı takip `denetimler` satırı | `denetimleri okuma` | **görmez** (0 satır) |
| 3.14 | D | `update saha_kontrol` / `insert denetim_fotograflari` / `update denetim_fotograflari` aynı takip kaydında | ilgili politikalar | **RED** |
| 3.15 | D | `select` + `insert` + `update` `storage.objects` takip fotoğrafı (path `<takip_denetim_id>/...`) | `denetim fotograf nesnesi okuma/ekleme/guncelleme` | **hepsi RED** (görmez / yazamaz / güncelleyemez) |
| 3.15b | D | `insert denetim_degisim_gecmisi` takip kaydı için | `gecmis ekleme` | **RED** |
| 3.16 | A | `select` + `update` takip kaydı ve geçmişi (oluşturan sıfatıyla) | mevcut sahiplik dalları | **görür / başarılı** (regresyon) |
| 3.17 | B | takip kaydını `select` + `takip_atanan_email` ata/değiştir | `denetim guncelleme` (yönetim) | **görür / başarılı** |
| 3.18 | C | atama kaldırıldıktan sonra (`takip_atanan_email` = başkası) `select denetimler` / `select denetim_fotograflari` | tüm okuma politikaları | **görmez** |

## 3c. Gerçek PWA akış testi (yalnız SQL yeterli değil)

Ham SQL testi `app.js`'in satırın **tamamını** PATCH ettiğini ve otomatik yazdığı
alanları (`son_degistiren_email/ad/rol/at`, `updated_at`) yakalamaz. C hesabıyla
gerçek uygulamada (veya PostgREST üzerinden `app.js` gövdesini birebir taklit ederek):

| # | Adım | Beklenen |
|---|---|---|
| 3c.1 | C giriş yapar, kendine atanmış takip kaydını açar | kayıt ve maddeler yüklenir |
| 3c.2 | C bir maddeyi günceller (`durum`, `bulgu_secenegi`) — `app.js` `saha_kontrol` + `denetimler` satırını `son_degistiren_*` ile PATCH eder | **başarılı**; trigger reddetmez |
| 3c.3 | C bir fotoğraf ekler (Storage nesnesi + metadata, `x-upsert:true`) | **başarılı** |
| 3c.4 | C takibi kapatır: `denetim_durumu` → `Çalışma Tamamlandı` (+ `calisma_tamamlandi_at`, `son_degistiren_*`) | **başarılı**; `WITH CHECK` ve trigger izin verir |
| 3c.5 | 3c.4 sonrası C aynı kaydı tekrar güncellemeye çalışır | **RED** (`USING` — tamamlanmış satırdan güncelleme başlatılamaz) |
| 3c.6 | `denetim_degisim_gecmisi`'nde C'nin işlemleri için satır oluştu | **evet**, `son_degistiren_email` = C |

## 4. Regresyon (mevcut davranış bozulmamalı)

| # | Aktör | İşlem | Beklenen |
|---|---|---|---|
| 4.1 | A | kendi ana denetimini `select` / `update` | değişmedi |
| 4.2 | D | A'nın ana denetimini `select` | görmez (önceki gibi) |
| 4.3 | B | tüm denetimleri `select` | görür (önceki gibi) |
| 4.4 | A | kendi denetimini `delete` | RED (mühendis silemez) |

## 5. PR'a eklenecek çıktı

- Hangi Supabase branch'inde koşuldu, hangi migration'lar uygulanmıştı.
- Her senaryo satırı için ✅ / ❌ ve ❌ olanların açıklaması.
- `aves_oturum_emaili()` claim kaynağının doğrulandığına dair not.
