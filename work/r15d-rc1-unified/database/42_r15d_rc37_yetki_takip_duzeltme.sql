-- AVES R15D-rc3.7 TEST — kullanıcı görünürlüğü, Modül G takip denetimi
-- ve izlenebilir düzeltme oturumları.
-- Bu migration veri silmez. Canlıya uygulanmadan önce salt okunur ön kontrol,
-- şema yedeği ve test dalı doğrulaması yapılmalıdır.

begin;

-- 1) Takip zinciri ve son düzeltme oturumu bilgileri.
alter table public.denetimler
  add column if not exists takip_ana_denetim_id uuid,
  add column if not exists takip_onceki_denetim_id uuid,
  add column if not exists takip_sira_no integer,
  add column if not exists takip_onceki_seri_numaralari jsonb,
  add column if not exists duzeltme_oturumu_id uuid,
  add column if not exists duzeltme_nedeni text,
  add column if not exists duzeltme_baslatildi_at timestamptz,
  add column if not exists duzeltme_baslatan_email text,
  add column if not exists duzeltme_baslatan_ad text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'denetimler_takip_ana_fk'
      and conrelid = 'public.denetimler'::regclass
  ) then
    alter table public.denetimler
      add constraint denetimler_takip_ana_fk
      foreign key (takip_ana_denetim_id) references public.denetimler(id) on delete restrict;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'denetimler_takip_onceki_fk'
      and conrelid = 'public.denetimler'::regclass
  ) then
    alter table public.denetimler
      add constraint denetimler_takip_onceki_fk
      foreign key (takip_onceki_denetim_id) references public.denetimler(id) on delete restrict;
  end if;
end $$;

alter table public.denetimler
  drop constraint if exists denetimler_takip_sira_check;
alter table public.denetimler
  add constraint denetimler_takip_sira_check check (
    (takip_ana_denetim_id is null and takip_onceki_denetim_id is null and takip_sira_no is null)
    or
    (takip_ana_denetim_id is not null and takip_onceki_denetim_id is not null and takip_sira_no > 0
      and kontrol_profili = 'modul_g_tam'
      and takip_ana_denetim_id <> id
      and takip_onceki_denetim_id <> id)
  );

alter table public.denetimler
  drop constraint if exists denetimler_duzeltme_nedeni_check;
alter table public.denetimler
  add constraint denetimler_duzeltme_nedeni_check check (
    duzeltme_nedeni is null or duzeltme_nedeni in (
      'Yanlış seçim düzeltmesi','Eksik bilgi tamamlama','Saha notu düzeltmesi'
    )
  );

create unique index if not exists denetimler_takip_zinciri_uidx
  on public.denetimler (takip_ana_denetim_id, takip_sira_no)
  where takip_ana_denetim_id is not null;

create index if not exists denetimler_sahip_tarih_idx
  on public.denetimler (lower(olusturan_email), denetim_tarihi desc, created_at desc);

alter table public.saha_kontrol
  add column if not exists takip_kaynak_saha_kontrol_id uuid,
  add column if not exists takip_onceki_durum text,
  add column if not exists takip_onceki_aciklama text,
  add column if not exists takip_onceki_bulgu_secenegi text,
  add column if not exists takip_onceki_diger_bulgu text;

alter table public.denetim_degisim_gecmisi
  add column if not exists duzeltme_oturumu_id uuid,
  add column if not exists duzeltme_nedeni text;

create index if not exists denetim_degisim_gecmisi_duzeltme_idx
  on public.denetim_degisim_gecmisi (duzeltme_oturumu_id, created_at)
  where duzeltme_oturumu_id is not null;

-- Geçmişteki kullanıcı ve düzeltme oturumu istemciden güvenilir kabul edilmez;
-- etkin oturum profili ve denetim kaydı üzerinden sunucuda yeniden yazılır.
create or replace function public.aves_gecmis_kimligini_dogrula()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
set row_security = off
as $$
declare
  v_email text := public.aves_oturum_emaili();
  v_ad text;
  v_rol text;
  v_duzeltme_id uuid;
  v_duzeltme_nedeni text;
begin
  select kp.ad_soyad, kp.rol into v_ad, v_rol
  from public.kullanici_profilleri kp
  where lower(kp.email) = v_email and kp.aktif = true
  limit 1;
  if v_rol is null then raise exception 'Aktif AVES kullanıcı profili bulunamadı'; end if;

  select d.duzeltme_oturumu_id, d.duzeltme_nedeni
    into v_duzeltme_id, v_duzeltme_nedeni
  from public.denetimler d where d.id = new.denetim_id;

  new.degistiren_email := v_email;
  new.degistiren_ad := v_ad;
  new.degistiren_rol := v_rol;
  new.duzeltme_oturumu_id := v_duzeltme_id;
  new.duzeltme_nedeni := v_duzeltme_nedeni;
  new.created_at := now();
  return new;
end;
$$;

-- 2) Yetkiler ayrı tutulur: teknik müdür yeni denetim veya sistem içeriği
-- oluşturmaz; tüm denetimleri görür ve denetim cevaplarını iz bırakarak düzeltebilir.
create or replace function public.aves_tum_denetimleri_gorebilir_mi()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
set row_security = off
as $$
  select exists (
    select 1 from public.kullanici_profilleri kp
    where lower(kp.email) = public.aves_oturum_emaili()
      and kp.aktif = true
      and kp.rol in ('yonetici','teknik_mudur')
  );
$$;

create or replace function public.aves_denetim_gorebilir_mi(p_olusturan_email text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
set row_security = off
as $$
  select public.aves_aktif_kullanici_mi()
    and (
      lower(coalesce(p_olusturan_email,'')) = public.aves_oturum_emaili()
      or public.aves_tum_denetimleri_gorebilir_mi()
    );
$$;

create or replace function public.aves_denetim_olusturabilir_mi(p_olusturan_email text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
set row_security = off
as $$
  select exists (
    select 1 from public.kullanici_profilleri kp
    where lower(kp.email) = public.aves_oturum_emaili()
      and kp.aktif = true
      and (
        kp.rol = 'yonetici'
        or (kp.rol = 'muhendis' and lower(coalesce(p_olusturan_email,'')) = public.aves_oturum_emaili())
      )
  );
$$;

create or replace function public.aves_denetim_yazabilir_mi(p_olusturan_email text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
set row_security = off
as $$
  select exists (
    select 1 from public.kullanici_profilleri kp
    where lower(kp.email) = public.aves_oturum_emaili()
      and kp.aktif = true
      and (
        kp.rol in ('yonetici','teknik_mudur')
        or (kp.rol = 'muhendis' and lower(coalesce(p_olusturan_email,'')) = public.aves_oturum_emaili())
      )
  );
$$;

create or replace function public.aves_takip_kaynagi_gecerli_mi(p_onceki_denetim_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
set row_security = off
as $$
  select p_onceki_denetim_id is null or exists (
    select 1 from public.denetimler onceki
    where onceki.id = p_onceki_denetim_id
      and onceki.denetim_durumu = 'Çalışma Tamamlandı'
      and coalesce(onceki.kontrol_profili,'') = 'modul_g_tam'
      and public.aves_denetim_gorebilir_mi(onceki.olusturan_email)
  );
$$;

revoke all on function public.aves_tum_denetimleri_gorebilir_mi() from public;
revoke all on function public.aves_denetim_gorebilir_mi(text) from public;
revoke all on function public.aves_denetim_olusturabilir_mi(text) from public;
revoke all on function public.aves_denetim_yazabilir_mi(text) from public;
revoke all on function public.aves_takip_kaynagi_gecerli_mi(uuid) from public;
grant execute on function public.aves_tum_denetimleri_gorebilir_mi() to authenticated;
grant execute on function public.aves_denetim_gorebilir_mi(text) to authenticated;
grant execute on function public.aves_denetim_olusturabilir_mi(text) to authenticated;
grant execute on function public.aves_denetim_yazabilir_mi(text) to authenticated;
grant execute on function public.aves_takip_kaynagi_gecerli_mi(uuid) to authenticated;

-- 3) Görünürlük RLS seviyesinde uygulanır. Mühendis yalnız kendi denetimini,
-- teknik müdür ve yönetici tüm denetimleri ve bunlara bağlı satır/geçmişi görür.
drop policy if exists "R15C denetimleri okuma" on public.denetimler;
drop policy if exists "denetim okuma" on public.denetimler;
drop policy if exists "denetimleri okuma" on public.denetimler;
create policy "denetimleri okuma" on public.denetimler
for select to authenticated
using (public.aves_denetim_gorebilir_mi(olusturan_email));

drop policy if exists "R15C denetim ekleme" on public.denetimler;
drop policy if exists "denetim ekleme" on public.denetimler;
create policy "denetim ekleme" on public.denetimler
for insert to authenticated
with check (
  public.aves_denetim_olusturabilir_mi(olusturan_email)
  and public.aves_takip_kaynagi_gecerli_mi(takip_onceki_denetim_id)
);

drop policy if exists "R15C denetim guncelleme" on public.denetimler;
drop policy if exists "denetim guncelleme" on public.denetimler;
create policy "denetim guncelleme" on public.denetimler
for update to authenticated
using (public.aves_denetim_yazabilir_mi(olusturan_email))
with check (public.aves_denetim_yazabilir_mi(olusturan_email));

drop policy if exists "R15C saha okuma" on public.saha_kontrol;
drop policy if exists "saha okuma" on public.saha_kontrol;
create policy "saha okuma" on public.saha_kontrol
for select to authenticated
using (
  exists (
    select 1 from public.denetimler d
    where d.id = saha_kontrol.denetim_id
      and public.aves_denetim_gorebilir_mi(d.olusturan_email)
  )
);

drop policy if exists "R15C saha ekleme" on public.saha_kontrol;
drop policy if exists "saha ekleme" on public.saha_kontrol;
create policy "saha ekleme" on public.saha_kontrol
for insert to authenticated
with check (
  exists (
    select 1 from public.denetimler d
    where d.id = saha_kontrol.denetim_id
      and d.denetim_durumu in ('Devam Ediyor','Gözden Geçirme')
      and public.aves_denetim_olusturabilir_mi(d.olusturan_email)
  )
);

drop policy if exists "R15C saha guncelleme" on public.saha_kontrol;
drop policy if exists "saha guncelleme" on public.saha_kontrol;
create policy "saha guncelleme" on public.saha_kontrol
for update to authenticated
using (
  exists (
    select 1 from public.denetimler d
    where d.id = saha_kontrol.denetim_id
      and d.denetim_durumu in ('Devam Ediyor','Gözden Geçirme')
      and public.aves_denetim_yazabilir_mi(d.olusturan_email)
  )
)
with check (
  exists (
    select 1 from public.denetimler d
    where d.id = saha_kontrol.denetim_id
      and d.denetim_durumu in ('Devam Ediyor','Gözden Geçirme')
      and public.aves_denetim_yazabilir_mi(d.olusturan_email)
  )
);

drop policy if exists "gecmis okuma" on public.denetim_degisim_gecmisi;
create policy "gecmis okuma" on public.denetim_degisim_gecmisi
for select to authenticated
using (
  exists (
    select 1 from public.denetimler d
    where d.id = denetim_degisim_gecmisi.denetim_id
      and public.aves_denetim_gorebilir_mi(d.olusturan_email)
  )
);

drop policy if exists "gecmis ekleme" on public.denetim_degisim_gecmisi;
create policy "gecmis ekleme" on public.denetim_degisim_gecmisi
for insert to authenticated
with check (
  denetim_degisim_gecmisi.islem_turu <> 'denetim_silme'
  and exists (
    select 1 from public.denetimler d
    where d.id = denetim_degisim_gecmisi.denetim_id
      and public.aves_denetim_yazabilir_mi(d.olusturan_email)
  )
);

-- 4) Takip referansı bir kez yazıldıktan sonra uygulama kullanıcısı tarafından
-- değiştirilemez. Kontrollü SQL bakım rolleri bu kilidin dışındadır.
create or replace function public.aves_takip_referansini_kilitle()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if current_user in ('postgres','service_role','supabase_admin') then return new; end if;
  if new.takip_kaynak_saha_kontrol_id is distinct from old.takip_kaynak_saha_kontrol_id
    or new.takip_onceki_durum is distinct from old.takip_onceki_durum
    or new.takip_onceki_aciklama is distinct from old.takip_onceki_aciklama
    or new.takip_onceki_bulgu_secenegi is distinct from old.takip_onceki_bulgu_secenegi
    or new.takip_onceki_diger_bulgu is distinct from old.takip_onceki_diger_bulgu
  then
    raise exception 'Takip denetimi kaynak bilgileri kilitlidir';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_aves_takip_referans_kilidi on public.saha_kontrol;
create trigger trg_aves_takip_referans_kilidi
before update on public.saha_kontrol
for each row execute function public.aves_takip_referansini_kilitle();

create or replace function public.aves_takip_zincirini_kilitle()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if current_user in ('postgres','service_role','supabase_admin') then return new; end if;
  if new.takip_ana_denetim_id is distinct from old.takip_ana_denetim_id
    or new.takip_onceki_denetim_id is distinct from old.takip_onceki_denetim_id
    or new.takip_sira_no is distinct from old.takip_sira_no
    or new.takip_onceki_seri_numaralari is distinct from old.takip_onceki_seri_numaralari
  then
    raise exception 'Takip denetimi zincir bilgileri kilitlidir';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_aves_takip_zincir_kilidi on public.denetimler;
create trigger trg_aves_takip_zincir_kilidi
before update on public.denetimler
for each row execute function public.aves_takip_zincirini_kilitle();

create or replace function public.aves_duzeltme_oturumunu_dogrula()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
set row_security = off
as $$
declare
  v_email text := public.aves_oturum_emaili();
  v_ad text;
begin
  if old.denetim_durumu = 'Çalışma Tamamlandı' and new.denetim_durumu = 'Gözden Geçirme' then
    if new.duzeltme_oturumu_id is null or new.duzeltme_nedeni is null then
      raise exception 'Tamamlanmış denetim yalnız gerekçeli düzeltme oturumuyla açılabilir';
    end if;
    select kp.ad_soyad into v_ad
    from public.kullanici_profilleri kp
    where lower(kp.email) = v_email and kp.aktif = true
    limit 1;
    new.duzeltme_baslatan_email := v_email;
    new.duzeltme_baslatan_ad := v_ad;
    new.duzeltme_baslatildi_at := now();
  elsif new.duzeltme_oturumu_id is distinct from old.duzeltme_oturumu_id
    or new.duzeltme_nedeni is distinct from old.duzeltme_nedeni
    or new.duzeltme_baslatildi_at is distinct from old.duzeltme_baslatildi_at
    or new.duzeltme_baslatan_email is distinct from old.duzeltme_baslatan_email
    or new.duzeltme_baslatan_ad is distinct from old.duzeltme_baslatan_ad
  then
    raise exception 'Düzeltme oturumu bilgileri değiştirilemez';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_aves_duzeltme_oturumu on public.denetimler;
create trigger trg_aves_duzeltme_oturumu
before update on public.denetimler
for each row execute function public.aves_duzeltme_oturumunu_dogrula();

commit;

-- Salt okunur kurulum doğrulamaları.
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('denetimler','saha_kontrol','denetim_degisim_gecmisi')
  and column_name in (
    'takip_ana_denetim_id','takip_onceki_denetim_id','takip_sira_no','takip_onceki_seri_numaralari',
    'duzeltme_oturumu_id','duzeltme_nedeni','takip_kaynak_saha_kontrol_id'
  )
order by table_name, column_name;

select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('denetimler','saha_kontrol','denetim_degisim_gecmisi')
order by tablename, cmd, policyname;
