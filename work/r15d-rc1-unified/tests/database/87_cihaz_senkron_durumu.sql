-- DB senaryo testi — migration 87 (cihaz senkron durumu)
-- ============================================================================
-- ÇALIŞTIRMA: 79_local_bootstrap.sql + 87 migration uygulandıktan sonra
--   psql -v ON_ERROR_STOP=1 -f 87_cihaz_senkron_durumu.sql
-- Tek transaction, ROLLBACK ile biter. Personalar: A ilk mühendis, B yönetici,
-- C ilgisiz mühendis, T teknik müdür, D pasif kullanıcı. Referans: RLS_TEST_CHECKLIST.md
-- ============================================================================

begin;

insert into public.kullanici_profilleri (email, ad_soyad, rol, aktif) values
  ('a.ilk@test.local',     'A Ilk Muhendis',     'muhendis',     true),
  ('b.yonetim@test.local', 'B Yonetim',          'yonetici',     true),
  ('c.atanan@test.local',  'C Ilgisiz Muhendis', 'muhendis',     true),
  ('t.mudur@test.local',   'T Teknik Mudur',     'teknik_mudur', true),
  ('d.pasif@test.local',   'D Pasif',            'muhendis',     false)
on conflict (email) do update set aktif = excluded.aktif, rol = excluded.rol;

-- 1. A kendi cihaz durumunu bildirir; istemci e-posta ve saati sahte verse bile sunucu değerleri yazılır.
do $$
declare v_email text; v_at timestamptz; v_bekleyen integer;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"role":"authenticated","email":"a.ilk@test.local"}';
  insert into public.cihaz_senkron_durumu (email, cihaz_id, uygulama_surumu, bildirildi_at, bekleyen_islem, cakisma, denetimler)
  values ('c.atanan@test.local', 'cihaz-a-0001', 'R15D-rc9', '2001-01-01', 3, 1, '[{"id":"11111111-1111-1111-1111-111111111111","bekleyen":3}]');
  reset role;
  select email, bildirildi_at, bekleyen_islem into v_email, v_at, v_bekleyen from public.cihaz_senkron_durumu where cihaz_id = 'cihaz-a-0001';
  if v_email <> 'a.ilk@test.local' then raise exception 'FAIL 1: e-posta oturumdan yazılmalıydı, gelen: %', v_email; end if;
  if v_at < now() - interval '1 minute' then raise exception 'FAIL 1: bildirildi_at sunucu saati olmalı'; end if;
  if v_bekleyen <> 3 then raise exception 'FAIL 1: sayı yazılmadı'; end if;
  raise notice 'PASS 1: A kendi satırını yazar, e-posta/saat sunucudan';
end $$;

-- 2. A aynı cihaz için tekrar bildirir (upsert): satır güncellenir, çoğalmaz.
do $$
declare v_adet integer; v_bekleyen integer;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"role":"authenticated","email":"a.ilk@test.local"}';
  insert into public.cihaz_senkron_durumu (cihaz_id, bekleyen_islem)
  values ('cihaz-a-0001', 0)
  on conflict (email, cihaz_id) do update set bekleyen_islem = excluded.bekleyen_islem;
  reset role;
  select count(*), max(bekleyen_islem) into v_adet, v_bekleyen from public.cihaz_senkron_durumu where cihaz_id = 'cihaz-a-0001';
  if v_adet <> 1 or v_bekleyen <> 0 then raise exception 'FAIL 2: upsert tek satırı güncellemeliydi (% satır, bekleyen %)', v_adet, v_bekleyen; end if;
  raise notice 'PASS 2: upsert tek satırı günceller';
end $$;

-- 3. C kendi satırını yazar; A'nın satırını görmez, A da C'ninkini görmez.
do $$
declare v_gorulen integer;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"role":"authenticated","email":"c.atanan@test.local"}';
  insert into public.cihaz_senkron_durumu (cihaz_id, bekleyen_islem, cakisma) values ('cihaz-c-0001', 5, 2);
  select count(*) into v_gorulen from public.cihaz_senkron_durumu;
  if v_gorulen <> 1 then raise exception 'FAIL 3: C yalnız kendi satırını görmeli, gördüğü: %', v_gorulen; end if;
  set local request.jwt.claims = '{"role":"authenticated","email":"a.ilk@test.local"}';
  select count(*) into v_gorulen from public.cihaz_senkron_durumu;
  if v_gorulen <> 1 then raise exception 'FAIL 3: A yalnız kendi satırını görmeli, gördüğü: %', v_gorulen; end if;
  reset role;
  raise notice 'PASS 3: mühendisler yalnız kendi cihaz satırını görür';
end $$;

-- 4. B yönetici ve T teknik müdür tüm satırları görür.
do $$
declare v_gorulen integer;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"role":"authenticated","email":"b.yonetim@test.local"}';
  select count(*) into v_gorulen from public.cihaz_senkron_durumu;
  if v_gorulen <> 2 then raise exception 'FAIL 4: yönetici 2 satır görmeli, gördüğü: %', v_gorulen; end if;
  set local request.jwt.claims = '{"role":"authenticated","email":"t.mudur@test.local"}';
  select count(*) into v_gorulen from public.cihaz_senkron_durumu;
  if v_gorulen <> 2 then raise exception 'FAIL 4: teknik müdür 2 satır görmeli, gördüğü: %', v_gorulen; end if;
  reset role;
  raise notice 'PASS 4: yönetici ve teknik müdür tüm cihaz durumlarını görür';
end $$;

-- 5. Yönetici başkasının satırını güncelleyemez/silemez (yalnız okur); mühendis de silemez.
do $$
declare v_etki integer; v_hata boolean := false; v_bekleyen integer;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"role":"authenticated","email":"b.yonetim@test.local"}';
  update public.cihaz_senkron_durumu set bekleyen_islem = 99 where cihaz_id = 'cihaz-c-0001';
  get diagnostics v_etki = row_count;
  if v_etki <> 0 then raise exception 'FAIL 5: yönetici başkasının satırını güncelledi'; end if;
  begin
    delete from public.cihaz_senkron_durumu where cihaz_id = 'cihaz-c-0001';
  exception when insufficient_privilege then v_hata := true;
  end;
  if not v_hata then raise exception 'FAIL 5: silme yetkisi olmamalı'; end if;
  reset role;
  select bekleyen_islem into v_bekleyen from public.cihaz_senkron_durumu where cihaz_id = 'cihaz-c-0001';
  if v_bekleyen <> 5 then raise exception 'FAIL 5: satır değişmemeliydi (%).', v_bekleyen; end if;
  raise notice 'PASS 5: başkasının satırı güncellenemez, hiç kimse silemez';
end $$;

-- 6. Pasif kullanıcı yazamaz ve okuyamaz; anon hiçbir şey yapamaz.
do $$
declare v_hata boolean := false; v_gorulen integer;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"role":"authenticated","email":"d.pasif@test.local"}';
  begin
    insert into public.cihaz_senkron_durumu (cihaz_id, bekleyen_islem) values ('cihaz-d-0001', 1);
  exception when others then v_hata := true;
  end;
  if not v_hata then raise exception 'FAIL 6: pasif kullanıcı yazabildi'; end if;
  select count(*) into v_gorulen from public.cihaz_senkron_durumu;
  if v_gorulen <> 0 then raise exception 'FAIL 6: pasif kullanıcı satır görüyor (%)', v_gorulen; end if;
  reset role;
  v_hata := false;
  set local role anon;
  begin
    perform count(*) from public.cihaz_senkron_durumu;
  exception when insufficient_privilege then v_hata := true;
  end;
  reset role;
  if not v_hata then raise exception 'FAIL 6: anon okuyabildi'; end if;
  raise notice 'PASS 6: pasif kullanıcı ve anon erişemez';
end $$;

-- 7. Aşırı büyük liste ve negatif sayı reddedilir.
do $$
declare v_hata1 boolean := false; v_hata2 boolean := false;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"role":"authenticated","email":"a.ilk@test.local"}';
  begin
    insert into public.cihaz_senkron_durumu (cihaz_id, denetimler)
    select 'cihaz-a-0002', jsonb_agg(jsonb_build_object('id', g)) from generate_series(1, 51) g;
  exception when others then v_hata1 := true;
  end;
  begin
    insert into public.cihaz_senkron_durumu (cihaz_id, bekleyen_islem) values ('cihaz-a-0003', -1);
  exception when others then v_hata2 := true;
  end;
  reset role;
  if not v_hata1 then raise exception 'FAIL 7: 51 öğeli liste kabul edildi'; end if;
  if not v_hata2 then raise exception 'FAIL 7: negatif sayı kabul edildi'; end if;
  raise notice 'PASS 7: şişirilmiş / geçersiz istek reddedilir';
end $$;

rollback;
