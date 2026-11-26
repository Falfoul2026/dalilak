\set QUIET on
\o /dev/null
\i supabase/snippets/add-al-barmaki.sql
\i supabase/snippets/add-al-barmaki.sql
do $t$ begin
  if (select count(*) from public.listings where name ilike '%barmak%') <> 1 then raise exception 'TEST FAILED: exactly one Barmaki'; end if;
  if (select slug from public.listings where name ilike '%barmak%') <> 'al-barmaki-bruxelles' then raise exception 'TEST FAILED: slug'; end if;
  if (select is_premium or status <> 'active' or lat is null or language_verified from public.listings where name ilike '%barmak%') then raise exception 'TEST FAILED: fields'; end if;
end $t$;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $t$ begin
  if (select count(*) from public.search_listings('البرمكي')) <> 1 then raise exception 'TEST FAILED: arabic search'; end if;
  if (select count(*) from public.search_listings('barmaki')) <> 1 then raise exception 'TEST FAILED: latin search'; end if;
end $t$;
reset role;
\o
\echo '  ok: 06_al_barmaki'
