-- AVES Saha R15D-rc3.9.40 — takip mühendisi ataması yetki tamamlaması.
--
-- 78 numaralı migration yalnız denetimler + saha_kontrol UPDATE politikası ekledi.
-- İstemci (app.js) `takip_atanan_email` üzerinden yeni bir görünürlük yolu açtı ama
-- sunucu tarafı okuma/geçmiş/fotoğraf/storage politikalarında bu yol yoktu; atanan
-- mühendis kaydı çekemiyordu. Bu migration:
--   1) denetimler / saha_kontrol / denetim_degisim_gecmisi / denetim_fotograflari /
--      storage.objects politikalarına "atanan takip mühendisi" dalını ekler,
--   2) denetimler UPDATE politikasında USING (eski satır aktif) ile WITH CHECK
--      (yeni satır 'Çalışma Tamamlandı' olabilir) asimetrisini kurar — atanan mühendis
--      takibi kapatabilsin ama tamamlanmış kayıttan yeni güncelleme başlatamasın,
--   3) `aves_takip_atanan_alan_kilidi` BEFORE UPDATE trigger'ı ile atanan mühendisin
--      yalnız sonuç/ilerleme/sync alanlarını değiştirmesine izin verir (izin listesi;
--      listede olmayan/yeni her kolon varsayılan kilitli), durum yalnız ileri yön.
--
-- Fotoğraf/storage DELETE politikaları DEĞİŞMEZ (karar D2): atanan mühendis fotoğraf
-- silemez; app.js `.photo-remove` düğmesi de ona gösterilmez (aynı sürümde).
--
-- NOT (review): denetimler/saha/geçmiş politikaları `public.aves_oturum_emaili()`,
-- fotoğraf/storage politikaları `lower(auth.jwt() ->> 'email')` kullanıyor (mevcut
-- gövdeleriyle tutarlı kalmak için korundu). İkisinin aynı değeri döndürdüğü Supabase
-- panelinden doğrulanmalı.
--
-- Trigger sırası: PostgreSQL BEFORE trigger'ları ad sırasına göre çalıştırır.
-- `trg_aves_denetim_kimligi` ('d') < `trg_aves_takip_atanan_alan_kilidi` ('t'), yani
-- son_degistiren_* alanları bizim trigger'a geldiğinde zaten oturumdan yazılmış olur.

begin;

-- 1) denetimler — okuma -------------------------------------------------------
drop policy if exists "denetimleri okuma" on public.denetimler;
create policy "denetimleri okuma" on public.denetimler
for select to authenticated
using (
  public.aves_denetim_gorebilir_mi(olusturan_email)
  or (
    public.aves_aktif_kullanici_mi()
    and lower(coalesce(takip_atanan_email,'')) = public.aves_oturum_emaili()
  )
);

-- 2) denetimler — atanan takip mühendisi güncellemesi (USING/WITH CHECK asimetrik) --
drop policy if exists "takip atanan denetim guncelleme" on public.denetimler;
create policy "takip atanan denetim guncelleme" on public.denetimler
for update to authenticated
using (
  public.aves_aktif_kullanici_mi()
  and lower(coalesce(takip_atanan_email,'')) = public.aves_oturum_emaili()
  and denetim_durumu in ('Devam Ediyor','Gözden Geçirme')
)
with check (
  public.aves_aktif_kullanici_mi()
  and lower(coalesce(takip_atanan_email,'')) = public.aves_oturum_emaili()
  and denetim_durumu in ('Devam Ediyor','Gözden Geçirme','Çalışma Tamamlandı')
);

-- 3) saha_kontrol — okuma ---------------------------------------------------------
drop policy if exists "saha okuma" on public.saha_kontrol;
create policy "saha okuma" on public.saha_kontrol
for select to authenticated
using (
  exists (
    select 1 from public.denetimler d
    where d.id = saha_kontrol.denetim_id
      and (
        public.aves_denetim_gorebilir_mi(d.olusturan_email)
        or (
          public.aves_aktif_kullanici_mi()
          and lower(coalesce(d.takip_atanan_email,'')) = public.aves_oturum_emaili()
        )
      )
  )
);

-- 4) denetim_degisim_gecmisi — okuma --------------------------------------------
drop policy if exists "gecmis okuma" on public.denetim_degisim_gecmisi;
create policy "gecmis okuma" on public.denetim_degisim_gecmisi
for select to authenticated
using (
  exists (
    select 1 from public.denetimler d
    where d.id = denetim_degisim_gecmisi.denetim_id
      and (
        public.aves_denetim_gorebilir_mi(d.olusturan_email)
        or (
          public.aves_aktif_kullanici_mi()
          and lower(coalesce(d.takip_atanan_email,'')) = public.aves_oturum_emaili()
        )
      )
  )
);

-- 5) denetim_degisim_gecmisi — ekleme (kapatma anında da yazılabilmeli) ---------
drop policy if exists "gecmis ekleme" on public.denetim_degisim_gecmisi;
create policy "gecmis ekleme" on public.denetim_degisim_gecmisi
for insert to authenticated
with check (
  denetim_degisim_gecmisi.islem_turu <> 'denetim_silme'
  and exists (
    select 1 from public.denetimler d
    where d.id = denetim_degisim_gecmisi.denetim_id
      and (
        public.aves_denetim_yazabilir_mi(d.olusturan_email)
        or (
          public.aves_aktif_kullanici_mi()
          and lower(coalesce(d.takip_atanan_email,'')) = public.aves_oturum_emaili()
          and d.denetim_durumu in ('Devam Ediyor','Gözden Geçirme','Çalışma Tamamlandı')
        )
      )
  )
);

-- 6) denetim_fotograflari — okuma (durum kısıtsız, sahip davranışıyla aynı) ------
drop policy if exists "denetim fotograflari okuma" on public.denetim_fotograflari;
create policy "denetim fotograflari okuma" on public.denetim_fotograflari for select to authenticated
using (exists (
  select 1 from public.denetimler d
  where d.id = denetim_id and (
    lower(d.olusturan_email) = lower(auth.jwt() ->> 'email') or exists (
      select 1 from public.kullanici_profilleri p
      where lower(p.email) = lower(auth.jwt() ->> 'email') and p.aktif and p.rol in ('yonetici','teknik_mudur')
    )
    or lower(coalesce(d.takip_atanan_email,'')) = lower(auth.jwt() ->> 'email')
  )
));

-- 7) denetim_fotograflari — ekleme (aktif kayıt) --------------------------------
drop policy if exists "denetim fotograflari ekleme" on public.denetim_fotograflari;
create policy "denetim fotograflari ekleme" on public.denetim_fotograflari for insert to authenticated
with check (exists (
  select 1 from public.denetimler d
  where d.id = denetim_id and d.denetim_durumu <> 'Çalışma Tamamlandı' and (
    lower(d.olusturan_email) = lower(auth.jwt() ->> 'email') or exists (
      select 1 from public.kullanici_profilleri p
      where lower(p.email) = lower(auth.jwt() ->> 'email') and p.aktif and p.rol in ('yonetici','teknik_mudur')
    )
    or lower(coalesce(d.takip_atanan_email,'')) = lower(auth.jwt() ->> 'email')
  )
));

-- 8) denetim_fotograflari — güncelleme (x-upsert / merge-duplicates için gerekli) --
drop policy if exists "denetim fotograflari guncelleme" on public.denetim_fotograflari;
create policy "denetim fotograflari guncelleme" on public.denetim_fotograflari for update to authenticated
using (exists (
  select 1 from public.denetimler d
  where d.id = denetim_id and d.denetim_durumu <> 'Çalışma Tamamlandı' and (
    lower(d.olusturan_email) = lower(auth.jwt() ->> 'email') or exists (
      select 1 from public.kullanici_profilleri p
      where lower(p.email) = lower(auth.jwt() ->> 'email') and p.aktif and p.rol in ('yonetici','teknik_mudur')
    )
    or lower(coalesce(d.takip_atanan_email,'')) = lower(auth.jwt() ->> 'email')
  )
))
with check (exists (
  select 1 from public.denetimler d
  where d.id = denetim_id and d.denetim_durumu <> 'Çalışma Tamamlandı' and (
    lower(d.olusturan_email) = lower(auth.jwt() ->> 'email') or exists (
      select 1 from public.kullanici_profilleri p
      where lower(p.email) = lower(auth.jwt() ->> 'email') and p.aktif and p.rol in ('yonetici','teknik_mudur')
    )
    or lower(coalesce(d.takip_atanan_email,'')) = lower(auth.jwt() ->> 'email')
  )
));

-- 9) storage.objects — okuma ---------------------------------------------------
drop policy if exists "denetim fotograf nesnesi okuma" on storage.objects;
create policy "denetim fotograf nesnesi okuma" on storage.objects for select to authenticated
using (bucket_id = 'denetim-fotograflari' and exists (
  select 1 from public.denetimler d
  where d.id::text = split_part(name, '/', 1) and (
    lower(d.olusturan_email) = lower(auth.jwt() ->> 'email') or exists (
      select 1 from public.kullanici_profilleri p
      where lower(p.email) = lower(auth.jwt() ->> 'email') and p.aktif and p.rol in ('yonetici','teknik_mudur')
    )
    or lower(coalesce(d.takip_atanan_email,'')) = lower(auth.jwt() ->> 'email')
  )
));

-- 10) storage.objects — ekleme (aktif kayıt) ---------------------------------------
drop policy if exists "denetim fotograf nesnesi ekleme" on storage.objects;
create policy "denetim fotograf nesnesi ekleme" on storage.objects for insert to authenticated
with check (bucket_id = 'denetim-fotograflari' and exists (
  select 1 from public.denetimler d
  where d.id::text = split_part(name, '/', 1) and d.denetim_durumu <> 'Çalışma Tamamlandı' and (
    lower(d.olusturan_email) = lower(auth.jwt() ->> 'email') or exists (
      select 1 from public.kullanici_profilleri p
      where lower(p.email) = lower(auth.jwt() ->> 'email') and p.aktif and p.rol in ('yonetici','teknik_mudur')
    )
    or lower(coalesce(d.takip_atanan_email,'')) = lower(auth.jwt() ->> 'email')
  )
));

-- 11) storage.objects — güncelleme (upsert için zorunlu) --------------------------
drop policy if exists "denetim fotograf nesnesi guncelleme" on storage.objects;
create policy "denetim fotograf nesnesi guncelleme" on storage.objects for update to authenticated
using (bucket_id = 'denetim-fotograflari' and exists (
  select 1 from public.denetimler d
  where d.id::text = split_part(name, '/', 1) and d.denetim_durumu <> 'Çalışma Tamamlandı' and (
    lower(d.olusturan_email) = lower(auth.jwt() ->> 'email') or exists (
      select 1 from public.kullanici_profilleri p
      where lower(p.email) = lower(auth.jwt() ->> 'email') and p.aktif and p.rol in ('yonetici','teknik_mudur')
    )
    or lower(coalesce(d.takip_atanan_email,'')) = lower(auth.jwt() ->> 'email')
  )
))
with check (bucket_id = 'denetim-fotograflari' and exists (
  select 1 from public.denetimler d
  where d.id::text = split_part(name, '/', 1) and d.denetim_durumu <> 'Çalışma Tamamlandı' and (
    lower(d.olusturan_email) = lower(auth.jwt() ->> 'email') or exists (
      select 1 from public.kullanici_profilleri p
      where lower(p.email) = lower(auth.jwt() ->> 'email') and p.aktif and p.rol in ('yonetici','teknik_mudur')
    )
    or lower(coalesce(d.takip_atanan_email,'')) = lower(auth.jwt() ->> 'email')
  )
));

-- 12) Üst bilgi alanı kilidi — izin listesi mantığı -----------------------------
-- Atanan takip mühendisi (sahip/yönetim değil) yalnız izin listesindeki alanları
-- değiştirebilir. Liste dışındaki her kolon (yeni eklenenler dahil) varsayılan kilitli.
-- son_degistiren_* alanları listede: app.js istemciden yazıyor, değeri
-- trg_aves_satir_kimligini_dogrula oturumdan yeniden yazdığı için güvenli.
create or replace function public.aves_takip_atanan_alan_kilidi()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
set row_security = off
as $$
declare
  v_email text := public.aves_oturum_emaili();
  v_izinli text[] := array[
    'denetim_durumu','saha_tamamlandi_at','gozden_gecirme_at','calisma_tamamlandi_at',
    'offline_hazir_at','butunluk_ozeti','butunluk_hash','butunluk_hesaplandi_at',
    'expected_item_count','expected_item_set_hash','seri_numaralari','form_cikti_snapshot',
    'updated_at','son_degistiren_email','son_degistiren_ad','son_degistiren_rol','son_degistiren_at'
  ];
begin
  if lower(coalesce(OLD.takip_atanan_email,'')) = v_email
     and lower(coalesce(OLD.olusturan_email,'')) <> v_email
     and not public.aves_tum_denetimleri_gorebilir_mi()
  then
    if (to_jsonb(NEW) - v_izinli) is distinct from (to_jsonb(OLD) - v_izinli) then
      raise exception 'Takip mühendisi yalnız sonuç ve ilerleme alanlarını güncelleyebilir';
    end if;

    if OLD.denetim_durumu is distinct from NEW.denetim_durumu then
      if not (
        (OLD.denetim_durumu = 'Devam Ediyor' and NEW.denetim_durumu in ('Gözden Geçirme','Çalışma Tamamlandı'))
        or (OLD.denetim_durumu = 'Gözden Geçirme' and NEW.denetim_durumu = 'Çalışma Tamamlandı')
      ) then
        raise exception 'Takip denetimi durumu yalnız ileri yönde ilerletilebilir';
      end if;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_aves_takip_atanan_alan_kilidi on public.denetimler;
create trigger trg_aves_takip_atanan_alan_kilidi
before update on public.denetimler
for each row execute function public.aves_takip_atanan_alan_kilidi();

commit;

-- Salt okunur kurulum doğrulamaları -------------------------------------------
select schemaname, tablename, policyname, cmd,
       qual is not null as has_using, with_check is not null as has_check
from pg_policies
where policyname in (
  'denetimleri okuma','takip atanan denetim guncelleme','saha okuma',
  'gecmis okuma','gecmis ekleme',
  'denetim fotograflari okuma','denetim fotograflari ekleme','denetim fotograflari guncelleme',
  'denetim fotograf nesnesi okuma','denetim fotograf nesnesi ekleme','denetim fotograf nesnesi guncelleme'
)
order by schemaname, tablename, cmd, policyname;

select tgname from pg_trigger
where tgrelid = 'public.denetimler'::regclass and not tgisinternal
order by tgname;
