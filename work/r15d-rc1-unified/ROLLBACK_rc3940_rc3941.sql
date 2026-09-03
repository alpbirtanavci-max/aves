-- GERİ DÖNÜŞ — migration 79 (rc3.9.40) + migration 80 (rc3.9.41)
-- Canlı politika/ACL durumunun 2026-09-03 (uygulama öncesi) anlık görüntüsünden üretildi.
-- Şema/veri dokunulmadığı için veri kaybı riski yok.
--
--   psql "$LIVE_DB_URL" -v ON_ERROR_STOP=1 -f ROLLBACK_rc3940_rc3941.sql

begin;

-- ---- migration 79 geri: trigger + 11 politikanın eski gövdesi ----------------
drop trigger if exists trg_aves_takip_atanan_alan_kilidi on public.denetimler;
drop function if exists public.aves_takip_atanan_alan_kilidi();

drop policy if exists "denetimleri okuma" on public.denetimler;
create policy "denetimleri okuma" on public.denetimler
for select to authenticated
using (aves_denetim_gorebilir_mi(olusturan_email));

drop policy if exists "takip atanan denetim guncelleme" on public.denetimler;
create policy "takip atanan denetim guncelleme" on public.denetimler
for update to authenticated
using (aves_aktif_kullanici_mi() and lower(coalesce(takip_atanan_email, ''::text)) = aves_oturum_emaili())
with check (aves_aktif_kullanici_mi() and lower(coalesce(takip_atanan_email, ''::text)) = aves_oturum_emaili());

drop policy if exists "saha okuma" on public.saha_kontrol;
create policy "saha okuma" on public.saha_kontrol
for select to authenticated
using (exists (select 1 from denetimler d where d.id = saha_kontrol.denetim_id and aves_denetim_gorebilir_mi(d.olusturan_email)));

drop policy if exists "gecmis okuma" on public.denetim_degisim_gecmisi;
create policy "gecmis okuma" on public.denetim_degisim_gecmisi
for select to authenticated
using (exists (select 1 from denetimler d where d.id = denetim_degisim_gecmisi.denetim_id and aves_denetim_gorebilir_mi(d.olusturan_email)));

drop policy if exists "gecmis ekleme" on public.denetim_degisim_gecmisi;
create policy "gecmis ekleme" on public.denetim_degisim_gecmisi
for insert to authenticated
with check ((islem_turu <> 'denetim_silme'::text) and exists (select 1 from denetimler d where d.id = denetim_degisim_gecmisi.denetim_id and aves_denetim_yazabilir_mi(d.olusturan_email)));

drop policy if exists "denetim fotograflari okuma" on public.denetim_fotograflari;
create policy "denetim fotograflari okuma" on public.denetim_fotograflari for select to authenticated
using (exists (select 1 from denetimler d where d.id = denetim_fotograflari.denetim_id and ((lower(d.olusturan_email) = lower(auth.jwt() ->> 'email')) or exists (select 1 from kullanici_profilleri p where lower(p.email) = lower(auth.jwt() ->> 'email') and p.aktif and p.rol = any (array['yonetici'::text,'teknik_mudur'::text])))));

drop policy if exists "denetim fotograflari ekleme" on public.denetim_fotograflari;
create policy "denetim fotograflari ekleme" on public.denetim_fotograflari for insert to authenticated
with check (exists (select 1 from denetimler d where d.id = denetim_fotograflari.denetim_id and d.denetim_durumu <> 'Çalışma Tamamlandı' and ((lower(d.olusturan_email) = lower(auth.jwt() ->> 'email')) or exists (select 1 from kullanici_profilleri p where lower(p.email) = lower(auth.jwt() ->> 'email') and p.aktif and p.rol = any (array['yonetici'::text,'teknik_mudur'::text])))));

drop policy if exists "denetim fotograflari guncelleme" on public.denetim_fotograflari;
create policy "denetim fotograflari guncelleme" on public.denetim_fotograflari for update to authenticated
using (exists (select 1 from denetimler d where d.id = denetim_fotograflari.denetim_id and d.denetim_durumu <> 'Çalışma Tamamlandı' and ((lower(d.olusturan_email) = lower(auth.jwt() ->> 'email')) or exists (select 1 from kullanici_profilleri p where lower(p.email) = lower(auth.jwt() ->> 'email') and p.aktif and p.rol = any (array['yonetici'::text,'teknik_mudur'::text])))))
with check (exists (select 1 from denetimler d where d.id = denetim_fotograflari.denetim_id and d.denetim_durumu <> 'Çalışma Tamamlandı' and ((lower(d.olusturan_email) = lower(auth.jwt() ->> 'email')) or exists (select 1 from kullanici_profilleri p where lower(p.email) = lower(auth.jwt() ->> 'email') and p.aktif and p.rol = any (array['yonetici'::text,'teknik_mudur'::text])))));

drop policy if exists "denetim fotograf nesnesi okuma" on storage.objects;
create policy "denetim fotograf nesnesi okuma" on storage.objects for select to authenticated
using (bucket_id = 'denetim-fotograflari' and exists (select 1 from denetimler d where d.id::text = split_part(objects.name,'/',1) and ((lower(d.olusturan_email) = lower(auth.jwt() ->> 'email')) or exists (select 1 from kullanici_profilleri p where lower(p.email) = lower(auth.jwt() ->> 'email') and p.aktif and p.rol = any (array['yonetici'::text,'teknik_mudur'::text])))));

drop policy if exists "denetim fotograf nesnesi ekleme" on storage.objects;
create policy "denetim fotograf nesnesi ekleme" on storage.objects for insert to authenticated
with check (bucket_id = 'denetim-fotograflari' and exists (select 1 from denetimler d where d.id::text = split_part(objects.name,'/',1) and d.denetim_durumu <> 'Çalışma Tamamlandı' and ((lower(d.olusturan_email) = lower(auth.jwt() ->> 'email')) or exists (select 1 from kullanici_profilleri p where lower(p.email) = lower(auth.jwt() ->> 'email') and p.aktif and p.rol = any (array['yonetici'::text,'teknik_mudur'::text])))));

drop policy if exists "denetim fotograf nesnesi guncelleme" on storage.objects;
create policy "denetim fotograf nesnesi guncelleme" on storage.objects for update to authenticated
using (bucket_id = 'denetim-fotograflari' and exists (select 1 from denetimler d where d.id::text = split_part(objects.name,'/',1) and d.denetim_durumu <> 'Çalışma Tamamlandı' and ((lower(d.olusturan_email) = lower(auth.jwt() ->> 'email')) or exists (select 1 from kullanici_profilleri p where lower(p.email) = lower(auth.jwt() ->> 'email') and p.aktif and p.rol = any (array['yonetici'::text,'teknik_mudur'::text])))))
with check (bucket_id = 'denetim-fotograflari' and exists (select 1 from denetimler d where d.id::text = split_part(objects.name,'/',1) and d.denetim_durumu <> 'Çalışma Tamamlandı' and ((lower(d.olusturan_email) = lower(auth.jwt() ->> 'email')) or exists (select 1 from kullanici_profilleri p where lower(p.email) = lower(auth.jwt() ->> 'email') and p.aktif and p.rol = any (array['yonetici'::text,'teknik_mudur'::text])))));

-- ---- migration 80 geri: anon EXECUTE geri ver -------------------------------
grant execute on function
  public.aves_denetim_silme_gecmisi(), public.aves_duzeltme_oturumunu_dogrula(),
  public.aves_gecmis_kimligini_dogrula(), public.aves_satir_kimligini_dogrula(),
  public.aves_aktif_kullanici_mi(), public.aves_denetim_gorebilir_mi(text),
  public.aves_denetim_olusturabilir_mi(text), public.aves_denetim_silebilir_mi(),
  public.aves_denetim_yazabilir_mi(text), public.aves_sistem_yoneticisi_mi(),
  public.aves_takip_kaynagi_gecerli_mi(uuid), public.aves_tum_denetimleri_gorebilir_mi(),
  public.aves_yonetici_mi(), public.aves_yonetim_yetkili_mi()
to anon, authenticated;

commit;
