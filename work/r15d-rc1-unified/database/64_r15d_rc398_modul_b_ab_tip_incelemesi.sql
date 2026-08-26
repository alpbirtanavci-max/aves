-- AVES Saha R15D-rc3.9.8
-- Modül B (AB Tip İncelemesi) denetim türü ekleniyor.
--
-- Kaynak: Google Drive ÜB.TB.05 /Rev.02 / 31.03.2026 "Modüllere Göre Denetim
-- Dosya Seti Tablosu" — Modül B sütunu incelendiğinde fiziksel saha kontrolü
-- için kullanılan form (ÜB.FR.38, TS EN 81-20 Test Kontrol Formu) Modül
-- G-81.20 ile birebir aynı; TS EN 81-1/2+A3 formları (ÜB.FR.39/ÜB.FR.51)
-- Modül B'de yok. Bu nedenle Modül B checklist içeriği olarak yeni madde
-- eklenmiyor — mevcut TAM/81-20 madde kümesi aynen kullanılıyor. Modül B'yi
-- ayıran; rapor/istatistiklerde ayrı görünmesi ve AB Tip İncelemesi'ne özgü
-- "ana tip" + "tip varyant kodu" kimlik alanlarının zorunlu olmasıdır
-- (ÜB.LS.23 Firma Beyanı ve Tip Varyasyon Listesi, ÜB.RP.14 AB Tip İnceleme
-- Raporu ile uyumlu). Takip denetimi Modül B için de açık tutulur (iş kararı).
--
-- Bu migration mevcut denetim/madde verisini değiştirmez; yalnız şema
-- kısıtlarını genişletir ve iki yeni sütun ekler.

begin;

alter table public.denetimler
  add column if not exists ana_tip text,
  add column if not exists tip_varyant_kodu text;

alter table public.denetimler
  drop constraint if exists denetimler_denetim_turu_check;
alter table public.denetimler
  add constraint denetimler_denetim_turu_check check (
    denetim_turu is null or denetim_turu = any (array[
      'Modül G - Birim Doğrulaması',
      'Modül E - Gözetim Saha Teyidi',
      'Modül H1 - Gözetim Saha Teyidi',
      'Modül B - AB Tip İncelemesi'
    ])
  );

alter table public.denetimler
  drop constraint if exists denetimler_kontrol_profili_check;
alter table public.denetimler
  add constraint denetimler_kontrol_profili_check check (
    kontrol_profili is null or kontrol_profili = any (array[
      'modul_g_tam','saha_teyidi_e','saha_teyidi_h1','modul_b_tip_inceleme'
    ])
  );

alter table public.denetimler
  drop constraint if exists denetimler_takip_sira_check;
alter table public.denetimler
  add constraint denetimler_takip_sira_check check (
    (takip_ana_denetim_id is null and takip_onceki_denetim_id is null and takip_sira_no is null)
    or
    (takip_ana_denetim_id is not null and takip_onceki_denetim_id is not null and takip_sira_no > 0
      and kontrol_profili in ('modul_g_tam','modul_b_tip_inceleme')
      and takip_ana_denetim_id <> id
      and takip_onceki_denetim_id <> id)
  );

alter table public.denetimler
  drop constraint if exists denetimler_modul_b_kimlik_check;
alter table public.denetimler
  add constraint denetimler_modul_b_kimlik_check check (
    kontrol_profili is distinct from 'modul_b_tip_inceleme'
    or (ana_tip is not null and length(trim(ana_tip)) > 0
      and tip_varyant_kodu is not null and length(trim(tip_varyant_kodu)) > 0)
  );

-- Takip denetimi kaynağı: Modül G TAM ile aynı şekilde Modül B için de açık.
create or replace function public.aves_takip_kaynagi_gecerli_mi(p_onceki_denetim_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
set row_security = off
as $$
  select p_onceki_denetim_id is null or exists (
    select 1 from public.denetimler onceki
    where onceki.id = p_onceki_denetim_id
      and onceki.denetim_durumu = 'Çalışma Tamamlandı'
      and coalesce(onceki.kontrol_profili,'') in ('modul_g_tam','modul_b_tip_inceleme')
      and public.aves_denetim_gorebilir_mi(onceki.olusturan_email)
  );
$$;

commit;

-- Salt okunur doğrulama.
select conname, pg_get_constraintdef(oid) as def
from pg_constraint
where conrelid = 'public.denetimler'::regclass
  and conname in (
    'denetimler_denetim_turu_check','denetimler_kontrol_profili_check',
    'denetimler_takip_sira_check','denetimler_modul_b_kimlik_check'
  )
order by conname;

select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'denetimler'
  and column_name in ('ana_tip','tip_varyant_kodu')
order by column_name;
