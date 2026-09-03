-- AVES R15D — migration 79 yerel RLS kanıtı için en küçük Supabase-benzeri şema.
--
-- Bu dosya production şeması veya migration değildir. Yalnız tests/rls/
-- içindeki dört-persona senaryosunun kullandığı tablo, rol ve yardımcı
-- fonksiyonları izole PostgreSQL'de kurar. Gerçek production prova sonucunun
-- yerine geçmez; remote Supabase branch mevcut olduğunda aynı 79_takip_atama.sql
-- o branch'te ayrıca çalıştırılmalıdır.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end $$;

create schema if not exists auth;
create schema if not exists storage;
grant usage on schema public, auth, storage to authenticated;

-- Supabase'in auth.jwt() sözleşmesinin test karşılığı. request.jwt.claims,
-- PostgREST'in verdiği JWT iddiasıyla aynı biçimde senaryo bloklarında atanır.
create or replace function auth.jwt()
returns jsonb
language sql
stable
as $$ select coalesce(current_setting('request.jwt.claims', true), '{}')::jsonb $$;
grant execute on function auth.jwt() to authenticated;

create table public.kullanici_profilleri (
  email text primary key,
  ad_soyad text not null,
  rol text not null check (rol in ('muhendis','teknik_mudur','yonetici')),
  aktif boolean not null default true,
  fotograf_arsiv_temizleme_yetkisi boolean not null default false
);

create table public.denetimler (
  id uuid primary key default gen_random_uuid(),
  musteri_unvani text not null,
  denetim_adresi text,
  asansor_seri_no text not null,
  asansor_kimlik_no text,
  dosya_no text,
  denetim_tarihi date,
  denetimi_yapan text,
  olusturan_email text not null,
  olusturan_ad text,
  modul text,
  denetim_turu text,
  kontrol_profili text,
  ana_standart text not null,
  denetim_durumu text not null default 'Devam Ediyor',
  takip_ana_denetim_id uuid,
  takip_onceki_denetim_id uuid,
  takip_sira_no integer,
  takip_atanan_email text,
  takip_atanan_ad text,
  takip_atama_at timestamptz,
  saha_tamamlandi_at timestamptz,
  gozden_gecirme_at timestamptz,
  calisma_tamamlandi_at timestamptz,
  offline_hazir_at timestamptz,
  butunluk_ozeti jsonb,
  butunluk_hash text,
  butunluk_hesaplandi_at timestamptz,
  expected_item_count integer,
  expected_item_set_hash text,
  seri_numaralari jsonb,
  form_cikti_snapshot jsonb,
  son_degistiren_email text,
  son_degistiren_ad text,
  son_degistiren_rol text,
  son_degistiren_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.saha_kontrol (
  id uuid primary key default gen_random_uuid(),
  denetim_id uuid not null references public.denetimler(id),
  madde_id text not null,
  sira_no integer not null,
  bolum text not null,
  standart_grubu text not null,
  kontrol_basligi text not null,
  durum text,
  unique (denetim_id, madde_id)
);

create table public.denetim_degisim_gecmisi (
  id uuid primary key default gen_random_uuid(),
  denetim_id uuid not null references public.denetimler(id),
  islem_turu text not null,
  detay jsonb,
  created_at timestamptz not null default now()
);

create table public.denetim_fotograflari (
  id uuid primary key default gen_random_uuid(),
  denetim_id uuid not null references public.denetimler(id),
  object_path text not null,
  kategori text,
  created_at timestamptz not null default now(),
  unique (denetim_id, object_path)
);

create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null,
  name text not null,
  metadata jsonb not null default '{}'::jsonb,
  unique (bucket_id, name)
);

alter table public.kullanici_profilleri enable row level security;
alter table public.denetimler enable row level security;
alter table public.saha_kontrol enable row level security;
alter table public.denetim_degisim_gecmisi enable row level security;
alter table public.denetim_fotograflari enable row level security;
alter table storage.objects enable row level security;

grant select, insert, update on public.denetimler to authenticated;
grant select, insert, update on public.saha_kontrol to authenticated;
grant select, insert on public.denetim_degisim_gecmisi to authenticated;
grant select, insert, update, delete on public.denetim_fotograflari to authenticated;
grant select, insert, update, delete on storage.objects to authenticated;
grant select on public.kullanici_profilleri to authenticated;

create or replace function public.aves_oturum_emaili()
returns text
language sql
stable
security definer
set search_path = public, auth, pg_temp
set row_security = off
as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

create or replace function public.aves_aktif_kullanici_mi()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
set row_security = off
as $$
  select exists (
    select 1 from public.kullanici_profilleri kp
    where lower(kp.email) = public.aves_oturum_emaili() and kp.aktif
  )
$$;

create or replace function public.aves_tum_denetimleri_gorebilir_mi()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
set row_security = off
as $$
  select exists (
    select 1 from public.kullanici_profilleri kp
    where lower(kp.email) = public.aves_oturum_emaili()
      and kp.aktif and kp.rol in ('yonetici','teknik_mudur')
  )
$$;

create or replace function public.aves_denetim_gorebilir_mi(p_olusturan_email text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
set row_security = off
as $$
  select public.aves_aktif_kullanici_mi() and (
    lower(coalesce(p_olusturan_email,'')) = public.aves_oturum_emaili()
    or public.aves_tum_denetimleri_gorebilir_mi()
  )
$$;

create or replace function public.aves_denetim_yazabilir_mi(p_olusturan_email text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
set row_security = off
as $$
  select exists (
    select 1 from public.kullanici_profilleri kp
    where lower(kp.email) = public.aves_oturum_emaili() and kp.aktif and (
      kp.rol in ('yonetici','teknik_mudur')
      or (kp.rol = 'muhendis' and lower(coalesce(p_olusturan_email,'')) = public.aves_oturum_emaili())
    )
  )
$$;

revoke all on function public.aves_oturum_emaili() from public;
revoke all on function public.aves_aktif_kullanici_mi() from public;
revoke all on function public.aves_tum_denetimleri_gorebilir_mi() from public;
revoke all on function public.aves_denetim_gorebilir_mi(text) from public;
revoke all on function public.aves_denetim_yazabilir_mi(text) from public;
grant execute on function public.aves_oturum_emaili() to authenticated;
grant execute on function public.aves_aktif_kullanici_mi() to authenticated;
grant execute on function public.aves_tum_denetimleri_gorebilir_mi() to authenticated;
grant execute on function public.aves_denetim_gorebilir_mi(text) to authenticated;
grant execute on function public.aves_denetim_yazabilir_mi(text) to authenticated;

-- Fotoğraf politikalarının yönetim dalı, oturum kullanıcısının aktif rolünü
-- doğrudan profil tablosundan doğrular. Yerel karşılık aynı dar okumayı verir.
create policy "profil kendi okuma" on public.kullanici_profilleri
for select to authenticated
using (lower(email) = lower(auth.jwt() ->> 'email'));

-- D2 testi SQL GRANT eksikliğine değil, production'daki fotoğraf silme RLS
-- kuralına dayanır: sahip/yönetim veya açık arşiv yetkisi silebilir; atanan
-- takip mühendisi bunların içinde değildir.
create policy "denetim fotograflari silme" on public.denetim_fotograflari
for delete to authenticated
using (exists (
  select 1 from public.denetimler d
  where d.id = denetim_id and (
    (d.denetim_durumu <> 'Çalışma Tamamlandı' and (
      lower(d.olusturan_email) = lower(auth.jwt() ->> 'email') or exists (
        select 1 from public.kullanici_profilleri p
        where lower(p.email) = lower(auth.jwt() ->> 'email') and p.aktif
          and p.rol in ('yonetici','teknik_mudur')
      )
    )) or exists (
      select 1 from public.kullanici_profilleri p
      where lower(p.email) = lower(auth.jwt() ->> 'email') and p.aktif
        and p.fotograf_arsiv_temizleme_yetkisi
    )
  )
));

create policy "denetim fotograf nesnesi silme" on storage.objects
for delete to authenticated
using (bucket_id = 'denetim-fotograflari' and exists (
  select 1 from public.denetimler d
  where d.id::text = split_part(name, '/', 1) and (
    (d.denetim_durumu <> 'Çalışma Tamamlandı' and (
      lower(d.olusturan_email) = lower(auth.jwt() ->> 'email') or exists (
        select 1 from public.kullanici_profilleri p
        where lower(p.email) = lower(auth.jwt() ->> 'email') and p.aktif
          and p.rol in ('yonetici','teknik_mudur')
      )
    )) or exists (
      select 1 from public.kullanici_profilleri p
      where lower(p.email) = lower(auth.jwt() ->> 'email') and p.aktif
        and p.fotograf_arsiv_temizleme_yetkisi
    )
  )
));

create policy "denetim sahip/yönetim güncelleme" on public.denetimler
for update to authenticated
using (public.aves_denetim_yazabilir_mi(olusturan_email))
with check (public.aves_denetim_yazabilir_mi(olusturan_email));

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
