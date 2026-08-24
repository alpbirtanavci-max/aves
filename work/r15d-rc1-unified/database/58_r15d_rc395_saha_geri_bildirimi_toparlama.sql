-- AVES Saha R15D-rc3.9.5
-- Saha geri bildirimlerinde doğrulanan kalan içerik düzeltmeleri.
-- Veri silmez; başlamış denetimlerin saha_kontrol snapshotlarına ve RLS'ye dokunmaz.

begin;

do $$
begin
  if to_regclass('public.madde_kutuphanesi') is null then
    raise exception 'public.madde_kutuphanesi bulunamadı';
  end if;
  if (select count(*) from public.madde_kutuphanesi where madde_id in
      ('MAD-0008F','MAD-0082','MAD-0209','MAD-0891','MAD-0897','MAD-0907','MAD-0909','MAD-0910','MAD-0911','MAD-0914','MAD-0915','MAD-0916','MAD-0917','MAD-0920')) <> 14 then
    raise exception 'R15D-rc3.9.5 hedef maddeleri eksik';
  end if;
end $$;

-- Uzun kuyu geometrisi sahada metre cinsinden kaydedilir; ölçüm kimlikleri değişmez.
update public.madde_kutuphanesi m
set olcum_tanimlari = (
  select jsonb_agg(
    case when item.value->>'id' in ('seyir_mesafesi','toplam_kuyu_yuksekligi','son_kat_yuksekligi','toplam_kuyu_ray_boyu')
      then jsonb_set(item.value, '{birim}', '"m"'::jsonb, true)
      else item.value end
    order by item.ordinality
  )
  from jsonb_array_elements(m.olcum_tanimlari) with ordinality as item(value, ordinality)
)
where m.madde_id = 'MAD-0008F';

update public.madde_kutuphanesi
set denetci_yonlendirmesi = 'Koruma eteğinin durak kapısı açıklığını tam genişlikte kapladığını ve alt pahın bulunduğunu gözle kontrol edin; yalnız alt pahın yatay izdüşümünü ölçün. Açı sahada ölçüm alanı olarak kaydedilmez.'
where madde_id = 'MAD-0082';

update public.madde_kutuphanesi
set resmi_madde_metni = 'Asansörün yanında, yangın sırasında asansörün kullanılmaması gerektiğini bildiren ve duraklardan kolayca görülebilen uygun bir uyarı işareti bulunmalıdır.'
where madde_id = 'MAD-0209';

with r(madde_id, kontrol_basligi, denetci_yonlendirmesi) as (values
('MAD-0891', null, '“Belirlenmiş sahanlık/durak”, yangın sinyali geldiğinde asansörün otomatik olarak geri çağrılacağı, projede önceden tanımlanmış yangın geri çağırma katıdır. Kumanda sisteminde bu yangın geri çağırma katına karşılık gelen giriş sinyalinin tanımlı olduğunu ve çağırma işlevinin bu kata yönlendiğini kontrol edin.'),
('MAD-0897', 'Yangın geri çağırma kumandasının yeri', '“Belirlenmiş sahanlık/durak”, yangın sinyali geldiğinde asansörün otomatik olarak geri çağrılacağı, projede önceden tanımlanmış yangın geri çağırma katıdır. Elle çağırma aygıtının bina yönetim merkezinde veya yangın geri çağırma katında bulunduğunu doğrulayın.'),
('MAD-0907', 'Durakta bekleyen asansörün yangın geri çağırma katına hareketi', '“Belirlenmiş sahanlık/durak”, yangın sinyali geldiğinde asansörün otomatik olarak geri çağrılacağı, projede önceden tanımlanmış yangın geri çağırma katıdır. Asansör başka bir durakta bekliyorsa kapılarının kapanıp ara duraklarda durmadan yangın geri çağırma katına gittiğini; kapılar kapanana kadar kabinde işitsel sinyal verildiğini test edin.'),
('MAD-0909', 'Elle/otomatik olmayan kapılı asansörün yangın geri çağırma davranışı', '“Belirlenmiş sahanlık/durak”, yangın sinyali geldiğinde asansörün otomatik olarak geri çağrılacağı, projede önceden tanımlanmış yangın geri çağırma katıdır. Elle çalıştırılan veya otomatik olmayan kapılı asansör, kapıları açıkken bulunduğu durakta hareketsiz kalmalıdır. Kapılar kapatıldıktan sonra ara duraklarda durmadan yangın geri çağırma katına gitmelidir; iki durumu ayrı ayrı test edin.'),
('MAD-0910', 'Ters yöndeki asansörün yangın geri çağırma katına dönüşü', '“Belirlenmiş sahanlık/durak”, yangın sinyali geldiğinde asansörün otomatik olarak geri çağrılacağı, projede önceden tanımlanmış yangın geri çağırma katıdır. Asansör yangın geri çağırma katının ters yönünde hareket ediyorsa en yakın uygun durakta kapı açmadan yön değiştirip geri çağırma katına döndüğünü test edin.'),
('MAD-0911', 'Yangın geri çağırma katına giderken ara durakların atlanması', '“Belirlenmiş sahanlık/durak”, yangın sinyali geldiğinde asansörün otomatik olarak geri çağrılacağı, projede önceden tanımlanmış yangın geri çağırma katıdır. Asansör yangın geri çağırma katına giderken ara kat çağrılarını dikkate almadan ilerlemelidir. Durmaya başlamışsa normal durup kapı açmadan geri çağırma katına devam ettiğini test edin.'),
('MAD-0914', null, '“Belirlenmiş sahanlık/durak”, yangın sinyali geldiğinde asansörün otomatik olarak geri çağrılacağı, projede önceden tanımlanmış yangın geri çağırma katıdır. Asansör yangın geri çağırma katına vardığında kapıların açıldığını ve sesli/görsel tahliye uyarısının verildiğini test edin.'),
('MAD-0915', null, '“Belirlenmiş sahanlık/durak”, yangın sinyali geldiğinde asansörün otomatik olarak geri çağrılacağı, projede önceden tanımlanmış yangın geri çağırma katıdır. Yangın geri çağırma katında kapı bekleme süresi 20 saniyeyi aştığında kapıların kapanıp asansörün hizmet dışı bırakıldığını test edin.'),
('MAD-0916', null, '“Belirlenmiş sahanlık/durak”, yangın sinyali geldiğinde asansörün otomatik olarak geri çağrılacağı, projede önceden tanımlanmış yangın geri çağırma katıdır. Yangın geri çağırma katında kapı açma ve acil durum alarm butonlarının çalışır durumda kaldığını doğrulayın.'),
('MAD-0917', null, '“Belirlenmiş sahanlık/durak”, yangın sinyali geldiğinde asansörün otomatik olarak geri çağrılacağı, projede önceden tanımlanmış yangın geri çağırma katıdır. Yangın geri çağırma katından verilen kat çağrısının, itfaiye personelinin kabini kontrol edebilmesi için kapıları en fazla 20 saniye açık tuttuğunu test edin.'),
('MAD-0920', null, '“Belirlenmiş sahanlık/durak”, yangın sinyali geldiğinde asansörün otomatik olarak geri çağrılacağı, projede önceden tanımlanmış yangın geri çağırma katıdır. Elle açılan kapılı asansörün yangın geri çağırma katında hizmet dışı kaldığını, kapıların açılabildiğini ve sesli/görsel tahliye uyarısının verildiğini test edin.')
)
update public.madde_kutuphanesi m
set denetci_yonlendirmesi = r.denetci_yonlendirmesi,
    kontrol_basligi = coalesce(r.kontrol_basligi, m.kontrol_basligi)
from r
where m.madde_id = r.madde_id;

update public.kutuphane_bolum_surumleri
set surum = surum + 1, updated_at = now();

commit;

select madde_id, kontrol_basligi, denetci_yonlendirmesi, olcum_tanimlari
from public.madde_kutuphanesi
where madde_id in ('MAD-0008F','MAD-0082','MAD-0209','MAD-0897','MAD-0907','MAD-0909','MAD-0910','MAD-0911')
order by madde_id;
