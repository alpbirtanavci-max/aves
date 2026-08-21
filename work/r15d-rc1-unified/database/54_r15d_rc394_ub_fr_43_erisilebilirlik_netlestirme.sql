-- AVES Saha R15D-rc3.9.4
-- Saha geri bildirimi: ÜB.FR.43 R.04 (TS EN 81-70 erişilebilirlik) kaynaklı
-- 5 madde denetçiye hiçbir açıklama sunmuyordu.
--
-- #16 MAD-0978 (kapı açma butonu): kaynak PDF'te sembol bir görsel/ikon olarak
--     basılmış, metne çıkmıyor. Sembol, ISO 7000-2864 (uluslararası "kapı açma"
--     piktogramı — birbirinden ayrılan iki ok) — asansörlerde evrensel olarak
--     kullanılan, standarttan bağımsız genel mühendislik/işaretleme bilgisi.
-- #17 MAD-0979 (kapı kapama butonu): aynı şekilde ISO 7000-2863 ("kapı kapama"
--     piktogramı — birbirine yaklaşan iki ok).
-- #20-22 MAD-1001/1002/1003 (dokunmatik ekran, erişilebilirlik butonu, büyük
--     boy tuş takımı): kaynak formun kendisi de bu 3 maddede yalnız "TS EN
--     81-70'e uygun olarak giderilmelidir" diyor, somut sayısal eşik vermiyor
--     (bkz. ÜB.FR.43 R.04 sayfa 8-9, "Diğer Kontroller" bölümü) — AVES bu üç
--     bileşen için ayrı bir teknik doküman yayımlamamış; bu nedenle sahte bir
--     eşik uydurulmadı. Bunun yerine: (a) bu maddelerin yalnız asansörde ilgili
--     bileşen fiilen VARSA doldurulacağı, (b) sahada yalnız ölçünün kaydedildiği,
--     (c) nihai uygunluk kararının kaydedilen ölçü ile TS EN 81-70'in ilgili
--     maddesinin resmi kıyaslanmasıyla verildiği rehberde açıkça yazıldı.
--     Ayrıca üçü de "Diğer Kontroller" gibi anlamsız kalıtsal başlık taşıyordu;
--     özel başlık verildi.
--
-- Veri silmez; başlamış denetimlerin saha_kontrol snapshot satırlarına dokunmaz.

begin;

do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.madde_kutuphanesi
  where madde_id in ('MAD-0978','MAD-0979','MAD-1001','MAD-1002','MAD-1003') and aktif is true;
  if v_count <> 5 then
    raise exception 'Beklenen 5 aktif madde bulunamadı (% bulundu)', v_count;
  end if;
end
$$;

update public.madde_kutuphanesi
set kontrol_basligi = 'Kapı açma butonu sembolü',
    denetci_yonlendirmesi = 'Kabin içi kapı açma butonunun üzerinde uluslararası "kapı açma" piktogramı (ISO 7000-2864 — birbirinden ayrılan iki ok) bulunduğunu kontrol edin.'
where madde_id = 'MAD-0978';

update public.madde_kutuphanesi
set kontrol_basligi = 'Kapı kapama butonu sembolü',
    denetci_yonlendirmesi = 'Kabin içinde kapı kapama butonu varsa (zorunlu değildir), üzerinde uluslararası "kapı kapama" piktogramının (ISO 7000-2863 — birbirine yaklaşan iki ok) bulunduğunu kontrol edin.'
where madde_id = 'MAD-0979';

update public.madde_kutuphanesi
set kontrol_basligi = 'Dokunmatik ekran ölçüleri (TS EN 81-70)',
    denetci_yonlendirmesi = 'Bu madde yalnız kabinde dokunmatik ekran arayüzü varsa doldurulur. Ekranın genişlik, yükseklik, üzerindeki sembol boyu ve görüntüleme merkezinin yerden yüksekliğini ölçüp kaydedin; uygunluk kararı bu ölçülerin TS EN 81-70''in ilgili maddesiyle resmi kıyaslanmasıyla verilir, AVES Saha otomatik karar vermez.',
    aranmaz_kosulu = 'Kabinde dokunmatik ekran arayüzü yoksa (standart buton/tuş takımı kullanılıyorsa) bu madde uygulanmaz.'
where madde_id = 'MAD-1001';

update public.madde_kutuphanesi
set kontrol_basligi = 'Erişilebilirlik butonu ölçüleri (TS EN 81-70)',
    denetci_yonlendirmesi = 'Bu madde yalnız kabinde ayrı bir "erişilebilirlik butonu" varsa doldurulur. Butonun yerden yüksekliğini ölçüp kaydedin; uygunluk kararı bu ölçünün TS EN 81-70''in ilgili maddesiyle resmi kıyaslanmasıyla verilir, AVES Saha otomatik karar vermez.',
    aranmaz_kosulu = 'Kabinde ayrı bir erişilebilirlik butonu yoksa bu madde uygulanmaz.'
where madde_id = 'MAD-1002';

update public.madde_kutuphanesi
set kontrol_basligi = 'Büyük boy tuş takımı ölçüleri (TS EN 81-70)',
    denetci_yonlendirmesi = 'Bu madde yalnız kabinde standart tuş takımına ek/alternatif "büyük boy tuş takımı" varsa doldurulur. Tuş takımının dış boyutunu, üzerindeki sembol yüksekliğini, butonlar arası mesafeyi ve (eğik panel ise) panel derinliğini ölçüp kaydedin; uygunluk kararı bu ölçülerin TS EN 81-70''in ilgili maddesiyle resmi kıyaslanmasıyla verilir, AVES Saha otomatik karar vermez.',
    aranmaz_kosulu = 'Kabinde büyük boy tuş takımı yoksa bu madde uygulanmaz.'
where madde_id = 'MAD-1003';

update public.kutuphane_bolum_surumleri
set surum = surum + 1, updated_at = now()
where bolum = '03 - Kabin ve Kabin Üstü';

commit;

-- Salt okunur doğrulama.
select madde_id, kontrol_basligi, denetci_yonlendirmesi, aranmaz_kosulu
from public.madde_kutuphanesi
where madde_id in ('MAD-0978','MAD-0979','MAD-1001','MAD-1002','MAD-1003')
order by madde_id;
