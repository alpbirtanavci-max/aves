-- AVES SAHA DENETIM R15D-RC1 — KAYIPSIZ YETKI, ICERIK VE OFFLINE GECIS MIGRASYONU
-- KONTROLLU TASLAK – RESMI UYGULAMADA KULLANILMAZ
--
-- Uygulama dosyalari R15C'ye alinmadan ONCE bu migration calistirilmalidir.
-- R15A/R15B mevcut veritabanini veri kaybini sinirlayarak R15C akimina tasir.

begin;

-- 1) Roller: muhendis / teknik_mudur / yonetici
alter table public.kullanici_profilleri
  drop constraint if exists kullanici_profilleri_rol_check;

alter table public.kullanici_profilleri
  add constraint kullanici_profilleri_rol_check
  check (rol in ('yonetici', 'teknik_mudur', 'muhendis'));

-- 2) Denetim is akisi: Devam Ediyor -> Gozden Gecirme -> Calisma Tamamlandi
alter table public.denetimler
  add column if not exists gozden_gecirme_at timestamptz,
  add column if not exists calisma_tamamlandi_at timestamptz,
  add column if not exists offline_hazir_at timestamptz,
  add column if not exists offline_hazirlayan_email text,
  add column if not exists expected_item_count integer,
  add column if not exists expected_item_set_hash text,
  add column if not exists app_build_id text,
  add column if not exists kutuphane_content_hash text,
  add column if not exists offline_check jsonb;

-- Eski constraint "Çalışma Tamamlandı" değerini kabul etmeyebilir. Veri dönüşümü
-- başlamadan önce kaldırılır; transaction içindeki yeni constraint hemen aşağıda kurulur.
alter table public.denetimler
  drop constraint if exists denetimler_denetim_durumu_check;

update public.denetimler
set denetim_durumu = 'Çalışma Tamamlandı',
    calisma_tamamlandi_at = coalesce(calisma_tamamlandi_at, saha_tamamlandi_at, updated_at)
where denetim_durumu = 'Saha Tamamlandı';

alter table public.denetimler
  add constraint denetimler_denetim_durumu_check
  check (denetim_durumu in ('Devam Ediyor', 'Gözden Geçirme', 'Çalışma Tamamlandı'));

-- Yeni/degistirilen denetimlerde MR/MRL bos birakilamaz. Eski null kayitlar NOT VALID
-- sayesinde migrasyonu engellemez; daha sonra veri temizligiyle constraint validate edilebilir.
alter table public.denetimler
  drop constraint if exists denetimler_makine_dairesi_r15c_check;
alter table public.denetimler
  add constraint denetimler_makine_dairesi_r15c_check
  check (makine_dairesi_tipi is not null and makine_dairesi_tipi in ('MR','MRL')) not valid;

-- 3) Checklist sonucu yalniz uc durumdur.
-- Eski "Veri eksik" sonucu otomatik olarak uygun/uygunsuz/uygulanmaza cevrilmez.
-- Bunun yerine ic kontrol notuna tasinir ve madde yeniden degerlendirilmek uzere bos birakilir.
alter table public.saha_kontrol
  add column if not exists ic_kontrol_notu text,
  add column if not exists gecis_oncesi_durum text,
  add column if not exists gozden_gecirme_nedeni text,
  add column if not exists gozden_gecirme_notu text;

alter table public.saha_kontrol
  drop constraint if exists saha_kontrol_gozden_gecirme_nedeni_check,
  add constraint saha_kontrol_gozden_gecirme_nedeni_check check (
    gozden_gecirme_nedeni is null or gozden_gecirme_nedeni in (
      'Sonra tekrar bakılacak',
      'Erişim sağlanacak',
      'Ortam / aydınlatma düzeltilecek',
      'Teknik bilgi doğrulanacak',
      'Diğer'
    )
  );

update public.saha_kontrol
set gecis_oncesi_durum = coalesce(gecis_oncesi_durum, durum),
    ic_kontrol_notu = trim(both E'\n' from concat_ws(
      E'\n',
      nullif(ic_kontrol_notu, ''),
      '[R15C geçişi] Önceki sürümde "Veri eksik" olarak işaretlenmişti; Uygun / Uygun Değil / Uygulanmaz seçeneklerinden biriyle yeniden değerlendirilmelidir.'
    )),
    durum = null,
    denetci_gordu = false,
    updated_at = now()
where durum = 'Veri eksik';

alter table public.saha_kontrol
  drop constraint if exists saha_kontrol_durum_check;

alter table public.saha_kontrol
  add constraint saha_kontrol_durum_check
  check (durum is null or durum in ('Kontrol tamamlandı', 'Olumsuz bulgu', 'Uygulanmaz'));

-- 4) "Tekrar saha ziyareti gerekiyor mu?" yeni denetimlerde kullanilmaz.
-- Canli ve tarihsel veri silinmez: ana kayit pasiflestirilir, mevcut snapshot korunur.
update public.madde_kutuphanesi
set aktif = false
where madde_id = 'MAD-1010';

update public.saha_kontrol
set ic_kontrol_notu = trim(both E'\n' from concat_ws(
      E'\n',
      nullif(ic_kontrol_notu, ''),
      '[R15D geçişi] Bu tarihsel snapshot korunmuştur; MAD-1010 yeni denetimlerde kullanılmaz.'
    ))
where madde_id = 'MAD-1010'
  and position('[R15D geçişi] Bu tarihsel snapshot korunmuştur; MAD-1010 yeni denetimlerde kullanılmaz.' in coalesce(ic_kontrol_notu, '')) = 0;

-- Yardimci bulgu seceneklerindeki ana sonuc kopyalarini / gecersiz genel secenekleri temizle.
-- Sadece gercek, o maddeye ozel olumsuz bulgular kalir. Bos kalan alan null yapilir.
update public.madde_kutuphanesi m
set hazir_secenekler = (
  select nullif(string_agg(t.v, '|' order by t.ord), '')
  from unnest(string_to_array(coalesce(m.hazir_secenekler, ''), '|')) with ordinality as t(v, ord)
  where btrim(t.v) not in (
    'Belirgin olumsuzluk yok',
    'Olumsuz durum görüldü',
    'Belirgin kusur görülmedi',
    '2.000 mm altında ve belirgin kusur yok',
    '8.8 veya üzeri',
    'Kontrol edilemedi',
    'Uygulanmaz',
    'Aranmaz',
    'Diğer bulgu',
    'Tekrar saha gerekmiyor',
    'Tekrar saha gerekli',
    'Karar verilemedi'
  )
)
where m.hazir_secenekler is not null;

-- Mevcut denetim snapshotlarinin hazir secenekleri tarihsel kayit niteliginde korunur.

-- 4.1) Kontrollu kaynaklarla dogrulanan R15D kutuphane duzeltmeleri.
do $$
declare
  title_target_count integer;
  title_final_count integer;
  mr_target_count integer;
  mr_final_count integer;
begin
  select count(*) into title_target_count
  from public.madde_kutuphanesi
  where (
    madde_id = 'MAD-0561'
    or (madde_id between 'MAD-0562' and 'MAD-0613' and madde_id <> 'MAD-0611')
  )
    and kontrol_basligi = 'KASNAK KANALLARI KONTROLÜ';

  select count(*) into title_final_count
  from public.madde_kutuphanesi
  where (madde_id = 'MAD-0561' and kontrol_basligi = 'Testler')
     or (madde_id between 'MAD-0562' and 'MAD-0613' and madde_id <> 'MAD-0611'
         and kontrol_basligi = 'Hidrolik Kontrol ve Testleri');

  if not ((title_target_count = 52 and title_final_count = 0)
       or (title_target_count = 0 and title_final_count = 52)) then
    raise exception 'R15D başlık kümesi ne başlangıç ne de tamamlanmış durumda (eski: %, yeni: %)', title_target_count, title_final_count;
  end if;

  select count(*) into mr_target_count
  from public.madde_kutuphanesi
  where madde_id in ('MAD-0460','MAD-0467','MAD-0486','MAD-0492')
    and md_kosulu = 'MRL';

  select count(*) into mr_final_count
  from public.madde_kutuphanesi
  where madde_id in ('MAD-0460','MAD-0467','MAD-0486','MAD-0492')
    and md_kosulu = 'MR';

  if not ((mr_target_count = 4 and mr_final_count = 0)
       or (mr_target_count = 0 and mr_final_count = 4)) then
    raise exception 'R15D MR koşulu kümesi ne başlangıç ne de tamamlanmış durumda (MRL: %, MR: %)', mr_target_count, mr_final_count;
  end if;

  if not exists (
    select 1
    from public.madde_kutuphanesi a
    join public.madde_kutuphanesi b on b.madde_id = 'MAD-0824'
    where a.madde_id = 'MAD-0814'
      and a.kontrol_basligi is not distinct from b.kontrol_basligi
      and a.denetci_yonlendirmesi is not distinct from b.denetci_yonlendirmesi
      and a.resmi_madde_metni is not distinct from b.resmi_madde_metni
  ) then
    raise exception 'MAD-0814 / MAD-0824 mükerrer doğrulaması başarısız';
  end if;
end $$;

update public.madde_kutuphanesi
set kontrol_basligi = 'Testler'
where madde_id = 'MAD-0561';

update public.madde_kutuphanesi
set kontrol_basligi = 'Hidrolik Kontrol ve Testleri'
where madde_id between 'MAD-0562' and 'MAD-0613'
  and madde_id <> 'MAD-0611';

update public.madde_kutuphanesi
set md_kosulu = 'MR'
where madde_id in ('MAD-0460','MAD-0467','MAD-0486','MAD-0492');

update public.madde_kutuphanesi
set aktif = false
where madde_id = 'MAD-0824';

-- Aynı denetim/madde için tekrar gönderim yeni satır üretmez. Mevcut mükerrer varsa
-- veri silmeden durulur ve elle incelenir.
do $$
begin
  if exists (
    select 1 from public.saha_kontrol
    group by denetim_id, madde_id
    having count(*) > 1
  ) then
    raise exception 'saha_kontrol içinde denetim_id + madde_id mükerrerleri var; R15D güvenli geçiş durduruldu';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_index i
    join pg_class t on t.oid = i.indrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'saha_kontrol'
      and i.indisunique
      and (
        select array_agg(a.attname::text order by k.ord)
        from unnest(i.indkey) with ordinality as k(attnum, ord)
        join pg_attribute a on a.attrelid = i.indrelid and a.attnum = k.attnum
        where k.attnum > 0
      ) = array['denetim_id','madde_id']::text[]
  ) then
    create unique index saha_kontrol_denetim_madde_uidx
      on public.saha_kontrol (denetim_id, madde_id);
  end if;
end $$;

-- Yeni R15D uygulaması KUTUPHANE_VER değişimi nedeniyle kütüphaneyi kendisi yeniden
-- doğrular. Bölüm sürümünü her migration tekrarında artırmak idempotent olmadığı için
-- burada ayrıca sayaç yükseltilmez.

-- 5) Yonetim yetkisi: teknik mudur veya yonetici.
create or replace function public.aves_yonetim_yetkili_mi()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
set row_security = off
as $$
  select exists (
    select 1
    from public.kullanici_profilleri kp
    where kp.email = public.aves_oturum_emaili()
      and kp.aktif = true
      and kp.rol in ('yonetici', 'teknik_mudur')
  );
$$;

revoke all on function public.aves_yonetim_yetkili_mi() from public;
grant execute on function public.aves_yonetim_yetkili_mi() to authenticated;

-- Eski yonetici fonksiyonu geriye uyumluluk icin korunur; yeni politikalarda yonetim fonksiyonu kullanilir.

-- 6) RLS politikalari
-- Profil: kullanici kendisini gorur; teknik mudur / yonetici tum aktif profil listesini gorebilir.
drop policy if exists "R11 profilleri okuma" on public.kullanici_profilleri;
drop policy if exists "R12 profilleri okuma" on public.kullanici_profilleri;
drop policy if exists "R15C profilleri okuma" on public.kullanici_profilleri;
create policy "R15C profilleri okuma" on public.kullanici_profilleri
for select to authenticated
using (
  (email = public.aves_oturum_emaili() and aktif = true)
  or public.aves_yonetim_yetkili_mi()
);

-- Denetimler: aktif kullanicilar gorur. Muhendis kendi denetimini gunceller fakat SILEMEZ.
drop policy if exists "R11 denetimleri okuma" on public.denetimler;
drop policy if exists "R11 denetim ekleme" on public.denetimler;
drop policy if exists "R11 denetim guncelleme" on public.denetimler;
drop policy if exists "R11 denetim silme" on public.denetimler;
drop policy if exists "R12 denetimleri okuma" on public.denetimler;
drop policy if exists "R12 denetim ekleme" on public.denetimler;
drop policy if exists "R12 denetim guncelleme" on public.denetimler;
drop policy if exists "R12 denetim silme" on public.denetimler;
drop policy if exists "R15C denetimleri okuma" on public.denetimler;
drop policy if exists "R15C denetim ekleme" on public.denetimler;
drop policy if exists "R15C denetim guncelleme" on public.denetimler;
drop policy if exists "R15C denetim silme" on public.denetimler;

create policy "R15C denetimleri okuma" on public.denetimler
for select to authenticated
using (public.aves_aktif_kullanici_mi());

create policy "R15C denetim ekleme" on public.denetimler
for insert to authenticated
with check (
  public.aves_aktif_kullanici_mi()
  and (
    lower(coalesce(olusturan_email, '')) = public.aves_oturum_emaili()
    or public.aves_yonetim_yetkili_mi()
  )
);

create policy "R15C denetim guncelleme" on public.denetimler
for update to authenticated
using (
  public.aves_aktif_kullanici_mi()
  and (
    public.aves_yonetim_yetkili_mi()
    or lower(coalesce(olusturan_email, '')) = public.aves_oturum_emaili()
  )
)
with check (
  public.aves_aktif_kullanici_mi()
  and (
    public.aves_yonetim_yetkili_mi()
    or lower(coalesce(olusturan_email, '')) = public.aves_oturum_emaili()
  )
);

create policy "R15C denetim silme" on public.denetimler
for delete to authenticated
using (
  public.aves_aktif_kullanici_mi()
  and public.aves_yonetim_yetkili_mi()
);

-- Saha cevaplari: muhendis kendi denetiminde Devam Ediyor/Gozden Gecirme asamalarinda duzeltir.
-- Tek tek saha satiri hicbir role verilmez; yanlis cevap silinmez, guncellenir.
drop policy if exists "R11 saha okuma" on public.saha_kontrol;
drop policy if exists "R11 saha ekleme" on public.saha_kontrol;
drop policy if exists "R11 saha guncelleme" on public.saha_kontrol;
drop policy if exists "R11 saha silme" on public.saha_kontrol;
drop policy if exists "R12 saha okuma" on public.saha_kontrol;
drop policy if exists "R12 saha ekleme" on public.saha_kontrol;
drop policy if exists "R12 saha guncelleme" on public.saha_kontrol;
drop policy if exists "R12 saha silme" on public.saha_kontrol;
drop policy if exists "R15C saha okuma" on public.saha_kontrol;
drop policy if exists "R15C saha ekleme" on public.saha_kontrol;
drop policy if exists "R15C saha guncelleme" on public.saha_kontrol;
drop policy if exists "R15C saha silme" on public.saha_kontrol;

create policy "R15C saha okuma" on public.saha_kontrol
for select to authenticated
using (public.aves_aktif_kullanici_mi());

create policy "R15C saha ekleme" on public.saha_kontrol
for insert to authenticated
with check (
  public.aves_aktif_kullanici_mi()
  and exists (
    select 1 from public.denetimler d
    where d.id = saha_kontrol.denetim_id
      and (
        public.aves_yonetim_yetkili_mi()
        or (
          lower(coalesce(d.olusturan_email, '')) = public.aves_oturum_emaili()
          and d.denetim_durumu in ('Devam Ediyor', 'Gözden Geçirme')
        )
      )
  )
);

create policy "R15C saha guncelleme" on public.saha_kontrol
for update to authenticated
using (
  public.aves_aktif_kullanici_mi()
  and exists (
    select 1 from public.denetimler d
    where d.id = saha_kontrol.denetim_id
      and (
        public.aves_yonetim_yetkili_mi()
        or (
          lower(coalesce(d.olusturan_email, '')) = public.aves_oturum_emaili()
          and d.denetim_durumu in ('Devam Ediyor', 'Gözden Geçirme')
        )
      )
  )
)
with check (
  public.aves_aktif_kullanici_mi()
  and exists (
    select 1 from public.denetimler d
    where d.id = saha_kontrol.denetim_id
      and (
        public.aves_yonetim_yetkili_mi()
        or (
          lower(coalesce(d.olusturan_email, '')) = public.aves_oturum_emaili()
          and d.denetim_durumu in ('Devam Ediyor', 'Gözden Geçirme')
        )
      )
  )
);

-- Yetki grant'leri en az yetki ilkesine indirilir; RLS ikinci savunma katmanidir.
revoke all on public.kullanici_profilleri from anon, authenticated;
grant select on public.kullanici_profilleri to authenticated;
revoke all on public.madde_kutuphanesi from anon, authenticated;
grant select on public.madde_kutuphanesi to authenticated;
revoke all on public.kutuphane_bolum_surumleri from anon, authenticated;
grant select on public.kutuphane_bolum_surumleri to authenticated;
revoke all on public.denetimler from anon, authenticated;
grant select, insert, update, delete on public.denetimler to authenticated;
revoke all on public.saha_kontrol from anon, authenticated;
grant select, insert, update on public.saha_kontrol to authenticated;

commit;

-- Kontrol sorgulari
select rol, count(*) from public.kullanici_profilleri group by rol order by rol;
select denetim_durumu, count(*) from public.denetimler group by denetim_durumu order by denetim_durumu;
select count(*) as mad_1010_aktif from public.madde_kutuphanesi where madde_id = 'MAD-1010' and aktif = true;
select count(*) as gecersiz_sonuc_kalan from public.saha_kontrol where durum not in ('Kontrol tamamlandı','Olumsuz bulgu','Uygulanmaz') and durum is not null;
select count(*) as r15d_yanlis_baslik_kalan
from public.madde_kutuphanesi
where (madde_id = 'MAD-0561' or (madde_id between 'MAD-0562' and 'MAD-0613' and madde_id <> 'MAD-0611'))
  and kontrol_basligi = 'KASNAK KANALLARI KONTROLÜ';
select madde_id, md_kosulu from public.madde_kutuphanesi where madde_id in ('MAD-0460','MAD-0467','MAD-0486','MAD-0492') order by madde_id;
select madde_id, aktif from public.madde_kutuphanesi where madde_id in ('MAD-0814','MAD-0824') order by madde_id;
