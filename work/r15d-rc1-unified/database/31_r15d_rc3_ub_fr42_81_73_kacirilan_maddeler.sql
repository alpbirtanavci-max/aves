begin;

do $$
declare dolu_sayisi int;
begin
  select count(*) into dolu_sayisi from public.madde_kutuphanesi
  where madde_id in ('MAD-0889','MAD-0891','MAD-0892','MAD-0908') and resmi_madde_metni is not null;
  if dolu_sayisi <> 0 then
    raise exception 'Beklenmeyen durum: % satirda resmi_madde_metni zaten dolu (fail-fast)', dolu_sayisi;
  end if;
end $$;

update public.madde_kutuphanesi set
  resmi_madde_metni = 'Bina yüksekliği 21.50 m’den, yapı yüksekliği 30.50 m’den fazla olan binalardaki asansörler yangın anında davranış standardı olan TS EN 81-73 şartlarını sağlamalıdır.',
  kontrol_basligi = 'TS EN 81-73 uygulanması gereken bina yüksekliği',
  denetci_yonlendirmesi = 'Bina yüksekliğinin 21,50 m''yi veya yapı yüksekliğinin 30,50 m''yi aştığı durumlarda asansörün TS EN 81-73 şartlarını sağladığını kontrol edin.',
  kaynak_form_kodu = 'ÜB.FR.42', kaynak_form_revizyonu = 'R.04'
where madde_id = 'MAD-0889';

update public.madde_kutuphanesi set
  resmi_madde_metni = 'Asansör bir veya birden fazla belirlenmiş durakta çalışmalıdır. Belirlenmiş her durak için, asansör kumanda sisteminde karşılığı olan bir giriş sinyali olmalıdır.',
  kontrol_basligi = 'Belirlenmiş durak için kumanda sisteminde giriş sinyali',
  denetci_yonlendirmesi = 'Asansörün bir veya birden fazla belirlenmiş durakta çalıştığını ve her belirlenmiş durak için kumanda sisteminde karşılık gelen bir giriş sinyali bulunduğunu kontrol edin.',
  kaynak_form_kodu = 'ÜB.FR.42', kaynak_form_revizyonu = 'R.04'
where madde_id = 'MAD-0891';

update public.madde_kutuphanesi set
  resmi_madde_metni = 'Yangın sinyali sıfırlanana kadar, diğer çağırma araçlarından gelen sinyaller yok sayılmalıdır.(durak çağrıları)',
  kontrol_basligi = 'Yangın sinyali süresince normal çağrıların devre dışı bırakılması',
  denetci_yonlendirmesi = 'Yangın sinyali sıfırlanana kadar diğer çağırma araçlarından (durak çağrıları) gelen sinyallerin yok sayıldığını test edin.',
  kaynak_form_kodu = 'ÜB.FR.42', kaynak_form_revizyonu = 'R.04'
where madde_id = 'MAD-0892';

update public.madde_kutuphanesi set
  resmi_madde_metni = 'Kapının fiilî açık kalma süresi en fazla 20 s’yi geçtiğinde, kapı koruma aygıt(lar)ı devre dışı bırakılmalı ve asansör çalışmaya devam ediyorsa, kapıların kinetik enerjisi 4 J ile sınırlandırılmalı ve kapının/kapıların her kapanışında bir akustik sinyal çalışmalıdır.',
  kontrol_basligi = 'Kapı koruma aygıtı arızasında düşük enerjili çalışma',
  denetci_yonlendirmesi = 'Kapının fiilî açık kalma süresi 20 saniyeyi aştığında kapı koruma aygıtının devre dışı bırakıldığını, kapı kinetik enerjisinin 4 J ile sınırlandığını ve her kapanışta akustik sinyal verildiğini kontrol edin.',
  kaynak_form_kodu = 'ÜB.FR.42', kaynak_form_revizyonu = 'R.04'
where madde_id = 'MAD-0908';

update public.madde_kutuphanesi set aktif = false where madde_id = 'MAD-0890';

commit;
