-- AVES Saha R15D-rc3.9.7
-- Saha geri bildirimi #3: "01 - Kuyu Dibi" bölümü, kullanıcı sırayla kendi
-- uygulamasında gezip madde no'suz (bölüm içi sıra no'suyla) bildirdi.
-- Yalnız kütüphaneyi günceller; saha_kontrol snapshotlarını silmez/değiştirmez.

begin;

do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.madde_kutuphanesi
  where madde_id in (
    'MAD-0015','MAD-0016','MAD-0017','MAD-0018','MAD-0019','MAD-0020','MAD-0021',
    'MAD-0023','MAD-0024','MAD-0025','MAD-0026','MAD-0027','MAD-0028','MAD-0029',
    'MAD-0030','MAD-0031'
  ) and aktif is true;
  if v_count <> 16 then
    raise exception 'Beklenen 16 aktif madde bulunamadı (% bulundu)', v_count;
  end if;
end
$$;

-- Kuyu dibi 10, 11, 12, 14, 15, 16, 18, 19, 20: rehber kaldırılıyor (tekrar/gereksiz)
update public.madde_kutuphanesi set denetci_yonlendirmesi = null
where madde_id in ('MAD-0015','MAD-0016','MAD-0017','MAD-0019','MAD-0020','MAD-0021','MAD-0023','MAD-0024','MAD-0025');

-- Kuyu dibi 13, 21, 22: yalnız Uygulanmaz koşulu metni kaldırılıyor (buton kalır)
update public.madde_kutuphanesi set aranmaz_kosulu = null
where madde_id in ('MAD-0018','MAD-0026','MAD-0027');

-- Kuyu dibi 23, 24, 25, 26: hem rehber hem Uygulanmaz koşulu metni kaldırılıyor
update public.madde_kutuphanesi set denetci_yonlendirmesi = null, aranmaz_kosulu = null
where madde_id in ('MAD-0028','MAD-0029','MAD-0030','MAD-0031');

update public.kutuphane_bolum_surumleri set surum = surum + 1, updated_at = now()
where bolum ilike '%Kuyu Dibi%';

commit;

-- Salt okunur doğrulama.
select madde_id, kontrol_basligi, denetci_yonlendirmesi is null as rehber_bos, aranmaz_kosulu
from public.madde_kutuphanesi
where madde_id in (
  'MAD-0015','MAD-0016','MAD-0017','MAD-0018','MAD-0019','MAD-0020','MAD-0021',
  'MAD-0023','MAD-0024','MAD-0025','MAD-0026','MAD-0027','MAD-0028','MAD-0029',
  'MAD-0030','MAD-0031'
)
order by madde_id;
