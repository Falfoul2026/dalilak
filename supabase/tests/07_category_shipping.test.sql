-- New category "shipping" (0009).
\set QUIET on
\o /dev/null
\i supabase/migrations/20261127000009_category_shipping.sql
do $t$ begin
  if (select count(*) from public.categories) <> 10 then raise exception 'TEST FAILED: 10 categories'; end if;
  if (select name_ar from public.categories where slug = 'shipping') <> 'شحن ونقل أثاث' then raise exception 'TEST FAILED: arabic name'; end if;
  if (select name_en from public.categories where slug = 'travel') <> 'Travel & money transfer' then raise exception 'TEST FAILED: travel unchanged'; end if;
end $t$;
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select admin_create_listing('{"name":"Test Déménagement","category":"shipping","province":"brussels","city":"Anderlecht"}');
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $t$ begin
  if (select count(*) from public.search_listings(null, 'shipping')) <> 1 then raise exception 'TEST FAILED: filter by shipping'; end if;
  if (select count(*) from public.search_listings('نقل أثاث')) < 1 then raise exception 'TEST FAILED: search by category name'; end if;
end $t$;
reset role;
\o
\echo '  ok: 07_category_shipping'
