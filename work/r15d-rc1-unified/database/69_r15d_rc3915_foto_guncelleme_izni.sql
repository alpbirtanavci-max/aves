-- AVES Saha R15D-rc3.9.15 — denetim_fotograflari yazımı canlıda 403 veriyordu
-- Sebep: API.upsert() tüm tablolarda "Prefer: resolution=merge-duplicates" kullanıyor,
-- bu PostgREST'te INSERT ... ON CONFLICT DO UPDATE üretir. Çakışma hiç oluşmasa bile
-- Postgres bu ifadeyi planlamak için tabloda UPDATE ayrıcalığı ister. 68 numaralı migration
-- yalnız select/insert/delete vermişti, UPDATE eksikti — her fotoğraf yazımı 403 ile düşüyordu.

do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema='public' and table_name='denetim_fotograflari') then
    raise exception 'denetim_fotograflari tablosu bulunamadı — 68 numaralı migration önce uygulanmalı';
  end if;
end $$;

begin;

grant update on public.denetim_fotograflari to authenticated;

drop policy if exists "denetim fotograflari guncelleme" on public.denetim_fotograflari;
create policy "denetim fotograflari guncelleme" on public.denetim_fotograflari for update to authenticated
using (exists (
  select 1 from public.denetimler d
  where d.id = denetim_id and d.denetim_durumu <> 'Çalışma Tamamlandı' and (
    lower(d.olusturan_email) = lower(auth.jwt() ->> 'email') or exists (
      select 1 from public.kullanici_profilleri p
      where lower(p.email) = lower(auth.jwt() ->> 'email') and p.aktif and p.rol in ('yonetici','teknik_mudur')
    )
  )
))
with check (exists (
  select 1 from public.denetimler d
  where d.id = denetim_id and d.denetim_durumu <> 'Çalışma Tamamlandı' and (
    lower(d.olusturan_email) = lower(auth.jwt() ->> 'email') or exists (
      select 1 from public.kullanici_profilleri p
      where lower(p.email) = lower(auth.jwt() ->> 'email') and p.aktif and p.rol in ('yonetici','teknik_mudur')
    )
  )
));

commit;

-- Doğrulama (salt okunur)
select grantee, privilege_type from information_schema.role_table_grants
where table_schema='public' and table_name='denetim_fotograflari' and grantee='authenticated'
order by privilege_type;
