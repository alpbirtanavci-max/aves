-- AVES Saha R15D-rc3.9.28 — indirilen fotoğraf arşivlerinin kontrollü temizliği.
-- Yetki kişi bazındadır; yalnız Alpbirtan Avcı ve Emine adlı aktif profil(ler)
-- için açılır. İki aşamalı kullanıcı onayı uygulama tarafında ayrıca zorunludur.

begin;

alter table public.kullanici_profilleri
  add column if not exists fotograf_arsiv_temizleme_yetkisi boolean not null default false;

do $$
declare
  alp_sayisi integer;
  emine_sayisi integer;
begin
  select count(*) into alp_sayisi
  from public.kullanici_profilleri
  where aktif = true and lower(trim(ad_soyad)) = lower('Alpbirtan Avcı');

  select count(*) into emine_sayisi
  from public.kullanici_profilleri
  where aktif = true and (lower(trim(ad_soyad)) = 'emine' or lower(trim(ad_soyad)) like 'emine %');

  if alp_sayisi <> 1 or emine_sayisi <> 1 then
    raise exception 'Fotoğraf arşiv yetkisi verilmedi: Alpbirtan eşleşmesi %, Emine eşleşmesi % (her biri tam 1 olmalı)', alp_sayisi, emine_sayisi;
  end if;
end $$;

update public.kullanici_profilleri
set fotograf_arsiv_temizleme_yetkisi = true
where aktif = true and (
  lower(trim(ad_soyad)) = lower('Alpbirtan Avcı') or
  lower(trim(ad_soyad)) = 'emine' or
  lower(trim(ad_soyad)) like 'emine %'
);

drop policy if exists "denetim fotograflari silme" on public.denetim_fotograflari;
create policy "denetim fotograflari silme" on public.denetim_fotograflari for delete to authenticated
using (exists (
  select 1 from public.denetimler d
  where d.id = denetim_id and (
    (d.denetim_durumu <> 'Çalışma Tamamlandı' and (
      lower(d.olusturan_email) = lower(auth.jwt() ->> 'email') or exists (
        select 1 from public.kullanici_profilleri p
        where lower(p.email) = lower(auth.jwt() ->> 'email') and p.aktif and p.rol in ('yonetici','teknik_mudur')
      )
    )) or exists (
      select 1 from public.kullanici_profilleri p
      where lower(p.email) = lower(auth.jwt() ->> 'email')
        and p.aktif and p.fotograf_arsiv_temizleme_yetkisi
    )
  )
));

drop policy if exists "denetim fotograf nesnesi silme" on storage.objects;
create policy "denetim fotograf nesnesi silme" on storage.objects for delete to authenticated
using (bucket_id = 'denetim-fotograflari' and exists (
  select 1 from public.denetimler d
  where d.id::text = split_part(name, '/', 1) and (
    (d.denetim_durumu <> 'Çalışma Tamamlandı' and (
      lower(d.olusturan_email) = lower(auth.jwt() ->> 'email') or exists (
        select 1 from public.kullanici_profilleri p
        where lower(p.email) = lower(auth.jwt() ->> 'email') and p.aktif and p.rol in ('yonetici','teknik_mudur')
      )
    )) or exists (
      select 1 from public.kullanici_profilleri p
      where lower(p.email) = lower(auth.jwt() ->> 'email')
        and p.aktif and p.fotograf_arsiv_temizleme_yetkisi
    )
  )
));

commit;

select email, ad_soyad, fotograf_arsiv_temizleme_yetkisi
from public.kullanici_profilleri
where fotograf_arsiv_temizleme_yetkisi
order by email;
