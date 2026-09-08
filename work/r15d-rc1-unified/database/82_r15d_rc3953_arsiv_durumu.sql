-- AVES Saha R15D-rc3.9.53 — kurumsal arşive aktarım durumu.
--
-- Tamamlanmış bir denetimin resmî dosyasının kurumsal arşive konduğu bilgisi
-- hiçbir yerde tutulmuyordu. Bu migration 2 nullable kolon + bunları koruyan
-- bir BEFORE UPDATE trigger ekler. RLS politikası değişmez, veri değişmez.
--
--   arsive_aktarildi_at  — arşive aktarım işaretinin konduğu an (kaldırılırsa null)
--   arsive_aktaran_email — işareti koyan kişi (sunucu oturumundan yazılır)
--
-- Neden trigger: mevcut "denetim guncelleme" politikası denetim sahibine de
-- yazma hakkı verir. Arayüzde düğmeyi gizlemek yeterli değil — sahip kullanıcı
-- doğrudan istek/outbox ile arsive_* alanlarını değiştirip aktaran e-postasını
-- taklit edebilir. Trigger bu yüzden şart:
--   * Yalnız aktif yonetici / teknik_mudur iki alanı değiştirebilir
--     (aves_tum_denetimleri_gorebilir_mi).
--   * İşaretleme yalnız 'Çalışma Tamamlandı' denetimde yapılır.
--   * Tarih sunucu saatinden (now()), aktaran e-posta DB oturumundan yazılır;
--     istemciden gelen değerler yok sayılır.
--   * İşaret kaldırılınca iki alan birlikte NULL olur.

begin;

alter table public.denetimler
  add column if not exists arsive_aktarildi_at timestamptz,
  add column if not exists arsive_aktaran_email text;

-- SECURITY INVOKER (plpgsql varsayılanı): current_user gerçek oturum rolüdür.
-- Rol/e-posta kontrolü mevcut SECURITY DEFINER yardımcılarına devredilir
-- (aves_tum_denetimleri_gorebilir_mi = aktif yonetici/teknik_mudur).
create or replace function public.aves_arsiv_durumunu_dogrula()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $$
declare
  v_email text := public.aves_oturum_emaili();
begin
  -- Bakım rolleri (migration/servis) dokunulmadan geçer.
  if current_user in ('postgres','service_role','supabase_admin') then
    return new;
  end if;

  -- Arşiv alanları bu UPDATE'te değişmiyorsa trigger'ın işi yok.
  if new.arsive_aktarildi_at is not distinct from old.arsive_aktarildi_at
    and new.arsive_aktaran_email is not distinct from old.arsive_aktaran_email then
    return new;
  end if;

  if not public.aves_tum_denetimleri_gorebilir_mi() then
    raise exception 'Kurumsal arşiv durumunu yalnız yönetici veya teknik müdür değiştirebilir';
  end if;

  if new.arsive_aktarildi_at is not null then
    -- İşaretleme: yalnız tamamlanmış denetim; değerler sunucudan.
    if new.denetim_durumu <> 'Çalışma Tamamlandı' then
      raise exception 'Arşiv işareti yalnız Çalışma Tamamlandı denetimde konabilir';
    end if;
    new.arsive_aktarildi_at := now();
    new.arsive_aktaran_email := v_email;
  else
    -- İşareti kaldırma: iki alan birlikte NULL.
    new.arsive_aktarildi_at := null;
    new.arsive_aktaran_email := null;
  end if;

  return new;
end;
$$;

revoke all on function public.aves_arsiv_durumunu_dogrula() from public;

drop trigger if exists trg_aves_arsiv_durumu_kilidi on public.denetimler;
create trigger trg_aves_arsiv_durumu_kilidi
before update on public.denetimler
for each row execute function public.aves_arsiv_durumunu_dogrula();

commit;

-- Salt okunur doğrulama.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'denetimler'
  and column_name in ('arsive_aktarildi_at', 'arsive_aktaran_email')
order by column_name;

select tgname, tgenabled
from pg_trigger
where tgrelid = 'public.denetimler'::regclass and tgname = 'trg_aves_arsiv_durumu_kilidi';
