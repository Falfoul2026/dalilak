-- Add «البرمكي / Al Barmaki» (Lebanese restaurant, Brussels). Not featured.
-- Supabase → SQL Editor → paste → Run. Safe to run more than once: it adds nothing
-- if a listing with this name, address or phone already exists (any status, also hidden).
-- Coordinates: OpenStreetMap (Nominatim), building at Rue des Éperonniers 67.
insert into public.listings (slug, name, category, type_label, province, city, address, phone,
                             lat, lng, languages, language_verified, status, source, description)
select public.unique_slug('Al Barmaki', 'Bruxelles'),
       'Al Barmaki – البرمكي', 'food', 'مطعم لبناني', 'brussels', 'Bruxelles',
       'Rue des Éperonniers 67, 1000 Bruxelles', '+32 2 513 08 34',
       50.8451786, 4.3529207,
       '{}', false,              -- Arabic not confirmed yet → shows «اتصل وتأكد من العربية»
       'active', 'admin',
       jsonb_build_object('ar', 'أول مطعم لبناني في بلجيكا، مفتوح منذ 1978 في قلب بروكسل قرب الغراند بلاس. مازة لبنانية متنوعة ومشاوي، أجواء شرقية دافئة. يُنصح بالحجز.')
where not exists (
  select 1 from public.listings
   where name ilike '%barmak%' or name like '%برمكي%'
      or (address ilike '%peronniers 67%')
      or regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') in ('3225130834', '025130834')
);

select id, slug, name, status, is_premium, lat, lng from public.listings where name ilike '%barmak%';
