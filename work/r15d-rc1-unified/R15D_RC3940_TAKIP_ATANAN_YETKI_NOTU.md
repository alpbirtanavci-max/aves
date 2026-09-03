# R15D-rc3.9.40 — Takip Atanan Mühendis Yetkisi (Teslim Notu)

## Ne değişti

**`database/79_r15d_rc3940_takip_atanan_yetki.sql`** — 11 RLS politikası yeniden yazıldı +
1 trigger eklendi. Kolon/şema değişikliği **yok** (`takip_atanan_*` kolonları 78'de eklendi).

| Katman | Politika | Değişiklik |
|---|---|---|
| `denetimler` | `denetimleri okuma` | `+ takip_atanan_email` dalı |
| `denetimler` | `takip atanan denetim guncelleme` | `USING` = aktif iki durum, `WITH CHECK` = + `Çalışma Tamamlandı` |
| `saha_kontrol` | `saha okuma` | `+ takip_atanan_email` dalı |
| `denetim_degisim_gecmisi` | `gecmis okuma`, `gecmis ekleme` | `+ takip_atanan_email` dalı (ekleme: aktif üç durum) |
| `denetim_fotograflari` | `okuma`, `ekleme`, `guncelleme` | `+ takip_atanan_email` dalı (yazma: `<> 'Çalışma Tamamlandı'`) |
| `storage.objects` | `okuma`, `ekleme`, `guncelleme` (bucket `denetim-fotograflari`) | `+ takip_atanan_email` dalı |

**Trigger `aves_takip_atanan_alan_kilidi`** (`BEFORE UPDATE` on `denetimler`): atanan takip
mühendisi (sahip/yönetim değil) yalnız izin listesindeki alanları değiştirebilir; liste
dışı her kolon (yeni kolonlar dahil) kilitli. Durum yalnız ileri yön. Yetki
`OLD.takip_atanan_email` üzerinden.

**`app/app.js`** — sürüm `rc3.9.39 → rc3.9.40` (4 dosya). `.photo-remove` düğmesi artık
`fotoSilebilir` (sahip / admin / arşiv yetkisi) ile korunuyor — atanan mühendis fotoğraf
**ekler**, silmez (DELETE politikaları bilinçli olarak değişmedi, karar D2).

## DELETE neden kapsam dışı (karar D2, 2026-09-03)

Atanan mühendise fotoğraf silme yetkisi verilmedi. DELETE politikaları (`75_...`)
korunuyor; app.js düğmesi de gizlendiği için "düzenleyebilir görünüp 403 alma" durumu yok.

## Canlı uygulama sırası (yalnız kullanıcı açıkça isteyince)

1. Supabase branch aç, `79_...sql`'i uygula, sonundaki salt okunur `select`leri kontrol et
   (11 politika + `trg_aves_takip_atanan_alan_kilidi` görünmeli).
2. `RLS_TEST_CHECKLIST.md` §1b + §3–4 + §3c senaryolarını **dört test kimliğiyle** koş,
   çıktıyı PR'a ekle.
3. `aves_oturum_emaili()` = `lower(auth.jwt() ->> 'email')` olduğunu panelden doğrula
   (denetimler politikaları helper, fotoğraf politikaları jwt kullanıyor).
4. Yeşilse `main` branch'e uygula, PWA sürümünü (`rc3940` cache) yayına al.

## Geri dönüş planı

Migration 79 yalnız `drop policy` + `create policy` + `create trigger`. Geri almak için:
78 ve 42/68/69/70/71'deki politika gövdelerini yeniden `create` et, trigger'ı `drop`.
Şema/veri dokunulmadığı için veri kaybı riski yok. `backup/` dalları referans.

## Test

`node work/r15d-rc1-unified/tests/r15d-static-test.mjs` → 332/332 (7 yeni kontrol).
Statik test RLS davranışını doğrulamaz — canlı test §2 zorunlu.
