-- AVES R15D-rc3 — RLS policy isim temizliği
-- Uygulandı: 2026-08-12, canlı proje jmccmkqyncunpqliqvox.
--
-- Politikalar hâlâ eski sürüm önekleriyle ("R15C ...", "R13 ...")
-- adlandırılmıştı. Bu yalnızca bir etiket/isim değişikliğidir —
-- ALTER POLICY ... RENAME TO kullanıldığı için qual/with_check ifadeleri
-- hiç dokunulmadan korunur, güvenlik mantığı değişmez. Uygulama sonrası
-- her policy'nin qual/with_check metni uygulama öncesiyle karakter karakter
-- karşılaştırılarak doğrulandı; hiçbir fark bulunmadı.
--
-- Amaç: ileride yapılacak düzenlemelerde "R15C"/"R13" adlarının yanlış
-- sürüm/yetki varsayımına yol açmasını önlemek.

begin;

alter policy "R15C denetim silme" on public.denetimler rename to "denetim silme";
alter policy "R15C denetim ekleme" on public.denetimler rename to "denetim ekleme";
alter policy "R15C denetimleri okuma" on public.denetimler rename to "denetim okuma";
alter policy "R15C denetim guncelleme" on public.denetimler rename to "denetim guncelleme";

alter policy "R15C profilleri okuma" on public.kullanici_profilleri rename to "profil okuma";

alter policy "R13 kutuphane surumlerini okuma" on public.kutuphane_bolum_surumleri rename to "kutuphane surum okuma";

alter policy "R15C saha ekleme" on public.saha_kontrol rename to "saha ekleme";
alter policy "R15C saha okuma" on public.saha_kontrol rename to "saha okuma";
alter policy "R15C saha guncelleme" on public.saha_kontrol rename to "saha guncelleme";

commit;

-- Salt okunur doğrulama
select tablename, policyname, cmd, qual, with_check
from pg_policies where schemaname='public' order by tablename, cmd;
