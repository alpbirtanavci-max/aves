-- AVES R15D-rc3.2 — kurulum öncesi/sonrası SALT OKUNUR kontrol paketi
-- Bu dosya veri veya şema değiştirmez.

-- 1) Canlı kayıt sayıları: migration öncesi ve sonrası çıktılar saklanır.
select 'denetimler' as nesne, count(*) as kayit from public.denetimler
union all
select 'saha_kontrol', count(*) from public.saha_kontrol
union all
select 'aktif_kutuphane', count(*) from public.madde_kutuphanesi where aktif = true
union all
select 'kullanici_profilleri', count(*) from public.kullanici_profilleri;

-- 2) Yeni sütunlar eksiksiz mi?
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'denetimler' and column_name in (
      'snapshot_kilitli_at','snapshot_app_build_id','snapshot_kutuphane_hash',
      'snapshot_bolum_surumleri','snapshot_madde_sayisi','snapshot_madde_set_hash',
      'snapshot_content_hash','butunluk_ozeti','butunluk_hash','butunluk_hesaplandi_at',
      'olusturan_ad','son_degistiren_email','son_degistiren_ad','son_degistiren_rol','son_degistiren_at'
    ))
    or (table_name = 'saha_kontrol' and column_name in (
      'snapshot_madde_hash','olusturan_email','olusturan_ad',
      'son_degistiren_email','son_degistiren_ad','son_degistiren_rol','son_degistiren_at'
    ))
    or table_name = 'denetim_degisim_gecmisi'
  )
order by table_name, ordinal_position;

-- 3) RLS ifadeleri: teknik_mudur yazma politikalarında doğrudan yer almamalı.
select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('denetimler','saha_kontrol','denetim_degisim_gecmisi')
order by tablename, cmd, policyname;

-- 4) Kimlik, silme geçmişi ve snapshot kilidi tetikleyicileri etkin mi?
select event_object_table, trigger_name, event_manipulation, action_timing
from information_schema.triggers
where trigger_schema = 'public'
  and trigger_name in (
    'trg_aves_gecmis_kimligi','trg_aves_denetim_silme_gecmisi',
    'trg_aves_denetim_kimligi','trg_aves_saha_kimligi',
    'trg_aves_denetim_snapshot_kilidi','trg_aves_saha_snapshot_kilidi'
  )
order by event_object_table, trigger_name, event_manipulation;

-- 5) Tablo yetkileri: geçmişte authenticated için yalnız SELECT/INSERT olmalı.
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('denetimler','saha_kontrol','denetim_degisim_gecmisi')
  and grantee in ('anon','authenticated')
order by table_name, grantee, privilege_type;

-- 6) Yeni sürüm sonrası operasyonel tutarlılık.
select count(*) as gecersiz_sonuc
from public.saha_kontrol
where durum is not null
  and durum not in ('Kontrol tamamlandı','Olumsuz bulgu','Uygulanmaz');

select count(*) as snapshot_sayisi_uyusmayan_denetim
from public.denetimler d
where d.snapshot_kilitli_at is not null
  and d.snapshot_madde_sayisi <> (
    select count(*) from public.saha_kontrol s where s.denetim_id = d.id
  );

select count(*) as tamamlanmis_ama_butunluk_hashsiz
from public.denetimler
where denetim_durumu = 'Çalışma Tamamlandı'
  and snapshot_kilitli_at is not null
  and butunluk_hash is null;

select islem_turu, count(*)
from public.denetim_degisim_gecmisi
group by islem_turu
order by islem_turu;

