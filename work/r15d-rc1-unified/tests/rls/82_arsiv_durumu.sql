-- RLS senaryo testi — migration 82 (kurumsal arşiv durumu trigger)
-- ============================================================================
-- ÇALIŞTIRMA:
--   Yerel: 79_local_bootstrap.sql + migration 79 + migration 82 uygulandıktan
--          sonra  psql -v ON_ERROR_STOP=1 -f 82_arsiv_durumu.sql
--   CI:    .github/workflows/ci.yml rls-test job'ında zincirin sonunda.
--
-- Script tek transaction'dır ve ROLLBACK ile biter. Başarısız her beklenti
-- exception üretir; psql -v ON_ERROR_STOP=1 bu nedenle kırmızı döner.
-- Personalar: A ilk denetçi (sahip/muhendis), B yönetici, C ilgisiz muhendis,
-- T teknik müdür. Referans: RLS_TEST_CHECKLIST.md §1b + §3.
-- ============================================================================

begin;

alter table public.denetimler disable trigger user;
alter table public.saha_kontrol disable trigger user;

insert into public.kullanici_profilleri (email, ad_soyad, rol, aktif) values
  ('a.ilk@test.local',     'A Ilk Denetci',      'muhendis',     true),
  ('b.yonetim@test.local', 'B Yonetim',          'yonetici',     true),
  ('c.atanan@test.local',  'C Ilgisiz Muhendis', 'muhendis',     true),
  ('t.mudur@test.local',   'T Teknik Mudur',     'teknik_mudur', true)
on conflict (email) do update set aktif = true, rol = excluded.rol;

do $$
declare
  v_tamam uuid := gen_random_uuid();
  v_aktif uuid := gen_random_uuid();
begin
  -- Tamamlanmış denetim (arşiv işareti buraya konabilir).
  insert into public.denetimler (id, musteri_unvani, asansor_seri_no, ana_standart,
    olusturan_email, denetim_durumu)
  values (v_tamam, 'Test AVM', 'SN-ARS-001', 'TS EN 81-20',
    'a.ilk@test.local', 'Çalışma Tamamlandı');

  -- Devam eden denetim (arşiv işareti reddedilmeli).
  insert into public.denetimler (id, musteri_unvani, asansor_seri_no, ana_standart,
    olusturan_email, denetim_durumu)
  values (v_aktif, 'Test AVM', 'SN-ARS-002', 'TS EN 81-20',
    'a.ilk@test.local', 'Devam Ediyor');

  create temporary table _ids (tamam uuid, aktif uuid) on commit drop;
  insert into _ids values (v_tamam, v_aktif);
end $$;

grant select on _ids to authenticated;

alter table public.denetimler enable trigger user;
alter table public.saha_kontrol enable trigger user;

-- 1. B yönetici tamamlanmış denetimi arşive aktarıldı olarak işaretler.
--    İstemciden gönderilen sahte e-posta ve zaman yok sayılmalı; değerler
--    sunucudan yazılmalı.
do $$
declare changed integer; v_at timestamptz; v_email text; v_before timestamptz := now();
begin
  set local role authenticated;
  set local request.jwt.claims = '{"role":"authenticated","email":"b.yonetim@test.local"}';
  update public.denetimler
  set arsive_aktarildi_at = '2000-01-01T00:00:00Z', arsive_aktaran_email = 'sahte@saldirgan.local'
  where id = (select tamam from _ids);
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception '1: B yönetici arşiv işareti koyamadı (satır=%)', changed; end if;
  select arsive_aktarildi_at, arsive_aktaran_email into v_at, v_email
  from public.denetimler where id = (select tamam from _ids);
  if v_at is null or v_at < v_before then
    raise exception '1: arsive_aktarildi_at sunucu saatinden yazılmadı (%).', v_at;
  end if;
  if v_email <> 'b.yonetim@test.local' then
    raise exception '1: arsive_aktaran_email istemciden alındı, oturumdan değil (%).', v_email;
  end if;
  reset role;
end $$;

-- 2. A sahip (muhendis) arşiv alanlarını değiştiremez — RLS geçse bile trigger reddeder.
do $$
declare blocked boolean := false;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"role":"authenticated","email":"a.ilk@test.local"}';
  begin
    update public.denetimler set arsive_aktaran_email = 'a.ilk@test.local'
    where id = (select tamam from _ids);
  exception when others then blocked := true;
  end;
  if not blocked then raise exception '2: A sahip arşiv alanını değiştirebildi'; end if;
  -- Sahip normal alanları hâlâ güncelleyebilmeli (regresyon).
  update public.denetimler set musteri_unvani = 'A Sahip Guncel' where id = (select tamam from _ids);
  reset role;
end $$;

-- 3. C ilgisiz muhendis tamamlanmış denetimi hiç göremez/güncelleyemez (RLS 0 satır).
do $$
declare changed integer;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"role":"authenticated","email":"c.atanan@test.local"}';
  update public.denetimler set arsive_aktaran_email = 'c.atanan@test.local'
  where id = (select tamam from _ids);
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception '3: C ilgisiz muhendis arşiv alanını değiştirebildi (satır=%)', changed; end if;
  reset role;
end $$;

-- 4. B yönetici devam eden denetimi arşive aktaramaz — trigger durum kontrolü.
do $$
declare blocked boolean := false;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"role":"authenticated","email":"b.yonetim@test.local"}';
  begin
    update public.denetimler set arsive_aktarildi_at = now()
    where id = (select aktif from _ids);
  exception when others then blocked := true;
  end;
  if not blocked then raise exception '4: B yönetici devam eden denetimi arşive aktarabildi'; end if;
  reset role;
end $$;

-- 5. T teknik müdür arşiv işaretini kaldırır — iki alan birlikte NULL olur,
--    istemciden gönderilen bayat değerler yok sayılır.
do $$
declare v_at timestamptz; v_email text;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"role":"authenticated","email":"t.mudur@test.local"}';
  update public.denetimler
  set arsive_aktarildi_at = null, arsive_aktaran_email = 'bayat@iz.local'
  where id = (select tamam from _ids);
  select arsive_aktarildi_at, arsive_aktaran_email into v_at, v_email
  from public.denetimler where id = (select tamam from _ids);
  if v_at is not null or v_email is not null then
    raise exception '5: işaret kaldırılınca alanlar NULL olmadı (at=%, email=%)', v_at, v_email;
  end if;
  reset role;
end $$;

rollback;
