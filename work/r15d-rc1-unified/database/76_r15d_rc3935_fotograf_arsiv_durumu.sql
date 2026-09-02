-- AVES Saha R15D-rc3.9.35 — denetim bazında fotoğraf arşiv izleri.
-- Mevcut fotoğraf veya denetim verisini değiştirmez; yalnız ZIP indirme ve
-- yetkili arşiv temizleme işlemlerinin denetim kaydında görünmesini sağlar.

begin;

alter table public.denetimler
  add column if not exists fotograf_arsiv_son_indirme_at timestamptz,
  add column if not exists fotograf_arsiv_son_indirme_by text,
  add column if not exists fotograf_arsiv_temizlendi_at timestamptz,
  add column if not exists fotograf_arsiv_temizlendi_by text,
  add column if not exists fotograf_arsiv_temizlenen_adet integer;

alter table public.denetimler
  drop constraint if exists denetimler_fotograf_arsiv_temizlenen_adet_check;
alter table public.denetimler
  add constraint denetimler_fotograf_arsiv_temizlenen_adet_check
  check (fotograf_arsiv_temizlenen_adet is null or fotograf_arsiv_temizlenen_adet >= 0) not valid;

commit;
