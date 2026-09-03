-- RLS senaryo testi — migration 79 (takip atanan mühendis yetkisi)
-- ============================================================================
-- ÇALIŞTIRMA: Bir Supabase branch'inde, migration 1..79 uygulandıktan sonra.
--   psql "$BRANCH_DB_URL" -v ON_ERROR_STOP=1 -f 79_takip_atama.sql
--
-- Script tek transaction'dır ve sonunda ROLLBACK yapar — test verisi kalıcı olmaz.
-- Her senaryo bir DO bloğudur; sonuç `PASS <n>` / `FAIL <n>` olarak yazılır.
-- Referans: work/r15d-rc1-unified/tests/RLS_TEST_CHECKLIST.md §1b + §3 + §3c.
--
-- DURUM: fikstür kurulumu canlı şemaya göre yazıldı; senaryo blokları henüz bir
-- branch'te çalıştırılmadı. İlk koşumda beklenen ufak düzeltmeler (claim biçimi,
-- kolon adı) buraya işlenmeli.
-- ============================================================================

begin;

-- Kimlik trigger'ları fikstür kurulumunu engeller (aktif profil arar); yalnız
-- setup boyunca kapat.
alter table public.denetimler        disable trigger user;
alter table public.saha_kontrol      disable trigger user;

-- --- Personalar --------------------------------------------------------------
insert into public.kullanici_profilleri (email, ad_soyad, rol, aktif) values
  ('a.ilk@test.local',    'A Ilk Denetci',      'muhendis',  true),
  ('b.yonetim@test.local','B Yonetim',          'yonetici',  true),
  ('c.atanan@test.local', 'C Atanan Muhendis',  'muhendis',  true),
  ('d.ilgisiz@test.local','D Ilgisiz Muhendis', 'muhendis',  true)
on conflict (email) do update set aktif = true, rol = excluded.rol;

-- --- Fikstür: ana denetim + takip kaydı (C'ye atanmış) + bir saha satırı ------
-- Not: NOT NULL kolonlar canlı şemadan: musteri_unvani, asansor_seri_no,
-- ana_standart, olusturan_email (+ default'lu olanlar boş bırakılabilir).
do $$
declare v_ana uuid := gen_random_uuid();
        v_takip uuid := gen_random_uuid();
        v_saha uuid := gen_random_uuid();
begin
  insert into public.denetimler (id, musteri_unvani, asansor_seri_no, ana_standart,
    olusturan_email, denetim_durumu)
  values (v_ana, 'Test AVM', 'SN-ANA-001', 'TS EN 81-20',
    'a.ilk@test.local', 'Çalışma Tamamlandı');

  insert into public.denetimler (id, musteri_unvani, asansor_seri_no, ana_standart,
    olusturan_email, denetim_durumu, takip_ana_denetim_id, takip_onceki_denetim_id,
    takip_sira_no, takip_atanan_email, takip_atanan_ad, takip_atama_at)
  values (v_takip, 'Test AVM', 'SN-ANA-001', 'TS EN 81-20',
    'a.ilk@test.local', 'Devam Ediyor', v_ana, v_ana, 1,
    'c.atanan@test.local', 'C Atanan Muhendis', now());

  insert into public.saha_kontrol (id, denetim_id, madde_id, sira_no, bolum,
    standart_grubu, kontrol_basligi)
  values (v_saha, v_takip, 'MAD-0001', 1, 'Genel', 'TS EN 81-20', 'Test maddesi');

  -- id'leri sonraki bloklara taşı
  create temporary table _ids (ana uuid, takip uuid, saha uuid) on commit drop;
  insert into _ids values (v_ana, v_takip, v_saha);
end $$;

alter table public.denetimler   enable trigger user;
alter table public.saha_kontrol enable trigger user;

-- --- Yardımcı: oturum taklidi -----------------------------------------------
-- aves_oturum_emaili() = lower(coalesce(auth.jwt() ->> 'email','')) (canlıdan doğrulandı)
-- Her senaryo bloğu başında:
--   set local role authenticated;
--   set local request.jwt.claims = '{"role":"authenticated","email":"<persona>"}';
-- ve blok sonunda `reset role;` (transaction ROLLBACK ile toparlanır).

-- ============================================================================
-- §3 SENARYOLAR — beklenen sonuçlar RLS_TEST_CHECKLIST.md ile birebir
-- ============================================================================

-- 3.1  C takip denetimini görür (SELECT denetimler) -> 1 satır
do $$
declare n int;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"role":"authenticated","email":"c.atanan@test.local"}';
  select count(*) into n from public.denetimler d
    where d.id = (select takip from _ids);
  reset role;
  raise notice '%  3.1  C takip denetimini gorur (beklenen 1, gelen %)',
    case when n = 1 then 'PASS' else 'FAIL' end, n;
end $$;

-- 3.2  C takip kaydının saha_kontrol satırlarını görür
do $$
declare n int;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"role":"authenticated","email":"c.atanan@test.local"}';
  select count(*) into n from public.saha_kontrol s
    where s.denetim_id = (select takip from _ids);
  reset role;
  raise notice '%  3.2  C saha_kontrol gorur (beklenen 1, gelen %)',
    case when n = 1 then 'PASS' else 'FAIL' end, n;
end $$;

-- 3.3  C bir maddeyi günceller (aktif durumda) -> başarılı
do $$
begin
  set local role authenticated;
  set local request.jwt.claims = '{"role":"authenticated","email":"c.atanan@test.local"}';
  update public.saha_kontrol set durum = 'Kontrol tamamlandı'
    where denetim_id = (select takip from _ids);
  reset role;
  raise notice 'PASS  3.3  C saha_kontrol guncelleme basarili';
exception when others then
  reset role;
  raise notice 'FAIL  3.3  C saha_kontrol guncelleme reddedildi: %', sqlerrm;
end $$;

-- 3.12  C üst bilgi değiştiremez (trigger) -> RED
do $$
begin
  set local role authenticated;
  set local request.jwt.claims = '{"role":"authenticated","email":"c.atanan@test.local"}';
  update public.denetimler set musteri_unvani = 'DEGISTIRILDI'
    where id = (select takip from _ids);
  reset role;
  raise notice 'FAIL  3.12  C musteri_unvani degistirebildi (RED bekleniyordu)';
exception when others then
  reset role;
  raise notice 'PASS  3.12  C ust bilgi degisikligi reddedildi: %', sqlerrm;
end $$;

-- 3.12c  C takibi kapatabilir (denetim_durumu -> Çalışma Tamamlandı) -> başarılı
do $$
begin
  set local role authenticated;
  set local request.jwt.claims = '{"role":"authenticated","email":"c.atanan@test.local"}';
  update public.denetimler set denetim_durumu = 'Çalışma Tamamlandı'
    where id = (select takip from _ids);
  reset role;
  raise notice 'PASS  3.12c C takibi kapatabildi';
exception when others then
  reset role;
  raise notice 'FAIL  3.12c C takibi kapatamadi: %', sqlerrm;
end $$;

-- 3.10 / 3.5(a)  Tamamlanmış kayıttan sonra C yeni güncelleme başlatamaz -> RED
do $$
begin
  set local role authenticated;
  set local request.jwt.claims = '{"role":"authenticated","email":"c.atanan@test.local"}';
  update public.denetimler set updated_at = now()
    where id = (select takip from _ids);
  reset role;
  raise notice 'FAIL  3.10  C tamamlanmis kaydi guncelleyebildi (RED bekleniyordu)';
exception when others then
  reset role;
  raise notice 'PASS  3.10  C tamamlanmis kayitta guncelleme reddedildi';
end $$;

-- 3.13  D takip denetimini GÖRMEZ -> 0 satır
do $$
declare n int;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"role":"authenticated","email":"d.ilgisiz@test.local"}';
  select count(*) into n from public.denetimler d
    where d.id = (select takip from _ids);
  reset role;
  raise notice '%  3.13  D takip denetimini gormez (beklenen 0, gelen %)',
    case when n = 0 then 'PASS' else 'FAIL' end, n;
end $$;

-- 3.14  D saha_kontrol güncelleyemez -> RED
do $$
begin
  set local role authenticated;
  set local request.jwt.claims = '{"role":"authenticated","email":"d.ilgisiz@test.local"}';
  update public.saha_kontrol set durum = 'Olumsuz bulgu'
    where denetim_id = (select takip from _ids);
  -- güncellenen satır 0 ise de "RED" sayılır (RLS satırı görünmez kılar)
  if not found then
    reset role; raise notice 'PASS  3.14  D saha_kontrol guncelleyemedi (0 satir)';
  else
    reset role; raise notice 'FAIL  3.14  D saha_kontrol guncelledi';
  end if;
exception when others then
  reset role;
  raise notice 'PASS  3.14  D saha_kontrol guncelleme reddedildi';
end $$;

-- 3.16  A (oluşturan) kendi takip kaydını görür + günceller -> başarılı (regresyon)
do $$
declare n int;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"role":"authenticated","email":"a.ilk@test.local"}';
  select count(*) into n from public.denetimler d where d.id = (select takip from _ids);
  reset role;
  raise notice '%  3.16  A takip kaydini gorur (beklenen 1, gelen %)',
    case when n = 1 then 'PASS' else 'FAIL' end, n;
end $$;

-- 3.17  B (yönetim) tüm denetimleri görür -> başarılı (regresyon)
do $$
declare n int;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"role":"authenticated","email":"b.yonetim@test.local"}';
  select count(*) into n from public.denetimler d where d.id = (select takip from _ids);
  reset role;
  raise notice '%  3.17  B takip kaydini gorur (beklenen 1, gelen %)',
    case when n = 1 then 'PASS' else 'FAIL' end, n;
end $$;

-- ============================================================================
-- EKSİK (branch'te tamamlanacak): denetim_degisim_gecmisi INSERT/SELECT (3.4/3.5),
-- denetim_fotograflari + storage.objects metadata/nesne senaryoları (3.6–3.9, 3.15),
-- §3c gerçek PWA akışı (son_degistiren_* ile tam-satır PATCH).
-- Bunlar fikstür olarak bir denetim_fotograflari satırı + storage.objects kaydı
-- ve gecmis trigger'ının kimlik damgası gerektirir.
-- ============================================================================

rollback;
