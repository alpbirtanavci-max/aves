# RLS Test Kontrol Listesi

RLS (satır güvenliği) veya istemci yetki mantığına dokunan **her** PR bu listeyi bir
Supabase branch'inde gerçek çalıştırır ve çıktı özetini PR'a ekler. Statik test
(`r15d-static-test.mjs`) bunun yerine geçmez.

---

## 1. Test edilecek roller (üç gerçek hesap)

| Persona | `kullanici_profilleri.rol` | Rolü |
|---|---|---|
| **A — İlk denetçi** | `muhendis` | Ana denetimi oluşturur, takip kaydını açar |
| **B — Yönetim** | `yonetici` veya `teknik_mudur` | Takip mühendisi atar |
| **C — Atanmış ikinci mühendis** | `muhendis` | B tarafından takip kaydına atanır; kaydı oluşturan **değildir** |
| **D — İlgisiz mühendis** | `muhendis` | Hiçbir role atanmamış; negatif kontrol |

## 2. Harness deseni (pgTAP / düz SQL)

Testler bir Supabase branch'inde koşar; her persona için oturum taklit edilir:

```sql
-- Supabase JWT taklidi. aves_oturum_emaili()'nin gerçekte hangi claim'i okuduğunu
-- Supabase panelinden DOĞRULA (genelde auth.jwt() ->> 'email').
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

| # | Aktör | İşlem | Beklenen |
|---|---|---|---|
| 3.1 | C | `select` takip `denetimler` satırı | **görür** (1 satır) |
| 3.2 | C | `select` takip kaydının `saha_kontrol` satırları | **görür** (tümü) |
| 3.3 | C | `update saha_kontrol` — bir maddeye `durum`, `bulgu_secenegi` yaz | **başarılı** (denetim_durumu 'Devam Ediyor'/'Gözden Geçirme' iken) |
| 3.4 | C | fotoğraf tablosuna `insert` (takip kaydı için) | **başarılı** |
| 3.5 | C | takip kaydının fotoğraflarını `select` | **görür** |
| 3.6 | C | `denetim_degisim_gecmisi` (geçmiş) satırı oluşması / okunması | **başarılı / görür** |
| 3.7 | C | takip `denetimler` satırını `update` — `denetim_durumu = 'Çalışma Tamamlandı'` iken herhangi bir alan | **RED** (durum kısıtı) |
| 3.8 | C | `update denetimler` — `takip_atanan_email`'i D'ye değiştir | **RED** (`with check`) |
| 3.9 | C | `update denetimler` — `musteri_unvani` / `denetimi_yapan` değiştir | **RED olması tercih edilir** — kapsam kararı "doğrulanması gereken" olarak işaretli |
| 3.10 | D | `select` aynı takip `denetimler` satırı | **görmez** (0 satır) |
| 3.11 | D | `update saha_kontrol` aynı takip kaydında | **RED** |
| 3.12 | A | `select` + `update` takip kaydı (oluşturan sıfatıyla) | **görür / başarılı** |
| 3.13 | B | takip kaydını `select` + `takip_atanan_email` ata/değiştir | **görür / başarılı** |
| 3.14 | C | atama kaldırıldıktan sonra (`takip_atanan_email` = başkası) `select` | **görmez** |

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
