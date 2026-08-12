begin;

do $$
declare dolu_sayisi int;
begin
  select count(*) into dolu_sayisi from public.madde_kutuphanesi
  where madde_id = 'MAD-0549' and resmi_madde_metni is not null;
  if dolu_sayisi <> 0 then
    raise exception 'Beklenmeyen durum: satir zaten dolu (fail-fast)';
  end if;
end $$;

update public.madde_kutuphanesi set
  resmi_madde_metni = 'Yalıtım direnci, gerilim taşıyan her iletken ile toprak arasında ölçülmelidir. Geçerli devre için >0,5 MΩ (test voltajı 500 V); güvenlik ekipmanları için >0,5 MΩ (test voltajı 500 V).',
  kontrol_basligi = 'Yalıtım direnci testi',
  denetci_yonlendirmesi = 'Gerilim taşıyan her iletken ile toprak arasındaki yalıtım direncini 500 V test voltajıyla ölçün; geçerli devrede ve güvenlik ekipmanlarında değerin 0,5 MΩ''u aştığını doğrulayın.',
  kaynak_form_kodu = 'ÜB.FR.38', kaynak_form_revizyonu = 'R.04'
where madde_id = 'MAD-0549';

commit;
