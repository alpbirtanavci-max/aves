-- saha_kontrol(denetim_id) üzerinde iki birebir aynı index vardı (idx_saha_denetim,
-- saha_kontrol_denetim_id_idx) — her INSERT/UPDATE'te ikisi de bakım gerektiriyordu.
-- Daha eski/gereksiz adı olan idx_saha_denetim kaldırılıyor, saha_kontrol_denetim_id_idx
-- (Postgres'in otomatik FK-index adlandırma kuralına uyan) korunuyor.
--
-- saha_kontrol.madde_id -> madde_kutuphanesi.madde_id foreign key'i indekssizdi.
-- Bu, o sütuna göre join/filtre yapan sorguları ve referans edilen satırın
-- silinmesi/güncellenmesi sırasındaki FK doğrulamasını yavaşlatabilir.
begin;

drop index if exists public.idx_saha_denetim;
create index if not exists saha_kontrol_madde_id_idx on public.saha_kontrol (madde_id);

commit;
