-- CI-only fixture: model the live Modül B identity constraint before migration 85.
alter table public.denetimler
  add column ana_tip text,
  add column tip_varyant_kodu text;

alter table public.denetimler
  add constraint denetimler_modul_b_kimlik_check check (
    kontrol_profili is distinct from 'modul_b_tip_inceleme'
    or (ana_tip is not null and length(trim(ana_tip)) > 0
      and tip_varyant_kodu is not null and length(trim(tip_varyant_kodu)) > 0)
  );
