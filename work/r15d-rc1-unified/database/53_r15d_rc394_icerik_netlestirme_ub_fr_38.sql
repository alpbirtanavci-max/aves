-- AVES Saha R15D-rc3.9.4
-- Saha geri bildirimi: ÜB.FR.38 R.04 kaynaklı bazı maddelerin resmi_madde_metni
-- alanı, formdaki cümle parçası/başlık halinde kalmış (denetçi anlamıyor).
-- Kaynak PDF (app/form-assets/UB_FR_38_R04.pdf) yeniden okunarak parçalar,
-- içerik DEĞİŞTİRİLMEDEN tam cümle haline getirildi; hiçbir yeni teknik hüküm
-- eklenmedi. denetci_yonlendirmesi yalnız gerekliyse netleştirildi.
--
-- #5  MAD-0179 (5.3.8.1): "kilit açılma bölgesi" ne demek, hiç açıklanmıyordu.
-- #24 MAD-0401/MAD-0473 (7.1-7.2-7.3): fragman -> "bulunmalıdır" ile tamamlandı;
--     MAD-0473'ün rehberi başlığın birebir kopyasıydı, netleştirildi.
-- #25 MAD-0406 (5.10.8.3): fragman -> tam cümle. Saha rehberi zaten iyiydi, dokunulmadı.
-- #28 MAD-0551 (5.11.1.1): fragman -> tam cümle. Saha rehberi zaten iyiydi, dokunulmadı.
-- #29 MAD-0560 (TS EN 81-50 5.11.2.3.1.1/.2): fragman -> tam cümle. Saha rehberi
--     zaten iyiydi, dokunulmadı.
-- #30 MAD-0637 (5.2.3.2 c): resmi metin doğruydu (EN 81-20'nin kendi ifadesi);
--     "karşı ağırlıkla dengelenmiş" ifadesi sahada ne anlama geldiği rehberde
--     açıklanmadığı için denetçiye anlaşılmaz geliyordu. Ayrıca kardeş maddeler
--     (5.2.3.2 a/b/c/d, hepsi makine/makara dairesi giriş kapısı/kapağı ölçüleri)
--     "04 - Makine ve Şase" ve "05 - Elektrik ve Test" arasında bölünmüştü;
--     MAD-0635/MAD-0637/MAD-0638, MAD-0376 ile aynı bölüme (04) taşındı.
--
-- Veri silmez; başlamış denetimlerin saha_kontrol snapshot satırlarına dokunmaz.

begin;

do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.madde_kutuphanesi
  where madde_id in ('MAD-0179','MAD-0401','MAD-0473','MAD-0406','MAD-0551','MAD-0560','MAD-0635','MAD-0637','MAD-0638')
    and aktif is true;
  if v_count <> 9 then
    raise exception 'Beklenen 9 aktif madde bulunamadı (% bulundu)', v_count;
  end if;
end
$$;

update public.madde_kutuphanesi
set denetci_yonlendirmesi = 'Kilit açılma bölgesi, kabin durak seviyesindeyken durak kapısının kilidinin açılabildiği düşey aralıktır. Bu aralığın kat seviyesinin üstünde ve altında en fazla 0,20 m (otomatik açılıp kapanan durak-kabin kapılarında en fazla 0,35 m) olduğunu kumanda/tahrik ayarlarından veya sahada seviye kontrolüyle doğrulayın.'
where madde_id = 'MAD-0179';

update public.madde_kutuphanesi
set resmi_madde_metni = 'Devre şemaları, bakım, muayene ve tamir için talimatlar ve kayıt defteri bulunmalıdır.'
where madde_id in ('MAD-0401','MAD-0473');

update public.madde_kutuphanesi
set denetci_yonlendirmesi = 'Devre şemaları, bakım/muayene/tamir talimatları ve kayıt defterinin makine dairesinde veya erişilebilir bir noktada bulunduğunu kontrol edin.'
where madde_id = 'MAD-0473';

update public.madde_kutuphanesi
set resmi_madde_metni = 'Kabin aydınlatması, kabin prizi ve makine dairesi aydınlatması devreleri ayrı sigortalarla korunmalıdır.'
where madde_id = 'MAD-0406';

update public.madde_kutuphanesi
set resmi_madde_metni = 'Topraklama ile ilgili bir yalıtım arızası, asansörün kendiliğinden tehlikeli bir şekilde çalışmasına neden olmamalıdır.'
where madde_id = 'MAD-0551';

update public.madde_kutuphanesi
set resmi_madde_metni = 'Tahrik kasnağı kanallarının durumu kontrol edilmelidir (kanallarda aşınma olup olmadığı, halatların kanala tam oturup oturmadığı vb.).'
where madde_id = 'MAD-0560';

update public.madde_kutuphanesi
set denetci_yonlendirmesi = 'Makine/makara dairesi giriş kapağı (yerden erişilen, kapak tipi geçiş) varsa en az 0,80 x 0,80 m net geçiş sağladığını ölçün. "Karşı ağırlıkla dengelenmiş" ifadesi, kapağın kendiliğinden çarpıp kapanmaması veya ağırlığından dolayı zor açılmaması için bir karşı ağırlık/yay mekanizmasıyla dengelenmiş olması gerektiği anlamına gelir; bu mekanizmanın mevcut ve çalışır durumda olduğunu kontrol edin.'
where madde_id = 'MAD-0637';

update public.madde_kutuphanesi m
set bolum = '04 - Makine ve Şase'
where m.madde_id in ('MAD-0635','MAD-0637','MAD-0638');

update public.kutuphane_bolum_surumleri
set surum = surum + 1, updated_at = now()
where bolum in ('04 - Makine ve Şase', '05 - Elektrik ve Test');

commit;

-- Salt okunur doğrulama.
select madde_id, bolum, kontrol_basligi, resmi_madde_metni
from public.madde_kutuphanesi
where madde_id in ('MAD-0179','MAD-0401','MAD-0473','MAD-0406','MAD-0551','MAD-0560','MAD-0635','MAD-0637','MAD-0638')
order by madde_id;
