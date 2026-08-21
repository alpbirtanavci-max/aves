-- AVES Saha R15D-rc3.9.4
-- Saha geri bildirimi #42: "Saha Kapanışı" bölümündeki KAP-01 ("Ana standart
-- maddeleri ele alındı mı?") ve KAP-02 ("İlave standartlar kontrol edildi mi?")
-- maddeleri gereksizdi. Bu iki madde, denetçiye "tüm maddeleri işledin mi?"
-- diye soran kendine referanslı bir kontroldür — ama uygulama zaten her
-- maddenin doldurulup doldurulmadığını izliyor ve (rc3.9.4'teki #43 düzeltmesiyle)
-- denetimi bitirirken eksik maddeleri otomatik filtreleyip gösteriyor. Bu iki
-- madde, uygulamanın kendi yaptığı bir işi denetçiye tekrar sordurmaktan başka
-- bir şey yapmıyordu.
--
-- Aynı bölümdeki diğer 3 kapanış maddesi (MAD-1007 zorunlu ölçüler, MAD-1008
-- test yapılamayan işlemler, MAD-1009 ek mühendislik bulguları) farklı ve somut
-- konuları sorduğu için dokunulmadı.
--
-- Silme değil pasifleştirme yapıldı (aktif = false); veri kaybı yok,
-- başlamış denetimlerin saha_kontrol snapshot satırlarına dokunulmadı.

begin;

do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.madde_kutuphanesi
  where madde_id in ('MAD-1005','MAD-1006') and aktif is true
    and standart_madde_no in ('KAP-01','KAP-02');
  if v_count <> 2 then
    raise exception 'Beklenen KAP-01/KAP-02 aktif kayıtları bulunamadı';
  end if;
end
$$;

update public.madde_kutuphanesi
set aktif = false
where madde_id in ('MAD-1005','MAD-1006');

update public.kutuphane_bolum_surumleri
set surum = surum + 1, updated_at = now()
where bolum = '06 - Saha Kapanışı';

commit;

-- Salt okunur doğrulama.
select madde_id, standart_madde_no, aktif, kontrol_basligi
from public.madde_kutuphanesi
where bolum = '06 - Saha Kapanışı'
order by madde_id;
