-- AVES Saha R15D-rc3.9.21 — rc3.9.20 uygulanmış canlı şemayı güvenli geçişe al.
-- 72'nin ilk sürümü eski bağlantı sütunlarını kaldırmıştı. Bu migration sütunları
-- nullable olarak geri ekler ve açık rc3.9.14-19 istemcilerden gelen dokuz maddeyi
-- kategoriye dönüştürür. Mevcut kategori fotoğrafları ve Storage nesneleri korunur.

do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema='public' and table_name='denetim_fotograflari') then
    raise exception 'denetim_fotograflari tablosu bulunamadı';
  end if;
end $$;

begin;

alter table public.denetim_fotograflari
  add column if not exists saha_kontrol_id uuid,
  add column if not exists madde_id text;

create or replace function public.denetim_fotografi_legacy_kategori_ata()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.kategori is null or btrim(new.kategori) = '' then
    new.kategori := case new.madde_id
      when 'MAD-0006' then 'kuyu_dibi'
      when 'MAD-0072' then 'kuyu_dibi'
      when 'MAD-0110' then 'kuyu_boyunca'
      when 'MAD-0111' then 'kuyu_boyunca'
      when 'MAD-0162' then 'kabin_kabin_ustu'
      when 'MAD-0364' then 'kabin_kabin_ustu'
      when 'MAD-0366' then 'makine_sase'
      when 'MAD-0368' then 'makine_sase'
      when 'MAD-0369' then 'makine_sase'
      else null
    end;
  end if;
  if new.kategori is null then
    raise exception 'Fotoğraf kategorisi belirlenemedi (madde_id=%)', new.madde_id;
  end if;
  return new;
end;
$$;

drop trigger if exists denetim_fotografi_legacy_kategori_trg on public.denetim_fotograflari;
create trigger denetim_fotografi_legacy_kategori_trg
before insert or update on public.denetim_fotograflari
for each row execute function public.denetim_fotografi_legacy_kategori_ata();

create index if not exists denetim_fotograflari_madde_idx
  on public.denetim_fotograflari (saha_kontrol_id, created_at);

commit;

select column_name, is_nullable from information_schema.columns
where table_schema='public' and table_name='denetim_fotograflari'
  and column_name in ('kategori','saha_kontrol_id','madde_id')
order by column_name;
