-- AVES R15D-rc3 — otomatik Uygulanmaz gerekçesi için kalıcı alan
-- Uygulandı: 2026-08-12, canlı proje jmccmkqyncunpqliqvox.
--
-- Denetim oluşturulurken tahrik tipi / makine dairesi tipi uyuşmazlığından
-- hesaplanan gerekçe metni ("Hidrolik asansörlere özgü madde (bu asansör:
-- Elektrikli)") hiçbir sütuna yazılmıyor, hesaplanır hesaplanmaz atılıyordu.
-- Etkilenen kapsam doğrulandı: tahrik_kosulu veya md_kosulu tanımlı 215
-- aktif maddenin tamamında (215/215) statik aranmaz_kosulu alanı da boş —
-- yani denetçi bu maddelerde otomatik Uygulanmaz gördüğünde hiçbir gerekçe
-- göremiyordu.
--
-- Ölçüme bağlı otomatik Uygulanmaz kuralı (otomatik_aranmaz_kurali, 4 aktif
-- madde) ayrıca kontrol edildi: bu 4 maddenin tamamında aranmaz_kosulu zaten
-- dolu, dolayısıyla o yol için ek alan gerekmiyor.
--
-- Bu, denetim başına hesaplanan ve tarihsel snapshot niteliğinde bir alandır;
-- madde_kutuphanesi'ne değil yalnızca saha_kontrol'e eklenir.

begin;

alter table public.saha_kontrol add column if not exists otomatik_gerekce text;

commit;

-- Salt okunur doğrulama
select column_name, is_nullable, data_type
from information_schema.columns
where table_schema='public' and table_name='saha_kontrol' and column_name='otomatik_gerekce';
