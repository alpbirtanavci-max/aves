-- 07 - TS EN 81-72 İtfaiyeci Asansörü bölümü ÜB.FR.40 R.04 kaynak eşlemesiyle tamamlandı (132/132 madde).
-- Cihaz tarafı önbelleği (kutuphane_bolum_surumleri) tetiklemek için sürüm artırılıyor.
update public.kutuphane_bolum_surumleri set surum = 4, updated_at = now() where bolum = '07 - TS EN 81-72 İtfaiyeci Asansörü';
