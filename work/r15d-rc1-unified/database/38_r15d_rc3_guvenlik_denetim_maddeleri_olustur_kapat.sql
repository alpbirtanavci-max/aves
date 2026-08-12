-- P0 GÜVENLİK: denetim_maddeleri_olustur(uuid) SECURITY DEFINER fonksiyonu RLS'i
-- atlayarak herhangi bir denetimler satırını okuyup saha_kontrol'e satır ekleyebiliyordu.
-- Kod taramasıyla doğrulandı: app.js, hiçbir trigger ve hiçbir RLS policy bu
-- fonksiyonu KULLANMIYOR (tamamen ölü/yetim kod) — ama PUBLIC'e (dolayısıyla anon'a,
-- yani kimliksiz herhangi bir internet kullanıcısına) EXECUTE açıktı. Kimliksiz biri
-- /rest/v1/rpc/denetim_maddeleri_olustur ile tahmin ettiği bir denetim_id için
-- saha_kontrol satırları oluşturabilirdi.
--
-- Fonksiyonu silmek yerine (geriye dönük uyumluluk için, ileride gerçekten
-- kullanılıyorsa diye), yalnızca sunucu taraflı erişime (postgres/service_role)
-- kısıtlıyoruz. Ayrıca bu ve iki masum ama "mutable search_path" linter uyarısı
-- veren fonksiyonun search_path'ini sabitliyoruz (davranış değişmiyor, zaten
-- yalnızca public.* nesnelerini tam nitelikli çağırıyorlardı).
begin;

revoke execute on function public.denetim_maddeleri_olustur(uuid) from public, anon, authenticated;

alter function public.denetim_maddeleri_olustur(uuid) set search_path = 'public', 'pg_temp';
alter function public.set_updated_at() set search_path = 'public', 'pg_temp';
alter function public.aves_oturum_emaili() set search_path = 'public', 'pg_temp';

commit;
