-- AVES Saha R15D-rc3.9.4
-- MAD-0293/MAD-0294: "Uygulanmaz koşulu" yanlışlıkla "koruyucu aygıt yoksa
-- uygulanmaz" diyordu. AVES'in denetlediği asansörlerde engelli erişimi
-- (TS EN 81-70) zorunlu olduğu için çarpma/menteşeli kapı kullanılmaz;
-- kapılar daima otomatiktir ve bu yüzden ışık perdesi/fotosel türü koruyucu
-- aygıt daima zorunludur. Aygıt yokluğu "uygulanmaz" değil, "Uygun Değil"
-- sayılmalıdır. Bu düzeltme yanıltıcı muafiyet metnini kaldırır.
-- Veri silmez; başlamış denetimlerin saha_kontrol snapshot satırlarına dokunmaz.

begin;

do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.madde_kutuphanesi where madde_id in ('MAD-0293','MAD-0294');
  if v_count <> 2 then
    raise exception 'Beklenen MAD-0293/MAD-0294 kayıtları bulunamadı';
  end if;
end
$$;

update public.madde_kutuphanesi
set aranmaz_kosulu = null,
    denetci_yonlendirmesi = 'Koruyucu aygıtın (ör. ışık perdesi) kabin kapısı eşiğinden 25-1600 mm yükseklik aralığını kapsadığını ölçün. Engelli erişimi zorunlu olduğundan kapılar daima otomatiktir; bu koruyucu aygıt her zaman bulunmalıdır — aygıt yoksa madde Uygun Değil olarak işaretlenmelidir, Uygulanmaz değil.'
where madde_id = 'MAD-0293';

update public.madde_kutuphanesi
set aranmaz_kosulu = null,
    denetci_yonlendirmesi = 'Kapı koruyucu aygıtının en az 50 mm çapındaki engelleri algıladığını test edin. Engelli erişimi zorunlu olduğundan kapılar daima otomatiktir; bu koruyucu aygıt her zaman bulunmalıdır — aygıt yoksa madde Uygun Değil olarak işaretlenmelidir, Uygulanmaz değil.'
where madde_id = 'MAD-0294';

update public.kutuphane_bolum_surumleri
set surum = surum + 1, updated_at = now()
where bolum = '03 - Kabin ve Kabin Üstü';

commit;

-- Salt okunur doğrulama.
select madde_id, aranmaz_kosulu, denetci_yonlendirmesi
from public.madde_kutuphanesi
where madde_id in ('MAD-0293','MAD-0294');
