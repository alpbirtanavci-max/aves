-- AVES Saha R15D-rc3.9.53 — kurumsal arşive aktarım durumu.
--
-- Tamamlanmış bir denetimin resmî dosyasının kurumsal arşive konduğu bilgisi
-- hiçbir yerde tutulmuyordu. Bu migration yalnız 2 nullable kolon ekler;
-- RLS, trigger veya veri değişikliği yok.
--
--   arsive_aktarildi_at  — arşive aktarım işaretinin konduğu an (kaldırılırsa null)
--   arsive_aktaran_email — işareti koyan kişi
--
-- Yazma: mevcut "denetim guncelleme" politikası (sahip / yönetici / teknik müdür).
-- İşaretleme yalnız "Çalışma Tamamlandı" denetimde ve arayüzde yalnız yönetim
-- (yonetici / teknik_mudur) için açık olduğundan atanan takip mühendisi trigger'ı
-- (aves_takip_atanan_alan_kilidi — yalnız aktif takipte ve sahip/yönetim dışı) bu
-- yolu etkilemez.

begin;

alter table public.denetimler
  add column if not exists arsive_aktarildi_at timestamptz,
  add column if not exists arsive_aktaran_email text;

commit;

-- Salt okunur doğrulama.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'denetimler'
  and column_name in ('arsive_aktarildi_at', 'arsive_aktaran_email')
order by column_name;
