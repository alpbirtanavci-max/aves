-- AVES Saha R15D-rc3.9.14 — kritik montaj maddelerine sınırsız fotoğraf kaydı
-- Fotoğraflar teknik olarak yorumlanmaz; sayı sınırı yoktur. Ham telefon fotoğrafı
-- istemci tarafında küçültülür, özel (public olmayan) Storage bucket'ına yüklenir.

create table if not exists public.denetim_fotograflari (
  id uuid primary key,
  denetim_id uuid not null references public.denetimler(id) on delete cascade,
  saha_kontrol_id uuid not null references public.saha_kontrol(id) on delete cascade,
  madde_id text not null,
  object_path text not null unique,
  mime_type text not null default 'image/jpeg' check (mime_type = 'image/jpeg'),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 5242880),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  created_by text not null default lower(auth.jwt() ->> 'email'),
  created_at timestamptz not null default now(),
  constraint denetim_fotografi_path_scope check (object_path like denetim_id::text || '/%')
);

create index if not exists denetim_fotograflari_denetim_idx
  on public.denetim_fotograflari (denetim_id, created_at);
create index if not exists denetim_fotograflari_madde_idx
  on public.denetim_fotograflari (saha_kontrol_id, created_at);

alter table public.denetim_fotograflari enable row level security;
revoke all on public.denetim_fotograflari from anon, authenticated;
grant select, insert, delete on public.denetim_fotograflari to authenticated;

drop policy if exists "denetim fotograflari okuma" on public.denetim_fotograflari;
create policy "denetim fotograflari okuma" on public.denetim_fotograflari for select to authenticated
using (exists (
  select 1 from public.denetimler d
  where d.id = denetim_id and (
    lower(d.olusturan_email) = lower(auth.jwt() ->> 'email') or exists (
      select 1 from public.kullanici_profilleri p
      where lower(p.email) = lower(auth.jwt() ->> 'email') and p.aktif and p.rol in ('yonetici','teknik_mudur')
    )
  )
));

drop policy if exists "denetim fotograflari ekleme" on public.denetim_fotograflari;
create policy "denetim fotograflari ekleme" on public.denetim_fotograflari for insert to authenticated
with check (exists (
  select 1 from public.denetimler d
  where d.id = denetim_id and d.denetim_durumu <> 'Çalışma Tamamlandı' and (
    lower(d.olusturan_email) = lower(auth.jwt() ->> 'email') or exists (
      select 1 from public.kullanici_profilleri p
      where lower(p.email) = lower(auth.jwt() ->> 'email') and p.aktif and p.rol in ('yonetici','teknik_mudur')
    )
  )
));

drop policy if exists "denetim fotograflari silme" on public.denetim_fotograflari;
create policy "denetim fotograflari silme" on public.denetim_fotograflari for delete to authenticated
using (exists (
  select 1 from public.denetimler d
  where d.id = denetim_id and d.denetim_durumu <> 'Çalışma Tamamlandı' and (
    lower(d.olusturan_email) = lower(auth.jwt() ->> 'email') or exists (
      select 1 from public.kullanici_profilleri p
      where lower(p.email) = lower(auth.jwt() ->> 'email') and p.aktif and p.rol in ('yonetici','teknik_mudur')
    )
  )
));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('denetim-fotograflari', 'denetim-fotograflari', false, 5242880, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "denetim fotograf nesnesi okuma" on storage.objects;
create policy "denetim fotograf nesnesi okuma" on storage.objects for select to authenticated
using (bucket_id = 'denetim-fotograflari' and exists (
  select 1 from public.denetim_fotograflari f where f.object_path = name
));

drop policy if exists "denetim fotograf nesnesi ekleme" on storage.objects;
create policy "denetim fotograf nesnesi ekleme" on storage.objects for insert to authenticated
with check (bucket_id = 'denetim-fotograflari' and exists (
  select 1 from public.denetimler d
  where d.id::text = split_part(name, '/', 1) and d.denetim_durumu <> 'Çalışma Tamamlandı' and (
    lower(d.olusturan_email) = lower(auth.jwt() ->> 'email') or exists (
      select 1 from public.kullanici_profilleri p
      where lower(p.email) = lower(auth.jwt() ->> 'email') and p.aktif and p.rol in ('yonetici','teknik_mudur')
    )
  )
));

drop policy if exists "denetim fotograf nesnesi silme" on storage.objects;
create policy "denetim fotograf nesnesi silme" on storage.objects for delete to authenticated
using (bucket_id = 'denetim-fotograflari' and exists (
  select 1 from public.denetimler d
  where d.id::text = split_part(name, '/', 1) and d.denetim_durumu <> 'Çalışma Tamamlandı' and (
    lower(d.olusturan_email) = lower(auth.jwt() ->> 'email') or exists (
      select 1 from public.kullanici_profilleri p
      where lower(p.email) = lower(auth.jwt() ->> 'email') and p.aktif and p.rol in ('yonetici','teknik_mudur')
    )
  )
));
