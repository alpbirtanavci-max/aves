-- AVES Saha R15D-rc3.9.7
-- Saha geri bildirimi #2 (telefon offline denetim taraması, 130 ekran görüntüsü,
-- kullanıcı tarafından tek tek doğrulanmış). Bu migration yalnız kütüphaneyi
-- günceller; saha_kontrol snapshotlarını silmez/değiştirmez.
--
-- A) Uygulanmaz koşulu metni yanıltıcı bulunan 2 madde: metin kaldırıldı, buton kalır.
-- B) Rehber kutusu resmi madde metninin tekrarı/gereksiz olan madde grubu: rehber kaldırıldı.
-- C) Resmi madde metni bozuk/eksik yazılmış maddeler: düzgün cümle haline getirildi.
-- D) TS EN 81-70 (erişilebilirlik) tuş takımı/dokunmatik ekran/erişilebilirlik butonu/
--    büyük boy tuş takımı maddelerine, standardın (TS EN 81-70:2021) gerçek sayısal
--    kriterleri rehbere eklendi; resmi madde metni değiştirilmedi (form çıktısı bozulmasın).
-- E) 5.12.1.6.1 d: ekipman listesi madde madde alt alta yazılacak şekilde düzenlendi.
-- F) Hidrolik "Kontrol ve Testleri" başlık kümesindeki tek gerçek hata (MAD-0570) düzeltildi.

begin;

do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.madde_kutuphanesi
  where madde_id in (
    'MAD-0045','MAD-0048','MAD-0183','MAD-0190','MAD-0191','MAD-0195','MAD-0196',
    'MAD-0198','MAD-0199','MAD-0212','MAD-0276','MAD-0277','MAD-0278','MAD-0281',
    'MAD-0282','MAD-0283','MAD-0285','MAD-0286','MAD-0288','MAD-0290','MAD-0291',
    'MAD-0292','MAD-0293','MAD-0294','MAD-0295','MAD-0296','MAD-0297','MAD-0298',
    'MAD-0428','MAD-0433','MAD-0451','MAD-0541','MAD-0560','MAD-0570','MAD-0591',
    'MAD-0600','MAD-0616','MAD-0633','MAD-0640','MAD-0649','MAD-0656','MAD-0846',
    'MAD-0884','MAD-0181','MAD-0184','MAD-0201',
    'MAD-1000','MAD-1001','MAD-1002','MAD-1003'
  ) and aktif is true;
  if v_count <> 50 then
    raise exception 'Beklenen 50 aktif madde bulunamadı (% bulundu)', v_count;
  end if;
end
$$;

-- A) Uygulanmaz koşulu metni kaldırılıyor (buton dokunulmuyor)
update public.madde_kutuphanesi set aranmaz_kosulu = null where madde_id in ('MAD-0045','MAD-0048');

-- B) Rehber kaldırılıyor (resmi metnin tekrarı/gereksiz)
update public.madde_kutuphanesi set denetci_yonlendirmesi = null
where madde_id in (
  'MAD-0183','MAD-0190','MAD-0191','MAD-0195','MAD-0196','MAD-0198','MAD-0199','MAD-0212',
  'MAD-0276','MAD-0277','MAD-0278','MAD-0281','MAD-0282','MAD-0283','MAD-0285','MAD-0286',
  'MAD-0288','MAD-0292','MAD-0293','MAD-0294','MAD-0297','MAD-0298',
  'MAD-0428','MAD-0433','MAD-0541','MAD-0560','MAD-0640','MAD-0649','MAD-0656',
  'MAD-0846','MAD-0884',
  'MAD-0633','MAD-0600','MAD-0616'
);

-- B2) Rehber + Uygulanmaz koşulu birlikte kaldırılıyor
update public.madde_kutuphanesi set denetci_yonlendirmesi = null, aranmaz_kosulu = null
where madde_id in ('MAD-0290','MAD-0291','MAD-0295','MAD-0296');

-- C) Resmi madde metni düzgün cümle haline getiriliyor (rehber dokunulmuyor, zaten iyi)
update public.madde_kutuphanesi
set resmi_madde_metni = 'Durak kapıları, kilit açma bölgesinin dışında hem mekanik hem elektriksel olarak kapalı kalmalıdır.'
where madde_id = 'MAD-0181';

update public.madde_kutuphanesi
set resmi_madde_metni = 'Kapalı kapılar arasında kalan herhangi bir boşluğa 150 mm çapında bir topun yerleştirilememesi gerekir.'
where madde_id = 'MAD-0184';

update public.madde_kutuphanesi
set resmi_madde_metni = 'Kuyu duvarları, 0,3 m x 0,3 m''lik bir alana eşit dağıtılmış 1000 N''luk bir kuvvete, 1 mm''den fazla kalıcı ve 15 mm''den fazla elastik şekil bozukluğu olmaksızın dayanabilmelidir.'
where madde_id = 'MAD-0201';

update public.madde_kutuphanesi
set resmi_madde_metni = 'Kamuya açık işaret ve işaretlemeler, Ek E''de belirtilen araçlarla yerlerinden çıkarılamayacak şekilde tespit edilmelidir.'
where madde_id = 'MAD-0884';

-- D) TS EN 81-70:2021 (Mayıs 2021) kaynaklı gerçek sayısal kriterler rehbere eklendi.
update public.madde_kutuphanesi
set denetci_yonlendirmesi = 'TS EN 81-70''e göre: tuş takımı genişliği en fazla 120 mm, yüksekliği en fazla 160 mm olmalı; butonlar arası mesafe 5-15 mm. Rakamlar kabartma OLMAMALI (kazınmış olabilir); Braille kullanılmaz. Çıkış katı (yıldız) sembolü ve eksi işareti kabartma olmalı. ''5'' rakamlı butonda tek bir kabartma nokta bulunmalı (körler için dokunsal referans). Genel şartlar: aktif alan en az 490 mm² (~20 mm çap), çalıştırma kuvveti 2,5-5,0 N, sembol yüksekliği 15-40 mm kabartma. Bu ölçüleri ölçüp kaydedin.'
where madde_id = 'MAD-1000';

update public.madde_kutuphanesi
set denetci_yonlendirmesi = 'TS EN 81-70''e göre dokunmatik ekranlar koşullu izinlidir (standarda aykırı değildir): ekran en az 300 cd/m² parlaklık sağlamalı, dokunma alanları/semboller çevresiyle kontrastlı olmalı; sembol yüksekliği 15-40 mm, butonlar arası mesafe en az 5 mm. Ekranın yanında/altında bir erişilebilirlik butonu bulunmalı; bu butona basıldığında katların sırayla sesli anons edilip ikinci bir basışla seçilebildiğini test edin. Bu madde yalnız kabinde dokunmatik ekran varsa doldurulur.'
where madde_id = 'MAD-1001';

update public.madde_kutuphanesi
set denetci_yonlendirmesi = 'TS EN 81-70''e göre erişilebilirlik butonu: tuş takımı veya dokunmatik ekranın yanında, tercihen altında, uluslararası ''Engelliler için Erişim'' sembolüyle (ISO 4190-5 Tablo C.1 No.10) işaretli ayrı bir buton olmalıdır. Aktive edildiğinde sesli anons başlatmalı, çağrıyı uygun kabine yönlendirmeli veya kapının açık kalma süresini uzatmalıdır. Butonun varlığını, sembolünü ve yerden yüksekliğini ölçüp kaydedin; bu madde yalnız ayrı bir erişilebilirlik butonu varsa doldurulur.'
where madde_id = 'MAD-1002';

update public.madde_kutuphanesi
set denetci_yonlendirmesi = 'TS EN 81-70''e göre büyük boy tuş takımı (standart tuş takımına ek/alternatif, genelde az görüşlü/yaşlı yolcular için): buton aktif alanı en az 50x50 mm (veya 50 mm çap), sembol boyutu 25-40 mm. Kat butonları, dikeyle 30°±15° açılı, çıkıntısı en fazla 100 mm eğik bir panelde olmalı; en üst butonun merkezi yerden en fazla 1000 mm yükseklikte olmalı. Alarm/kapı butonları, kat butonları arası mesafenin en az iki katı kadar ayrık olmalı. Bu ölçüleri ölçüp kaydedin; bu madde yalnız böyle bir panel varsa doldurulur.'
where madde_id = 'MAD-1003';

-- E) Ekipman listesi madde madde alt alta yazılıyor (bkz. app CSS: .mrequirement artık
--    white-space:pre-wrap, satır sonları gerçekten görünür).
update public.madde_kutuphanesi
set denetci_yonlendirmesi = E'Acil durum elektrikli kurtarma anahtarı çalıştırıldığında yalnız şu güvenlik aygıtları devre dışı bırakılmalı:\n1) Pozitif tahrikli ve hidrolik asansörlerde halat/zincir gevşeklik kontrol aygıtları\n2) Kabin güvenlik tertibatına monte edilenler\n3) Hız regülatöründekiler\n4) Yukarı yönde aşırı hızlanmaya karşı koruma aygıtına monte edilenler\n5) Hidrolik tamponlara monte edilenler\n6) Sınır güvenlik kesicileri\n\nDiğer güvenlik devreleri etkin kalmalıdır.'
where madde_id = 'MAD-0451';

-- F) MAD-0570: içerik hidrolikle özel ilgili değil (kılavuz ray genel şartı), yanlış
--    "Hidrolik'e özel, bu asansör Elektrikli ise Uygulanmaz" kuralı kaldırıldı ve
--    doğru, özgü başlık yazıldı.
update public.madde_kutuphanesi
set kontrol_basligi = 'Kabin en üst konumunda kılavuz ray ilave hareket seyri',
    tahrik_kosulu = null
where madde_id = 'MAD-0570';

update public.kutuphane_bolum_surumleri set surum = surum + 1, updated_at = now();

commit;

-- Salt okunur doğrulama.
select madde_id, kontrol_basligi, denetci_yonlendirmesi is null as rehber_bos,
       aranmaz_kosulu, tahrik_kosulu
from public.madde_kutuphanesi
where madde_id in (
  'MAD-0045','MAD-0048','MAD-0181','MAD-0184','MAD-0201','MAD-0290','MAD-0451','MAD-0570',
  'MAD-1000','MAD-1001','MAD-1002','MAD-1003'
)
order by madde_id;
