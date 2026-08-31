-- AVES Saha R15D-rc3.9.16 — fotoğraf storage yüklemesi hâlâ 400 veriyordu
-- Sebep: app.js x-upsert:true kullanıyor (rc3.9.15'te eklendi). Supabase Storage bunu
-- storage.objects üzerinde INSERT ... ON CONFLICT DO UPDATE olarak çalıştırıyor;
-- çakışma hiç oluşmasa (tamamen yeni object_path) bile Postgres bu ifadeyi planlamak
-- için UPDATE RLS politikası ister. 68 numaralı migration yalnız insert/select/delete
-- politikası eklemişti, UPDATE eksikti.

do $$
begin
  if not exists (select 1 from storage.buckets where id = 'denetim-fotograflari') then
    raise exception 'denetim-fotograflari bucket bulunamadı — 68 numaralı migration önce uygulanmalı';
  end if;
end $$;

begin;

drop policy if exists "denetim fotograf nesnesi guncelleme" on storage.objects;
create policy "denetim fotograf nesnesi guncelleme" on storage.objects for update to authenticated
using (bucket_id = 'denetim-fotograflari' and exists (
  select 1 from public.denetimler d
  where d.id::text = split_part(name, '/', 1) and d.denetim_durumu <> 'Çalışma Tamamlandı' and (
    lower(d.olusturan_email) = lower(auth.jwt() ->> 'email') or exists (
      select 1 from public.kullanici_profilleri p
      where lower(p.email) = lower(auth.jwt() ->> 'email') and p.aktif and p.rol in ('yonetici','teknik_mudur')
    )
  )
))
with check (bucket_id = 'denetim-fotograflari' and exists (
  select 1 from public.denetimler d
  where d.id::text = split_part(name, '/', 1) and d.denetim_durumu <> 'Çalışma Tamamlandı' and (
    lower(d.olusturan_email) = lower(auth.jwt() ->> 'email') or exists (
      select 1 from public.kullanici_profilleri p
      where lower(p.email) = lower(auth.jwt() ->> 'email') and p.aktif and p.rol in ('yonetici','teknik_mudur')
    )
  )
));

commit;

-- Doğrulama (salt okunur)
select policyname, cmd from pg_policies
where schemaname='storage' and tablename='objects' and policyname like 'denetim foto%'
order by cmd;
