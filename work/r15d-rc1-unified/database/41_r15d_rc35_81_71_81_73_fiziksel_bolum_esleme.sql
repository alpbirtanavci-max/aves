-- AVES Saha R15D-rc3.5
-- TS EN 81-71 ve TS EN 81-73 aktif kontrol maddelerini ayrı standart
-- bölümlerinden çıkarıp denetçinin çalıştığı fiziksel saha bölümlerine taşır.
--
-- Yalnız ana madde kütüphanesini değiştirir. Başlamış denetimlerin
-- public.saha_kontrol snapshot satırlarına, cevaplarına veya denetimlere dokunmaz.

begin;

create temporary table r15d_rc35_bolum_esleme (
  madde_id text primary key,
  hedef_bolum text not null
) on commit drop;

insert into r15d_rc35_bolum_esleme (madde_id, hedef_bolum) values
  -- TS EN 81-71: kuyu dibi
  ('MAD-0859', '01 - Kuyu Dibi'),

  -- TS EN 81-71: kuyu boyunca, durak kapıları ve sahanlıklar
  ('MAD-0845', '02 - Kuyu Boyunca'),
  ('MAD-0846', '02 - Kuyu Boyunca'),
  ('MAD-0847', '02 - Kuyu Boyunca'),
  ('MAD-0848', '02 - Kuyu Boyunca'),
  ('MAD-0850', '02 - Kuyu Boyunca'),
  ('MAD-0851', '02 - Kuyu Boyunca'),
  ('MAD-0854', '02 - Kuyu Boyunca'),
  ('MAD-0860', '02 - Kuyu Boyunca'),
  ('MAD-0861', '02 - Kuyu Boyunca'),
  ('MAD-0862', '02 - Kuyu Boyunca'),
  ('MAD-0863', '02 - Kuyu Boyunca'),
  ('MAD-0864', '02 - Kuyu Boyunca'),
  ('MAD-0865', '02 - Kuyu Boyunca'),
  ('MAD-0866', '02 - Kuyu Boyunca'),
  ('MAD-0867', '02 - Kuyu Boyunca'),
  ('MAD-0884', '02 - Kuyu Boyunca'),
  ('MAD-0885', '02 - Kuyu Boyunca'),

  -- TS EN 81-71: kabin ve kabin üstü
  ('MAD-0870', '03 - Kabin ve Kabin Üstü'),
  ('MAD-0871', '03 - Kabin ve Kabin Üstü'),
  ('MAD-0872', '03 - Kabin ve Kabin Üstü'),
  ('MAD-0873', '03 - Kabin ve Kabin Üstü'),
  ('MAD-0874', '03 - Kabin ve Kabin Üstü'),
  ('MAD-0875', '03 - Kabin ve Kabin Üstü'),
  ('MAD-0876', '03 - Kabin ve Kabin Üstü'),
  ('MAD-0877', '03 - Kabin ve Kabin Üstü'),
  ('MAD-0878', '03 - Kabin ve Kabin Üstü'),
  ('MAD-0879', '03 - Kabin ve Kabin Üstü'),
  ('MAD-0880', '03 - Kabin ve Kabin Üstü'),
  ('MAD-0881', '03 - Kabin ve Kabin Üstü'),
  ('MAD-0882', '03 - Kabin ve Kabin Üstü'),
  ('MAD-0886', '03 - Kabin ve Kabin Üstü'),

  -- TS EN 81-71: makine alanı
  ('MAD-0853', '04 - Makine ve Şase'),

  -- TS EN 81-71: elektrik, kumanda ve fonksiyon testleri
  ('MAD-0855', '05 - Elektrik ve Test'),
  ('MAD-0856', '05 - Elektrik ve Test'),
  ('MAD-0857', '05 - Elektrik ve Test'),
  ('MAD-0858', '05 - Elektrik ve Test'),
  ('MAD-0868', '05 - Elektrik ve Test'),
  ('MAD-0869', '05 - Elektrik ve Test'),

  -- TS EN 81-73: ön kontrol / uygulanabilirlik
  ('MAD-0889', '00 - Ön Kontrol'),

  -- TS EN 81-73: duraklar ve belirlenmiş sahanlık
  ('MAD-0900', '02 - Kuyu Boyunca'),
  ('MAD-0914', '02 - Kuyu Boyunca'),
  ('MAD-0915', '02 - Kuyu Boyunca'),
  ('MAD-0916', '02 - Kuyu Boyunca'),
  ('MAD-0917', '02 - Kuyu Boyunca'),
  ('MAD-0918', '02 - Kuyu Boyunca'),
  ('MAD-0919', '02 - Kuyu Boyunca'),
  ('MAD-0920', '02 - Kuyu Boyunca'),

  -- TS EN 81-73: kabin kumandaları
  ('MAD-0904', '03 - Kabin ve Kabin Üstü'),

  -- TS EN 81-73: elektrik, kumanda ve yangın senaryosu testleri
  ('MAD-0891', '05 - Elektrik ve Test'),
  ('MAD-0892', '05 - Elektrik ve Test'),
  ('MAD-0893', '05 - Elektrik ve Test'),
  ('MAD-0894', '05 - Elektrik ve Test'),
  ('MAD-0895', '05 - Elektrik ve Test'),
  ('MAD-0896', '05 - Elektrik ve Test'),
  ('MAD-0897', '05 - Elektrik ve Test'),
  ('MAD-0898', '05 - Elektrik ve Test'),
  ('MAD-0899', '05 - Elektrik ve Test'),
  ('MAD-0902', '05 - Elektrik ve Test'),
  ('MAD-0903', '05 - Elektrik ve Test'),
  ('MAD-0905', '05 - Elektrik ve Test'),
  ('MAD-0906', '05 - Elektrik ve Test'),
  ('MAD-0907', '05 - Elektrik ve Test'),
  ('MAD-0908', '05 - Elektrik ve Test'),
  ('MAD-0909', '05 - Elektrik ve Test'),
  ('MAD-0910', '05 - Elektrik ve Test'),
  ('MAD-0911', '05 - Elektrik ve Test'),
  ('MAD-0912', '05 - Elektrik ve Test'),
  ('MAD-0913', '05 - Elektrik ve Test'),
  ('MAD-0921', '05 - Elektrik ve Test');

do $$
declare
  v_mapping_count integer;
  v_library_count integer;
  v_wrong_source integer;
begin
  select count(*) into v_mapping_count from r15d_rc35_bolum_esleme;
  if v_mapping_count <> 70 then
    raise exception '81-71/81-73 bölüm eşlemesi 70 yerine % satır içeriyor', v_mapping_count;
  end if;

  select count(*) into v_library_count
  from public.madde_kutuphanesi m
  join r15d_rc35_bolum_esleme e using (madde_id)
  where m.aktif is true
    and m.standart_grubu in ('81-71', '81-73');

  if v_library_count <> 70 then
    raise exception 'Beklenen 70 aktif 81-71/81-73 maddesinden yalnız % tanesi bulundu', v_library_count;
  end if;

  select count(*) into v_wrong_source
  from public.madde_kutuphanesi m
  join r15d_rc35_bolum_esleme e using (madde_id)
  where coalesce(m.bolum, '') not in (
    e.hedef_bolum,
    '08 - TS EN 81-71 Tahribata Dayanıklı',
    '09 - TS EN 81-73 Yangın Davranışı'
  );

  if v_wrong_source <> 0 then
    raise exception '% madde beklenmeyen bir bölümde; migration güvenlik nedeniyle durduruldu', v_wrong_source;
  end if;
end
$$;

update public.madde_kutuphanesi m
set bolum = e.hedef_bolum
from r15d_rc35_bolum_esleme e
where m.madde_id = e.madde_id;

-- Hem yeni fiziksel bölümleri hem eski özel bölüm anahtarlarını artırmak,
-- çevrimdışı cihazların kütüphane değişikliğini kesin olarak görmesini sağlar.
update public.kutuphane_bolum_surumleri
set surum = surum + 1,
    updated_at = now()
where bolum in (
  '00 - Ön Kontrol',
  '01 - Kuyu Dibi',
  '02 - Kuyu Boyunca',
  '03 - Kabin ve Kabin Üstü',
  '04 - Makine ve Şase',
  '05 - Elektrik ve Test',
  '08 - TS EN 81-71 Tahribata Dayanıklı',
  '09 - TS EN 81-73 Yangın Davranışı'
);

do $$
declare
  v_remaining integer;
  v_mapped integer;
begin
  select count(*) into v_remaining
  from public.madde_kutuphanesi
  where aktif is true
    and bolum in (
      '08 - TS EN 81-71 Tahribata Dayanıklı',
      '09 - TS EN 81-73 Yangın Davranışı'
    );

  if v_remaining <> 0 then
    raise exception 'Özel 81-71/81-73 bölümlerinde % aktif madde kaldı', v_remaining;
  end if;

  select count(*) into v_mapped
  from public.madde_kutuphanesi m
  join r15d_rc35_bolum_esleme e using (madde_id)
  where m.bolum = e.hedef_bolum;

  if v_mapped <> 70 then
    raise exception 'Fiziksel bölüm eşlemesi 70 yerine % madde için doğrulandı', v_mapped;
  end if;
end
$$;

commit;

-- Salt okunur kurulum sonucu: standart ve yeni fiziksel bölüm dağılımı.
select standart_grubu, bolum, count(*) as aktif_madde
from public.madde_kutuphanesi
where aktif is true
  and standart_grubu in ('81-71', '81-73')
group by standart_grubu, bolum
order by standart_grubu, bolum;
