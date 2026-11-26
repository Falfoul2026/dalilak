
-- snippet: Falfoul photos (run twice: idempotent, stays within limits)
\i supabase/snippets/falfoul-photos.sql
\i supabase/snippets/falfoul-photos.sql
\o /dev/null
do $$ begin
  if (select count(*) from public.listing_photos where listing_id = 1 and kind = 'gallery' and status = 'approved') <> 7 then raise exception 'TEST FAILED: 7 gallery photos'; end if;
  if (select logo_path from public.listings where id = 1) <> '1/logo.webp' then raise exception 'TEST FAILED: logo path'; end if;
end $$;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$ begin
  if (select count(*) from public.listing_photos where listing_id = 1) <> 8 then raise exception 'TEST FAILED: public sees photos of premium listing'; end if;
end $$;
reset role;
\o
\echo '  ok: 02_snippets'
