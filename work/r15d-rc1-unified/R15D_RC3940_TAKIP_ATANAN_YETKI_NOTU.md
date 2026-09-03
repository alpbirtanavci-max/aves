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
`OLD.takip_atanan_email` üzerinden. **SECURITY INVOKER** + `current_user in ('postgres',
'service_role','supabase_admin')` erken çıkışı — `aves_takip_referansini_kilitle` /
`aves_takip_zincirini_kilitle` ile aynı desen; SQL bakım rolleri kilidin dışında.

**`app/app.js`** — sürüm `rc3.9.39 → rc3.9.40` (4 dosya). `.photo-remove` düğmesi artık
`fotoSilebilir` (sahip / `canSeeAllInspections` = yönetici·teknik müdür / arşiv yetkisi)
ile korunuyor — RLS DELETE politikasıyla (68/75) birebir hizalı. Atanan mühendis fotoğraf
**ekler**, silmez (DELETE politikaları bilinçli olarak değişmedi, karar D2).

## DELETE neden kapsam dışı (karar D2, 2026-09-03)

Atanan mühendise fotoğraf silme yetkisi verilmedi. DELETE politikaları (`75_...`)
korunuyor; app.js düğmesi de gizlendiği için "düzenleyebilir görünüp 403 alma" durumu yok.

## Canlı uygulama sırası (yalnız kullanıcı açıkça isteyince)

1. Supabase branch aç, `79_...sql`'i uygula, sonundaki salt okunur `select`leri kontrol et
   (11 politika + `trg_aves_takip_atanan_alan_kilidi` görünmeli).
2. `RLS_TEST_CHECKLIST.md` §1b + §3–4 + §3c senaryolarını **dört test kimliğiyle** koş,
   çıktıyı PR'a ekle.
3. Eklenen "atanan takip mühendisi" dalları 11 politikada tutarlı olarak
   `public.aves_oturum_emaili()` kullanır. (Fotoğraf/storage politikalarının mevcut
   sahip/rol dalları hâlâ `lower(auth.jwt() ->> 'email')` — bu pre-existing davranış,
   bu migrationda değişmedi.)
4. Yeşilse `main` branch'e uygula, PWA sürümünü (`rc3940` cache) yayına al.

## Geri dönüş planı

Migration 79 yalnız `drop policy` + `create policy` + `create trigger`. Geri almak için:
78 ve 42/68/69/70/71'deki politika gövdelerini yeniden `create` et, trigger'ı `drop`.
Şema/veri dokunulmadığı için veri kaybı riski yok. `backup/` dalları referans.

## Test

`node work/r15d-rc1-unified/tests/r15d-static-test.mjs` → 333/333.
Statik test RLS davranışını doğrulamaz — canlı test §2 zorunlu.

## Canlı şema doğrulaması (2026-09-03, Supabase MCP salt okunur)

- `aves_oturum_emaili()` = `lower(coalesce(auth.jwt() ->> 'email',''))` — fotoğraf
  politikalarındaki ifadeyle authenticated kullanıcı için birebir aynı. Bulgu #3 kapandı.
- 11 politikanın tümü canlıda beklenen ad/tablo/komutla mevcut.
- `denetimler` trigger sırası yeni trigger'ı `trg_aves_denetim_kimligi`'den sonra,
  `trg_aves_takip_zincir_kilidi`'den önce koyuyor — `son_degistiren_*` sıralaması güvenli.

## Bu migration kapsamı dışı — ayrı ele alınacak advisor bulguları

- **security · `anon` SECURITY DEFINER RPC**: 14 `aves_*` yardımcı fonksiyonu `anon`
  rolüne RPC ile açık. app.js hiçbirini RPC ile çağırmıyor → `revoke execute ... from anon`
  güvenli (authenticated grant'ı RLS için korunur). Ayrı PR.
- **perf · `auth_rls_initplan`**: `denetim_fotograflari` politikalarında `auth.jwt()`
  satır başına yeniden değerlendiriliyor; `(select auth.jwt())` sarımıyla düzeltilir.
  Bu migrationda mevcut davranış korundu (diff'i küçük tutmak için).
- **perf · `multiple_permissive_policies`** (`denetimler`, `saha_kontrol`): 78'in eklediği
  ikinci UPDATE politikasından; ek yük düşük, konsolidasyon opsiyonel.
