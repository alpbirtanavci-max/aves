-- AVES Saha R15D-rc3.9.7
-- Saha geri bildirimi: karşı ağırlık ayırıcı bölmesi maddeleri (5.2.5.5.1 e, g, a).
-- Reel sahada hidrolik asansörde karşı ağırlık bulunmaz; "Karşı ağırlık veya
-- dengeleme ağırlığı bulunmuyorsa Aranmaz" notu yanıltıcı bulunduğundan
-- kaldırılıyor (buton dokunulmuyor, denetçi elle işaretler).
-- MAD-0049'da ayrıca ölçüm alanlarına gerek görülmedi, kaldırıldı.
-- Yalnız kütüphaneyi günceller; saha_kontrol snapshotlarını silmez/değiştirmez.

begin;

do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.madde_kutuphanesi
  where madde_id in ('MAD-0046','MAD-0047','MAD-0049') and aktif is true;
  if v_count <> 3 then
    raise exception 'Beklenen 3 aktif madde bulunamadı (% bulundu)', v_count;
  end if;
end
$$;

update public.madde_kutuphanesi set aranmaz_kosulu = null
where madde_id in ('MAD-0046','MAD-0047');

update public.madde_kutuphanesi set olcum_tanimlari = '[]'::jsonb
where madde_id = 'MAD-0049';

update public.kutuphane_bolum_surumleri
set surum = surum + 1, updated_at = now()
where bolum in (
  select distinct bolum from public.madde_kutuphanesi
  where madde_id in ('MAD-0046','MAD-0047','MAD-0049')
);

commit;

-- Salt okunur doğrulama.
select madde_id, kontrol_basligi, aranmaz_kosulu, jsonb_array_length(olcum_tanimlari) as olcu_sayisi
from public.madde_kutuphanesi
where madde_id in ('MAD-0045','MAD-0046','MAD-0047','MAD-0048','MAD-0049')
order by madde_id;
