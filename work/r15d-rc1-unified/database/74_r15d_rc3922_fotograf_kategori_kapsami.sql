-- AVES Saha R15D-rc3.9.22 — Modül G esaslı fotoğraf kategori kapsamı.
-- Mevcut fotoğraf ve kategori değerleri korunur; yalnız izin verilen yeni saha
-- grupları eklenir. Tablo, Storage nesnesi veya metadata silinmez.

begin;

alter table public.denetim_fotograflari
  drop constraint if exists denetim_fotografi_kategori_gecerli;

alter table public.denetim_fotograflari
  add constraint denetim_fotografi_kategori_gecerli check (
    kategori in (
      'genel_kimlik',
      'kuyu_dibi',
      'kuyu_boyunca',
      'durak_kapilari',
      'kabin_kabin_ustu',
      'makine_sase',
      'hidrolik_grubu',
      'kumanda_grubu',
      'ozel_sistemler'
    )
  );

commit;

select kategori, count(*)
from public.denetim_fotograflari
group by kategori
order by kategori;
