-- AVES Saha R15D-rc2
-- Akış ve içerik düzeltmeleri. Checklist cevaplarını veya denetimleri değiştirmez.
begin;

do $$
declare
  bulunan integer;
begin
  select count(*) into bulunan
  from public.madde_kutuphanesi
  where madde_id in (
    'MAD-0021','MAD-0036','MAD-0037','MAD-0041','MAD-0057',
    'MAD-0060','MAD-0076','MAD-0077','MAD-0080'
  );
  if bulunan <> 9 then
    raise exception 'R15D-rc2 hedef madde kontrolü başarısız: 9 yerine % madde bulundu', bulunan;
  end if;
end $$;

-- Sonuç uygunluğuna ait koşul, madde/rehber metninde tekrarlanmaz.
update public.madde_kutuphanesi
set denetci_yonlendirmesi = btrim(
  regexp_replace(
    regexp_replace(denetci_yonlendirmesi, '\s+(Aranmaz|Uygulanmaz)\s*:.*$', '', 'i'),
    '^\s*Kontrol\s*:\s*', '', 'i'
  )
)
where denetci_yonlendirmesi is not null
  and (
    denetci_yonlendirmesi ~* '^\s*Kontrol\s*:'
    or denetci_yonlendirmesi ~* '\s+(Aranmaz|Uygulanmaz)\s*:'
  );

-- Koşulu cümle içinde taşıyan dört eski rehberin kontrollü temizliği.
update public.madde_kutuphanesi
set denetci_yonlendirmesi = 'Ayırıcı bölme delikliyse açıklığın biçimini ve en büyük ölçüsünü belirleyin; açıklık ile hareketli parça arasındaki en kısa mesafeyi ölçün. Sonucu uygulamadaki TS EN ISO 13857 Çizelge 4 görseliyle karşılaştırın.'
where madde_id = 'MAD-0049';

update public.madde_kutuphanesi
set denetci_yonlendirmesi = 'Karşı ağırlık veya dengeleme ağırlığı kullanılmışsa bunun kabinle aynı kuyu içinde bulunduğunu doğrulayın.'
where madde_id = 'MAD-0200';

update public.madde_kutuphanesi
set denetci_yonlendirmesi = 'Makara dairesi bulunuyorsa erişim kapısının net yüksekliği en az 1400 mm, net genişliği en az 600 mm olmalıdır.'
where madde_id = 'MAD-0635';

-- Tip 3 / Tip 4 merdiven ayırt etme şeması.
update public.madde_kutuphanesi
set denetci_yonlendirmesi = 'Tip 3 hareketli merdiven tek parça hâlinde kullanım konumuna taşınır; Tip 4 katlanabilir merdiven menteşeli gövdesi açılarak kullanım konumuna getirilir. Her iki tipte de merdiven kütlesi, durak eşiğinden güvenli biçimde elle taşınabilmesi için 15 kg’ı aşmamalıdır.',
    gorsel_referansi = 'G-PIT-LADDER-TYPE3-4 — Tip 3 hareketli ve Tip 4 katlanabilir merdiven ayırt etme şeması'
where madde_id = 'MAD-0021';

-- Kuyu dibi 33: ham standart cümlesi saha kontrolüne dönüştürülür.
update public.madde_kutuphanesi
set kontrol_basligi = 'Muayene kumandasında YUKARI ve AŞAĞI yön butonları',
    resmi_madde_metni = 'Yön butonları açıkça işaretlenmiş ve kazara çalıştırılmaya karşı korunmuş olmalıdır. YUKARI butonu beyaz zemin üzerinde siyah; AŞAĞI butonu siyah zemin üzerinde beyaz yön sembolü taşımalıdır.',
    denetci_yonlendirmesi = 'Her iki yön butonuna ayrı ayrı basın. Kabinin seçilen yönde hareket ettiğini, yön işaretleri ile renk düzeninin doğru olduğunu ve istem dışı basmaya karşı koruma bulunduğunu doğrulayın.'
where madde_id = 'MAD-0036';

-- Kuyu dibi 34: “bir durdurma aygıtı” ifadesi işlevsel kontrole dönüştürülür.
update public.madde_kutuphanesi
set kontrol_basligi = 'Muayene kumandasının durdurma aygıtı',
    resmi_madde_metni = 'Muayene kumanda istasyonunda bir durdurma aygıtı bulunmalıdır.',
    denetci_yonlendirmesi = 'Durdurma aygıtını çalıştırın; kabin hareketinin engellendiğini ve aygıt normal konumuna alınmadan hareketin yeniden başlayamadığını doğrulayın.'
where madde_id = 'MAD-0037';

-- Kuyu dibi 38: gereklilik ve saha rehberi birbirini tekrar etmez.
update public.madde_kutuphanesi
set denetci_yonlendirmesi = 'Prizin koruma iletkeni/toprak bağlantısını, fiziksel durumunu ve kuyu dibinden güvenli biçimde kullanılabilirliğini kontrol edin.'
where madde_id = 'MAD-0041';

-- Kuyu dibi 54: %90 sıkışma ifadesi ölçülebilir hâle getirilir.
update public.madde_kutuphanesi
set kontrol_basligi = 'Doğrusal olmayan tamponda %90 sıkışma referansı',
    denetci_yonlendirmesi = 'Doğrusal olmayan enerji biriktiren tamponda tam sıkışmış konum, sabitleme parçaları hariç ilk montaj yüksekliğinin %10’una kalan yüksekliktir; başka deyişle tampon %90 sıkışmıştır. İlk montaj yüksekliğini ve deneyde ulaşılan en düşük yüksekliği kaydedin; sonucu bu referansa göre değerlendirin.'
where madde_id = 'MAD-0057';

-- Kuyu dibi 57: uygulamanın fotoğraf saklamadığına ilişkin gereksiz son cümle kaldırılır.
update public.madde_kutuphanesi
set denetci_yonlendirmesi = 'Doğrusal özellikli tamponlar dışındaki tamponlarda bilgi plakası bulunmalıdır. Plakada imalatçı adı, tip inceleme belgesi numarası ve tampon tipi; hidrolik tamponda ayrıca akışkanın tipi ve tanımı yer almalıdır. Etiket ile teknik belgedeki ürün tanımını karşılaştırın.'
where madde_id = 'MAD-0060';

-- Sığınma alanı: el çizimi yerine kaynak standart tablosu gösterilir.
update public.madde_kutuphanesi
set denetci_yonlendirmesi = 'Kuyu dibi girişinden okunabilen işarette izin verilen kişi sayısı ile sığınma alanı tipi açıkça belirtilmelidir. İşaretteki bilgileri sahadaki sığınma alanlarının sayısı ve tipiyle karşılaştırın.'
where madde_id = 'MAD-0076';

update public.madde_kutuphanesi
set denetci_yonlendirmesi = 'Kabin en alt konumdayken kuyu dibi zemininde, gerekli her kişi için birbiriyle çakışmayan ve aynı tipte net sığınma alanı bulunmalıdır. Seçilen tipi TS EN 81-20 Çizelge 4 kaynak görselinden doğrulayın ve alanın net genişlik, derinlik ve yüksekliğini kaydedin.',
    gorsel_referansi = 'G-PIT-REFUGE-TABLE4 — TS EN 81-20 Çizelge 4 kaynak tablosu'
where madde_id = 'MAD-0077';

-- Kuyu dibi 77: istisnanın ne zaman ve nasıl kullanılacağı açıklaştırılır.
update public.madde_kutuphanesi
set kontrol_basligi = 'Kabin eteği/kapı altındaki 100 mm açıklık istisnası',
    denetci_yonlendirmesi = 'Bu madde yalnız kabin eteği veya düşey sürgülü kabin kapısı, bitişik kuyu duvarına yatayda en fazla 150 mm uzaktaysa değerlendirilir. Bu durumda parçanın altı ile kuyu dibi zemini arasındaki serbest düşey açıklık en az 100 mm olmalıdır. Yatay mesafe 150 mm’yi aşıyorsa bu istisnayı kullanmayın; genel 500 mm açıklık şartını uygulayın.',
    aranmaz_kosulu = 'Kabin eteği veya düşey sürgülü kabin kapısı bu istisna bölgesinde bulunmuyorsa.'
where madde_id = 'MAD-0080';

-- Bütün kütüphane: resmî gerekliliği aynen tekrar eden rehber ayrı bir
-- kontrol bilgisi değildir. Yalnız birebir eşleşen metinler temizlenir;
-- farklı bir saha yönlendirmesi taşıyan hiçbir satıra dokunulmaz.
update public.madde_kutuphanesi
set denetci_yonlendirmesi = null
where resmi_madde_metni is not null
  and denetci_yonlendirmesi is not null
  and btrim(regexp_replace(denetci_yonlendirmesi, '^\s*Kontrol\s*:\s*', '', 'i')) = btrim(resmi_madde_metni);

update public.madde_kutuphanesi
set denetci_yonlendirmesi = null
where denetci_yonlendirmesi is not null
  and btrim(denetci_yonlendirmesi) = '';

-- MAD-0038'de yalnız parantez boşluğu farklıdır; içerik yine resmî metnin
-- aynısıdır ve uygulamadaki normalleştirilmiş karşılaştırmayla da tekrardır.
update public.madde_kutuphanesi
set denetci_yonlendirmesi = null
where madde_id = 'MAD-0038'
  and resmi_madde_metni is not null;

-- Kaynak dönüşümünden kalan, neyin ve hangi birimle ölçüleceğini söylemeyen
-- genel alanlar yeni denetimlerde gösterilmez. Eşiği veya birimi olan gerçek
-- ölçüm tanımları bu temizlik kapsamına girmez.
update public.madde_kutuphanesi
set olcu1_adi = null
where lower(btrim(coalesce(olcu1_adi, ''))) = lower('Ölçülen değer')
  and nullif(btrim(coalesce(olcu1_birimi, '')), '') is null
  and esik_deger is null
  and esik_operator is null
  and coalesce(jsonb_array_length(olcum_tanimlari), 0) = 0;

-- Eşiği bulunan eski ölçüm satırlarında genel "Ölçülen değer" etiketi yerine
-- sahada ölçülecek büyüklük ve birim açıkça belirtilir.
update public.madde_kutuphanesi as m
set olcu1_adi = v.etiket,
    olcu1_birimi = v.birim
from (values
  ('MAD-0103','Kabin altı serbest düşey mesafe','m'),
  ('MAD-0104','Sabit parçalar ile kabin altı arasındaki düşey mesafe','m'),
  ('MAD-0105','Beyan hızı','m/s'),
  ('MAD-0234','Kuyu havalandırma açıklığı alanı','m²'),
  ('MAD-0242','İletken kesit alanı','mm²'),
  ('MAD-0244','Etek sacının giriş dışına yanal taşması','cm'),
  ('MAD-0245','Kilit açılma bölgesinin en büyük düşey sapması','m'),
  ('MAD-0358','Kabin üstü net çalışma alanı','m²'),
  ('MAD-0458','Hareket güzergâhı serbest yüksekliği','m'),
  ('MAD-0460','Pano önü net derinliği','m'),
  ('MAD-0461','Geçiş yolunun net genişliği','m'),
  ('MAD-0462','Serbest çalışma alanı genişliği','m'),
  ('MAD-0464','Yatay açıklıktaki engelleyici çıkıntı yüksekliği','mm'),
  ('MAD-0488','Dönen parçaların üstündeki serbest yükseklik','m'),
  ('MAD-0508','Pano önü net derinliği','m'),
  ('MAD-0511','Çalışma alanları arasındaki serbest yükseklik','m'),
  ('MAD-0513','Serbest çalışma alanı genişliği','m'),
  ('MAD-0514','Korumasız dönen parça üstü serbest mesafe','m'),
  ('MAD-0516','Çalışma alanı erişim kapısı net genişliği','m'),
  ('MAD-0687','Kuyu tavanı ile piston arasındaki düşey mesafe','m'),
  ('MAD-0740','Priz/lamba ile izin verilen su seviyesi arasındaki mesafe','m'),
  ('MAD-0936','Net giriş açıklığı genişliği','mm'),
  ('MAD-0992','Panel tarafındaki kullanılabilir el tutamağı uzunluğu','mm')
) as v(madde_id, etiket, birim)
where m.madde_id = v.madde_id;

update public.madde_kutuphanesi
set olcu2_adi = 'Çalışma alanının en küçük kenarı', olcu2_birimi = 'm'
where madde_id = 'MAD-0358';

update public.madde_kutuphanesi
set olcu2_adi = 'Pano önü net genişliği', olcu2_birimi = 'm'
where madde_id in ('MAD-0460','MAD-0508');

update public.madde_kutuphanesi
set olcu2_adi = 'Serbest çalışma alanı derinliği', olcu2_birimi = 'm'
where madde_id in ('MAD-0462','MAD-0513');

update public.madde_kutuphanesi
set olcu2_adi = 'Çalışma alanı erişim kapısı net yüksekliği', olcu2_birimi = 'm'
where madde_id = 'MAD-0516';

-- Eski form aktarımında adı korunup birimi kaybolmuş açık sayısal alanlar.
update public.madde_kutuphanesi as m
set olcu1_birimi = v.birim1,
    olcu2_birimi = case when v.birim2 is not null then v.birim2 else m.olcu2_birimi end
from (values
  ('MAD-0098','m',null),
  ('MAD-0106','cm',null),
  ('MAD-0214','lüks',null),
  ('MAD-0221','mm',null),
  ('MAD-0222','mm',null),
  ('MAD-0223','mm',null),
  ('MAD-0226','N',null),
  ('MAD-0229','m',null),
  ('MAD-0241','lüks',null),
  ('MAD-0246','mm',null),
  ('MAD-0258','m','m'),
  ('MAD-0319','lüks',null),
  ('MAD-0324','m',null),
  ('MAD-0326','m',null),
  ('MAD-0355','m',null),
  ('MAD-0357','m','m'),
  ('MAD-0364','adet',null),
  ('MAD-0459','m',null),
  ('MAD-0470','lüks',null),
  ('MAD-0489','mm','adet'),
  ('MAD-0490','oran',null),
  ('MAD-0496','oran',null),
  ('MAD-0501','lüks',null),
  ('MAD-0506','lüks',null),
  ('MAD-0512','m',null),
  ('MAD-0681','MΩ',null),
  ('MAD-0714','m','m'),
  ('MAD-0723','dB(A)',null),
  ('MAD-0726','mm','mm'),
  ('MAD-0727','mm','mm'),
  ('MAD-0728','mm',null),
  ('MAD-0751','N',null),
  ('MAD-0782','dB(A)',null),
  ('MAD-0847','m',null),
  ('MAD-0857','dB(A)',null),
  ('MAD-0880','lüks',null),
  ('MAD-0882','dB(A)',null),
  ('MAD-0889','m','m'),
  ('MAD-0953','dB(A)',null),
  ('MAD-0958','dB(A)',null),
  ('MAD-0959','dB(A)',null),
  ('MAD-0980','s',null),
  ('MAD-0999','lüks',null)
) as v(madde_id, birim1, birim2)
where m.madde_id = v.madde_id;

-- Saha ölçümü olmayan laboratuvar/dayanım hükümlerinde anlamsız sayısal kutu
-- gösterilmez; uygunluk yine görsel, belge ve ilgili deney kaydıyla değerlendirilir.
update public.madde_kutuphanesi
set olcu1_adi = null,
    olcu1_birimi = null
where madde_id in ('MAD-0845','MAD-0850','MAD-0853','MAD-0881');

-- Sayı olmayan eski alanlar doğru giriş türüne dönüştürülür.
update public.madde_kutuphanesi
set olcum_tanimlari = jsonb_build_array(
      jsonb_build_object(
        'id','kabin_tipi','tur','secim','birim',null,'etiket','Kabin tipi',
        'secenekler',jsonb_build_array('Tip 1','Tip 2','Tip 3','Tip 4','Tip 5'),
        'referans_metni','Sahadaki kabin tipini seçin; uygunluk değerlendirmesi madde metnindeki tipe göre yapılır.'
      )
    ),
    olcu1_adi = null,
    olcu1_birimi = null
where madde_id in ('MAD-0929','MAD-0997');

update public.madde_kutuphanesi
set olcu1_adi = null,
    olcu1_birimi = null
where madde_id in ('MAD-0961','MAD-0962','MAD-0964');

-- Birden fazla büyüklüğü tek kutuda birleştiren son dokuz eski alan,
-- ayrı ve birimli saha kayıtlarına dönüştürülür.
update public.madde_kutuphanesi
set olcum_tanimlari = case madde_id
  when 'MAD-0101' then '[
    {"id":"sig_ince_kenar","tur":"sayi","birim":"m","etiket":"Sığınma bloğu ince kenarı","referans_metni":"En az 0,50 m"},
    {"id":"sig_orta_kenar","tur":"sayi","birim":"m","etiket":"Sığınma bloğu orta kenarı","referans_metni":"En az 0,60 m"},
    {"id":"sig_uzun_kenar","tur":"sayi","birim":"m","etiket":"Sığınma bloğu uzun kenarı","referans_metni":"En az 1,00 m"}
  ]'::jsonb
  when 'MAD-0220' then '[
    {"id":"pencere_kalinligi","tur":"sayi","birim":"mm","etiket":"Pencere kalınlığı","referans_metni":"En az 6 mm"},
    {"id":"pencere_toplam_alani","tur":"sayi","birim":"m²","etiket":"Durak kapısındaki toplam pencere alanı","referans_metni":"En az 0,015 m²"},
    {"id":"tek_pencere_alani","tur":"sayi","birim":"m²","etiket":"Her bir pencerenin alanı","referans_metni":"En az 0,01 m²"},
    {"id":"pencere_genisligi","tur":"sayi","birim":"mm","etiket":"Pencere genişliği","referans_metni":"60 mm ile 150 mm arasında"},
    {"id":"pencere_alt_kenar_yuksekligi","tur":"sayi","birim":"m","etiket":"Pencere alt kenarının döşemeden yüksekliği","referans_metni":"Pencere genişliği 80 mm’den fazlaysa en az 1 m"}
  ]'::jsonb
  when 'MAD-0228' then '[
    {"id":"kapi_yangin_sinifi","tur":"secim","birim":null,"etiket":"Kapı yangına dayanım sınıfı","secenekler":["E30","E60"],"referans_metni":"Sınıfı ürün etiketi veya uygunluk belgesinden doğrulayın."},
    {"id":"yapi_yuksekligi","tur":"sayi","birim":"m","etiket":"Yapı yüksekliği","referans_metni":"51,5 m sınırına göre gerekli kapı sınıfını madde metninden değerlendirin."}
  ]'::jsonb
  when 'MAD-0238' then '[
    {"id":"ust_sig_genislik","tur":"sayi","birim":"m","etiket":"Üst sığınma alanı genişliği","referans_metni":"En az 0,50 m"},
    {"id":"ust_sig_derinlik","tur":"sayi","birim":"m","etiket":"Üst sığınma alanı derinliği","referans_metni":"En az 0,60 m"},
    {"id":"ust_sig_yukseklik","tur":"sayi","birim":"m","etiket":"Üst sığınma alanı yüksekliği","referans_metni":"En az 0,80 m"},
    {"id":"halat_merkez_mesafesi","tur":"sayi","birim":"m","etiket":"Halat merkezinin blok yüzeyine mesafesi","referans_metni":"Halat bu alandaysa en fazla 0,15 m"}
  ]'::jsonb
  when 'MAD-0729' then '[
    {"id":"itfaiyeci_hareket_mesafesi","tur":"sayi","birim":"m","etiket":"İtfaiye erişim seviyesi ile en üst durak arası hareket mesafesi","referans_metni":"200 m üzerindeki ilave mesafe süre hesabında kullanılır."},
    {"id":"itfaiyeci_ulasma_suresi","tur":"sayi","birim":"s","etiket":"Kapıların kapanmasından en üst durağa ulaşma süresi","referans_metni":"Temel sınır 60 s; 200 m üzerindeki her 3 m için 1 s eklenebilir."}
  ]'::jsonb
  when 'MAD-0748' then '[
    {"id":"imdat_gecis_genisligi","tur":"sayi","birim":"m","etiket":"İmdat geçiş kapısı net genişliği","referans_metni":"Genel durumda en az 0,50 m; 630 kg kabinde en az 0,40 m"},
    {"id":"imdat_gecis_derinligi","tur":"sayi","birim":"m","etiket":"İmdat geçiş kapısı net uzunluğu","referans_metni":"Genel durumda en az 0,70 m; 630 kg kabinde en az 0,50 m"}
  ]'::jsonb
  when 'MAD-0757' then '[
    {"id":"kurtarma_merdiveni_boyu","tur":"sayi","birim":"m","etiket":"Kurtarma merdiveni boyu","referans_metni":"Kabin yüksekliğinden en az 1 m uzun olmalı"},
    {"id":"kabin_yuksekligi","tur":"sayi","birim":"m","etiket":"Kabin yüksekliği","referans_metni":"Merdiven boyu karşılaştırması için kaydedilir."}
  ]'::jsonb
  when 'MAD-0769' then '[
    {"id":"itfaiyeci_anahtar_yuksekligi","tur":"sayi","birim":"m","etiket":"İtfaiyeci anahtarının zemin seviyesinden yüksekliği","referans_metni":"1,40 m ile 2,00 m arasında"},
    {"id":"itfaiyeci_anahtar_yatay_mesafe","tur":"sayi","birim":"m","etiket":"Anahtarın asansöre yatay mesafesi","referans_metni":"En fazla 2,00 m"}
  ]'::jsonb
  when 'MAD-0851' then '[
    {"id":"havalandirma_acikligi_genislik","tur":"sayi","birim":"mm","etiket":"Havalandırma açıklığı genişliği","referans_metni":"En fazla 250 mm"},
    {"id":"havalandirma_acikligi_yukseklik","tur":"sayi","birim":"mm","etiket":"Havalandırma açıklığı yüksekliği","referans_metni":"En fazla 250 mm"}
  ]'::jsonb
end,
olcu1_adi = null,
olcu1_birimi = null,
olcu2_adi = null,
olcu2_birimi = null
where madde_id in ('MAD-0101','MAD-0220','MAD-0228','MAD-0238','MAD-0729','MAD-0748','MAD-0757','MAD-0769','MAD-0851');

-- Belirsiz iki genel madde saha eylemine dönüştürülür.
update public.madde_kutuphanesi
set kontrol_basligi = 'Kuyuda asansöre ait olmayan teçhizat',
    denetci_yonlendirmesi = 'Kuyuyu kuyu dibi, seyir hattı ve kuyu üstü boyunca gözle inceleyin. Asansörün çalışması veya güvenliğiyle ilgisi olmayan boru, kablo, kanal, cihaz ya da başka bir tesisat bulunup bulunmadığını kaydedin.'
where madde_id = 'MAD-0251';

update public.madde_kutuphanesi
set denetci_yonlendirmesi = 'Denetimi tamamlamadan önce ölçüm gerektiren maddeleri tarayın. Zorunlu ölçüm alanlarında değer, ölçüm türü veya birim eksikse ilgili maddeye dönerek kaydı tamamlayın.'
where madde_id = 'MAD-1007';

-- Form açıklaması, bölüm başlığı veya sözlük satırı kontrol sonucu bekleyen
-- bir checklist maddesi değildir. Kayıtlar ve tarihsel cevaplar korunur;
-- yalnız yeni denetimlere alınmaları durdurulur.
update public.madde_kutuphanesi
set aktif = false
where madde_id in (
  'MAD-0232','MAD-0252','MAD-0257','MAD-0262','MAD-0499','MAD-0517',
  'MAD-0682','MAD-0712','MAD-0736','MAD-0747','MAD-0791','MAD-0809',
  'MAD-0817','MAD-0825','MAD-0826','MAD-0841','MAD-0842','MAD-0843',
  'MAD-0844','MAD-0887','MAD-0888','MAD-0922','MAD-0946','MAD-1004'
);

-- TS EN 81-72 5.8.9.1 ve 5.8.9.2 aynı görünen kontrolleri farklı güvenli
-- alan yerleşimleri için ayrı ayrı ister. MAD-0824 gerçek bir mükerrer değil,
-- 5.8.9.2 c) 4) dalıdır; koşulu açıklaştırılarak geri alınır.
update public.madde_kutuphanesi
set aktif = true,
    kontrol_basligi = 'Güvenli alanlar farklı taraflarda: diğer kumanda panelleri',
    aranmaz_kosulu = 'Çift girişli kabinde güvenli alanlar itfaiye erişim seviyesiyle aynı taraftaysa veya birden çok kabin kumanda panosu yoksa.'
where madde_id = 'MAD-0824';

update public.madde_kutuphanesi
set kontrol_basligi = 'Güvenli alanlar aynı tarafta: tek panelde iki kapı açma düğmesi',
    aranmaz_kosulu = 'Çift girişli kabinde güvenli alanlar itfaiye erişim seviyesiyle aynı tarafta değilse veya yalnız bir kabin kumanda panosu yoksa.'
where madde_id = 'MAD-0810';

update public.madde_kutuphanesi
set kontrol_basligi = 'Güvenli alanlar farklı taraflarda: tek panelde iki kapı açma düğmesi',
    aranmaz_kosulu = 'Çift girişli kabinde güvenli alanlar itfaiye erişim seviyesiyle aynı taraftaysa veya yalnız bir kabin kumanda panosu yoksa.'
where madde_id = 'MAD-0818';

update public.madde_kutuphanesi
set kontrol_basligi = 'Güvenli alanlar aynı tarafta: diğer kumanda panelleri',
    aranmaz_kosulu = 'Çift girişli kabinde güvenli alanlar itfaiye erişim seviyesiyle aynı tarafta değilse veya birden çok kabin kumanda panosu yoksa.'
where madde_id = 'MAD-0814';

update public.madde_kutuphanesi
set kontrol_basligi = 'Güvenli alanlar aynı tarafta: diğer taraftaki kapıların kilitlenmesi',
    aranmaz_kosulu = 'Çift girişli kabinde güvenli alanlar itfaiye erişim seviyesiyle aynı tarafta değilse veya birden çok kabin kumanda panosu yoksa.'
where madde_id = 'MAD-0816';

-- Cihazlar kütüphane değişikliğini kesin olarak algılasın.
update public.kutuphane_bolum_surumleri
set surum = 3,
    updated_at = now()
where surum < 3;

commit;

-- Salt okunur kurulum kontrolleri.
select madde_id, kontrol_basligi, gorsel_referansi
from public.madde_kutuphanesi
where madde_id in ('MAD-0021','MAD-0036','MAD-0037','MAD-0041','MAD-0057','MAD-0060','MAD-0076','MAD-0077','MAD-0080')
order by madde_id;

select count(*) as rehberde_tekrarlanan_uygulanmaz_kosulu
from public.madde_kutuphanesi
where denetci_yonlendirmesi ~* '\s+(Aranmaz|Uygulanmaz)\s*:';
