-- AVES Saha R15D-rc3.9.4
-- Saha geri bildirimi #14/#15/#19: Tip 1-5 kabin tipi seçimi kabin bölümü
-- boyunca 3 farklı yerde (MAD-0923 grubu, MAD-0929, MAD-0997) ayrı ayrı
-- soruluyordu; ikisi (MAD-0929/MAD-0997) yalnız serbest metin/sayı kutusu
-- olarak "Kabin Tipi" yazdırıyordu, gerçek bir seçim değildi. Denetçi
-- kabinin tipini kaydetmiş olsa bile bunu hatırlayıp her yerde tekrar
-- girmek zorunda kalıyordu.
--
-- Bu migration TEK bir gerçek seçim noktası kurar:
-- - MAD-0923 (kabin bölümünün en başındaki madde) artık gerçek bir
--   "Kabin tipi" seçici (tur: secim) içeriyor; her seçeneğin metninde
--   asgari ölçüler ve kullanım amacı yazıyor (ekran görseli yerine açıklama
--   metni — kaynak: ÜB.FR.43 R.04, TS EN 81-70 madde 5.3.1).
-- - MAD-0924..MAD-0928 (Tip 1..5'e özel asgari boyut maddeleri) artık bu
--   seçime otomatik bağlı: seçilen tip dışındakiler otomatik "Uygulanmaz"
--   işaretlenir (uygulama zaten var olan otomatik_aranmaz_kurali +
--   paylasimli_anahtar mekanizmasını kullanır, yeni "icerir/icermez"
--   operatörü app.js'e eklendi).
-- - MAD-0929 ve MAD-0997'deki eski, gerçek olmayan "Kabin Tipi" serbest
--   metin kutusu kaldırıldı (olcu1_adi = null); rehber metni artık
--   MAD-0923'teki seçime atıfta bulunuyor.
-- - MAD-0936 (Serbest giriş açıklığı): eşik tipe göre değiştiği için
--   (Tip1: 800mm, Tip2-4: 900mm, Tip5: 1100mm) otomatik eşik değişmiyor;
--   denetci_yonlendirmesi bu üç değeri ve MAD-0923 referansını açıkça
--   yazıyor, denetçi doğru eşiği kendisi uygular.
--
-- Veri silmez; başlamış denetimlerin saha_kontrol snapshot satırlarına dokunmaz.

begin;

do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.madde_kutuphanesi
  where madde_id in ('MAD-0923','MAD-0924','MAD-0925','MAD-0926','MAD-0927','MAD-0928','MAD-0929','MAD-0936','MAD-0997')
    and aktif is true;
  if v_count <> 9 then
    raise exception 'Beklenen 9 aktif madde bulunamadı (% bulundu)', v_count;
  end if;
end
$$;

update public.madde_kutuphanesi
set kontrol_basligi = 'Kabin tipi seçimi',
    resmi_madde_metni = 'Kabin tipi, sayısı ve boyutları. Kabin genişliği: kabinin yapı duvarlarının iç yüzeyleri arasındaki, ön girişe paralel ölçülen yatay mesafe. Kabin derinliği: kabinin yapı duvarlarının iç yüzeyleri arasındaki, genişliğe dik ölçülen yatay mesafe.',
    denetci_yonlendirmesi = 'Bu bölümdeki tip-bağımlı maddeler (asgari boyutlar, geri hareket görüş desteği, el tutamağı, serbest giriş açıklığı vb.) burada seçtiğiniz kabin tipine göre değerlendirilir. Aşağıdan sahadaki kabinin tipini seçin: Tip 1 — genişlik 1000 mm, derinlik 1300 mm (450 kg); refakatsiz tekerlekli sandalye kullanıcısı; yalnız tip 2 kurulumuna imkân vermeyen mevcut binalarda. Tip 2 — genişlik 1100 mm, derinlik 1400 mm (630 kg); tekerlekli sandalye kullanıcısı + refakatçi; yeni binalarda asgari tip. Tip 3 — genişlik 1100 mm, derinlik 2100 mm (1000 kg); C sınıfı tekerlekli sandalye + sedye taşıma; kamusal alanlar. Tip 4 — genişlik 1600/derinlik 1400 mm veya genişlik 1400/derinlik 1600 mm (1000 kg); tekerlekli sandalyenin kabin içinde dönebildiği tip; bitişik duvarlı kapılarda asgari. Tip 5 — genişlik 2000/derinlik 1400 mm veya genişlik 1400/derinlik 2000 mm (1275 kg); tekerlekli sandalyenin döndüğü, birkaç yolcu daha alan en büyük tip.',
    olcum_tanimlari = '[{"id":"kabin_tipi_secimi","tur":"secim","etiket":"Kabin tipi","secenekler":["Tip 1","Tip 2","Tip 3","Tip 4","Tip 5"],"paylasimli_anahtar":"kabin_tipi_secimi","referans_metni":"Bu bölümdeki diğer tip-bağımlı maddeler bu seçime göre otomatik değerlendirilir."}]'::jsonb
where madde_id = 'MAD-0923';

update public.madde_kutuphanesi set otomatik_aranmaz_kurali = '{"paylasimli_anahtar":"kabin_tipi_secimi","operator":"icermez","deger":"Tip 1"}'::jsonb where madde_id = 'MAD-0924';
update public.madde_kutuphanesi set otomatik_aranmaz_kurali = '{"paylasimli_anahtar":"kabin_tipi_secimi","operator":"icermez","deger":"Tip 2"}'::jsonb where madde_id = 'MAD-0925';
update public.madde_kutuphanesi set otomatik_aranmaz_kurali = '{"paylasimli_anahtar":"kabin_tipi_secimi","operator":"icermez","deger":"Tip 3"}'::jsonb where madde_id = 'MAD-0926';
update public.madde_kutuphanesi set otomatik_aranmaz_kurali = '{"paylasimli_anahtar":"kabin_tipi_secimi","operator":"icermez","deger":"Tip 4"}'::jsonb where madde_id = 'MAD-0927';
update public.madde_kutuphanesi set otomatik_aranmaz_kurali = '{"paylasimli_anahtar":"kabin_tipi_secimi","operator":"icermez","deger":"Tip 5"}'::jsonb where madde_id = 'MAD-0928';

-- MAD-0929/MAD-0997 canlıda halihazırda kendi başlarına serbest bir
-- "Kabin tipi" select alanı (olcum_tanimlari, id: kabin_tipi) taşıyordu —
-- dev JSON'daki eski legacy olcu1_adi kaydından farklı, sonradan canlıda
-- ayrıca eklenmiş bir alan. İkisi de kaldırılıp MAD-0923'e yönlendirildi.
update public.madde_kutuphanesi
set olcu1_adi = null, olcu1_birimi = null, olcum_tanimlari = '[]'::jsonb,
    denetci_yonlendirmesi = '1., 2. ve 3. tip kabinlerde geçerlidir (kabinin tipini bu bölümün başındaki "Kabin tipi seçimi" maddesinden görün). Geri geri giderken yolcuların arkalarındaki engelleri gözleyebilmeleri için bir aygıt (ör. ayna) kurulduğunu kontrol edin.'
where madde_id = 'MAD-0929';

update public.madde_kutuphanesi
set olcu1_adi = null, olcu1_birimi = null, olcum_tanimlari = '[]'::jsonb,
    denetci_yonlendirmesi = 'Kabinin tipini bu bölümün başındaki "Kabin tipi seçimi" maddesinden görün. Tip 1, 2 ve 3''te, giriş genişliği kısıtlanacaksa el tutamağı yalnız karşı yan duvara monte edilebilir. Tip 4 ve 5''te karşı yan duvara veya arka duvara ikinci bir el tutamağı monte edilmiş olmalıdır.'
where madde_id = 'MAD-0997';

update public.madde_kutuphanesi
set denetci_yonlendirmesi = 'Kabinin tipini bu bölümün başındaki "Kabin tipi seçimi" maddesinden görün. Asgari net açıklık genişliği tipe göre değişir: Tip 1 için 800 mm, Tip 2/3/4 için 900 mm, Tip 5 için 1100 mm (mevcut binalarda Tip 2 için asgari 800 mm kabul edilir). Uygulama yalnız 800 mm''lik ortak tabanı otomatik kontrol eder; Tip 2 ve üzerinde gerçek eşiğin 900/1100 mm olduğunu siz doğrulayın.'
where madde_id = 'MAD-0936';

update public.kutuphane_bolum_surumleri
set surum = surum + 1, updated_at = now()
where bolum = '03 - Kabin ve Kabin Üstü';

commit;

-- Salt okunur doğrulama.
select madde_id, kontrol_basligi, otomatik_aranmaz_kurali, olcu1_adi, jsonb_array_length(coalesce(olcum_tanimlari,'[]'::jsonb)) as olcum_sayisi
from public.madde_kutuphanesi
where madde_id in ('MAD-0923','MAD-0924','MAD-0925','MAD-0926','MAD-0927','MAD-0928','MAD-0929','MAD-0936','MAD-0997')
order by madde_id;
