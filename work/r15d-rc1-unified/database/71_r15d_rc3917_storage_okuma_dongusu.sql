-- AVES Saha R15D-rc3.9.17 — fotoğraf yüklemesi hâlâ 400 veriyordu (tavuk-yumurta kilidi)
-- Kök neden: storage.objects SELECT politikası denetim_fotograflari tablosunda zaten bir
-- kayıt olmasını şart koşuyordu. x-upsert:true'nun ürettiği ON CONFLICT ifadesi, çakışma
-- kontrolü için storage.objects üzerinde SELECT yetkisi gerektirir — ama app.js önce
-- storage'a yükleyip SONRA metadata satırını yazıyor. Metadata henüz yokken SELECT hiç
-- geçemiyor, her upsert RLS hatasıyla düşüyordu. SQL ile doğrulandı (bkz. oturum notları).
-- Çözüm: SELECT politikasını metadata tablosuna bağımlılıktan kurtarıp, ekleme/silme/
-- güncelleme politikalarıyla aynı temele (denetimler sahiplik/rol kontrolü) oturt.

do $$
begin
  if not exists (select 1 from storage.buckets where id = 'denetim-fotograflari') then
    raise exception 'denetim-fotograflari bucket bulunamadı — 68 numaralı migration önce uygulanmalı';
  end if;
end $$;

begin;

drop policy if exists "denetim fotograf nesnesi okuma" on storage.objects;
create policy "denetim fotograf nesnesi okuma" on storage.objects for select to authenticated
using (bucket_id = 'denetim-fotograflari' and exists (
  select 1 from public.denetimler d
  where d.id::text = split_part(name, '/', 1) and (
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
