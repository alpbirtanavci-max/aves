-- Behavioral PostgreSQL test for migration 85; does not test RLS.
begin;
alter table public.denetimler disable trigger user;

-- Modül B's Ana Tip and Tip Varyant Kodu are now optional, including null/null
-- and either field recorded on its own.
insert into public.denetimler (
  musteri_unvani, asansor_seri_no, olusturan_email, ana_standart,
  modul, denetim_turu, kontrol_profili, ana_tip, tip_varyant_kodu
) values
  ('B null kimlik', 'SN-B-NULL', 'test@example.local', '81-20',
   'Modül B', 'Modül B - AB Tip İncelemesi', 'modul_b_tip_inceleme', null, null),
  ('B ana tip tek başına', 'SN-B-TIP', 'test@example.local', '81-20',
   'Modül B', 'Modül B - AB Tip İncelemesi', 'modul_b_tip_inceleme', 'Tip A', null),
  ('B varyant tek başına', 'SN-B-VARYANT', 'test@example.local', '81-20',
   'Modül B', 'Modül B - AB Tip İncelemesi', 'modul_b_tip_inceleme', null, 'V1');

do $$
declare rejected boolean;
begin
  rejected := false;
  begin
    insert into public.denetimler (
      musteri_unvani, asansor_seri_no, olusturan_email, ana_standart,
      modul, denetim_turu, kontrol_profili
    ) values ('B A3', 'SN-A3-B', 'test@example.local', '81-1/2+A3',
      'Modül B', 'Modül B - AB Tip İncelemesi', 'modul_b_tip_inceleme');
  exception when check_violation then rejected := true;
  end;
  if not rejected then raise exception 'Modül B, TS EN 81-1/2+A3 ile kaydedildi'; end if;

  rejected := false;
  begin
    insert into public.denetimler (
      musteri_unvani, asansor_seri_no, olusturan_email, ana_standart,
      modul, denetim_turu, kontrol_profili
    ) values ('E A3', 'SN-A3-E', 'test@example.local', '81-1/2+A3',
      'Modül E', 'Modül E - Gözetim Saha Teyidi', 'saha_teyidi_e');
  exception when check_violation then rejected := true;
  end;
  if not rejected then raise exception 'Modül E, TS EN 81-1/2+A3 ile kaydedildi'; end if;

  rejected := false;
  begin
    insert into public.denetimler (
      musteri_unvani, asansor_seri_no, olusturan_email, ana_standart,
      modul, denetim_turu, kontrol_profili
    ) values ('H1 A3', 'SN-A3-H1', 'test@example.local', '81-1/2+A3',
      'Modül H1', 'Modül H1 - Gözetim Saha Teyidi', 'saha_teyidi_h1');
  exception when check_violation then rejected := true;
  end;
  if not rejected then raise exception 'Modül H1, TS EN 81-1/2+A3 ile kaydedildi'; end if;

  -- A forged/inconsistent row cannot pass by setting only the G profile.
  rejected := false;
  begin
    insert into public.denetimler (
      musteri_unvani, asansor_seri_no, olusturan_email, ana_standart,
      modul, denetim_turu, kontrol_profili
    ) values ('Tutarsız profil', 'SN-A3-MISMATCH', 'test@example.local', '81-1/2+A3',
      'Modül B', 'Modül B - AB Tip İncelemesi', 'modul_g_tam');
  exception when check_violation then rejected := true;
  end;
  if not rejected then raise exception 'A3, tutarsız Modül G profiliyle kaydedildi'; end if;
end $$;

-- A3 remains available for a consistently identified Modül G inspection.
insert into public.denetimler (
  musteri_unvani, asansor_seri_no, olusturan_email, ana_standart,
  modul, denetim_turu, kontrol_profili
) values ('G A3', 'SN-A3-G', 'test@example.local', '81-1/2+A3',
  'Modül G', 'Modül G - Birim Doğrulaması', 'modul_g_tam');

alter table public.denetimler enable trigger user;
rollback;
