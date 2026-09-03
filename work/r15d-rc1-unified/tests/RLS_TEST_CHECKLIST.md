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
| 3.7 | C | `insert storage.objects` bucket `denetim-fotograflari`, path `<takip_denetim_id>/...` | `denetim fotograf nesnesi ekleme` | **başarılı** |
| 3.8 | C | `update` (upsert / `x-upsert:true`) aynı `storage.objects` nesnesi | `denetim fotograf nesnesi guncelleme` | **başarılı** — yoksa upsert 403/400 |
| 3.9 | C | `select denetim_fotograflari` + `select storage.objects` takip fotoğrafları | `... okuma` (68 / 71) | **görür** |
| 3.10 | C | takip `denetimler` `update` — `denetim_durumu = 'Çalışma Tamamlandı'` iken herhangi bir alan | `takip atanan denetim guncelleme` | **RED** (durum kısıtı; tamamlanmış kaydı yeniden açamaz) |
| 3.11 | C | `update denetimler` — `takip_atanan_email`'i D'ye değiştir | `... with check` | **RED** |
| 3.12 | C | `update denetimler` — `musteri_unvani` / `denetimi_yapan` / `denetim_tarihi` değiştir (aktif durumda) | üst bilgi koruma trigger/RPC | **RED** (seçenek A/B) **veya** kabul edilen risk notu (seçenek C) — migration 79 hangisini seçtiyse |
| 3.13 | D | `select` aynı takip `denetimler` satırı | `denetimleri okuma` | **görmez** (0 satır) |
| 3.14 | D | `update saha_kontrol` / `insert denetim_fotograflari` aynı takip kaydında | ilgili politikalar | **RED** |
| 3.15 | D | `select storage.objects` takip fotoğrafı | `denetim fotograf nesnesi okuma` | **görmez** |
| 3.16 | A | `select` + `update` takip kaydı ve geçmişi (oluşturan sıfatıyla) | mevcut sahiplik dalları | **görür / başarılı** (regresyon) |
| 3.17 | B | takip kaydını `select` + `takip_atanan_email` ata/değiştir | `denetim guncelleme` (yönetim) | **görür / başarılı** |
| 3.18 | C | atama kaldırıldıktan sonra (`takip_atanan_email` = başkası) `select denetimler` / `select denetim_fotograflari` | tüm okuma politikaları | **görmez** |

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
