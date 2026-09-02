-- AVES Saha R15D-rc3.9.36 — tamamlanmış denetim devir teslim bilgisi.
begin;
alter table public.denetimler
  add column if not exists devir_edilen_ad text,
  add column if not exists devir_edilen_email text,
  add column if not exists devir_at timestamptz,
  add column if not exists devir_notu text;
commit;
