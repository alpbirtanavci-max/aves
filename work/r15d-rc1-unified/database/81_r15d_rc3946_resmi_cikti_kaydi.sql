-- AVES Saha R15D-rc3.9.46 — resmî çıktı (PDF/Word) üretim kaydı.
--
-- `btnYazdir` bir denetimin resmî formunu üretip indiriyor ama üretimin
-- kaydı hiçbir yerde tutulmuyordu ("bu denetimin çıktısı alındı mı, ne zaman,
-- hangi revizyondan"). Bu migration yalnız 3 nullable kolon ekler; RLS,
-- trigger veya veri değişikliği yok.
--
--   resmi_cikti_uretildi_at    — son üretim zamanı
--   resmi_cikti_snapshot_ozeti — form kodu + revizyon + biçim + kütüphane hash özeti
--   resmi_cikti_hash           — üretilen belge baytlarının SHA-256'sı
--
-- Yazma: mevcut "denetim guncelleme" politikası (sahip / yönetici / teknik müdür).
-- Çıktı yalnız "Çalışma Tamamlandı" denetimden üretildiği için atanan takip
-- mühendisi trigger'ı (aves_takip_atanan_alan_kilidi) bu yolu etkilemez —
-- o trigger yalnız aktif takipte ve sahip/yönetim dışı kullanıcıda çalışır.

begin;

alter table public.denetimler
  add column if not exists resmi_cikti_uretildi_at timestamptz,
  add column if not exists resmi_cikti_snapshot_ozeti text,
  add column if not exists resmi_cikti_hash text;

commit;

-- Salt okunur doğrulama.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'denetimler'
  and column_name in ('resmi_cikti_uretildi_at', 'resmi_cikti_snapshot_ozeti', 'resmi_cikti_hash')
order by column_name;
