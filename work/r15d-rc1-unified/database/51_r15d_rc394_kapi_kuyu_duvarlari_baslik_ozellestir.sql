-- AVES Saha R15D-rc3.9.4
-- 22 madde, eski DOCX çıkarımından kalıtsal genel başlık "Kapı ve kuyu
-- duvarları"nı paylaşıyordu. Uygulama, genel/kesik başlık tespit ettiğinde
-- resmi metnin TAMAMINI kalın başlık olarak gösteriyor (mrequirement boş
-- kalıyor) — bu da saha geri bildirimindeki "kalın yazı göz yoruyor" sorununun
-- kök nedeni. Her maddeye, zaten doğrulanmış resmi_madde_metni içeriğinden
-- türetilmiş özel ve kısa bir başlık verildi; resmi_madde_metni değişmedi.
-- Veri silmez; başlamış denetimlerin saha_kontrol snapshot satırlarına dokunmaz.

begin;

create temporary table r15d_rc394_baslik_duzeltme (madde_id text primary key, yeni_baslik text not null) on commit drop;
insert into r15d_rc394_baslik_duzeltme (madde_id, yeni_baslik) values
  ('MAD-0171', 'Kat kapıları topraklama sürekliliği'),
  ('MAD-0172', 'Cam panel lamine yapısı ve darbe dayanımı'),
  ('MAD-0173', 'Cam panel etiketi'),
  ('MAD-0174', 'Kuyu açıklıklarının durak kapılarıyla donatılması'),
  ('MAD-0175', 'Kapalı durak/kabin kapılarının kuyuyu tam kapatması'),
  ('MAD-0176', 'Yatay sürgülü kapı kılavuz elemanı arızasında güvenlik'),
  ('MAD-0177', 'Kabin çalışmasının kapı kilitlenmesine bağlı olması'),
  ('MAD-0178', 'Durak kapısının kapanmasını sağlayan elektriksel güvenlik tertibatı'),
  ('MAD-0179', 'Kilit açılma bölgesi genişliği'),
  ('MAD-0180', 'Kilit açılma bölgesi dışında kapı açıldığında hareketin engellenmesi'),
  ('MAD-0181', 'Durak kapılarının kilit açma bölgesi dışında kapalı olması'),
  ('MAD-0182', 'Kilit açma bölgesi dışında durak kapısının otomatik kapanması'),
  ('MAD-0183', 'Kabin kapısı-durak kapısı arası yatay mesafe'),
  ('MAD-0185', 'Durak kapısı yayının tipi ve kilit açıkken davranışı'),
  ('MAD-0188', 'Durak kapısı açıkken asansörün hareket etmemesi'),
  ('MAD-0189', 'Durak kapısı kilitlenmesinin kabin hareketinden önce sağlanması'),
  ('MAD-0190', 'Kapı açılma yönündeki kuvvetin kilitlenmeyi etkilememesi'),
  ('MAD-0191', 'Kilit açılma bölgesinde kapının elle açılabilmesi'),
  ('MAD-0192', 'Kabin hareket halindeyken kapı açma kuvveti'),
  ('MAD-0193', 'Kilit açma bölgesi dışında kapının zorla açılmaya direnci'),
  ('MAD-0194', 'Tam kapalı kuyu duvarlarının bütünlüğü'),
  ('MAD-0195', 'Kuyu iç yüzeyi ile kabin eşiği arası yatay açıklık');

do $$
declare
  v_count integer;
  v_wrong integer;
begin
  select count(*) into v_count from r15d_rc394_baslik_duzeltme;
  if v_count <> 22 then raise exception 'Beklenen 22 madde yerine % tanesi listelendi', v_count; end if;

  select count(*) into v_wrong
  from public.madde_kutuphanesi m
  join r15d_rc394_baslik_duzeltme e using (madde_id)
  where coalesce(m.kontrol_basligi,'') <> 'Kapı ve kuyu duvarları';
  if v_wrong <> 0 then
    raise exception '% madde beklenen genel başlığa sahip değil; migration güvenlik nedeniyle durduruldu', v_wrong;
  end if;
end
$$;

update public.madde_kutuphanesi m
set kontrol_basligi = e.yeni_baslik
from r15d_rc394_baslik_duzeltme e
where m.madde_id = e.madde_id;

update public.kutuphane_bolum_surumleri
set surum = surum + 1, updated_at = now()
where bolum = '02 - Kuyu Boyunca';

do $$
declare
  v_remaining integer;
begin
  select count(*) into v_remaining
  from public.madde_kutuphanesi m
  join r15d_rc394_baslik_duzeltme e using (madde_id)
  where m.kontrol_basligi = 'Kapı ve kuyu duvarları';
  if v_remaining <> 0 then
    raise exception '% maddede hâlâ genel başlık kaldı', v_remaining;
  end if;
end
$$;

commit;

-- Salt okunur doğrulama.
select madde_id, bolum, kontrol_basligi
from public.madde_kutuphanesi
where madde_id in (
  'MAD-0171','MAD-0172','MAD-0173','MAD-0174','MAD-0175','MAD-0176','MAD-0177','MAD-0178',
  'MAD-0179','MAD-0180','MAD-0181','MAD-0182','MAD-0183','MAD-0185','MAD-0188','MAD-0189',
  'MAD-0190','MAD-0191','MAD-0192','MAD-0193','MAD-0194','MAD-0195'
)
order by madde_id;
