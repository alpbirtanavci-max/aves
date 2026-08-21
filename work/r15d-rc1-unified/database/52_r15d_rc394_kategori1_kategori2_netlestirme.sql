-- AVES Saha R15D-rc3.9.4
-- Saha geri bildirimi: TS EN 81-71 (kasıtlı tahribata karşı dayanıklı asansör)
-- bölümündeki "Kategori 1" / "Kategori 2" maddeleri, denetçiye hangi asansörün
-- hangi kategoriye girdiğini ve karşı kategorinin maddelerinin ne olacağını
-- söylemiyordu (kaynak: ÜB.FR.41 R.04, 5.2.1.2/5.2.1.3 — Kategori 1 = kuyusu
-- KISMİ mahfazalı, Kategori 2 = kuyusu TAM mahfazalı asansör; ikisi karşılıklı
-- dışlayıcıdır).
--
-- MAD-0847 (Kategori 1 tanımlayıcı madde) ve MAD-0848 (Kategori 2 tanımlayıcı
-- madde) denetci_yonlendirmesi metnine kategori belirleme talimatı eklendi.
-- Yalnız tek kategoriye özgü diğer 13 madde için aranmaz_kosulu dolduruldu:
-- denetçi karşı kategoriye ait bir maddeyle karşılaşırsa "Uygulanmaz" gerekçesini
-- görür. Ortak (her iki kategoride de geçerli) maddeler (MAD-0861, MAD-0862,
-- MAD-0880) dokunulmadı.
-- Veri silmez; başlamış denetimlerin saha_kontrol snapshot satırlarına dokunmaz.

begin;

do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.madde_kutuphanesi
  where madde_id in (
    'MAD-0847','MAD-0848','MAD-0855','MAD-0859','MAD-0863','MAD-0864','MAD-0865',
    'MAD-0866','MAD-0872','MAD-0873','MAD-0876','MAD-0877','MAD-0878','MAD-0879','MAD-0881'
  ) and aktif is true;
  if v_count <> 15 then
    raise exception 'Beklenen 15 aktif madde bulunamadı (% bulundu)', v_count;
  end if;
end
$$;

update public.madde_kutuphanesi
set denetci_yonlendirmesi = 'Önce asansörün kuyu mahfaza tipini belirleyin: kuyu TAM kapalı değilse (kısmi mahfaza) asansör Kategori 1''dir. Kategori 1 ise mahfaza yüksekliğinin en az 5,0 m olduğunu ölçün. Kuyu tam mahfazalıysa asansör Kategori 2''dir; bu maddeyi "Uygulanmaz" işaretleyip MAD-0848''i değerlendirin.'
where madde_id = 'MAD-0847';

update public.madde_kutuphanesi
set denetci_yonlendirmesi = 'Önce asansörün kuyu mahfaza tipini belirleyin: kuyu TAM kapalıysa asansör Kategori 2''dir. Kategori 2 ise kuyunun tam mahfazalı olduğunu gözle kontrol edin. Kuyu kısmi mahfazalıysa asansör Kategori 1''dir; bu maddeyi "Uygulanmaz" işaretleyip MAD-0847''yi değerlendirin.'
where madde_id = 'MAD-0848';

update public.madde_kutuphanesi
set aranmaz_kosulu = 'Asansör Kategori 2 (kuyusu tam mahfazalı) ise bu madde uygulanmaz. Kategori, MAD-0847/MAD-0848 ile belirlenir.'
where madde_id in ('MAD-0872','MAD-0878');

update public.madde_kutuphanesi
set aranmaz_kosulu = 'Asansör Kategori 1 (kuyusu kısmi mahfazalı) ise bu madde uygulanmaz. Kategori, MAD-0847/MAD-0848 ile belirlenir.'
where madde_id in ('MAD-0855','MAD-0859','MAD-0863','MAD-0864','MAD-0865','MAD-0866','MAD-0873','MAD-0876','MAD-0877','MAD-0879','MAD-0881');

update public.kutuphane_bolum_surumleri
set surum = surum + 1, updated_at = now()
where bolum in ('01 - Kuyu Dibi', '02 - Kuyu Boyunca', '03 - Kabin ve Kabin Üstü', '05 - Elektrik ve Test');

commit;

-- Salt okunur doğrulama.
select madde_id, kontrol_basligi, aranmaz_kosulu
from public.madde_kutuphanesi
where madde_id in (
  'MAD-0847','MAD-0848','MAD-0855','MAD-0859','MAD-0863','MAD-0864','MAD-0865',
  'MAD-0866','MAD-0872','MAD-0873','MAD-0876','MAD-0877','MAD-0878','MAD-0879','MAD-0881'
)
order by madde_id;
