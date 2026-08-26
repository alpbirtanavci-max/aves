-- AVES Saha R15D-rc3.9.7 aday / ekran fotoğrafı denetimi, 1. grup
-- Yalnız yeni denetim kütüphanesini günceller; saha_kontrol snapshotlarını silmez/değiştirmez.

begin;

do $$
begin
  if to_regclass('public.madde_kutuphanesi') is null then
    raise exception 'public.madde_kutuphanesi bulunamadı';
  end if;
  if (select count(*) from public.madde_kutuphanesi where madde_id in
      ('MAD-0389','MAD-0390','MAD-0394','MAD-0404','MAD-0407','MAD-0411','MAD-0426','MAD-0427',
       'MAD-0636','MAD-0640','MAD-0641','MAD-0645','MAD-0653','MAD-0855','MAD-0856',
       'MAD-0909','MAD-0910','MAD-0913','MAD-0923','MAD-0961','MAD-0962','MAD-0964','MAD-0978','MAD-0979')) <> 24 then
    raise exception 'rc3.9.7 birinci grup hedef maddeleri eksik';
  end if;
end $$;

update public.madde_kutuphanesi
set denetci_yonlendirmesi = null
where madde_id in ('MAD-0636','MAD-0640','MAD-0641','MAD-0645','MAD-0653','MAD-0855','MAD-0856','MAD-0909','MAD-0910','MAD-0913');

update public.madde_kutuphanesi
set gorsel_referansi = 'G-8171-KATEGORI-TR.svg — Kategori 1 ve Kategori 2 açıklamaları'
where standart_grubu = '81-71'
  and concat_ws(' ', kontrol_basligi, resmi_madde_metni, aranmaz_kosulu) ~* 'Kategori[[:space:]]+[12]';

update public.madde_kutuphanesi
set aranmaz_kosulu = 'Asansör Kategori 1 (kuyusu kısmi mahfazalı) ise bu madde uygulanmaz.'
where madde_id = 'MAD-0855';

update public.madde_kutuphanesi
set gorsel_referansi = 'G-8170-KABIN-TIPLERI-TR.svg — Kabin tipi açıklamaları'
where standart_grubu = '81-70'
  and concat_ws(' ', kontrol_basligi, resmi_madde_metni, denetci_yonlendirmesi) ~* 'Tip[[:space:]]+[1-5]';

update public.madde_kutuphanesi
set denetci_yonlendirmesi = null,
    resmi_madde_metni = 'Kabin tipini net kabin genişliği, net kabin derinliği, kapı yerleşimi ve kullanım amacına göre çizelgeden belirleyin. Beyan yükü tek başına kabin tipini belirlemez; 800 kg gibi ara beyan yüklerinde gerçek kabin ölçülerini esas alın.',
    gorsel_referansi = 'G-8170-KABIN-TIPLERI-TR.svg — Kabin tipi açıklamaları'
where madde_id = 'MAD-0923';

update public.madde_kutuphanesi
set olcu1_adi = null,
    olcu1_birimi = null,
    olcum_tanimlari = '[{"id":"kumanda_paneli_bulundugu_taraf","etiket":"Kumanda panelinin bulunduğu taraf","tur":"secim","secenekler":["Girişte sağ","Girişte sol","Arka duvar"],"referans_metni":"Kabine giriş yönüne göre seçilir."}]'::jsonb
where madde_id in ('MAD-0961','MAD-0962','MAD-0964');

update public.madde_kutuphanesi
set resmi_madde_metni = 'Kabin içindeki kapı açma butonunda, kapının açılmasını gösteren ISO 7000-2864 sembolü (birbirinden ayrılan iki ok) bulunmalıdır.',
    denetci_yonlendirmesi = null
where madde_id = 'MAD-0978';

update public.madde_kutuphanesi
set resmi_madde_metni = 'Kabin içinde kapı kapama butonu bulunuyorsa, butonda ISO 7000-2863 sembolü (birbirine yaklaşan iki ok) bulunmalıdır.',
    denetci_yonlendirmesi = null
where madde_id = 'MAD-0979';

update public.madde_kutuphanesi
set kontrol_basligi = 'Makine veya pano çalışma alanı aydınlatma anahtarı',
    resmi_madde_metni = 'Makine dairesinin veya MRL asansörde kumanda panosu çalışma alanının aydınlatma anahtarı, yetkili kişilerin kolayca erişebileceği uygun bir konum ve yükseklikte bulunmalıdır.',
    denetci_yonlendirmesi = null,
    md_kosulu = null
where madde_id = 'MAD-0389';

update public.madde_kutuphanesi
set kontrol_basligi = 'Makine veya pano çalışma alanının aydınlatılması',
    resmi_madde_metni = 'Makine dairesinde veya MRL asansörde kumanda panosunun bulunduğu çalışma alanında, çalışma seviyesinde en az 200 lüks; erişim ve hareket alanlarında en az 50 lüks aydınlatma sağlanmalıdır.',
    denetci_yonlendirmesi = null,
    md_kosulu = null
where madde_id = 'MAD-0390';

update public.madde_kutuphanesi
set resmi_madde_metni = 'Asansördeki etiketler, bildirimler, işaretlemeler ve talimatlar kalıcı biçimde sabitlenmiş; silinmez, okunaklı, anlaşılır, görünür, dayanıklı ve Türkçe olmalıdır.',
    denetci_yonlendirmesi = null,
    md_kosulu = null
where madde_id = 'MAD-0394';

update public.madde_kutuphanesi
set kontrol_basligi = 'Ana anahtarın (pako şalterin) erişimi ve montaj yüksekliği',
    resmi_madde_metni = 'Ana anahtar (pako şalter), makine veya kumanda alanının girişinden doğrudan erişilebilir olmalı ve zeminden 0,60 m ile 1,90 m arasındaki yüksekliğe monte edilmelidir.',
    denetci_yonlendirmesi = null,
    md_kosulu = null
where madde_id = 'MAD-0404';

update public.madde_kutuphanesi set denetci_yonlendirmesi = null where madde_id = 'MAD-0407';

update public.madde_kutuphanesi
set md_kosulu = 'MR',
    resmi_madde_metni = 'Makine dairesinde ağır donanımın güvenli biçimde kaldırılması ve taşınması gerekiyorsa, uygun konumlandırılmış bir kaldırma/taşıma vasıtası bulunmalı ve güvenli çalışma yükü üzerinde açıkça belirtilmelidir.',
    denetci_yonlendirmesi = null
where madde_id = 'MAD-0411';

update public.madde_kutuphanesi
set resmi_madde_metni = 'Kuvvet panosunda, uygulanabilir devreler için hata akımına karşı koruma elemanları bulunmalı; elemanların anma değerleri, bağlantıları ve test işlevleri uygun olmalıdır.',
    denetci_yonlendirmesi = null
where madde_id = 'MAD-0426';

update public.madde_kutuphanesi
set resmi_madde_metni = 'Kumanda panosunda, uygulanabilir devreler için hata akımına karşı koruma elemanları bulunmalı; elemanların anma değerleri, bağlantıları ve test işlevleri uygun olmalıdır.',
    denetci_yonlendirmesi = null
where madde_id = 'MAD-0427';

update public.kutuphane_bolum_surumleri
set surum = surum + 1, updated_at = now();

commit;

select madde_id, kontrol_basligi, denetci_yonlendirmesi, md_kosulu, gorsel_referansi, olcum_tanimlari
from public.madde_kutuphanesi
where madde_id in ('MAD-0389','MAD-0390','MAD-0394','MAD-0404','MAD-0411','MAD-0426','MAD-0427','MAD-0855','MAD-0923','MAD-0961','MAD-0962','MAD-0964')
order by madde_id;
