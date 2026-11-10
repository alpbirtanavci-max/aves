-- DB senaryo testi — migration 88 (denetime bağlı teknik dosya PDF'i: tablo + storage.objects)
-- ============================================================================
-- ÇALIŞTIRMA: 79_local_bootstrap.sql + 88 migration uygulandıktan sonra
--   psql -v ON_ERROR_STOP=1 -f 88_teknik_pdf.sql
-- Tek transaction, ROLLBACK ile biter. Personalar: A denetimi açan mühendis, B yönetici,
-- C atanmış 2. mühendis (takip_atanan_email), D ilgisiz mühendis, P pasif kullanıcı.
-- Referans: RLS_TEST_CHECKLIST.md
-- ============================================================================

begin;

insert into public.kullanici_profilleri (email, ad_soyad, rol, aktif) values
  ('a.ilk@test.local',     'A Ilk Muhendis',     'muhendis', true),
  ('b.yonetim@test.local', 'B Yonetim',          'yonetici', true),
  ('c.atanan@test.local',  'C Atanan Muhendis',  'muhendis', true),
  ('d.ilgisiz@test.local', 'D Ilgisiz Muhendis', 'muhendis', true),
  ('p.pasif@test.local',   'P Pasif',            'muhendis', false)
on conflict (email) do update set aktif = excluded.aktif, rol = excluded.rol;

insert into public.denetimler (id, musteri_unvani, asansor_seri_no, olusturan_email, ana_standart, denetim_durumu, takip_atanan_email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Test Firma', 'SN-1', 'a.ilk@test.local', 'EN 81-20', 'Devam Ediyor', 'c.atanan@test.local'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'Test Firma 2', 'SN-2', 'a.ilk@test.local', 'EN 81-20', 'Çalışma Tamamlandı', null);

-- 1. A kendi denetimine PDF kaydı ekler; uploaded_by başka e-posta olursa reddedilir.
do $$
declare v_hata boolean := false; v_adet integer;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"role":"authenticated","email":"a.ilk@test.local"}';
  insert into public.denetim_teknik_pdf (denetim_id, file_name, object_path, file_size_bytes, sha256, uploaded_by)
  values ('aaaaaaaa-0000-4000-8000-000000000001', 'teknik.pdf',
          'aaaaaaaa-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.pdf', 1000, repeat('a', 64), 'a.ilk@test.local');
  begin
    insert into public.denetim_teknik_pdf (denetim_id, file_name, object_path, file_size_bytes, sha256, uploaded_by)
    values ('aaaaaaaa-0000-4000-8000-000000000001', 'x.pdf',
            'aaaaaaaa-0000-4000-8000-000000000001/22222222-2222-4222-8222-222222222222.pdf', 1000, repeat('b', 64), 'b.yonetim@test.local');
  exception when others then v_hata := true;
  end;
  select count(*) into v_adet from public.denetim_teknik_pdf;
  reset role;
  if not v_hata then raise exception 'FAIL 1: başkası adına uploaded_by kabul edildi'; end if;
  if v_adet <> 1 then raise exception 'FAIL 1: A kendi satırını görmeli (%)', v_adet; end if;
  raise notice 'PASS 1: A kendi denetimine PDF ekler, uploaded_by sahtelenemez';
end $$;

-- 2. Görünürlük: B yönetici ve C atanmış görür; D ilgisiz ve P pasif göremez.
do $$
declare v_b integer; v_c integer; v_d integer; v_p integer;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"role":"authenticated","email":"b.yonetim@test.local"}';
  select count(*) into v_b from public.denetim_teknik_pdf;
  set local request.jwt.claims = '{"role":"authenticated","email":"c.atanan@test.local"}';
  select count(*) into v_c from public.denetim_teknik_pdf;
  set local request.jwt.claims = '{"role":"authenticated","email":"d.ilgisiz@test.local"}';
  select count(*) into v_d from public.denetim_teknik_pdf;
  set local request.jwt.claims = '{"role":"authenticated","email":"p.pasif@test.local"}';
  select count(*) into v_p from public.denetim_teknik_pdf;
  reset role;
  if v_b <> 1 then raise exception 'FAIL 2: yönetici görmeli (%)', v_b; end if;
  if v_c <> 1 then raise exception 'FAIL 2: atanmış mühendis görmeli (%)', v_c; end if;
  if v_d <> 0 then raise exception 'FAIL 2: ilgisiz mühendis görmemeli (%)', v_d; end if;
  if v_p <> 0 then raise exception 'FAIL 2: pasif kullanıcı görmemeli (%)', v_p; end if;
  raise notice 'PASS 2: B ve C görür; D ve pasif göremez';
end $$;

-- 3. D ilgisiz mühendis başkasının denetimine PDF ekleyemez, güncelleyemez, silemez.
do $$
declare v_hata boolean := false; v_etki integer; v_sil integer;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"role":"authenticated","email":"d.ilgisiz@test.local"}';
  begin
    insert into public.denetim_teknik_pdf (denetim_id, file_name, object_path, file_size_bytes, sha256, uploaded_by)
    values ('aaaaaaaa-0000-4000-8000-000000000001', 'd.pdf',
            'aaaaaaaa-0000-4000-8000-000000000001/33333333-3333-4333-8333-333333333333.pdf', 10, repeat('c', 64), 'd.ilgisiz@test.local');
  exception when others then v_hata := true;
  end;
  update public.denetim_teknik_pdf set file_name = 'ele-gecirildi.pdf';
  get diagnostics v_etki = row_count;
  delete from public.denetim_teknik_pdf;
  get diagnostics v_sil = row_count;
  reset role;
  if not v_hata then raise exception 'FAIL 3: D PDF ekleyebildi'; end if;
  if v_etki <> 0 then raise exception 'FAIL 3: D güncelledi'; end if;
  if v_sil <> 0 then raise exception 'FAIL 3: D sildi'; end if;
  raise notice 'PASS 3: D ekleyemez, güncelleyemez, silemez';
end $$;

-- 4. C atanmış mühendis günceller; tamamlanmış denetimde A bile ekleyemez / güncelleyemez / silemez.
do $$
declare v_etki integer; v_hata boolean := false; v_gunc integer; v_sil integer;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"role":"authenticated","email":"c.atanan@test.local"}';
  update public.denetim_teknik_pdf set file_name = 'c-guncelledi.pdf', uploaded_by = 'c.atanan@test.local';
  get diagnostics v_etki = row_count;
  set local request.jwt.claims = '{"role":"authenticated","email":"a.ilk@test.local"}';
  begin
    insert into public.denetim_teknik_pdf (denetim_id, file_name, object_path, file_size_bytes, sha256, uploaded_by)
    values ('aaaaaaaa-0000-4000-8000-000000000002', 'x.pdf',
            'aaaaaaaa-0000-4000-8000-000000000002/44444444-4444-4444-8444-444444444444.pdf', 10, repeat('d', 64), 'a.ilk@test.local');
  exception when others then v_hata := true;
  end;
  reset role;
  if v_etki <> 1 then raise exception 'FAIL 4: C atanmış güncelleyebilmeli (%)', v_etki; end if;
  if not v_hata then raise exception 'FAIL 4: tamamlanmış denetime PDF eklendi'; end if;
  -- tamamlanmış denetimin satırı postgres ile açılır, A'nın güncelleme/silmesi denenir
  insert into public.denetim_teknik_pdf (denetim_id, file_name, object_path, file_size_bytes, sha256, uploaded_by)
  values ('aaaaaaaa-0000-4000-8000-000000000002', 'kilitli.pdf',
          'aaaaaaaa-0000-4000-8000-000000000002/55555555-5555-4555-8555-555555555555.pdf', 10, repeat('e', 64), 'a.ilk@test.local');
  set local role authenticated;
  set local request.jwt.claims = '{"role":"authenticated","email":"a.ilk@test.local"}';
  update public.denetim_teknik_pdf set file_name = 'degisti.pdf' where denetim_id = 'aaaaaaaa-0000-4000-8000-000000000002';
  get diagnostics v_gunc = row_count;
  delete from public.denetim_teknik_pdf where denetim_id = 'aaaaaaaa-0000-4000-8000-000000000002';
  get diagnostics v_sil = row_count;
  reset role;
  if v_gunc <> 0 then raise exception 'FAIL 4: kilitli denetimde güncelleme'; end if;
  if v_sil <> 0 then raise exception 'FAIL 4: kilitli denetimde silme'; end if;
  raise notice 'PASS 4: C günceller; tamamlanmış denetim PDF''i kilitli';
end $$;

-- 5. Anon erişemez; bozuk object_path ve boyut kısıtları reddedilir.
do $$
declare v_hata1 boolean := false; v_hata2 boolean := false; v_hata3 boolean := false;
begin
  set local role anon;
  begin perform count(*) from public.denetim_teknik_pdf; exception when insufficient_privilege then v_hata1 := true; end;
  reset role;
  if not v_hata1 then raise exception 'FAIL 5: anon okuyabildi'; end if;
  begin
    insert into public.denetim_teknik_pdf (denetim_id, file_name, object_path, file_size_bytes, sha256, uploaded_by)
    values ('aaaaaaaa-0000-4000-8000-000000000001', 'y.pdf', 'baska-yol/x.pdf', 10, repeat('f', 64), 'postgres');
  exception when check_violation then v_hata2 := true; end;
  begin
    insert into public.denetim_teknik_pdf (denetim_id, file_name, object_path, file_size_bytes, sha256, uploaded_by)
    values ('aaaaaaaa-0000-4000-8000-000000000001', 'y.pdf',
            'aaaaaaaa-0000-4000-8000-000000000001/66666666-6666-4666-8666-666666666666.pdf', 20971521, repeat('f', 64), 'postgres');
  exception when check_violation or unique_violation then v_hata3 := true; end;
  if not v_hata2 then raise exception 'FAIL 5: denetim dışı object_path kabul edildi'; end if;
  if not v_hata3 then raise exception 'FAIL 5: 20 MB üstü kabul edildi'; end if;
  raise notice 'PASS 5: anon erişemez; yol ve boyut kısıtları çalışır';
end $$;

-- 6. storage.objects: A kendi klasörüne yükler; yanlış ad / iç içe yol / başka bucket / tamamlanmış denetim / ilgisiz kullanıcı reddedilir.
do $$
declare v_hata_ad boolean := false; v_hata_ic boolean := false; v_hata_bucket boolean := false; v_hata_d boolean := false; v_hata_kilit boolean := false;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"role":"authenticated","email":"a.ilk@test.local"}';
  insert into storage.objects (bucket_id, name) values ('denetim-teknik-dosyalari', 'aaaaaaaa-0000-4000-8000-000000000001/77777777-7777-4777-8777-777777777777.pdf');
  begin insert into storage.objects (bucket_id, name) values ('denetim-teknik-dosyalari', 'aaaaaaaa-0000-4000-8000-000000000001/rastgele.pdf'); exception when others then v_hata_ad := true; end;
  begin insert into storage.objects (bucket_id, name) values ('denetim-teknik-dosyalari', 'aaaaaaaa-0000-4000-8000-000000000001/alt/88888888-8888-4888-8888-888888888888.pdf'); exception when others then v_hata_ic := true; end;
  begin insert into storage.objects (bucket_id, name) values ('baska-bucket', 'aaaaaaaa-0000-4000-8000-000000000001/99999999-9999-4999-8999-999999999999.pdf'); exception when others then v_hata_bucket := true; end;
  begin insert into storage.objects (bucket_id, name) values ('denetim-teknik-dosyalari', 'aaaaaaaa-0000-4000-8000-000000000002/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.pdf'); exception when others then v_hata_kilit := true; end;
  set local request.jwt.claims = '{"role":"authenticated","email":"d.ilgisiz@test.local"}';
  begin insert into storage.objects (bucket_id, name) values ('denetim-teknik-dosyalari', 'aaaaaaaa-0000-4000-8000-000000000001/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.pdf'); exception when others then v_hata_d := true; end;
  reset role;
  if not v_hata_ad then raise exception 'FAIL 6: uuid olmayan dosya adı kabul edildi'; end if;
  if not v_hata_ic then raise exception 'FAIL 6: iç içe yol kabul edildi'; end if;
  if not v_hata_bucket then raise exception 'FAIL 6: başka bucket kabul edildi'; end if;
  if not v_hata_kilit then raise exception 'FAIL 6: tamamlanmış denetime nesne yüklendi'; end if;
  if not v_hata_d then raise exception 'FAIL 6: ilgisiz kullanıcı yükledi'; end if;
  raise notice 'PASS 6: nesne yükleme yalnız yetkili, uuid.pdf, tek klasör düzeyi, açık denetim';
end $$;

-- 7. storage.objects okuma / güncelleme / silme: A, B, C görür; D ve pasif göremez/değiştiremez; C siler.
do $$
declare v_a integer; v_b integer; v_c integer; v_d integer; v_p integer; v_gunc integer; v_sild integer; v_silc integer;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"role":"authenticated","email":"a.ilk@test.local"}';
  select count(*) into v_a from storage.objects where bucket_id = 'denetim-teknik-dosyalari';
  set local request.jwt.claims = '{"role":"authenticated","email":"b.yonetim@test.local"}';
  select count(*) into v_b from storage.objects where bucket_id = 'denetim-teknik-dosyalari';
  set local request.jwt.claims = '{"role":"authenticated","email":"c.atanan@test.local"}';
  select count(*) into v_c from storage.objects where bucket_id = 'denetim-teknik-dosyalari';
  set local request.jwt.claims = '{"role":"authenticated","email":"d.ilgisiz@test.local"}';
  select count(*) into v_d from storage.objects where bucket_id = 'denetim-teknik-dosyalari';
  update storage.objects set name = name where bucket_id = 'denetim-teknik-dosyalari';
  get diagnostics v_gunc = row_count;
  delete from storage.objects where bucket_id = 'denetim-teknik-dosyalari';
  get diagnostics v_sild = row_count;
  set local request.jwt.claims = '{"role":"authenticated","email":"p.pasif@test.local"}';
  select count(*) into v_p from storage.objects where bucket_id = 'denetim-teknik-dosyalari';
  set local request.jwt.claims = '{"role":"authenticated","email":"c.atanan@test.local"}';
  delete from storage.objects where bucket_id = 'denetim-teknik-dosyalari';
  get diagnostics v_silc = row_count;
  reset role;
  if v_a <> 1 or v_b <> 1 or v_c <> 1 then raise exception 'FAIL 7: A/B/C nesneyi görmeli (% % %)', v_a, v_b, v_c; end if;
  if v_d <> 0 or v_p <> 0 then raise exception 'FAIL 7: D/pasif nesneyi görmemeli (% %)', v_d, v_p; end if;
  if v_gunc <> 0 then raise exception 'FAIL 7: D nesneyi güncelledi'; end if;
  if v_sild <> 0 then raise exception 'FAIL 7: D nesneyi sildi'; end if;
  if v_silc <> 1 then raise exception 'FAIL 7: C atanmış silebilmeli (%)', v_silc; end if;
  raise notice 'PASS 7: nesne okuma/silme izolasyonu';
end $$;

-- 8. Bucket özel (public=false), 20 MB sınırı ve yalnız PDF MIME türü.
do $$
declare v_public boolean; v_limit bigint; v_mime text[];
begin
  select public, file_size_limit, allowed_mime_types into v_public, v_limit, v_mime from storage.buckets where id = 'denetim-teknik-dosyalari';
  if v_public is distinct from false then raise exception 'FAIL 8: bucket özel olmalı'; end if;
  if v_limit <> 20971520 then raise exception 'FAIL 8: 20 MB sınırı yok (%)', v_limit; end if;
  if v_mime <> array['application/pdf'] then raise exception 'FAIL 8: yalnız PDF MIME türü olmalı'; end if;
  raise notice 'PASS 8: bucket özel, 20 MB, yalnız PDF';
end $$;

rollback;
