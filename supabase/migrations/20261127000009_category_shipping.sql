-- Dalilak – 0009 new category "Shipping & Furniture Moving" (شحن ونقل أثاث).
-- Existing categories and listings are not changed. Safe to run more than once.
insert into public.categories (slug, name_ar, name_fr, name_nl, name_en, icon, sort_order, requires_languages)
values ('shipping', 'شحن ونقل أثاث', 'Expédition et déménagement', 'Verzending en verhuizing', 'Shipping & Furniture Moving', '🚚', 9, false)
on conflict (slug) do update set
  name_ar = excluded.name_ar, name_fr = excluded.name_fr, name_nl = excluded.name_nl, name_en = excluded.name_en,
  icon = excluded.icon;
