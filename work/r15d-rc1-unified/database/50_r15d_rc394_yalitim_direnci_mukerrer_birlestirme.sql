-- AVES Saha R15D-rc3.9.4
-- MAD-0548 ve MAD-0549 aynı fiziksel testi (500 V yalıtım direnci ölçümü,
-- gerilim taşıyan iletken ile toprak arası) iki farklı standart referansından
-- (ÜB.FR.38 ana gövde 5.10.1.3.1 ve Ek-I 1.1) tarif ediyor.
--
-- İKİSİ DE AKTİF KALIYOR: form-output-manifest.json'a göre resmi PDF
-- çıktısında bu iki madde AYRI SAYFALARDA (29 ve 30) AYRI kutulara karşılık
-- geliyor; birini pasifleştirmek resmi formda bir kutunun sürekli boş
-- kalmasına yol açardı. Bu migration yalnız iki maddenin denetci_yonlendirmesi
-- metnini netleştirir ve MAD-0548'e MAD-0549'daki doğru ölçü birimi/eşik
-- bilgisini ekler; denetçi aynı ölçümü iki kez yaptığını bilerek girer.
--
-- Bilinen ayrı konu (bu migration'ın kapsamı dışında): form-output-manifest.json
-- içinde MAD-0548 ve MAD-0549, DOCX çıktısında AYNI hücreye (tablo 11,
-- satır 310) eşlenmiş durumda; Word çıktısında biri diğerini sessizce eziyor.
-- Bu, form-output-manifest.json'ın yeniden üretilmesini gerektiren ayrı bir
-- düzeltme konusu olarak takip edilmelidir.
--
-- Veri silmez; başlamış denetimlerin saha_kontrol snapshot satırlarına dokunmaz.

begin;

do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.madde_kutuphanesi where madde_id in ('MAD-0548','MAD-0549') and aktif is true;
  if v_count <> 2 then
    raise exception 'Beklenen MAD-0548/MAD-0549 aktif kayıtları bulunamadı';
  end if;
end
$$;

update public.madde_kutuphanesi
set olcu1_birimi = 'MΩ',
    esik_deger = 0.5,
    esik_operator = '>=',
    denetci_yonlendirmesi = 'Gerilim taşıyan her iletken ile toprak arasındaki yalıtım direncini 500 V test voltajıyla ölçün; geçerli devrede ve güvenlik ekipmanlarında değerin 0,5 MΩ''u aştığını doğrulayın. (Bu ölçüm ÜB.FR.38 formunda hem ana madde 5.10.1.3.1 hem Ek-I 1.1 satırında ayrı ayrı istenir; aynı ölçüm değerini her iki maddede de girin.)'
where madde_id = 'MAD-0548';

update public.madde_kutuphanesi
set denetci_yonlendirmesi = 'Gerilim taşıyan her iletken ile toprak arasındaki yalıtım direncini 500 V test voltajıyla ölçün; geçerli devrede ve güvenlik ekipmanlarında değerin 0,5 MΩ''u aştığını doğrulayın. (Bu ölçüm ÜB.FR.38 formunda hem ana madde 5.10.1.3.1 hem Ek-I 1.1 satırında ayrı ayrı istenir; aynı ölçüm değerini her iki maddede de girin.)'
where madde_id = 'MAD-0549';

update public.kutuphane_bolum_surumleri
set surum = surum + 1, updated_at = now()
where bolum = '05 - Elektrik ve Test';

commit;

-- Salt okunur doğrulama.
select madde_id, aktif, olcu1_birimi, esik_deger, esik_operator
from public.madde_kutuphanesi
where madde_id in ('MAD-0548','MAD-0549')
order by madde_id;
