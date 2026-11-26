-- Database tests: data import, RLS, user flows, admin flows.
\set QUIET on
\o /dev/null
create or replace function public.t_assert(ok boolean, msg text) returns void language plpgsql as $$
begin
  if ok is not true then raise exception 'TEST FAILED: %', msg; end if;
end $$;
grant execute on function public.t_assert(boolean, text) to anon, authenticated;

-- expects the statement to fail
create or replace function public.t_fails(stmt text, msg text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    return;
  end;
  raise exception 'TEST FAILED (should have failed): %', msg;
end $$;
grant execute on function public.t_fails(text, text) to anon, authenticated;

create or replace function public.t_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', coalesce(uid::text, ''), false)
$$;
grant execute on function public.t_as(uuid) to anon, authenticated;

-- ---------------------------------------------------------------- import
select t_assert((select count(*) from listings) = 266, 'all listings imported');
select t_assert((select count(*) from listings where not language_verified and languages = '{}') = 62, '62 unverified');
select t_assert((select is_premium and premium_until is null and is_verified from listings where id = 1), 'Falfoul premium forever');
select t_assert((select count(*) from listings where is_premium) = 1, 'only Falfoul premium');
select t_assert((select province from listings where id = 56) = 'flemish-brabant', 'Grimbergen province');
select t_assert((select count(distinct slug) from listings) = 266, 'unique slugs');
select t_assert((select slug = 'smoke-house-chef-khalil-bruxelles' and category = 'food' and not is_premium from listings where id = 266), 'Smoke House imported');
select t_assert((select slug from listings where id = 1) = 'm-et-mme-falfoul-bruxelles', 'slug of id 1: ' || (select slug from listings where id = 1));
select t_assert((select status from listings where id = 1) = 'active', 'active');
select t_assert(nextval(pg_get_serial_sequence('public.listings', 'id')) > 266, 'sequence after import');

-- users
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@test.be', '{"display_name":"Yousef"}'),
  ('00000000-0000-0000-0000-000000000001', 'u1@test.be',    '{"display_name":"Sara","lang":"fr"}'),
  ('00000000-0000-0000-0000-000000000002', 'u2@test.be',    '{}');
select t_assert((select count(*) from profiles) = 3, 'profiles created by trigger');
select t_assert((select preferred_lang from profiles where id = '00000000-0000-0000-0000-000000000001') = 'fr', 'lang from metadata');
select bootstrap_admin('ADMIN@test.be');
select t_assert((select role from profiles where id = '00000000-0000-0000-0000-00000000000a') = 'admin', 'bootstrap admin');
select t_assert((select owner_id from listings where id = 1) = '00000000-0000-0000-0000-00000000000a', 'Falfoul linked to admin');

-- ---------------------------------------------------------------- visitor
set role anon;
select t_as(null);
select t_assert((select count(*) from listings) = 266, 'anon sees active listings');
select t_fails($$ insert into listings (slug, name, category, province, source) values ('x','xx','food','brussels','owner') $$, 'anon cannot insert listing');
select t_fails($$ update listings set is_premium = true where id = 2 $$, 'anon cannot update');
select t_fails($$ delete from listings where id = 2 $$, 'anon cannot delete');
select t_fails($$ select * from profiles $$, 'anon cannot read profiles');
select t_fails($$ select * from reports $$, 'anon cannot read reports');
select t_fails($$ select * from subscriptions $$, 'anon cannot read subscriptions');
select t_fails($$ select * from listing_events $$, 'anon cannot read events');
select t_fails($$ select submit_listing('X shop','food','brussels','Bxl','a','1') $$, 'anon cannot submit listing');
select t_fails($$ select bootstrap_admin('u1@test.be') $$, 'anon cannot bootstrap admin');
select t_fails($$ select admin_set_premium(2, true) $$, 'anon cannot set premium');
insert into reports (listing_id, kind, message, contact_email) values (2, 'wrong_info', 'phone is wrong', 'a@b.be');
select t_fails($$ insert into reports (listing_id, kind, message, status) values (2, 'other', 'xxxx', 'resolved') $$, 'anon cannot set report status');
select t_fails($$ insert into reports (listing_id, kind, message, reporter_id) values (2, 'other', 'xxxx', '00000000-0000-0000-0000-000000000001') $$, 'anon cannot spoof reporter');
select track_event(2, 'call');
select log_search('مطعم', null, null, 3);
select t_assert((select count(*) from listing_photos) = 0, 'no photos visible');
-- search & ranking
select t_assert(exists (select 1 from search_listings('مطعم سوري') where name = 'Baladi'), 'arabic type search');
select t_assert(exists (select 1 from search_listings('baladi') where name = 'Baladi'), 'latin name search');
select t_assert(exists (select 1 from search_listings('اردني') where id = 1), 'alef normalisation (أردني)');
select t_assert((select count(*) from search_listings('Restaurants', p_limit => 100)) >= 45, 'category name search (fr/en)');
select t_assert((select count(*) from search_listings(null, 'food', 'brussels', p_limit => 100)) > 0, 'filters');
select t_assert((select id from search_listings(null, 'food', null) limit 1) = 1, 'premium boosted first in its category');
select t_assert((select id from search_listings(null, 'food', null, false) limit 1) <> 1, 'no boost when p_boost=false');
select t_assert(not exists (select 1 from top_rated() where id = 1), 'top rated ignores payment (Falfoul has no rating yet)');
select t_assert((select count(*) from top_rated(p_limit => 100)) = 100, 'top rated returns');
select t_assert((select array_agg(id) from featured_listings()) = '{1}', 'featured = premium only');
reset role;
select t_assert((select count(*) from reports where reporter_role = 'visitor' and reporter_id is null and status = 'new') = 1, 'visitor report stored');
select t_assert((select count(*) from listing_events) = 1, 'event stored');

-- ---------------------------------------------------------------- user u1
set role authenticated;
select t_as('00000000-0000-0000-0000-000000000001');
select t_assert((select count(*) from profiles) = 1, 'user sees only own profile');
select t_fails($$ update profiles set role = 'admin' where id = auth.uid() $$, 'cannot change own role');
update profiles set display_name = 'Sara K' where id = auth.uid();
select t_fails($$ select submit_listing('Doc X','doc','brussels','Bxl','a','1') $$, 'doctor needs languages');
select submit_listing('Smoke Test Grill', 'food', 'brussels', 'Bruxelles', 'Rue X 1', '0470000000', '{ar,fr}');
select t_assert((select status from listings where name = 'Smoke Test Grill') = 'pending', 'own pending listing visible to owner');
select t_assert((select slug from listings where name = 'Smoke Test Grill') = 'smoke-test-grill-bruxelles', 'slug');
insert into favorites (listing_id) values (2), (3);
select t_assert((select count(*) from favorites) = 2, 'favorites');
select t_fails($$ insert into favorites (user_id, listing_id) values ('00000000-0000-0000-0000-000000000002', 4) $$, 'cannot favourite for others');
insert into reviews (listing_id, stars, text) values (3, 5, 'ممتاز');
select t_fails($$ insert into reviews (listing_id, stars) values (3, 4) $$, 'one review per listing');
select t_fails($$ insert into reviews (listing_id, stars, status) values (4, 4, 'hidden') $$, 'cannot set review status');
select t_fails($$ update reviews set owner_reply = 'x' $$, 'cannot write owner reply directly');
update reviews set stars = 4 where listing_id = 3;
select t_assert((select app_reviews_count = 1 and app_rating_avg = 4 from listings where id = 3), 'rating sync');
insert into reports (review_id, kind, message) values (null, 'other', 'hello admin');
select t_assert((select reporter_role from reports) = 'user', 'user report role, sees only own');
insert into claims (listing_id, proof_note) values (2, 'I am the owner, KBO 0123');
select t_fails($$ select admin_decide_claim(1, true) $$, 'user cannot approve claim');
select t_fails($$ insert into listing_edits (listing_id, changes) values (2, '{"phone":"1"}') $$, 'no edits before claim approved');
select t_fails($$ select reply_to_review(1, 'thanks') $$, 'not owner, cannot reply');

-- ---------------------------------------------------------------- admin
select t_as('00000000-0000-0000-0000-00000000000a');
select t_assert((select count(*) from reports) = 2, 'admin sees all reports');
select t_assert((select count(*) from listings) = 267, 'admin sees pending too');
select admin_decide_claim((select id from claims where listing_id = 2), true, 'ok');
select admin_approve_listing((select id from listings where name = 'Smoke Test Grill'));
select admin_update_report((select min(id) from reports), 'resolved', 'fixed phone');
reset role;
select t_assert((select owner_id from listings where id = 2) = '00000000-0000-0000-0000-000000000001', 'claim approved -> owner');
select t_assert((select role from profiles where id = '00000000-0000-0000-0000-000000000001') = 'owner', 'role owner');
select t_assert((select status from listings where name = 'Smoke Test Grill') = 'active', 'listing approved');

-- ---------------------------------------------------------------- owner u1
set role authenticated;
select t_as('00000000-0000-0000-0000-000000000001');
insert into listing_edits (listing_id, changes) values (2, '{"phone":"0466 00 00 00","is_premium":true,"description":{"ar":"وصف"}}');
select t_fails($$ insert into listing_edits (listing_id, changes) values (3, '{"phone":"1"}') $$, 'cannot edit others');
select t_fails($$ insert into listing_photos (listing_id, storage_path) values (2, '2/a.webp') $$, 'free listing: no photos');
select t_fails($$ insert into storage.objects (bucket_id, name) values ('listing-photos', '2/a.webp') $$, 'free listing: no storage upload');
select t_fails($$ select owner_stats(2) $$, 'stats only for premium');
reset role;

set role authenticated;
select t_as('00000000-0000-0000-0000-00000000000a');
select admin_decide_edit((select id from listing_edits), true);
select admin_set_premium(2, true, now() + interval '30 days');
reset role;
select t_assert((select phone = '0466 00 00 00' and description->>'ar' = 'وصف' from listings where id = 2), 'edit applied');
select t_assert((select is_premium and is_verified from listings where id = 2), 'premium on (and not via edit json)');

set role authenticated;
select t_as('00000000-0000-0000-0000-000000000001');
insert into storage.objects (bucket_id, name) values ('listing-photos', '2/logo.webp');
select t_fails($$ insert into storage.objects (bucket_id, name) values ('listing-photos', '3/x.webp') $$, 'upload only to own listing');
select t_fails($$ insert into storage.objects (bucket_id, name) values ('listing-photos', '../2/x.webp') $$, 'bad path');
insert into listing_photos (listing_id, kind, storage_path) values (2, 'logo', '2/logo.webp');
select t_fails($$ insert into listing_photos (listing_id, kind, storage_path) values (2, 'logo', '2/logo2.webp') $$, 'one logo');
insert into listing_photos (listing_id, storage_path) select 2, '2/g' || g || '.webp' from generate_series(1, 8) g;
select t_fails($$ insert into listing_photos (listing_id, storage_path) values (2, '2/g9.webp') $$, 'max 8 gallery photos');
select t_fails($$ insert into listing_photos (listing_id, storage_path, status) values (2, '2/z.webp', 'approved') $$, 'cannot self-approve');
select t_fails($$ insert into listing_photos (listing_id, storage_path) values (2, '3/z.webp') $$, 'path must match listing');
select t_assert((select count(*) from owner_stats(2)) = 1, 'owner stats when premium');
select t_fails($$ insert into reviews (listing_id, stars) values (2, 5) $$, 'no self review');
reset role;

set role authenticated;
select t_as('00000000-0000-0000-0000-000000000002');
insert into reviews (listing_id, stars, text) values (2, 2, 'bad service');
select t_fails($$ select reply_to_review((select id from reviews where listing_id = 2), 'x') $$, 'other user cannot reply');
select t_fails($$ insert into claims (listing_id) values (2) $$, 'cannot claim owned listing');
select t_assert((select count(*) from listing_photos where listing_id = 2) = 0, 'pending photos not public');
select t_assert((select count(*) from reviews where user_id <> auth.uid()) = 1, 'sees visible reviews of others');
reset role;

set role authenticated;
select t_as('00000000-0000-0000-0000-000000000001');
select reply_to_review((select id from reviews where listing_id = 2), 'نعتذر، نحاول نتحسن');
select t_fails($$ select reply_to_review((select id from reviews where listing_id = 2), 'again') $$, 'reply only once');
reset role;

set role authenticated;
select t_as('00000000-0000-0000-0000-00000000000a');
select admin_decide_photo((select id from listing_photos where kind = 'logo'), true);
select admin_decide_photo((select id from listing_photos where storage_path = '2/g1.webp'), true);
select admin_set_review_status((select id from reviews where listing_id = 2), 'hidden');
reset role;
select t_assert((select logo_path from listings where id = 2) = '2/logo.webp', 'logo approved');
select t_assert((select app_reviews_count from listings where id = 2) = 0, 'hidden review leaves rating');

set role anon;
select t_as(null);
select t_assert((select count(*) from listing_photos where listing_id = 2) = 2, 'approved photos public while premium');
select t_assert((select count(*) from listing_reviews(2)) = 0, 'hidden review not public');
select t_assert((select count(*) from listing_reviews(3)) = 1 and (select author from listing_reviews(3)) = 'Sara K', 'reviews with author name');
select t_assert((select count(*) from featured_listings()) = 2, 'featured has 2 now');
reset role;

-- ---------------------------------------------------------------- expiry
update listings set premium_until = now() - interval '3 days' where id = 2;
select t_assert(expire_premium() = 1, 'expired one');
select t_assert((select not is_premium and status = 'active' from listings where id = 2), 'listing stays after premium ends');
select t_assert((select is_premium from listings where id = 1), 'Falfoul never expires');
set role anon;
select t_as(null);
select t_assert((select count(*) from listing_photos where listing_id = 2) = 0, 'photos hidden after premium ends');
reset role;

-- hidden listing invisible
set role authenticated;
select t_as('00000000-0000-0000-0000-00000000000a');
select admin_set_listing_status(5, 'hidden');
reset role;
set role anon;
select t_as(null);
select t_assert(not exists (select 1 from listings where id = 5), 'hidden listing not public');
reset role;

drop function public.t_assert(boolean, text);
drop function public.t_fails(text, text);
drop function public.t_as(uuid);
\o
\echo '  ok: 01_rls'
