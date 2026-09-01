-- AVES Saha R15D-rc3.9.20 — fotoğrafları madde bazlı butonlardan ayrı "Fotoğraflar"
-- sekmesine taşı (Seri No sekmesiyle aynı desen). Denetçinin "hangi maddeye
-- iğnelesek" tereddüdünü ortadan kaldırmak için fotoğraflar artık tek bir madde/
-- saha_kontrol satırına değil, sabit bir saha kategorisine (kuyu dibi, kuyu boyunca,
-- kabin/kabin üstü, makine/şase, kumanda grubu) bağlanıyor.
--
-- Mevcut 7 satır/obje tamamen TEST RC3.9.14 denetimine ait test verisi (bkz. oturum
-- notları); şema şekli değiştiği için metadata satırları temizlenip yeniden başlanıyor,
-- gerçek veri kaybı yok. storage.objects satırları Postgres'in storage.protect_delete()
-- tetikleyicisi yüzünden düz SQL ile silinemiyor (yalnız Storage API'den silinebilir) —
-- birkaç KB'lık test dosyası olduğu için sahipsiz bırakıldı, yeni sekim hiçbir zaman
-- onlara referans vermeyecek.

do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema='public' and table_name='denetim_fotograflari') then
    raise exception 'denetim_fotograflari tablosu bulunamadı — 68 numaralı migration önce uygulanmalı';
  end if;
end $$;

begin;

delete from public.denetim_fotograflari;

alter table public.denetim_fotograflari
  drop constraint if exists denetim_fotografi_path_scope;

alter table public.denetim_fotograflari
  drop column if exists saha_kontrol_id,
  drop column if exists madde_id;

alter table public.denetim_fotograflari
  add column kategori text not null default '' ;

alter table public.denetim_fotograflari
  alter column kategori drop default;

alter table public.denetim_fotograflari
  add constraint denetim_fotografi_kategori_gecerli check (
    kategori in ('kuyu_dibi','kuyu_boyunca','kabin_kabin_ustu','makine_sase','kumanda_grubu')
  );

alter table public.denetim_fotograflari
  add constraint denetim_fotografi_path_scope check (object_path like denetim_id::text || '/%');

drop index if exists denetim_fotograflari_madde_idx;
create index if not exists denetim_fotograflari_kategori_idx
  on public.denetim_fotograflari (denetim_id, kategori, created_at);

commit;

-- Doğrulama (salt okunur)
select column_name, data_type, is_nullable from information_schema.columns
where table_schema='public' and table_name='denetim_fotograflari'
order by ordinal_position;
