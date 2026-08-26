-- AVES Saha R15D-rc3.9.7
-- rc3.9.7 doğrulama düzeltmeleri:
-- - iPhone/Safari görsel düzeltmesi uygulama paketindedir.
-- - Halat sarım açısı sahada ölçüm alanı olmaktan çıkarılır.
-- - Otomatik Uygulanmaz kararı denetçiden gizlenmez.
-- - TS EN 81-70 rehberleri, sahada tutulmayan ölçüleri kaydetme zorunluluğu üretmez.
-- Yalnız yeni denetim kütüphanesini günceller; geçmiş saha cevaplarına dokunmaz.

begin;

do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.madde_kutuphanesi
  where madde_id in ('MAD-0008H','MAD-0018','MAD-1000','MAD-1001','MAD-1002','MAD-1003')
    and aktif is true;

  if v_count <> 6 then
    raise exception 'rc3.9.7 doğrulama hedeflerinden biri eksik (%/6 bulundu)', v_count;
  end if;
end
$$;

update public.madde_kutuphanesi
set olcum_tanimlari = coalesce((
      select jsonb_agg(item order by ordinality)
      from jsonb_array_elements(coalesce(olcum_tanimlari, '[]'::jsonb))
           with ordinality as items(item, ordinality)
      where item->>'id' <> 'halat_sarim_acisi'
    ), '[]'::jsonb),
    denetci_yonlendirmesi = 'Makine alanında halat ve kasnak bilgilerini etiket, kumpas/şerit metre ve erişilebilir yerleşim üzerinden kaydedin. En güvenli erişilebilir noktayı kullanın; değerleri tahmin etmeyin. Halat sarım açısını sahada ölçmeyin; yalnız onaylı teknik dosya veya yerleşim çizimi üzerinden kontrol edin. Eksiklik varsa madde açıklamasına yazın.'
where madde_id = 'MAD-0008H';

update public.madde_kutuphanesi
set aranmaz_kosulu = 'Kuyu dibi derinliği 2500 mm’den fazlaysa bu madde otomatik olarak Uygulanmaz işaretlenir.'
where madde_id = 'MAD-0018';

update public.madde_kutuphanesi
set denetci_yonlendirmesi = 'TS EN 81-70''e göre: tuş takımı genişliği en fazla 120 mm, yüksekliği en fazla 160 mm olmalı; butonlar arası mesafe 5-15 mm. Rakamlar kabartma OLMAMALI (kazınmış olabilir); Braille kullanılmaz. Çıkış katı (yıldız) sembolü ve eksi işareti kabartma olmalı. ''5'' rakamlı butonda tek bir kabartma nokta bulunmalı (körler için dokunsal referans). Genel şartlar: aktif alan en az 490 mm² (yaklaşık 20 mm çap), çalıştırma kuvveti 2,5-5,0 N, sembol yüksekliği 15-40 mm kabartma. Uygulamadaki mevcut ölçüm alanlarına sahada alınabilen temel boyutları yazın. Diğer kriterleri kontrol edin; eksiklik varsa madde açıklamasına yazın.'
where madde_id = 'MAD-1000';

update public.madde_kutuphanesi
set denetci_yonlendirmesi = 'TS EN 81-70''e göre dokunmatik ekranlar koşullu izinlidir: ekran en az 300 cd/m² parlaklık sağlamalı, dokunma alanları ve semboller çevresiyle kontrastlı olmalı; sembol yüksekliği 15-40 mm, butonlar arası mesafe en az 5 mm olmalıdır. Ekranın yanında veya altında bir erişilebilirlik butonu bulunmalı; bu butona basıldığında katların sırayla sesli anons edilip ikinci bir basışla seçilebildiğini test edin. Bu madde yalnız kabinde dokunmatik ekran varsa doldurulur. Uygulamadaki mevcut ölçüm alanlarına sahada alınabilen temel boyutları yazın. Diğer kriterleri kontrol edin; eksiklik varsa madde açıklamasına yazın.'
where madde_id = 'MAD-1001';

update public.madde_kutuphanesi
set denetci_yonlendirmesi = 'TS EN 81-70''e göre erişilebilirlik butonu, tuş takımı veya dokunmatik ekranın yanında, tercihen altında bulunmalı ve uluslararası ''Engelliler için Erişim'' sembolüyle (ISO 4190-5 Tablo C.1 No.10) işaretlenmelidir. Aktive edildiğinde sesli anons başlatmalı, çağrıyı uygun kabine yönlendirmeli veya kapının açık kalma süresini uzatmalıdır. Bu madde yalnız ayrı bir erişilebilirlik butonu varsa doldurulur. Uygulamadaki mevcut ölçüm alanına butonun yerden yüksekliğini yazın. Diğer kriterleri kontrol edin; eksiklik varsa madde açıklamasına yazın.'
where madde_id = 'MAD-1002';

update public.madde_kutuphanesi
set denetci_yonlendirmesi = 'TS EN 81-70''e göre büyük boy tuş takımında buton aktif alanı en az 50x50 mm (veya 50 mm çap), sembol boyutu 25-40 mm olmalıdır. Kat butonları, dikeyle 30°±15° açılı ve çıkıntısı en fazla 100 mm olan eğik bir panelde bulunmalı; en üst butonun merkezi yerden en fazla 1000 mm yükseklikte olmalıdır. Alarm ve kapı butonları, kat butonları arası mesafenin en az iki katı kadar ayrılmalıdır. Bu madde yalnız böyle bir panel varsa doldurulur. Uygulamadaki mevcut ölçüm alanlarına sahada alınabilen temel boyutları yazın. Diğer kriterleri kontrol edin; eksiklik varsa madde açıklamasına yazın.'
where madde_id = 'MAD-1003';

update public.kutuphane_bolum_surumleri
set surum = surum + 1, updated_at = now()
where bolum in (
  select distinct bolum
  from public.madde_kutuphanesi
  where madde_id in ('MAD-0008H','MAD-0018','MAD-1000','MAD-1001','MAD-1002','MAD-1003')
);

commit;

select madde_id, kontrol_basligi, denetci_yonlendirmesi, aranmaz_kosulu, olcum_tanimlari
from public.madde_kutuphanesi
where madde_id in ('MAD-0008H','MAD-0018','MAD-1000','MAD-1001','MAD-1002','MAD-1003')
order by madde_id;
