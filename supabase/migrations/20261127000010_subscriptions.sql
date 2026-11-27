-- Dalilak – 0010 subscriptions for Featured places: owner email, dates, renewals,
-- automatic reminder emails (sent by a Netlify scheduled function) and expiry.
-- Everything here is admin-only; the scheduled function uses the service_role key.
-- Run once in the Supabase SQL editor on the existing project.

-- End of a calendar day in Brussels, as a timestamp (premium is active until then).
create or replace function public.end_of_day_brussels(d date)
returns timestamptz language sql immutable set search_path = '' as $$
  select ((d + 1)::timestamp at time zone 'Europe/Brussels')
$$;

create table public.listing_billing (
  listing_id   bigint primary key references public.listings on delete cascade,
  owner_email  text check (owner_email is null or owner_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  email_lang   text not null default 'ar' check (email_lang in ('ar', 'fr', 'nl', 'en')),
  starts_on    date not null,                 -- first day of the subscription
  period_start date not null,                 -- first day of the current paid period (stats in reminders)
  ends_on      date not null,                 -- last day of the current paid period
  updated_at   timestamptz not null default now(),
  check (ends_on >= period_start and period_start >= starts_on)
);
create trigger listing_billing_touch before update on public.listing_billing
  for each row execute function public.touch_updated_at();

create table public.subscription_log (
  id          bigint generated always as identity primary key,
  listing_id  bigint not null references public.listings on delete cascade,
  action      text not null check (action in ('start', 'update', 'renew', 'expire')),
  old_ends_on date,
  new_ends_on date,
  created_at  timestamptz not null default now()
);
create index on public.subscription_log (listing_id, created_at desc);

create table public.reminder_log (
  id          bigint generated always as identity primary key,
  listing_id  bigint references public.listings on delete set null,
  kind        text not null check (kind in ('reminder', 'test')),
  period_end  date,
  to_email    text,
  status      text not null check (status in ('sending', 'sent', 'error')),
  error       text,
  created_at  timestamptz not null default now(),
  sent_at     timestamptz
);
-- A real reminder can exist only once per listing and period (sending or sent): never twice.
create unique index reminder_once on public.reminder_log (listing_id, period_end)
  where kind = 'reminder' and status in ('sending', 'sent');
create index on public.reminder_log (created_at desc);

-- ---------------------------------------------------------------------------
-- RLS: admin reads; writes only through the functions below (or the service role).
-- ---------------------------------------------------------------------------
revoke all on public.listing_billing, public.subscription_log, public.reminder_log from anon, authenticated;
grant select on public.listing_billing, public.subscription_log, public.reminder_log to authenticated;
alter table public.listing_billing  enable row level security;
alter table public.subscription_log enable row level security;
alter table public.reminder_log     enable row level security;
create policy billing_admin   on public.listing_billing  for select to authenticated using (public.is_admin());
create policy sublog_admin    on public.subscription_log for select to authenticated using (public.is_admin());
create policy reminders_admin on public.reminder_log     for select to authenticated using (public.is_admin());

-- Keeps listings.is_premium / premium_until in line with the billing dates.
create or replace function public.apply_billing(p_listing_id bigint, p_ends_on date)
returns void language sql security definer set search_path = '' as $$
  update public.listings
     set is_premium = p_ends_on >= public.today_brussels(),
         premium_until = public.end_of_day_brussels(p_ends_on),
         is_verified = is_verified or p_ends_on >= public.today_brussels()
   where id = p_listing_id
$$;

-- Create or edit a subscription (dates set by hand). p: owner_email, email_lang, starts_on, ends_on.
create or replace function public.admin_save_subscription(p_listing_id bigint, p jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  old public.listing_billing;
  v_start date := (p ->> 'starts_on')::date;
  v_end   date := (p ->> 'ends_on')::date;
  v_period date;
begin
  perform public.assert_admin();
  if v_start is null or v_end is null then raise exception 'dates_required'; end if;
  if v_end < v_start then raise exception 'end_before_start'; end if;
  select * into old from public.listing_billing where listing_id = p_listing_id;
  -- the current period keeps its start unless the subscription start moves after it
  v_period := case when old.listing_id is null or old.period_start < v_start or old.period_start > v_end
                   then v_start else old.period_start end;
  insert into public.listing_billing (listing_id, owner_email, email_lang, starts_on, period_start, ends_on)
  values (p_listing_id, nullif(trim(p ->> 'owner_email'), ''), coalesce(nullif(p ->> 'email_lang', ''), 'ar'), v_start, v_period, v_end)
  on conflict (listing_id) do update set
    owner_email = excluded.owner_email, email_lang = excluded.email_lang,
    starts_on = excluded.starts_on, period_start = excluded.period_start, ends_on = excluded.ends_on;
  perform public.apply_billing(p_listing_id, v_end);
  insert into public.subscription_log (listing_id, action, old_ends_on, new_ends_on)
  values (p_listing_id, case when old.listing_id is null then 'start' else 'update' end, old.ends_on, v_end);
end $$;

-- "Renew +1 month": from the current end date, or from today if it already ended.
create or replace function public.admin_renew_month(p_listing_id bigint)
returns date language plpgsql security definer set search_path = '' as $$
declare
  b public.listing_billing;
  today date := public.today_brussels();
  v_period date;
  v_end date;
begin
  perform public.assert_admin();
  select * into b from public.listing_billing where listing_id = p_listing_id for update;
  if not found then raise exception 'no_subscription'; end if;
  v_period := case when b.ends_on >= today then b.ends_on + 1 else today end;
  v_end := ((case when b.ends_on >= today then b.ends_on else today end) + interval '1 month')::date;
  update public.listing_billing set period_start = v_period, ends_on = v_end where listing_id = p_listing_id;
  perform public.apply_billing(p_listing_id, v_end);
  insert into public.subscription_log (listing_id, action, old_ends_on, new_ends_on) values (p_listing_id, 'renew', b.ends_on, v_end);
  return v_end;
end $$;

-- Counts for a place between two dates (Brussels days, inclusive). Security invoker:
-- the admin reads listing_events through RLS, the service role bypasses RLS.
create or replace function public.place_stats(p_listing_id bigint, p_from date, p_to date)
returns table (views bigint, calls bigint, directions bigint)
language sql stable set search_path = '' as $$
  select count(*) filter (where kind = 'view'),
         count(*) filter (where kind = 'call'),
         count(*) filter (where kind = 'directions')
    from public.listing_events
   where listing_id = p_listing_id
     and created_at >= (p_from::timestamp at time zone 'Europe/Brussels')
     and created_at <  public.end_of_day_brussels(p_to)
$$;

-- Subscriptions whose end date is 7 days away or closer (catch-up if a daily run was missed)
-- and that have no reminder for the current period yet. For the scheduled function.
create or replace function public.reminders_due()
returns table (listing_id bigint, name text, slug text, owner_email text, email_lang text,
               period_start date, ends_on date, days_left int)
language sql stable set search_path = '' as $$
  select b.listing_id, l.name, l.slug, b.owner_email, b.email_lang, b.period_start, b.ends_on,
         (b.ends_on - public.today_brussels())::int
    from public.listing_billing b
    join public.listings l on l.id = b.listing_id
   where b.owner_email is not null
     and l.status = 'active'
     and b.ends_on between public.today_brussels() and public.today_brussels() + 7
     and not exists (select 1 from public.reminder_log r
                      where r.listing_id = b.listing_id and r.period_end = b.ends_on
                        and r.kind = 'reminder' and r.status in ('sending', 'sent'))
$$;

-- Reserve a reminder before sending. Returns the log id, or null if it is already sent/being sent.
-- Rows stuck in 'sending' for over an hour (crashed run) are marked as errors so a later run can retry.
create or replace function public.claim_reminder(p_listing_id bigint, p_period_end date, p_to text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  new_id bigint;
begin
  update public.reminder_log set status = 'error', error = 'interrupted'
   where status = 'sending' and created_at < now() - interval '1 hour';
  insert into public.reminder_log (listing_id, kind, period_end, to_email, status)
  values (p_listing_id, 'reminder', p_period_end, p_to, 'sending')
  on conflict do nothing
  returning id into new_id;
  return new_id;
end $$;

create or replace function public.finish_reminder(p_id bigint, p_ok boolean, p_error text default null)
returns void language sql security definer set search_path = '' as $$
  update public.reminder_log
     set status = case when p_ok then 'sent' else 'error' end,
         error = case when p_ok then null else left(p_error, 500) end,
         sent_at = case when p_ok then now() end
   where id = p_id
$$;

create or replace function public.log_test_reminder(p_listing_id bigint, p_to text, p_ok boolean, p_error text default null)
returns void language sql security definer set search_path = '' as $$
  insert into public.reminder_log (listing_id, kind, to_email, status, error, sent_at)
  values (p_listing_id, 'test', p_to, case when p_ok then 'sent' else 'error' end, left(p_error, 500), case when p_ok then now() end)
$$;

-- Expiry: unchanged rule (is_premium off one day after the end), now also logged.
-- (premium_active already hides logo/photos the moment premium_until passes.)
create or replace function public.expire_premium()
returns int language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  with gone as (
    update public.listings
       set is_premium = false
     where is_premium and premium_until is not null and premium_until < now() - interval '1 day'
    returning id
  ), logged as (
    insert into public.subscription_log (listing_id, action, old_ends_on)
    select g.id, 'expire', b.ends_on from gone g join public.listing_billing b on b.listing_id = g.id
    returning 1
  )
  select count(*) into n from gone;
  return n;
end $$;

revoke execute on function
  public.apply_billing(bigint, date), public.admin_save_subscription(bigint, jsonb), public.admin_renew_month(bigint),
  public.place_stats(bigint, date, date), public.reminders_due(), public.claim_reminder(bigint, date, text),
  public.finish_reminder(bigint, boolean, text), public.log_test_reminder(bigint, text, boolean, text),
  public.expire_premium(), public.end_of_day_brussels(date)
from public, anon, authenticated;

grant execute on function public.admin_save_subscription(bigint, jsonb), public.admin_renew_month(bigint),
  public.place_stats(bigint, date, date), public.end_of_day_brussels(date)
to authenticated;

grant execute on function public.place_stats(bigint, date, date), public.reminders_due(),
  public.claim_reminder(bigint, date, text), public.finish_reminder(bigint, boolean, text),
  public.log_test_reminder(bigint, text, boolean, text), public.expire_premium(), public.end_of_day_brussels(date)
to service_role;
