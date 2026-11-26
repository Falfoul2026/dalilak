-- Admin panel functions (0006).
\set QUIET on
\o /dev/null
create or replace function public.t_ok(ok boolean, msg text) returns void language plpgsql as $$
begin if ok is not true then raise exception 'TEST FAILED: %', msg; end if; end $$;
create or replace function public.t_err(stmt text, msg text) returns void language plpgsql as $$
begin
  begin execute stmt; exception when others then return; end;
  raise exception 'TEST FAILED (should have failed): %', msg;
end $$;
grant execute on function public.t_ok(boolean, text), public.t_err(text, text) to anon, authenticated;

-- users from 01_rls: ...0a = admin, ...01 = owner of listing 2, ...02 = user
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
select t_err($$ select admin_create_listing('{"name":"Hack","category":"food","province":"brussels"}') $$, 'user cannot create');
select t_err($$ select admin_update_listing(3, '{"name":"Hack"}') $$, 'user cannot edit');
select t_err($$ select admin_add_photo(3, 'gallery', '3/x.webp') $$, 'user cannot add photo');
select t_err($$ insert into storage.objects (bucket_id, name) values ('listing-photos', '3/x.webp') $$, 'user cannot upload');
reset role;

set role anon;
select set_config('request.jwt.claim.sub', '', false);
select t_err($$ select admin_create_listing('{"name":"Hack","category":"food","province":"brussels"}') $$, 'anon cannot create');
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
-- create
select admin_create_listing('{"name":"Chez Test Shawarma","category":"food","province":"antwerp","city":"Antwerpen",
  "address":"Teststraat 1, 2000 Antwerpen","phone":"03 000 00 00","website":"https://example.be","type_label":"مطعم سوري",
  "languages":["ar","nl"],"description":{"ar":"شاورما","nl":"Shoarma"},"offer_text":{"ar":"خصم ١٠٪"}}');
select t_ok((select status = 'active' and source = 'admin' and slug = 'chez-test-shawarma-antwerpen' and languages = '{ar,nl}'
             and description ->> 'nl' = 'Shoarma' and not is_premium from listings where name = 'Chez Test Shawarma'), 'created');
select t_err($$ select admin_create_listing('{"name":"X shop","category":"pizza","province":"brussels"}') $$, 'unknown category rejected');
-- edit (slug stays)
select admin_update_listing((select id from listings where name = 'Chez Test Shawarma'),
  '{"name":"Chez Test Shawarma 2","phone":"","languages":["ar"],"status":"hidden"}');
select t_ok((select slug = 'chez-test-shawarma-antwerpen' and phone is null and languages = '{ar}' and status = 'hidden'
             and address is not null from listings where name = 'Chez Test Shawarma 2'), 'edited, other fields kept, slug kept');
select admin_update_listing((select id from listings where name = 'Chez Test Shawarma 2'), '{"status":"active"}');
-- featured on/off
select admin_set_premium((select id from listings where name = 'Chez Test Shawarma 2'), true, null);
select t_ok((select is_premium and premium_until is null from listings where name = 'Chez Test Shawarma 2'), 'featured on');
-- photos: upload + register
insert into storage.objects (bucket_id, name) select 'listing-photos', id || '/logo-a.webp' from listings where name = 'Chez Test Shawarma 2';
select t_ok(admin_add_photo(id, 'logo', id || '/logo-a.webp') = '{}', 'first logo') from listings where name = 'Chez Test Shawarma 2';
select t_ok(admin_add_photo(id, 'logo', id || '/logo-b.webp') = array[id || '/logo-a.webp'], 'logo replaced, old path returned') from listings where name = 'Chez Test Shawarma 2';
select t_ok((select logo_path = id || '/logo-b.webp' from listings where name = 'Chez Test Shawarma 2'), 'logo_path updated');
select admin_add_photo(id, 'gallery', id || '/g' || g || '.webp') from listings, generate_series(1, 8) g where name = 'Chez Test Shawarma 2';
select t_err($$ select admin_add_photo(id, 'gallery', id || '/g9.webp') from listings where name = 'Chez Test Shawarma 2' $$, 'max 8 gallery');
select t_err($$ select admin_add_photo(3, 'gallery', '4/x.webp') $$, 'path must match listing');
select t_ok(admin_delete_photo((select min(p.id) from listing_photos p join listings l on l.id = p.listing_id
                                where l.name = 'Chez Test Shawarma 2' and p.kind = 'gallery')) like '%/g1.webp', 'delete returns path');
select t_ok(admin_delete_photo((select id from listing_photos where storage_path like '%/logo-b.webp')) like '%logo-b.webp', 'delete logo');
select t_ok((select logo_path is null from listings where name = 'Chez Test Shawarma 2'), 'logo_path cleared');
reset role;

set role anon;
select set_config('request.jwt.claim.sub', '', false);
select t_ok((select count(*) from listing_photos p join listings l on l.id = p.listing_id where l.name = 'Chez Test Shawarma 2') = 7, 'public sees 7 approved photos');
select t_ok(exists (select 1 from featured_listings() where name = 'Chez Test Shawarma 2'), 'in Our Favourites');
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select admin_set_premium((select id from listings where name = 'Chez Test Shawarma 2'), false);
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
select t_ok(not exists (select 1 from featured_listings() where name = 'Chez Test Shawarma 2'), 'featured off');
select t_ok((select count(*) from listing_photos p join listings l on l.id = p.listing_id where l.name = 'Chez Test Shawarma 2') = 0, 'photos hidden when not featured');
select t_ok(exists (select 1 from listings where name = 'Chez Test Shawarma 2'), 'listing stays');
reset role;

drop function public.t_ok(boolean, text);
drop function public.t_err(text, text);
\o
\echo '  ok: 03_admin'
