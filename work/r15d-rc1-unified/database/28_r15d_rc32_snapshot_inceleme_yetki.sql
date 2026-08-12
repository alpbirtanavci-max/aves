-- AVES R15D-rc3.2 — snapshot kilidi, değişiklik geçmişi ve kesin rol ayrımı
-- Bu migration veri silmez. Uygulama paketinden ÖNCE çalıştırılmalıdır.
-- Canlı uygulama: 2026-08-12, Supabase proje jmccmkqyncunpqliqvox.
-- Öncesinde aves_backup_r15d_rc32_20260812 şema yedeği oluşturuldu.

begin;

-- 1) Denetim başladığı andaki kütüphane ve kapanış bütünlüğü.
alter table public.denetimler
  add column if not exists snapshot_kilitli_at timestamptz,
  add column if not exists snapshot_app_build_id text,
  add column if not exists snapshot_kutuphane_hash text,
  add column if not exists snapshot_bolum_surumleri text,
  add column if not exists snapshot_madde_sayisi integer,
  add column if not exists snapshot_madde_set_hash text,
  add column if not exists snapshot_content_hash text,
  add column if not exists butunluk_ozeti jsonb,
  add column if not exists butunluk_hash text,
  add column if not exists butunluk_hesaplandi_at timestamptz,
  add column if not exists olusturan_ad text,
  add column if not exists son_degistiren_email text,
  add column if not exists son_degistiren_ad text,
  add column if not exists son_degistiren_rol text,
  add column if not exists son_degistiren_at timestamptz;

alter table public.saha_kontrol
  add column if not exists snapshot_madde_hash text,
  add column if not exists olusturan_email text,
  add column if not exists olusturan_ad text,
  add column if not exists son_degistiren_email text,
  add column if not exists son_degistiren_ad text,
  add column if not exists son_degistiren_rol text,
  add column if not exists son_degistiren_at timestamptz;

-- Eski denetimler yeni hash üretilmiş gibi gösterilmez. Yalnız bilinen
-- oluşturucu adı profilden tamamlanır; tarihsel checklist içeriğine dokunulmaz.
update public.denetimler d
set olusturan_ad = kp.ad_soyad
from public.kullanici_profilleri kp
where d.olusturan_ad is null
  and lower(kp.email) = lower(d.olusturan_email);

-- 2) Uygulama işlemlerinin kim tarafından yapıldığını gösteren eklemeli kayıt.
create table if not exists public.denetim_degisim_gecmisi (
  id uuid primary key,
  denetim_id uuid not null,
  saha_kontrol_id uuid,
  madde_id text,
  islem_turu text not null check (islem_turu in (
    'denetim_olusturma', 'denetim_guncelleme', 'madde_guncelleme', 'denetim_silme'
  )),
  onceki_deger jsonb,
  yeni_deger jsonb,
  degistiren_email text not null,
  degistiren_ad text,
  degistiren_rol text not null,
  cihaz_id uuid,
  app_build_id text,
  created_at timestamptz not null default now()
);

create index if not exists denetim_degisim_gecmisi_denetim_tarih_idx
  on public.denetim_degisim_gecmisi (denetim_id, created_at desc);
create index if not exists denetim_degisim_gecmisi_madde_tarih_idx
  on public.denetim_degisim_gecmisi (saha_kontrol_id, created_at desc)
  where saha_kontrol_id is not null;

-- Kimlik alanlarını istemci belirleyemez; aktif oturum profilinden yazılır.
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
begin
  select kp.ad_soyad, kp.rol into v_ad, v_rol
  from public.kullanici_profilleri kp
  where lower(kp.email) = v_email and kp.aktif = true
  limit 1;

  if v_rol is null then
    raise exception 'Aktif AVES kullanıcı profili bulunamadı';
  end if;

  new.degistiren_email := v_email;
  new.degistiren_ad := v_ad;
  new.degistiren_rol := v_rol;
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists trg_aves_gecmis_kimligi on public.denetim_degisim_gecmisi;
create trigger trg_aves_gecmis_kimligi
before insert on public.denetim_degisim_gecmisi
for each row execute function public.aves_gecmis_kimligini_dogrula();

-- Teknik müdür silme dışında hiçbir tabloya yazmaz. Silme kaydı istemciden
-- değil, denetim gerçekten silinirken sunucu tarafından otomatik oluşturulur.
create or replace function public.aves_denetim_silme_gecmisi()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
set row_security = off
as $$
begin
  insert into public.denetim_degisim_gecmisi (
    id, denetim_id, saha_kontrol_id, madde_id, islem_turu,
    onceki_deger, yeni_deger, degistiren_email, degistiren_ad,
    degistiren_rol, cihaz_id, app_build_id, created_at
  ) values (
    gen_random_uuid(), old.id, null, null, 'denetim_silme',
    jsonb_build_object(
      'musteri_unvani', old.musteri_unvani,
      'asansor_seri_no', old.asansor_seri_no,
      'olusturan_email', old.olusturan_email,
      'butunluk_hash', old.butunluk_hash
    ),
    null, public.aves_oturum_emaili(), null, 'muhendis', null, old.app_build_id, now()
  );
  return old;
end;
$$;

drop trigger if exists trg_aves_denetim_silme_gecmisi on public.denetimler;
create trigger trg_aves_denetim_silme_gecmisi
before delete on public.denetimler
for each row execute function public.aves_denetim_silme_gecmisi();

-- Geçmiş eklemeli yapıdadır; UPDATE/DELETE hiçbir uygulama rolüne verilmez.
alter table public.denetim_degisim_gecmisi enable row level security;

-- 3) Roller ayrı amaçlara ayrılır. Teknik müdür sistem yöneticisi değildir.
create or replace function public.aves_sistem_yoneticisi_mi()
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
      and kp.aktif = true and kp.rol = 'yonetici'
  );
$$;

create or replace function public.aves_denetim_silebilir_mi()
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
      and kp.aktif = true and kp.rol in ('yonetici','teknik_mudur')
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
        kp.rol = 'yonetici'
        or (kp.rol = 'muhendis' and lower(coalesce(p_olusturan_email,'')) = public.aves_oturum_emaili())
      )
  );
$$;

revoke all on function public.aves_sistem_yoneticisi_mi() from public;
revoke all on function public.aves_denetim_silebilir_mi() from public;
revoke all on function public.aves_denetim_yazabilir_mi(text) from public;
grant execute on function public.aves_sistem_yoneticisi_mi() to authenticated;
grant execute on function public.aves_denetim_silebilir_mi() to authenticated;
grant execute on function public.aves_denetim_yazabilir_mi(text) to authenticated;

-- Denetim ve madde üzerindeki görünen son kullanıcı alanları da istemciden
-- güvenilmez kabul edilir; sunucu aktif profilden yeniden yazar.
create or replace function public.aves_satir_kimligini_dogrula()
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
begin
  select kp.ad_soyad, kp.rol into v_ad, v_rol
  from public.kullanici_profilleri kp
  where lower(kp.email) = v_email and kp.aktif = true
  limit 1;
  if v_rol is null then raise exception 'Aktif AVES kullanıcı profili bulunamadı'; end if;

  if tg_op = 'INSERT' then
    new.olusturan_email := v_email;
    new.olusturan_ad := v_ad;
  end if;
  new.son_degistiren_email := v_email;
  new.son_degistiren_ad := v_ad;
  new.son_degistiren_rol := v_rol;
  new.son_degistiren_at := now();
  return new;
end;
$$;

drop trigger if exists trg_aves_denetim_kimligi on public.denetimler;
create trigger trg_aves_denetim_kimligi
before insert or update on public.denetimler
for each row execute function public.aves_satir_kimligini_dogrula();

drop trigger if exists trg_aves_saha_kimligi on public.saha_kontrol;
create trigger trg_aves_saha_kimligi
before insert or update on public.saha_kontrol
for each row execute function public.aves_satir_kimligini_dogrula();

-- 4) Mevcut isimleriyle RLS politikaları yeniden ve açık biçimde kurulur.
drop policy if exists "denetim ekleme" on public.denetimler;
drop policy if exists "denetim guncelleme" on public.denetimler;
drop policy if exists "denetim silme" on public.denetimler;
drop policy if exists "R15C denetim ekleme" on public.denetimler;
drop policy if exists "R15C denetim guncelleme" on public.denetimler;
drop policy if exists "R15C denetim silme" on public.denetimler;

create policy "denetim ekleme" on public.denetimler
for insert to authenticated
with check (
  public.aves_aktif_kullanici_mi()
  and public.aves_denetim_yazabilir_mi(olusturan_email)
);

create policy "denetim guncelleme" on public.denetimler
for update to authenticated
using (
  public.aves_aktif_kullanici_mi()
  and public.aves_denetim_yazabilir_mi(olusturan_email)
)
with check (
  public.aves_aktif_kullanici_mi()
  and public.aves_denetim_yazabilir_mi(olusturan_email)
);

create policy "denetim silme" on public.denetimler
for delete to authenticated
using (
  public.aves_aktif_kullanici_mi()
  and public.aves_denetim_silebilir_mi()
);

drop policy if exists "saha ekleme" on public.saha_kontrol;
drop policy if exists "saha guncelleme" on public.saha_kontrol;
drop policy if exists "R15C saha ekleme" on public.saha_kontrol;
drop policy if exists "R15C saha guncelleme" on public.saha_kontrol;

create policy "saha ekleme" on public.saha_kontrol
for insert to authenticated
with check (
  public.aves_aktif_kullanici_mi()
  and exists (
    select 1 from public.denetimler d
    where d.id = saha_kontrol.denetim_id
      and d.denetim_durumu in ('Devam Ediyor','Gözden Geçirme')
      and public.aves_denetim_yazabilir_mi(d.olusturan_email)
  )
);

create policy "saha guncelleme" on public.saha_kontrol
for update to authenticated
using (
  public.aves_aktif_kullanici_mi()
  and exists (
    select 1 from public.denetimler d
    where d.id = saha_kontrol.denetim_id
      and d.denetim_durumu in ('Devam Ediyor','Gözden Geçirme')
      and public.aves_denetim_yazabilir_mi(d.olusturan_email)
  )
)
with check (
  public.aves_aktif_kullanici_mi()
  and exists (
    select 1 from public.denetimler d
    where d.id = saha_kontrol.denetim_id
      and d.denetim_durumu in ('Devam Ediyor','Gözden Geçirme')
      and public.aves_denetim_yazabilir_mi(d.olusturan_email)
  )
);

drop policy if exists "gecmis okuma" on public.denetim_degisim_gecmisi;
drop policy if exists "gecmis ekleme" on public.denetim_degisim_gecmisi;

create policy "gecmis okuma" on public.denetim_degisim_gecmisi
for select to authenticated
using (public.aves_aktif_kullanici_mi());

create policy "gecmis ekleme" on public.denetim_degisim_gecmisi
for insert to authenticated
with check (
  public.aves_aktif_kullanici_mi()
  and exists (
    select 1 from public.denetimler d
    where d.id = denetim_degisim_gecmisi.denetim_id
      and (
        public.aves_denetim_yazabilir_mi(d.olusturan_email)
        and denetim_degisim_gecmisi.islem_turu <> 'denetim_silme'
      )
  )
);

revoke all on public.denetim_degisim_gecmisi from anon, authenticated;
grant select, insert on public.denetim_degisim_gecmisi to authenticated;

-- 5) Bir denetimin tarihsel metni uygulama üzerinden sonradan değiştirilemez.
create or replace function public.aves_snapshot_degisimini_engelle()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  -- SQL bakım/migration oturumu kontrollü içerik düzeltmesi yapabilsin;
  -- authenticated uygulama kullanıcılarının tamamı kilide tabidir.
  if current_user in ('postgres','service_role','supabase_admin') then
    return new;
  end if;

  if tg_table_name = 'denetimler' then
    if old.snapshot_kilitli_at is not null and (
      new.snapshot_kilitli_at is distinct from old.snapshot_kilitli_at
      or new.snapshot_app_build_id is distinct from old.snapshot_app_build_id
      or new.snapshot_kutuphane_hash is distinct from old.snapshot_kutuphane_hash
      or new.snapshot_bolum_surumleri is distinct from old.snapshot_bolum_surumleri
      or new.snapshot_madde_sayisi is distinct from old.snapshot_madde_sayisi
      or new.snapshot_madde_set_hash is distinct from old.snapshot_madde_set_hash
      or new.snapshot_content_hash is distinct from old.snapshot_content_hash
    ) then
      raise exception 'Denetim snapshot bilgileri kilitlidir';
    end if;
  elsif tg_table_name = 'saha_kontrol' then
    if new.madde_id is distinct from old.madde_id
      or new.sira_no is distinct from old.sira_no
      or new.bolum is distinct from old.bolum
      or new.standart_grubu is distinct from old.standart_grubu
      or new.kaynak_turu is distinct from old.kaynak_turu
      or new.standart_madde_no is distinct from old.standart_madde_no
      or new.kontrol_basligi is distinct from old.kontrol_basligi
      or new.denetci_yonlendirmesi is distinct from old.denetci_yonlendirmesi
      or new.resmi_madde_metni is distinct from old.resmi_madde_metni
      or new.yontem_kodu is distinct from old.yontem_kodu
      or new.dogrulama_yontemi is distinct from old.dogrulama_yontemi
      or new.hazir_secenekler is distinct from old.hazir_secenekler
      or new.kaynak_form_kodu is distinct from old.kaynak_form_kodu
      or new.kaynak_form_revizyonu is distinct from old.kaynak_form_revizyonu
      or new.kaynak_form_tablo_no is distinct from old.kaynak_form_tablo_no
      or new.kaynak_form_satir_no is distinct from old.kaynak_form_satir_no
      or new.kaynak_form_bolumu is distinct from old.kaynak_form_bolumu
      or new.kaynak_form_alt_grubu is distinct from old.kaynak_form_alt_grubu
      or new.olcu1_adi is distinct from old.olcu1_adi
      or new.olcu1_birimi is distinct from old.olcu1_birimi
      or new.olcu2_adi is distinct from old.olcu2_adi
      or new.olcu2_birimi is distinct from old.olcu2_birimi
      or new.esik_deger is distinct from old.esik_deger
      or new.esik_operator is distinct from old.esik_operator
      or new.olcum_tanimlari is distinct from old.olcum_tanimlari
      or new.otomatik_aranmaz_kurali is distinct from old.otomatik_aranmaz_kurali
      or new.aranmaz_kosulu is distinct from old.aranmaz_kosulu
      or new.gorsel_referansi is distinct from old.gorsel_referansi
      or new.snapshot_madde_hash is distinct from old.snapshot_madde_hash
      or new.olusturan_email is distinct from old.olusturan_email
      or new.olusturan_ad is distinct from old.olusturan_ad
    then
      raise exception 'Denetim madde snapshot içeriği kilitlidir';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_aves_denetim_snapshot_kilidi on public.denetimler;
create trigger trg_aves_denetim_snapshot_kilidi
before update on public.denetimler
for each row execute function public.aves_snapshot_degisimini_engelle();

drop trigger if exists trg_aves_saha_snapshot_kilidi on public.saha_kontrol;
create trigger trg_aves_saha_snapshot_kilidi
before update on public.saha_kontrol
for each row execute function public.aves_snapshot_degisimini_engelle();

commit;

-- Salt okunur kurulum doğrulamaları.
select column_name, data_type
from information_schema.columns
where table_schema='public' and table_name in ('denetimler','saha_kontrol','denetim_degisim_gecmisi')
  and column_name in ('snapshot_kilitli_at','snapshot_content_hash','snapshot_madde_hash','butunluk_hash','degistiren_email')
order by table_name, column_name;

select tablename, policyname, cmd
from pg_policies
where schemaname='public' and tablename in ('denetimler','saha_kontrol','denetim_degisim_gecmisi')
order by tablename, cmd, policyname;
