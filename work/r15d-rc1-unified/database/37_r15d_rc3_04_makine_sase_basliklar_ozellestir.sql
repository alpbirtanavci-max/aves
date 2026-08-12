-- "04 - Makine ve Şase" bölümünde 81-1/2+A3 (ÜB.FR.39) kaynaklı, DOCX çıkarımından
-- kalıtsal genel "Makine/Makara Dairesi" başlığını taşıyan 10 satırın başlıkları
-- özelleştirildi. İçerik (resmi_madde_metni) zaten doğruydu; bunlar 81-20 (modern
-- standart) muadilleriyle aynı fiziksel gerekliliği eski standarda göre ayrıca
-- doğrulayan meşru paralel maddelerdir (MAD-0814/0824 emsaline benzer).
begin;

update public.madde_kutuphanesi set kontrol_basligi = 'Makine/makara dairesi topraklama sürekliliği (81-1/2+A3)' where madde_id = 'MAD-0456';
update public.madde_kutuphanesi set kontrol_basligi = 'Makine/makara dairesi pano önü açıklıkları (81-1/2+A3)' where madde_id = 'MAD-0460';
update public.madde_kutuphanesi set kontrol_basligi = 'Makine/makara dairesinde topraklı priz (81-1/2+A3)' where madde_id = 'MAD-0467';
update public.madde_kutuphanesi set kontrol_basligi = 'Makine/makara dairesinde güvenlik aksamı talimatları (81-1/2+A3)' where madde_id = 'MAD-0472';
update public.madde_kutuphanesi set kontrol_basligi = 'Makine/makara dairesinde devre şemaları ve kayıt defteri (81-1/2+A3)' where madde_id = 'MAD-0473';
update public.madde_kutuphanesi set kontrol_basligi = 'Makine/makara dairesi kuvvet panosu hata akımı koruması (81-1/2+A3)' where madde_id = 'MAD-0478';
update public.madde_kutuphanesi set kontrol_basligi = 'Makine/makara dairesi kumanda panosu hata akımı koruması (81-1/2+A3)' where madde_id = 'MAD-0481';
update public.madde_kutuphanesi set kontrol_basligi = 'Tahrik makinası yakınında durdurma tertibatı (81-1/2+A3)' where madde_id = 'MAD-0486';
update public.madde_kutuphanesi set kontrol_basligi = 'Tahrik makinasının gözlenmesi ve hareket göstergeleri (81-1/2+A3)' where madde_id = 'MAD-0492';
update public.madde_kutuphanesi set kontrol_basligi = 'Hız regülatörü devreye girme hızı ile asansör hızı uyumu (81-1/2+A3)' where madde_id = 'MAD-0495';

commit;
