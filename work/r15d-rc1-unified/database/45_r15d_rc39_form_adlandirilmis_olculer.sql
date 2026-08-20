-- ÜB.FR.38 R.04 ve ÜB.FR.39 R.02 Temel Kuyu Tasarım Ölçüleri için
-- uygulamada eksik kalan dört adlandırılmış saha alanı. Cevapları değiştirmez.
begin;

do $$
declare v_count integer;
begin
  select count(*) into v_count from public.madde_kutuphanesi where madde_id in ('MAD-0008A','MAD-0008D');
  if v_count <> 2 then raise exception 'Beklenen MAD-0008A/MAD-0008D kaynak satırları bulunamadı'; end if;
end $$;

update public.madde_kutuphanesi
set olcum_tanimlari = coalesce(olcum_tanimlari,'[]'::jsonb) ||
  '[{"id":"kabin_tampon_yuksekligi","etiket":"Kabin tampon yüksekliği","birim":"mm","tur":"sayi","kaynak":"ÜB.FR.38 R.04 / ÜB.FR.39 R.02 — Temel Kuyu Tasarım Ölçüleri","referans_metni":"Sahada görülen değer kaydedilir; uygulama otomatik uygunluk kararı vermez."}]'::jsonb
where madde_id='MAD-0008A'
  and not coalesce(olcum_tanimlari,'[]'::jsonb) @> '[{"id":"kabin_tampon_yuksekligi"}]'::jsonb;

update public.madde_kutuphanesi
set olcum_tanimlari = coalesce(olcum_tanimlari,'[]'::jsonb) ||
  '[{"id":"kuyu_dibi_yuksekligi","etiket":"Kuyu dibi yüksekliği","birim":"mm","tur":"sayi","kaynak":"ÜB.FR.38 R.04 / ÜB.FR.39 R.02 — Temel Kuyu Tasarım Ölçüleri","referans_metni":"Sahada görülen değer kaydedilir; uygulama otomatik uygunluk kararı vermez."}]'::jsonb
where madde_id='MAD-0008A'
  and not coalesce(olcum_tanimlari,'[]'::jsonb) @> '[{"id":"kuyu_dibi_yuksekligi"}]'::jsonb;

update public.madde_kutuphanesi
set olcum_tanimlari = coalesce(olcum_tanimlari,'[]'::jsonb) ||
  '[{"id":"kabin_genisligi","etiket":"Kabin genişliği","birim":"mm","tur":"sayi","kaynak":"ÜB.FR.38 R.04 / ÜB.FR.39 R.02 — Temel Kuyu Tasarım Ölçüleri","referans_metni":"Sahada görülen değer kaydedilir; uygulama otomatik uygunluk kararı vermez."}]'::jsonb
where madde_id='MAD-0008D'
  and not coalesce(olcum_tanimlari,'[]'::jsonb) @> '[{"id":"kabin_genisligi"}]'::jsonb;

update public.madde_kutuphanesi
set olcum_tanimlari = coalesce(olcum_tanimlari,'[]'::jsonb) ||
  '[{"id":"kabin_derinligi","etiket":"Kabin derinliği","birim":"mm","tur":"sayi","kaynak":"ÜB.FR.38 R.04 / ÜB.FR.39 R.02 — Temel Kuyu Tasarım Ölçüleri","referans_metni":"Sahada görülen değer kaydedilir; uygulama otomatik uygunluk kararı vermez."}]'::jsonb
where madde_id='MAD-0008D'
  and not coalesce(olcum_tanimlari,'[]'::jsonb) @> '[{"id":"kabin_derinligi"}]'::jsonb;

commit;
