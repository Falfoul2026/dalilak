-- Subscriptions, stats, reminders, expiry (0010).
\set QUIET on
\o /dev/null
create or replace function public.t_ok(ok boolean, msg text) returns void language plpgsql as $$
begin if ok is not true then raise exception 'TEST FAILED: %', msg; end if; end $$;
create or replace function public.t_err(stmt text, msg text) returns void language plpgsql as $$
begin
  begin execute stmt; exception when others then return; end;
  raise exception 'TEST FAILED (should have failed): %', msg;
end $$;
grant execute on function public.t_ok(boolean, text), public.t_err(text, text) to anon, authenticated, service_role;

-- fixtures: three places with subscriptions (as admin)
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
-- A: ends in exactly 7 days
select admin_save_subscription(10, json_build_object('owner_email', 'a@shop.be', 'email_lang', 'fr',
  'starts_on', (today_brussels() - 23)::text, 'ends_on', (today_brussels() + 7)::text)::jsonb);
-- B: ends in 20 days (no reminder yet)
select admin_save_subscription(11, json_build_object('owner_email', 'b@shop.be', 'email_lang', 'ar',
  'starts_on', (today_brussels() - 10)::text, 'ends_on', (today_brussels() + 20)::text)::jsonb);
-- C: ended 3 days ago
select admin_save_subscription(12, json_build_object('owner_email', 'c@shop.be', 'email_lang', 'nl',
  'starts_on', (today_brussels() - 40)::text, 'ends_on', (today_brussels() - 3)::text)::jsonb);
select t_err($$ select admin_save_subscription(13, '{"starts_on":"2026-12-10","ends_on":"2026-12-01"}') $$, 'end before start');
select t_err($$ select admin_save_subscription(13, '{"owner_email":"not-an-email","starts_on":"2026-12-01","ends_on":"2026-12-10"}') $$, 'bad email');
select t_err($$ select admin_renew_month(13) $$, 'renew needs a subscription');
reset role;

select t_ok((select is_premium and premium_until = end_of_day_brussels(today_brussels() + 7) from listings where id = 10), 'A featured until end of its last day');
select t_ok((select not is_premium from listings where id = 12), 'C not featured (already ended)');
select t_ok((select count(*) from subscription_log where action = 'start') = 3, 'start logged');

-- non-admins
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
select t_err($$ select admin_save_subscription(10, '{"starts_on":"2026-12-01","ends_on":"2026-12-10"}') $$, 'user cannot save');
select t_err($$ select admin_renew_month(10) $$, 'user cannot renew');
select t_ok((select count(*) from listing_billing) = 0, 'user sees no billing');
select t_ok((select count(*) from reminder_log) = 0, 'user sees no reminder log');
select t_err($$ select * from reminders_due() $$, 'user cannot list due reminders');
select t_err($$ select claim_reminder(10, current_date, 'x@y.be') $$, 'user cannot claim');
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
select t_err($$ select * from listing_billing $$, 'anon cannot read billing');
select t_err($$ select * from place_stats(10, current_date, current_date) $$, 'anon cannot read stats');
reset role;

-- stats (counts only, by Brussels day)
insert into listing_events (listing_id, kind, created_at) values
  (10, 'view', now()), (10, 'view', now()), (10, 'call', now()), (10, 'directions', now()),
  (10, 'view', (today_brussels() - 30)::timestamp at time zone 'Europe/Brussels');   -- before the period
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select t_ok((select views = 2 and calls = 1 and directions = 1 from place_stats(10, today_brussels() - 23, today_brussels())), 'admin stats for the period');
reset role;

-- reminders (as the scheduled function: service role)
set role service_role;
select t_ok((select array_agg(listing_id order by listing_id) from reminders_due()) = '{10}', 'only A is due');
select t_ok((select days_left = 7 and email_lang = 'fr' from reminders_due() where listing_id = 10), 'days left and language');
select t_ok((select views = 2 from place_stats(10, today_brussels() - 23, today_brussels())), 'service role reads stats');
select set_config('t.id', claim_reminder(10, today_brussels() + 7, 'a@shop.be')::text, false);
select t_ok(current_setting('t.id') <> '', 'claimed');
select t_ok(claim_reminder(10, today_brussels() + 7, 'a@shop.be') is null, 'second claim refused (never twice)');
select t_ok(not exists (select 1 from reminders_due() where listing_id = 10), 'not due while sending');
select finish_reminder(current_setting('t.id')::bigint, true);
select t_ok((select status = 'sent' and sent_at is not null from reminder_log where id = current_setting('t.id')::bigint), 'marked sent');
select t_ok(claim_reminder(10, today_brussels() + 7, 'a@shop.be') is null, 'still never twice after sent');
-- a failed send can be retried by a later run
select set_config('t.id2', claim_reminder(11, today_brussels() + 20, 'b@shop.be')::text, false);
select finish_reminder(current_setting('t.id2')::bigint, false, 'smtp down');
select t_ok(claim_reminder(11, today_brussels() + 20, 'b@shop.be') is not null, 'retry after error allowed');
select log_test_reminder(10, 'me@x.be', true);
reset role;
select t_ok((select count(*) from reminder_log where kind = 'test' and status = 'sent') = 1, 'test logged');

-- renew +1 month
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select t_ok(admin_renew_month(10) = ((today_brussels() + 7) + interval '1 month')::date, 'A renewed from its end date');
select t_ok((select period_start = today_brussels() + 8 from listing_billing where listing_id = 10), 'new period starts after old end');
select t_ok(admin_renew_month(12) = (today_brussels() + interval '1 month')::date, 'expired C renewed from today');
reset role;
select t_ok((select is_premium and premium_until > now() from listings where id = 12), 'renewing restores Featured');
select t_ok((select count(*) from subscription_log where action = 'renew') = 2, 'renewals logged');
set role service_role;
select t_ok(not exists (select 1 from reminders_due() where listing_id = 10), 'renewed A no longer due');
reset role;

-- expiry: one day after the end, Featured is removed and logged
update listing_billing set ends_on = today_brussels() - 2, period_start = today_brussels() - 10 where listing_id = 11;
select apply_billing(11, today_brussels() - 2);
update listings set is_premium = true where id = 11;   -- as if the daily job had not run yet
select t_ok((select not premium_active(l) from listings l where id = 11), 'hidden immediately after the end (premium_active)');
set role service_role;
select t_ok(expire_premium() >= 1, 'expired');
reset role;
select t_ok((select not is_premium from listings where id = 11), 'is_premium off');
select t_ok(exists (select 1 from subscription_log where listing_id = 11 and action = 'expire'), 'expiry logged');
set role anon;
select set_config('request.jwt.claim.sub', '', false);
select t_ok((select count(*) from listing_photos where listing_id = 11) = 0, 'no photos when not featured');
reset role;

drop function public.t_ok(boolean, text);
drop function public.t_err(text, text);
\o
\echo '  ok: 08_subscriptions'
