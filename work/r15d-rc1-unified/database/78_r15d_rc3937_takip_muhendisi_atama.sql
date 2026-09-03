-- AVES Saha — takip mühendisi ataması. Yönetim atar; atanan mühendis yalnız
-- devam eden takip maddelerini güncelleyebilir.
begin;
alter table public.denetimler
  add column if not exists takip_atanan_email text,
  add column if not exists takip_atanan_ad text,
  add column if not exists takip_atama_at timestamptz;

drop policy if exists "takip atanan denetim guncelleme" on public.denetimler;
create policy "takip atanan denetim guncelleme" on public.denetimler
for update to authenticated
using (public.aves_aktif_kullanici_mi() and lower(coalesce(takip_atanan_email,'')) = public.aves_oturum_emaili())
with check (public.aves_aktif_kullanici_mi() and lower(coalesce(takip_atanan_email,'')) = public.aves_oturum_emaili());

drop policy if exists "takip atanan saha guncelleme" on public.saha_kontrol;
create policy "takip atanan saha guncelleme" on public.saha_kontrol
for update to authenticated
using (public.aves_aktif_kullanici_mi() and exists (
  select 1 from public.denetimler d where d.id = saha_kontrol.denetim_id
    and d.denetim_durumu in ('Devam Ediyor','Gözden Geçirme')
    and lower(coalesce(d.takip_atanan_email,'')) = public.aves_oturum_emaili()
))
with check (public.aves_aktif_kullanici_mi() and exists (
  select 1 from public.denetimler d where d.id = saha_kontrol.denetim_id
    and d.denetim_durumu in ('Devam Ediyor','Gözden Geçirme')
    and lower(coalesce(d.takip_atanan_email,'')) = public.aves_oturum_emaili()
));
commit;
