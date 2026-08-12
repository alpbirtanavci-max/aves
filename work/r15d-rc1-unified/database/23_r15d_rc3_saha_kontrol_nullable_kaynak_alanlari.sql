-- AVES R15D-rc3 — kritik senkron hatası düzeltmesi
-- Uygulandı: 2026-08-12, canlı proje jmccmkqyncunpqliqvox,
-- supabase migration versiyonu 20260812080036.
--
-- Sorun: public.saha_kontrol.hazir_secenekler ve kaynak_turu NOT NULL idi,
-- ancak public.madde_kutuphanesi'nde bu alanlar nullable ve aktif maddelerin
-- büyük çoğunluğunda (hazir_secenekler için 952/1019, %93) gerçekten NULL.
-- app.js olustur() bu alanları doğrudan kopyaladığı için saha_kontrol satırı
-- sunucuya upsert edilirken 23502 (not-null violation) ile kalıcı olarak
-- reddediliyordu; outbox kaydı yerelde korunuyordu (veri kaybı yok) ama
-- hiçbir zaman sunucuya ulaşamıyordu ve Sync.pushOutbox() aynı hatada
-- sonsuza dek retry'da kalıyordu.
--
-- Bu, canlıdaki "1 denetim Çalışma Tamamlandı ama saha_kontrol satırı 0"
-- uyuşmazlığının kök nedeni olarak tespit edildi ve geçici bir test
-- denetimiyle (oluşturulup hemen temizlendi) doğrulandı:
--   - Düzeltme öncesi: MAD-0698 (hazir_secenekler=null) için satır eklemek
--     23502 not-null violation ile reddedildi.
--   - Düzeltme sonrası: aynı satır hatasız eklendi.
--
-- Düzeltme: kısıtı kaynağın gerçek nullable yapısına eşitle. Uygulama anında
-- saha_kontrol 0 satır içeriyordu; veri kaybı veya geriye dönük dönüşüm
-- riski yoktu.

begin;

do $$
begin
  if (select count(*) from public.saha_kontrol) <> 0 then
    raise exception 'Beklenmeyen durum: saha_kontrol boş değil (fail-fast, migration durduruldu)';
  end if;
end $$;

alter table public.saha_kontrol alter column hazir_secenekler drop not null;
alter table public.saha_kontrol alter column kaynak_turu drop not null;

commit;

-- Salt okunur doğrulama
select table_schema, column_name, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'saha_kontrol'
  and column_name in ('hazir_secenekler','kaynak_turu')
order by column_name;
