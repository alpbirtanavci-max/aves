-- AVES R15D-RC1 CANLI ON KONTROL — SALT OKUNUR
-- Bu dosya veri veya şema değiştirmez. 21_r15d_guvenli_gecis.sql öncesinde çalıştırılır.

select current_database() as veritabani, current_user as calistiran, now() as kontrol_zamani;

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('kullanici_profilleri','madde_kutuphanesi','kutuphane_bolum_surumleri','denetimler','saha_kontrol')
order by table_name;

select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('kullanici_profilleri','madde_kutuphanesi','denetimler','saha_kontrol')
order by table_name, ordinal_position;

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('kullanici_profilleri','madde_kutuphanesi','denetimler','saha_kontrol')
order by tablename, policyname;

select 'kullanici_profilleri' as nesne, count(*) as kayit from public.kullanici_profilleri
union all select 'madde_kutuphanesi', count(*) from public.madde_kutuphanesi
union all select 'denetimler', count(*) from public.denetimler
union all select 'saha_kontrol', count(*) from public.saha_kontrol;

select rol, aktif, count(*) from public.kullanici_profilleri group by rol, aktif order by rol, aktif;
select denetim_durumu, count(*) from public.denetimler group by denetim_durumu order by denetim_durumu;
select durum, count(*) from public.saha_kontrol group by durum order by durum nulls first;

select denetim_id, madde_id, count(*) as tekrar
from public.saha_kontrol
group by denetim_id, madde_id
having count(*) > 1
order by tekrar desc, denetim_id, madde_id;

select
  count(*) filter (where madde_id = 'MAD-0561' or (madde_id between 'MAD-0562' and 'MAD-0613' and madde_id <> 'MAD-0611')) as baslik_hedef_satiri,
  count(*) filter (where (madde_id = 'MAD-0561' or (madde_id between 'MAD-0562' and 'MAD-0613' and madde_id <> 'MAD-0611')) and kontrol_basligi = 'KASNAK KANALLARI KONTROLÜ') as eski_baslik,
  count(*) filter (where (madde_id = 'MAD-0561' and kontrol_basligi = 'Testler') or (madde_id between 'MAD-0562' and 'MAD-0613' and madde_id <> 'MAD-0611' and kontrol_basligi = 'Hidrolik Kontrol ve Testleri')) as duzeltilmis_baslik
from public.madde_kutuphanesi;

select madde_id, kontrol_basligi, md_kosulu, aktif
from public.madde_kutuphanesi
where madde_id in ('MAD-0460','MAD-0467','MAD-0486','MAD-0492','MAD-0561','MAD-0611','MAD-0814','MAD-0824','MAD-1010')
order by madde_id;
