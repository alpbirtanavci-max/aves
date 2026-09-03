-- RLS senaryo testi — migration 79 (takip atanan mühendis yetkisi)
-- ============================================================================
-- ÇALIŞTIRMA:
--   Yerel, izole kanıt: .\tests\rls\run-79-local.ps1
--   Supabase branch:    psql "$BRANCH_DB_URL" -v ON_ERROR_STOP=1 -f 79_takip_atama.sql
--
-- Script tek transaction'dır ve ROLLBACK ile biter. Başarısız her beklenti
-- exception üretir; psql -v ON_ERROR_STOP=1 bu nedenle kırmızı döner. Notice
-- yazıp başarıyla çıkmak yasaktır. Referans: RLS_TEST_CHECKLIST.md §1b + §3.
-- ============================================================================

begin;

alter table public.denetimler disable trigger user;
alter table public.saha_kontrol disable trigger user;

insert into public.kullanici_profilleri (email, ad_soyad, rol, aktif) values
  ('a.ilk@test.local',     'A Ilk Denetci',     'muhendis',  true),
  ('b.yonetim@test.local', 'B Yonetim',         'yonetici',  true),
  ('c.atanan@test.local',  'C Atanan Muhendis', 'muhendis',  true),
  ('d.ilgisiz@test.local', 'D Ilgisiz Muhendis','muhendis',  true)
on conflict (email) do update set aktif = true, rol = excluded.rol;

do $$
declare
  v_ana uuid := gen_random_uuid();
  v_takip uuid := gen_random_uuid();
  v_saha uuid := gen_random_uuid();
  v_foto uuid := gen_random_uuid();
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

  insert into public.denetim_fotograflari (id, denetim_id, object_path, kategori)
  values (v_foto, v_takip, v_takip::text || '/genel/baslangic.jpg', 'genel');

  insert into storage.objects (bucket_id, name)
  values ('denetim-fotograflari', v_takip::text || '/genel/baslangic.jpg');

  create temporary table _ids (ana uuid, takip uuid, saha uuid, foto uuid) on commit drop;
  insert into _ids values (v_ana, v_takip, v_saha, v_foto);
end $$;

-- Senaryo blokları `authenticated` rolüne geçer; fixture kimlikleri test
-- yardımcısıdır, production tablosu değildir.
grant select on _ids to authenticated;

alter table public.denetimler enable trigger user;
alter table public.saha_kontrol enable trigger user;

-- Her blok başarısız beklentide exception atar. Bu, RLS'nin 0 satır döndürdüğü
-- sessiz retleri ile trigger kaynaklı açık retleri aynı güven düzeyinde sınar.

-- 3.1–3.3 C: takip ve checklist'i görür/günceller.
do $$
declare n integer; changed integer;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"role":"authenticated","email":"c.atanan@test.local"}';
  select count(*) into n from public.denetimler where id = (select takip from _ids);
  if n <> 1 then raise exception '3.1: C takip kaydını göremedi (satır=%)', n; end if;
  select count(*) into n from public.saha_kontrol where denetim_id = (select takip from _ids);
  if n <> 1 then raise exception '3.2: C checklist satırını göremedi (satır=%)', n; end if;
  update public.saha_kontrol set durum = 'Kontrol tamamlandı' where id = (select saha from _ids);
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception '3.3: C checklist güncelleyemedi (satır=%)', changed; end if;
  reset role;
end $$;

-- 3.4–3.5 C: geçmiş ekler ve görür.
do $$
declare n integer; changed integer;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"role":"authenticated","email":"c.atanan@test.local"}';
  insert into public.denetim_degisim_gecmisi (denetim_id, islem_turu, detay)
  values ((select takip from _ids), 'saha_kontrol_guncelleme', '{"test":true}');
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception '3.4: C geçmiş olayı ekleyemedi'; end if;
  select count(*) into n from public.denetim_degisim_gecmisi where denetim_id = (select takip from _ids);
  if n <> 1 then raise exception '3.5: C geçmiş olayını göremedi (satır=%)', n; end if;
  reset role;
end $$;

-- 3.6–3.9 C: fotoğraf metadata'sı ve Storage nesnesi okunur; ekleme/upsert yapılır.
do $$
declare n integer; changed integer; v_path text;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"role":"authenticated","email":"c.atanan@test.local"}';
  select count(*) into n from public.denetim_fotograflari where id = (select foto from _ids);
  if n <> 1 then raise exception '3.6: C fotoğraf metadata göremedi (satır=%)', n; end if;
  update public.denetim_fotograflari set kategori = 'genel-guncel' where id = (select foto from _ids);
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception '3.6b: C fotoğraf metadata güncelleyemedi'; end if;
  select count(*) into n from storage.objects where bucket_id = 'denetim-fotograflari'
    and name = (select takip::text || '/genel/baslangic.jpg' from _ids);
  if n <> 1 then raise exception '3.7: C Storage nesnesini göremedi (satır=%)', n; end if;
  select takip::text || '/genel/yeni.jpg' into v_path from _ids;
  insert into storage.objects (bucket_id, name) values ('denetim-fotograflari', v_path);
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception '3.8: C Storage nesnesi ekleyemedi'; end if;
  update storage.objects set metadata = '{"upsert":true}'::jsonb
    where bucket_id = 'denetim-fotograflari' and name = v_path;
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception '3.9: C Storage upsert güncellemesi yapamadı'; end if;
  reset role;
end $$;

-- 3.12 C üst bilgiyi değiştiremez; 3.12b izinli tam-satır PATCH'i başarır.
do $$
declare blocked boolean := false; changed integer;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"role":"authenticated","email":"c.atanan@test.local"}';
  begin
    update public.denetimler set musteri_unvani = 'DEGISTIRILDI' where id = (select takip from _ids);
  exception when others then blocked := true;
  end;
  if not blocked then raise exception '3.12: C üst bilgiyi değiştirebildi'; end if;
  update public.denetimler
  set updated_at = now(), son_degistiren_email = 'c.atanan@test.local',
      son_degistiren_ad = 'C Atanan Muhendis', son_degistiren_rol = 'muhendis',
      son_degistiren_at = now(), gozden_gecirme_at = now()
  where id = (select takip from _ids);
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception '3.12b: C izinli tam-satır PATCH yapamadı'; end if;
  reset role;
end $$;

-- 3.12d D2: C metadata veya Storage nesnesi silemez; RLS reddi 0 satırdır.
do $$
declare changed integer; n integer;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"role":"authenticated","email":"c.atanan@test.local"}';
  delete from public.denetim_fotograflari where id = (select foto from _ids);
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception '3.12d: C fotoğraf metadata silebildi'; end if;
  select count(*) into n from public.denetim_fotograflari where id = (select foto from _ids);
  if n <> 1 then raise exception '3.12d: C metadata silme denemesi kaydı korumadı'; end if;
  delete from storage.objects where bucket_id = 'denetim-fotograflari'
    and name = (select takip::text || '/genel/baslangic.jpg' from _ids);
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception '3.12d: C Storage nesnesi silebildi'; end if;
  select count(*) into n from storage.objects where bucket_id = 'denetim-fotograflari'
    and name = (select takip::text || '/genel/baslangic.jpg' from _ids);
  if n <> 1 then raise exception '3.12d: C Storage silme denemesi nesneyi korumadı'; end if;
  reset role;
end $$;

-- 3.13–3.15 D: ilgisiz mühendis takip, geçmiş, metadata ve Storage'a erişemez.
do $$
declare n integer; changed integer; blocked boolean;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"role":"authenticated","email":"d.ilgisiz@test.local"}';
  select count(*) into n from public.denetimler where id = (select takip from _ids);
  if n <> 0 then raise exception '3.13: D takip kaydını görebildi'; end if;
  update public.saha_kontrol set durum = 'Olumsuz bulgu' where id = (select saha from _ids);
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception '3.14: D checklist güncelleyebildi'; end if;
  select count(*) into n from public.denetim_fotograflari where id = (select foto from _ids);
  if n <> 0 then raise exception '3.15: D fotoğraf metadata görebildi'; end if;
  select count(*) into n from storage.objects where bucket_id = 'denetim-fotograflari'
    and name = (select takip::text || '/genel/baslangic.jpg' from _ids);
  if n <> 0 then raise exception '3.15: D Storage nesnesini görebildi'; end if;
  blocked := false;
  begin
    insert into public.denetim_degisim_gecmisi (denetim_id, islem_turu)
    values ((select takip from _ids), 'saha_kontrol_guncelleme');
  exception when others then blocked := true;
  end;
  if not blocked then raise exception '3.15b: D geçmiş olayı ekleyebildi'; end if;
  blocked := false;
  begin
    insert into storage.objects (bucket_id, name)
    values ('denetim-fotograflari', (select takip::text || '/d/yeni.jpg' from _ids));
  exception when others then blocked := true;
  end;
  if not blocked then raise exception '3.15: D Storage nesnesi ekleyebildi'; end if;
  reset role;
end $$;

-- 3.16–3.17 A sahip ve B yönetim regresyonu: ikisi de kaydı günceller.
do $$
declare changed integer;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"role":"authenticated","email":"a.ilk@test.local"}';
  update public.denetimler set musteri_unvani = 'A Sahip Güncellemesi' where id = (select takip from _ids);
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception '3.16: A sahip kaydı güncelleyemedi'; end if;
  reset role;
  set local role authenticated;
  set local request.jwt.claims = '{"role":"authenticated","email":"b.yonetim@test.local"}';
  update public.denetimler set takip_atanan_ad = 'C Atanan Muhendis' where id = (select takip from _ids);
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception '3.17: B yönetim kaydı güncelleyemedi'; end if;
  reset role;
end $$;

-- 3.12c C takibi kapatır; 3.10 ile sonrasında yeniden güncelleyemez.
do $$
declare changed integer;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"role":"authenticated","email":"c.atanan@test.local"}';
  update public.denetimler set denetim_durumu = 'Çalışma Tamamlandı', calisma_tamamlandi_at = now()
    where id = (select takip from _ids);
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception '3.12c: C takibi kapatamadı'; end if;
  update public.denetimler set updated_at = now() where id = (select takip from _ids);
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception '3.10: C tamamlanmış kaydı güncelleyebildi'; end if;
  reset role;
end $$;

rollback;
