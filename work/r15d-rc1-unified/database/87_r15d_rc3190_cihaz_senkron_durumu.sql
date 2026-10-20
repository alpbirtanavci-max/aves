-- AVES Saha R15D-rc3.19.0 — cihaz senkron durumu (yönetici için "eşitlenmemiş kayıtlar").
--
-- Bir mühendisin telefonundaki bekleyen/çakışan/yetki bekleyen işlemleri ancak mühendis
-- söyleyince bilebiliyorduk. Her cihaz, senkron durumunu bu tabloya (en iyi çaba) bildirir;
-- yönetici ve teknik müdür hangi cihazın neyi gönderemediğini görür.
--
-- Tabloda SAHA CEVABI, firma adı, adres veya parola YOKTUR: yalnız sayılar, durum, kısa hata
-- metni ve bekleyen denetimlerin kimliği (uuid).
--
-- Güvenlik:
--   * (email, cihaz_id) birincil anahtar. email İSTEMCİDEN ALINMAZ: trigger oturumdan yazar,
--     başka kullanıcı adına satır yazılamaz.
--   * bildirildi_at sunucu saatidir (istemci saati yok sayılır).
--   * Okuma: kullanıcı yalnız kendi satırlarını; aktif yönetici / teknik müdür hepsini.
--   * Yazma (ekleme/güncelleme): yalnız aktif kullanıcı, yalnız kendi satırı. Silme yok.
--   * Metin ve liste boyutları sınırlıdır (şişirilmiş istekler reddedilir).
--   * Mevcut tablolara ve politikalara dokunmaz; geri alma: drop table public.cihaz_senkron_durumu.

begin;

create table if not exists public.cihaz_senkron_durumu (
  email text not null,
  cihaz_id text not null check (char_length(cihaz_id) between 8 and 80),
  uygulama_surumu text check (char_length(uygulama_surumu) <= 40),
  bildirildi_at timestamptz not null default now(),
  cevrimici boolean,
  bekleyen_islem integer not null default 0 check (bekleyen_islem between 0 and 100000),
  cakisma integer not null default 0 check (cakisma between 0 and 100000),
  yetki_bekleyen integer not null default 0 check (yetki_bekleyen between 0 and 100000),
  yeniden_deneme integer not null default 0 check (yeniden_deneme between 0 and 100000),
  bekleyen_fotograf integer not null default 0 check (bekleyen_fotograf between 0 and 100000),
  en_eski_bekleyen_at timestamptz,
  son_hata text check (char_length(son_hata) <= 300),
  denetimler jsonb not null default '[]'::jsonb,
  primary key (email, cihaz_id)
);

-- Sunucu tarafı doğrulama: email oturumdan, zaman sunucudan, liste boyutu sınırlı.
create or replace function public.aves_cihaz_durumu_dogrula()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $$
begin
  -- Bakım rolleri (migration/servis) dokunulmadan geçer.
  if current_user in ('postgres','service_role','supabase_admin') then
    return new;
  end if;
  new.email := public.aves_oturum_emaili();
  new.bildirildi_at := now();
  if jsonb_typeof(new.denetimler) <> 'array' or jsonb_array_length(new.denetimler) > 50 then
    raise exception 'denetimler en fazla 50 öğeli bir liste olmalı';
  end if;
  if octet_length(new.denetimler::text) > 20000 then
    raise exception 'denetimler listesi çok büyük';
  end if;
  return new;
end;
$$;

revoke all on function public.aves_cihaz_durumu_dogrula() from public;

drop trigger if exists trg_aves_cihaz_durumu_dogrula on public.cihaz_senkron_durumu;
create trigger trg_aves_cihaz_durumu_dogrula
before insert or update on public.cihaz_senkron_durumu
for each row execute function public.aves_cihaz_durumu_dogrula();

alter table public.cihaz_senkron_durumu enable row level security;

drop policy if exists "cihaz durumu okuma" on public.cihaz_senkron_durumu;
create policy "cihaz durumu okuma" on public.cihaz_senkron_durumu
for select to authenticated
using (
  public.aves_aktif_kullanici_mi()
  and (email = public.aves_oturum_emaili() or public.aves_tum_denetimleri_gorebilir_mi())
);

drop policy if exists "cihaz durumu ekleme" on public.cihaz_senkron_durumu;
create policy "cihaz durumu ekleme" on public.cihaz_senkron_durumu
for insert to authenticated
with check (public.aves_aktif_kullanici_mi());

drop policy if exists "cihaz durumu guncelleme" on public.cihaz_senkron_durumu;
create policy "cihaz durumu guncelleme" on public.cihaz_senkron_durumu
for update to authenticated
using (public.aves_aktif_kullanici_mi() and email = public.aves_oturum_emaili())
with check (public.aves_aktif_kullanici_mi() and email = public.aves_oturum_emaili());

revoke all on public.cihaz_senkron_durumu from anon, authenticated;
grant select, insert, update on public.cihaz_senkron_durumu to authenticated;

commit;

-- Salt okunur doğrulama.
select policyname, cmd from pg_policies where schemaname = 'public' and tablename = 'cihaz_senkron_durumu' order by policyname;
