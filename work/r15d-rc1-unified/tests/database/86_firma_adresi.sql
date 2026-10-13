-- Migration 86: firma adresi ve asansör adresi ayrı saklanabilmeli.
begin;

do $$
declare
  nullable text;
  inserted_id uuid;
  stored_firma text;
  stored_asansor text;
begin
  select is_nullable into nullable
  from information_schema.columns
  where table_schema = 'public' and table_name = 'denetimler' and column_name = 'firma_adresi';
  if nullable is distinct from 'YES' then
    raise exception 'firma_adresi kolonu nullable değil veya bulunamadı';
  end if;

  insert into public.denetimler (
    musteri_unvani, asansor_seri_no, olusturan_email, ana_standart,
    firma_adresi, denetim_adresi
  ) values (
    'Adres ayrımı testi', 'SN-86-ADDRESS', 'test@example.local', '81-20',
    'Asansör firmasının adresi', 'Asansörün bulunduğu adres'
  ) returning id into inserted_id;

  select firma_adresi, denetim_adresi into stored_firma, stored_asansor
  from public.denetimler where id = inserted_id;
  if stored_firma <> 'Asansör firmasının adresi' or stored_asansor <> 'Asansörün bulunduğu adres' then
    raise exception 'Firma ve asansör adresleri ayrı korunmadı';
  end if;
end $$;

rollback;
