-- AVES Saha R15D-rc3.9.20 — fotoğrafları denetim seviyesinde kategori sekmesine taşı.
-- Veri koruma ilkesi: mevcut metadata veya Storage nesnesi silinmez. Madde bazlı
-- eski kayıtlar, rc3.9.14-19'da fotoğraf kabul eden dokuz maddeden kategoriye çevrilir.
-- Eski sütunlar geçiş döneminde korunur; açık eski istemciler veri kaybetmeden çalışır.

do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema='public' and table_name='denetim_fotograflari') then
    raise exception 'denetim_fotograflari tablosu bulunamadı — 68 numaralı migration önce uygulanmalı';
  end if;
end $$;

begin;

alter table public.denetim_fotograflari
  add column if not exists kategori text;

update public.denetim_fotograflari
set kategori = case madde_id
  when 'MAD-0006' then 'kuyu_dibi'
  when 'MAD-0072' then 'kuyu_dibi'
  when 'MAD-0110' then 'kuyu_boyunca'
  when 'MAD-0111' then 'kuyu_boyunca'
  when 'MAD-0162' then 'kabin_kabin_ustu'
  when 'MAD-0364' then 'kabin_kabin_ustu'
  when 'MAD-0366' then 'makine_sase'
  when 'MAD-0368' then 'makine_sase'
  when 'MAD-0369' then 'makine_sase'
  else kategori
end
where kategori is null;

do $$
begin
  if exists (select 1 from public.denetim_fotograflari where kategori is null) then
    raise exception 'Kategoriye eşlenemeyen eski fotoğraf var; veri silinmeden migration durduruldu';
  end if;
end $$;

alter table public.denetim_fotograflari
  alter column kategori set not null;

alter table public.denetim_fotograflari
  drop constraint if exists denetim_fotografi_kategori_gecerli;
alter table public.denetim_fotograflari
  add constraint denetim_fotografi_kategori_gecerli check (
    kategori in ('kuyu_dibi','kuyu_boyunca','kabin_kabin_ustu','makine_sase','kumanda_grubu')
  );

create index if not exists denetim_fotograflari_kategori_idx
  on public.denetim_fotograflari (denetim_id, kategori, created_at);

commit;

select kategori, count(*) from public.denetim_fotograflari group by kategori order by kategori;
