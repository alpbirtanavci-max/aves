-- AVES Saha R15D-rc3.9.4
-- Saha geri bildirimi: 5 madde içerik olarak kapı/kuyu maddesi olmasına
-- rağmen "05 - Elektrik ve Test" bölümünde bulunuyordu. Aynı standart_madde_no
-- grubundaki kardeş maddelerin tamamı "02 - Kuyu Boyunca" bölümünde; bu 5
-- madde tutarlılık için aynı fiziksel bölüme taşınıyor.
-- Veri silmez; başlamış denetimlerin saha_kontrol snapshot satırlarına dokunmaz.

begin;

create temporary table r15d_rc394_bolum_duzeltme (madde_id text primary key) on commit drop;
insert into r15d_rc394_bolum_duzeltme (madde_id) values
  ('MAD-0649'), -- Asansör kapılarının yangın ve duman dayanımı
  ('MAD-0652'), -- Elle açılan kapılı asansörde durakta bekleme süresi
  ('MAD-0655'), -- Durak kapısı önündeki ek bina kapısında mahsur kalmanın önlenmesi
  ('MAD-0656'), -- Düşey sürgülü kapılı yük asansöründe kuyu önü açıklığı
  ('MAD-0659'); -- Otomatik sürgülü durak kapısındaki çıkıntı ve pahlar

do $$
declare
  v_count integer;
  v_wrong_source integer;
begin
  select count(*) into v_count from r15d_rc394_bolum_duzeltme;
  if v_count <> 5 then raise exception 'Beklenen 5 madde yerine % tanesi listelendi', v_count; end if;

  select count(*) into v_wrong_source
  from public.madde_kutuphanesi m
  join r15d_rc394_bolum_duzeltme e using (madde_id)
  where coalesce(m.bolum, '') <> '05 - Elektrik ve Test';
  if v_wrong_source <> 0 then
    raise exception '% madde beklenen kaynak bölümde değil; migration güvenlik nedeniyle durduruldu', v_wrong_source;
  end if;
end
$$;

update public.madde_kutuphanesi m
set bolum = '02 - Kuyu Boyunca'
from r15d_rc394_bolum_duzeltme e
where m.madde_id = e.madde_id;

update public.kutuphane_bolum_surumleri
set surum = surum + 1, updated_at = now()
where bolum in ('02 - Kuyu Boyunca', '05 - Elektrik ve Test');

commit;

-- Salt okunur doğrulama.
select madde_id, bolum, standart_madde_no, kontrol_basligi
from public.madde_kutuphanesi
where madde_id in ('MAD-0649','MAD-0652','MAD-0655','MAD-0656','MAD-0659')
order by madde_id;
