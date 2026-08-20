-- R15D-rc3.9 — Resmî form revizyonunu denetim bazında sabitleme
-- Veri silmez ve mevcut RLS politikalarını değiştirmez.

begin;

alter table public.denetimler
  add column if not exists form_cikti_snapshot jsonb not null default '{}'::jsonb;

alter table public.denetimler
  drop constraint if exists denetimler_form_cikti_snapshot_object_chk;

alter table public.denetimler
  add constraint denetimler_form_cikti_snapshot_object_chk
  check (jsonb_typeof(form_cikti_snapshot) = 'object');

-- Mevcut denetimler de bugünkü resmî revizyona bir kez bağlanır. Böylece
-- ileride R.05/R.03 yayımlansa bile eski denetim yeni şablona sessizce geçmez.
-- Kimlik tetikleyicisi yalnız uygulama JWT'siyle çalışır; SQL bakım oturumunda
-- sahte son-kullanıcı yazmaması için yalnız backfill süresince kapatılır.
-- Transaction başarısız olursa PostgreSQL tetikleyici durumunu da geri alır.
alter table public.denetimler disable trigger trg_aves_denetim_kimligi;

update public.denetimler
set form_cikti_snapshot = jsonb_build_object(
  'schema_version',1,
  'locked_at',coalesce(calisma_tamamlandi_at,created_at,now()),
  'migrated_baseline',true,
  'forms',jsonb_build_array(jsonb_build_object(
    'key','UB_FR_38_R04','code','ÜB.FR.38','revision','R.04','standard','81-20',
    'template_docx_sha256','dc2cc4b832ed227a684c7cb7c891830f59a795b5616da808ad5f730571d60a64',
    'template_pdf_sha256','16382245b42112242b5eab1ac5ff3136d16cae132a6b0a3665a5c801529fac6b',
    'mapping_sha256','8a6af5a789b9247e5b148a8f61a9d6b9326b174852f4ded39f2d2efa313d7501',
    'measurement_mapping_sha256','47b87cd689778d3b8a61205a64439206a27aba2aa1ec4e7101a134d1512c8bff'
  )))
where ana_standart='81-20' and form_cikti_snapshot='{}'::jsonb;

update public.denetimler
set form_cikti_snapshot = jsonb_build_object(
  'schema_version',1,
  'locked_at',coalesce(calisma_tamamlandi_at,created_at,now()),
  'migrated_baseline',true,
  'forms',jsonb_build_array(jsonb_build_object(
    'key','UB_FR_39_R02','code','ÜB.FR.39','revision','R.02','standard','81-1/2+A3',
    'template_docx_sha256','4cf5288f1fc8dd471fa0149c84551cece99a26090d55a2d4a10bacb4bf19aa8b',
    'template_pdf_sha256','b694853f6c610abb57590bbcd773bdaa6d834793f02657fd658c84e6de3803d5',
    'mapping_sha256','ff42ff67dca88967db5c21e1a5928d68551e8efea95af4eecea3da2244a62964',
    'measurement_mapping_sha256','7629ea7cc476ee90f90439e2280f47d50d4f0cdcdb3c2ae40b5d354ee53ca4f3'
  )))
where ana_standart='81-1/2+A3' and form_cikti_snapshot='{}'::jsonb;

alter table public.denetimler enable trigger trg_aves_denetim_kimligi;

create or replace function public.aves_form_cikti_snapshot_kilitle()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if current_user in ('postgres','service_role','supabase_admin') then return new; end if;
  if new.form_cikti_snapshot is distinct from old.form_cikti_snapshot then
    raise exception 'Denetimin resmî form revizyonu kilitlidir';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_aves_form_cikti_snapshot_kilidi on public.denetimler;
create trigger trg_aves_form_cikti_snapshot_kilidi
before update on public.denetimler
for each row execute function public.aves_form_cikti_snapshot_kilitle();

comment on column public.denetimler.form_cikti_snapshot is
  'Denetim oluşturulurken kilitlenen ÜB.FR form kodu, revizyonu ve şablon/eşleme SHA-256 değerleri. Sonraki form revizyonları geçmiş denetimi değiştirmez.';

commit;
