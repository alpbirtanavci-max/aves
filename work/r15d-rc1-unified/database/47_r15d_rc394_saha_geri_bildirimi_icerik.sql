-- AVES Saha R15D-rc3.9.4
-- Gerçek sahada denetçinin bir denetim sırasında bildirdiği içerik düzeltmeleri.
-- Veri silmez; yalnız madde_kutuphanesi metadata alanlarını günceller.
-- Başlamış denetimlerin saha_kontrol snapshot satırlarına dokunmaz.

begin;

do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.madde_kutuphanesi where madde_id in ('MAD-0082','MAD-0083','MAD-0008C','MAD-0401','MAD-0209');
  if v_count <> 5 then
    raise exception 'Beklenen 5 madde yerine % tanesi bulundu', v_count;
  end if;
end
$$;

-- 1) Kabin koruma eteği: denetçi sahada açı ölçemez; açı alanları kaldırıldı.
update public.madde_kutuphanesi
set olcum_tanimlari = (
  select jsonb_agg(elem) from jsonb_array_elements(olcum_tanimlari) elem
  where elem->>'id' <> 'kabin_etegi_alt_pah_acisi'
)
where madde_id = 'MAD-0082';

update public.madde_kutuphanesi
set olcum_tanimlari = (
  select jsonb_agg(elem) from jsonb_array_elements(olcum_tanimlari) elem
  where elem->>'id' <> 'kabin_etegi_cikinti_pah_acisi'
)
where madde_id = 'MAD-0083';

-- 2) Konsol/paten ölçüleri kuyu boyunca uzun mesafeler olabilir; mm birimi
-- pratik değil. Birim zorunluluğu kaldırıldı, denetçi doğal ölçek yazabilir.
update public.madde_kutuphanesi
set olcum_tanimlari = (
  select jsonb_agg(
    case when elem->>'id' in (
      'kabin_konsol_en_buyuk_aralik','karsi_agirlik_konsol_en_buyuk_aralik',
      'kabin_patenleri_dusey_aralik','karsi_agirlik_patenleri_dusey_aralik'
    ) then elem - 'birim' else elem end
  ) from jsonb_array_elements(olcum_tanimlari) elem
)
where madde_id = 'MAD-0008C';

-- 3) Denetçi yönlendirmesi, resmi metnin birebir tekrarı değil, eksiksiz bir
-- talimat cümlesi olmalı.
update public.madde_kutuphanesi
set denetci_yonlendirmesi = 'Devre şemaları, bakım, muayene ve tamir için talimatlar ve kayıt defteri bulunmalıdır.'
where madde_id = 'MAD-0401';

update public.madde_kutuphanesi
set denetci_yonlendirmesi = 'Asansörün yanına, tüm duraklardan görülebilecek şekilde en az 50 mm boyutunda ''Yangın anında asansörü kullanmayınız'' yasak işaretinin (EN ISO 7010 P020) yerleştirildiğini kontrol edin.'
where madde_id = 'MAD-0209';

update public.kutuphane_bolum_surumleri
set surum = surum + 1, updated_at = now()
where bolum in ('02 - Kuyu Boyunca', '03 - Kabin ve Kabin Üstü', '04 - Makine ve Şase');

commit;

-- Salt okunur doğrulama.
select madde_id, olcum_tanimlari, denetci_yonlendirmesi
from public.madde_kutuphanesi
where madde_id in ('MAD-0082','MAD-0083','MAD-0008C','MAD-0401','MAD-0209')
order by madde_id;
