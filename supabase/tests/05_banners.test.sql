-- Banner ads (0008).
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

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
select t_err($$ select admin_save_banner(null, '{"title":"Hack"}') $$, 'user cannot create banner');
select t_err($$ insert into storage.objects (bucket_id, name) values ('banners', '1/x.webp') $$, 'user cannot upload');
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
-- running now, with image
select admin_save_banner(null, '{"title":"Now running","link_url":"https://example.be","advertiser_name":"Garage X","price_paid":"150 EUR","notes":"paid cash"}');
select admin_set_banner_image(id, id || '/a.webp') from banners where title = 'Now running';
select t_ok(admin_set_banner_image(id, id || '/b.webp') = id || '/a.webp', 'old image path returned') from banners where title = 'Now running';
-- no image yet
select admin_save_banner(null, '{"title":"No image"}');
-- expired yesterday
select admin_save_banner(null, json_build_object('title', 'Expired', 'ends_on', (today_brussels() - 1)::text)::jsonb);
select admin_set_banner_image(id, id || '/e.webp') from banners where title = 'Expired';
-- ends today (still shown)
select admin_save_banner(null, json_build_object('title', 'Ends today', 'starts_on', (today_brussels() - 5)::text, 'ends_on', today_brussels()::text)::jsonb);
select admin_set_banner_image(id, id || '/t.webp') from banners where title = 'Ends today';
-- starts tomorrow
select admin_save_banner(null, json_build_object('title', 'Tomorrow', 'starts_on', (today_brussels() + 1)::text)::jsonb);
select admin_set_banner_image(id, id || '/f.webp') from banners where title = 'Tomorrow';
-- hidden
select admin_save_banner(null, '{"title":"Hidden one","is_visible":false}');
select admin_set_banner_image(id, id || '/h.webp') from banners where title = 'Hidden one';
select t_err($$ select admin_save_banner(null, '{"title":"Bad link","link_url":"javascript:alert(1)"}') $$, 'only https links');
select t_err($$ select admin_save_banner(null, '{"title":"Bad dates","starts_on":"2026-12-10","ends_on":"2026-12-01"}') $$, 'end before start');
select t_err($$ select admin_set_banner_image(id, '999/x.webp') from banners where title = 'Now running' $$, 'path must match banner');
select t_ok((select count(*) from banners) = 6, 'admin sees all');
select t_ok((select price_paid = '150 EUR' from banners_private p join banners b on b.id = p.banner_id where b.title = 'Now running'), 'private saved');
-- edit keeps private data in sync
select admin_save_banner(id, '{"title":"Now running 2","link_url":"","advertiser_name":"Garage X","price_paid":"200 EUR"}') from banners where title = 'Now running';
select t_ok((select link_url is null and is_visible from banners where title = 'Now running 2'), 'edited, link cleared, visibility kept');
reset role;

set role anon;
select set_config('request.jwt.claim.sub', '', false);
select t_ok((select string_agg(title, ',' order by title) from banners) = 'Ends today,Now running 2', 'public sees only running banners with an image');
select t_err($$ select * from banners_private $$, 'anon cannot read private');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
select t_ok((select count(*) from banners_private) = 0, 'user sees no private rows');
select t_ok((select count(*) from banners) = 2, 'user sees running banners only');
reset role;

drop function public.t_ok(boolean, text);
drop function public.t_err(text, text);
\o
\echo '  ok: 05_banners'
