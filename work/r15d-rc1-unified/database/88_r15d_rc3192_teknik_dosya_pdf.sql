-- R15D-rc3.19.2 — private, inspection-scoped technical-file PDFs.
-- PDF text extraction runs locally in the browser. This migration stores only
-- the source PDF and locally derived candidate values/evidence; it adds no AI service.

begin;

create table if not exists public.denetim_teknik_pdf (
  denetim_id uuid primary key references public.denetimler(id) on delete cascade,
  file_name text not null check (length(file_name) between 1 and 255),
  object_path text not null unique,
  file_size_bytes bigint not null check (file_size_bytes between 1 and 20971520),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  page_count integer check (page_count between 1 and 250),
  text_page_count integer check (text_page_count between 0 and 250),
  extracted_fields jsonb not null default '{}'::jsonb check (jsonb_typeof(extracted_fields) = 'object'),
  uploaded_by text not null default public.aves_oturum_emaili(),
  updated_at timestamptz not null default now(),
  constraint denetim_teknik_pdf_path_scope check (
    object_path ~ ('^' || denetim_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.]pdf$')
  )
);

alter table public.denetim_teknik_pdf enable row level security;
revoke all on public.denetim_teknik_pdf from anon, authenticated;
grant select, insert, update, delete on public.denetim_teknik_pdf to authenticated;

drop policy if exists "denetim teknik pdf okuma" on public.denetim_teknik_pdf;
create policy "denetim teknik pdf okuma" on public.denetim_teknik_pdf
for select to authenticated
using (exists (
  select 1 from public.denetimler d
  where d.id = denetim_teknik_pdf.denetim_id and (
    public.aves_denetim_gorebilir_mi(d.olusturan_email)
    or (
      public.aves_aktif_kullanici_mi()
      and lower(coalesce(d.takip_atanan_email,'')) = public.aves_oturum_emaili()
    )
  )
));

drop policy if exists "denetim teknik pdf ekleme" on public.denetim_teknik_pdf;
create policy "denetim teknik pdf ekleme" on public.denetim_teknik_pdf
for insert to authenticated
with check (
  lower(uploaded_by) = public.aves_oturum_emaili()
  and exists (
    select 1 from public.denetimler d
    where d.id = denetim_teknik_pdf.denetim_id
      and d.denetim_durumu in ('Devam Ediyor','Gözden Geçirme')
      and (
        public.aves_denetim_yazabilir_mi(d.olusturan_email)
        or (
          public.aves_aktif_kullanici_mi()
          and lower(coalesce(d.takip_atanan_email,'')) = public.aves_oturum_emaili()
        )
      )
  )
);

drop policy if exists "denetim teknik pdf guncelleme" on public.denetim_teknik_pdf;
create policy "denetim teknik pdf guncelleme" on public.denetim_teknik_pdf
for update to authenticated
using (exists (
  select 1 from public.denetimler d
  where d.id = denetim_teknik_pdf.denetim_id
    and d.denetim_durumu in ('Devam Ediyor','Gözden Geçirme')
    and (
      public.aves_denetim_yazabilir_mi(d.olusturan_email)
      or (
        public.aves_aktif_kullanici_mi()
        and lower(coalesce(d.takip_atanan_email,'')) = public.aves_oturum_emaili()
      )
    )
))
with check (
  lower(uploaded_by) = public.aves_oturum_emaili()
  and exists (
    select 1 from public.denetimler d
    where d.id = denetim_teknik_pdf.denetim_id
      and d.denetim_durumu in ('Devam Ediyor','Gözden Geçirme')
      and (
        public.aves_denetim_yazabilir_mi(d.olusturan_email)
        or (
          public.aves_aktif_kullanici_mi()
          and lower(coalesce(d.takip_atanan_email,'')) = public.aves_oturum_emaili()
        )
      )
  )
);

drop policy if exists "denetim teknik pdf silme" on public.denetim_teknik_pdf;
create policy "denetim teknik pdf silme" on public.denetim_teknik_pdf
for delete to authenticated
using (exists (
  select 1 from public.denetimler d
  where d.id = denetim_teknik_pdf.denetim_id
    and d.denetim_durumu in ('Devam Ediyor','Gözden Geçirme')
    and (
      public.aves_denetim_yazabilir_mi(d.olusturan_email)
      or (
        public.aves_aktif_kullanici_mi()
        and lower(coalesce(d.takip_atanan_email,'')) = public.aves_oturum_emaili()
      )
    )
));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('denetim-teknik-dosyalari', 'denetim-teknik-dosyalari', false, 20971520, array['application/pdf'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage upsert may read/replace an object after an ambiguous network response.
-- Scope SELECT by the audit folder so a retry can find its own object even before
-- the metadata row is written; no other audit's folder is visible.
drop policy if exists "denetim teknik pdf nesnesi okuma" on storage.objects;
create policy "denetim teknik pdf nesnesi okuma" on storage.objects
for select to authenticated
using (
  bucket_id = 'denetim-teknik-dosyalari'
  and split_part(name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.]pdf$'
  and split_part(name, '/', 3) = ''
  and exists (
    select 1 from public.denetimler d
    where d.id::text = split_part(storage.objects.name, '/', 1)
      and (
        public.aves_denetim_gorebilir_mi(d.olusturan_email)
        or (
          public.aves_aktif_kullanici_mi()
          and lower(coalesce(d.takip_atanan_email,'')) = public.aves_oturum_emaili()
        )
      )
  )
);

drop policy if exists "denetim teknik pdf nesnesi ekleme" on storage.objects;
create policy "denetim teknik pdf nesnesi ekleme" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'denetim-teknik-dosyalari'
  and split_part(name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.]pdf$'
  and split_part(name, '/', 3) = ''
  and exists (
    select 1 from public.denetimler d
    where d.id::text = split_part(storage.objects.name, '/', 1)
      and d.denetim_durumu in ('Devam Ediyor','Gözden Geçirme')
      and (
        public.aves_denetim_yazabilir_mi(d.olusturan_email)
        or (
          public.aves_aktif_kullanici_mi()
          and lower(coalesce(d.takip_atanan_email,'')) = public.aves_oturum_emaili()
        )
      )
  )
);

drop policy if exists "denetim teknik pdf nesnesi guncelleme" on storage.objects;
create policy "denetim teknik pdf nesnesi guncelleme" on storage.objects
for update to authenticated
using (
  bucket_id = 'denetim-teknik-dosyalari'
  and split_part(name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.]pdf$'
  and split_part(name, '/', 3) = ''
  and exists (
    select 1 from public.denetimler d
    where d.id::text = split_part(storage.objects.name, '/', 1)
      and d.denetim_durumu in ('Devam Ediyor','Gözden Geçirme')
      and (
        public.aves_denetim_yazabilir_mi(d.olusturan_email)
        or (
          public.aves_aktif_kullanici_mi()
          and lower(coalesce(d.takip_atanan_email,'')) = public.aves_oturum_emaili()
        )
      )
  )
)
with check (
  bucket_id = 'denetim-teknik-dosyalari'
  and split_part(name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.]pdf$'
  and split_part(name, '/', 3) = ''
  and exists (
    select 1 from public.denetimler d
    where d.id::text = split_part(storage.objects.name, '/', 1)
      and d.denetim_durumu in ('Devam Ediyor','Gözden Geçirme')
      and (
        public.aves_denetim_yazabilir_mi(d.olusturan_email)
        or (
          public.aves_aktif_kullanici_mi()
          and lower(coalesce(d.takip_atanan_email,'')) = public.aves_oturum_emaili()
        )
      )
  )
);

drop policy if exists "denetim teknik pdf nesnesi silme" on storage.objects;
create policy "denetim teknik pdf nesnesi silme" on storage.objects
for delete to authenticated
using (
  bucket_id = 'denetim-teknik-dosyalari'
  and split_part(name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.]pdf$'
  and split_part(name, '/', 3) = ''
  and exists (
    select 1 from public.denetimler d
    where d.id::text = split_part(storage.objects.name, '/', 1)
      and d.denetim_durumu in ('Devam Ediyor','Gözden Geçirme')
      and (
        public.aves_denetim_yazabilir_mi(d.olusturan_email)
        or (
          public.aves_aktif_kullanici_mi()
          and lower(coalesce(d.takip_atanan_email,'')) = public.aves_oturum_emaili()
        )
      )
  )
);

commit;

-- Read-only deployment checks.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'denetim_teknik_pdf'
order by ordinal_position;

select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'denetim-teknik-dosyalari';
