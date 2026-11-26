-- Buy & Sell (0007).
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

-- non-admins cannot write
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
select t_err($$ select admin_save_ad(null, '{"title":"Hack","category":"cars","city":"Gent"}') $$, 'user cannot create ad');
select t_err($$ insert into ads (title, category, city) values ('Hack', 'cars', 'Gent') $$, 'no direct insert');
select t_err($$ insert into storage.objects (bucket_id, name) values ('ad-photos', '1/x.webp') $$, 'user cannot upload');
reset role;

-- admin creates ads
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select admin_save_ad(null, '{"title":"Toyota Corolla 2018","category":"cars","city":"Bruxelles","price_eur":"8500",
  "description":"نظيفة","commission":"5%","seller_name":"Ali","seller_phone":"0470 11 22 33","notes":"call after 6"}');
select admin_save_ad(null, '{"title":"محل حلويات للبيع","category":"business","city":"Liège","price_eur":"","status":"active"}');
select admin_save_ad(null, '{"title":"Hidden sofa","category":"furniture","city":"Antwerpen","price_eur":"100","status":"hidden"}');
select t_ok((select slug from ads where title = 'Toyota Corolla 2018') = (select id || '-toyota-corolla-2018' from ads where title = 'Toyota Corolla 2018'), 'latin slug');
select t_ok((select slug from ads where title = 'محل حلويات للبيع') = (select id::text from ads where title = 'محل حلويات للبيع'), 'arabic title -> id slug');
select t_ok((select price_eur is null from ads where title = 'محل حلويات للبيع'), 'empty price -> null');
select t_ok((select commission = '5%' and seller_phone = '0470 11 22 33' from ads_private p join ads a on a.id = p.ad_id where a.title = 'Toyota Corolla 2018'), 'private saved');
select t_err($$ select admin_save_ad(null, '{"title":"X car","category":"boats","city":"Gent"}') $$, 'unknown category');
-- update keeps slug, sold sets sold_at
select admin_save_ad(id, '{"title":"Toyota Corolla 2018 (prix réduit)","category":"cars","city":"Bruxelles","price_eur":"7900","status":"sold","commission":"400 EUR"}')
  from ads where title = 'Toyota Corolla 2018';
select t_ok((select slug like '%-toyota-corolla-2018' and price_eur = 7900 and status = 'sold' and sold_at is not null from ads where title like 'Toyota%'), 'updated, slug kept, sold');
select t_ok((select commission = '400 EUR' and seller_name is null from ads_private p join ads a on a.id = p.ad_id where a.title like 'Toyota%'), 'private updated');
select admin_set_ad_status(id, 'active') from ads where title like 'Toyota%';
select t_ok((select status = 'active' and sold_at is null from ads where title like 'Toyota%'), 'back to active');
-- photos
insert into storage.objects (bucket_id, name) select 'ad-photos', id || '/a.webp' from ads where title like 'Toyota%';
select admin_add_ad_photo(id, id || '/p' || g || '.webp') from ads, generate_series(1, 8) g where title like 'Toyota%';
select t_err($$ select admin_add_ad_photo(id, id || '/p9.webp') from ads where title like 'Toyota%' $$, 'max 8');
select t_err($$ select admin_add_ad_photo(id, '999/x.webp') from ads where title like 'Toyota%' $$, 'path must match ad');
select t_ok((select cover_path like '%/p1.webp' from ads where title like 'Toyota%'), 'cover = first photo');
select admin_set_ad_cover((select p.id from ad_photos p join ads a on a.id = p.ad_id where a.title like 'Toyota%' and p.storage_path like '%/p5.webp'));
select t_ok((select cover_path like '%/p5.webp' from ads where title like 'Toyota%'), 'cover changed');
select t_ok(admin_delete_ad_photo((select p.id from ad_photos p join ads a on a.id = p.ad_id where a.title like 'Toyota%' and p.storage_path like '%/p5.webp')) like '%/p5.webp', 'delete returns path');
select t_ok((select cover_path like '%/p1.webp' from ads where title like 'Toyota%'), 'cover falls back');
reset role;

-- public view
set role anon;
select set_config('request.jwt.claim.sub', '', false);
select t_ok((select count(*) from ads) = 2, 'public sees active (and sold), not hidden');
select t_ok((select count(*) from ad_photos) = 7, 'public sees photos of visible ads');
select t_err($$ select * from ads_private $$, 'anon cannot read private');
select t_err($$ select admin_save_ad(null, '{"title":"Hack","category":"cars","city":"Gent"}') $$, 'anon cannot create');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
select t_ok((select count(*) from ads_private) = 0, 'user sees no private rows');
select t_ok((select count(*) from ads) = 2, 'user sees visible ads only');
reset role;

drop function public.t_ok(boolean, text);
drop function public.t_err(text, text);
\o
\echo '  ok: 04_market'
