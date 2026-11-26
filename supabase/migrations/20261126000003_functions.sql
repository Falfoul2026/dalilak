-- Dalilak – 0003 functions: listing queries, user actions, admin actions,
-- statistics and premium expiry.

-- ---------------------------------------------------------------------------
-- Slugs
-- ---------------------------------------------------------------------------
create or replace function public.unique_slug(p_name text, p_city text)
returns text language plpgsql stable set search_path = '' as $$
declare
  base text := public.slugify(coalesce(p_name, '') || ' ' || coalesce(p_city, ''));
  candidate text;
  n int := 1;
begin
  if base = '' then base := 'listing'; end if;
  base := left(base, 80);
  candidate := base;
  while exists (select 1 from public.listings where slug = candidate) loop
    n := n + 1;
    candidate := base || '-' || n;
  end loop;
  return candidate;
end $$;

-- ---------------------------------------------------------------------------
-- Ranking helpers (computed columns: select=*,rating_score)
-- Bayesian average of Google rating + app reviews, so a listing with one
-- 5-star review does not beat one with 4.7 from 2000 reviews.
-- Payment never enters this score.
-- ---------------------------------------------------------------------------
create or replace function public.rating_score(l public.listings)
returns numeric language sql stable set search_path = '' as $$
  with g as (
    select coalesce(
             sum(coalesce(rating_google, 0) * reviews_google + coalesce(app_rating_avg, 0) * app_reviews_count)
             / nullif(sum(reviews_google + app_reviews_count), 0),
             4.0) as c
      from public.listings where status = 'active'
  )
  select round(
           (coalesce(l.rating_google, 0) * l.reviews_google
            + coalesce(l.app_rating_avg, 0) * l.app_reviews_count
            + g.c * 20)
           / (l.reviews_google + l.app_reviews_count + 20), 3)
    from g
$$;

-- ---------------------------------------------------------------------------
-- Search / lists
-- ---------------------------------------------------------------------------
-- Home list and search. With p_boost, active premium listings come first
-- (the UI always labels them "مميّز / Featured"); then Google rating and count.
create or replace function public.search_listings(
  q          text    default null,
  p_category text    default null,
  p_province text    default null,
  p_boost    boolean default true,
  p_limit    int     default 50,
  p_offset   int     default 0
)
returns setof public.listings
language sql stable set search_path = '' as $$
  with params as (select nullif(public.normalize_text(trim(q)), '') as nq)
  select l.*
    from public.listings l
    join public.categories c on c.slug = l.category
    cross join params p
   where l.status = 'active'
     and (p_category is null or l.category = p_category)
     and (p_province is null or l.province = p_province)
     and (p.nq is null
          or l.search_doc like '%' || p.nq || '%'
          or extensions.word_similarity(p.nq, l.search_doc) > 0.45
          or public.normalize_text(c.name_ar || ' ' || c.name_fr || ' ' || c.name_nl || ' ' || c.name_en)
               like '%' || p.nq || '%')
   order by
     case when p_boost and public.premium_active(l) then 0 else 1 end,
     case when p.nq is not null and l.search_doc like '%' || p.nq || '%' then 0 else 1 end,
     l.rating_google desc nulls last,
     l.reviews_google desc,
     l.id
   limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0)
$$;

-- "الأعلى تقييماً": rating only, never payment.
create or replace function public.top_rated(
  p_category text default null,
  p_province text default null,
  p_limit    int  default 50
)
returns setof public.listings
language sql stable set search_path = '' as $$
  select l.*
    from public.listings l
   where l.status = 'active'
     and (l.reviews_google + l.app_reviews_count) > 0
     and (p_category is null or l.category = p_category)
     and (p_province is null or l.province = p_province)
   order by public.rating_score(l) desc, (l.reviews_google + l.app_reviews_count) desc, l.id
   limit least(greatest(p_limit, 1), 100)
$$;

-- "خياراتنا المفضلة": active premium only, shuffled by a seed the client
-- changes (per visit / per hour) so every premium business gets equal exposure.
create or replace function public.featured_listings(
  p_category text default null,
  p_province text default null,
  p_seed     text default null,
  p_limit    int  default 20
)
returns setof public.listings
language sql stable set search_path = '' as $$
  select l.*
    from public.listings l
   where l.status = 'active'
     and public.premium_active(l)
     and (p_category is null or l.category = p_category)
     and (p_province is null or l.province = p_province)
   order by md5(l.id::text || coalesce(p_seed, to_char(now(), 'YYYYMMDDHH24')))
   limit least(greatest(p_limit, 1), 100)
$$;

-- Visible reviews with the author's display name (profiles stay private).
create or replace function public.listing_reviews(p_listing_id bigint)
returns table (
  id bigint, stars smallint, text text, author text,
  owner_reply text, owner_replied_at timestamptz, created_at timestamptz, is_mine boolean
)
language sql stable security definer set search_path = '' as $$
  select r.id, r.stars, r.text, coalesce(p.display_name, ''), r.owner_reply, r.owner_replied_at,
         r.created_at, r.user_id = auth.uid()
    from public.reviews r
    join public.listings l on l.id = r.listing_id and l.status = 'active'
    left join public.profiles p on p.id = r.user_id
   where r.listing_id = p_listing_id and r.status = 'visible'
   order by r.created_at desc
$$;

-- ---------------------------------------------------------------------------
-- User actions
-- ---------------------------------------------------------------------------
-- "Add your business": login required, goes to pending; submitter becomes
-- the owner once the admin approves it.
create or replace function public.submit_listing(
  p_name      text,
  p_category  text,
  p_province  text,
  p_city      text,
  p_address   text,
  p_phone     text,
  p_languages text[] default '{}',
  p_website   text   default null
)
returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  needs_lang boolean;
  new_id bigint;
begin
  if auth.uid() is null then
    raise exception 'login_required' using errcode = '42501';
  end if;
  select requires_languages into needs_lang from public.categories where slug = p_category;
  if not found then
    raise exception 'unknown_category';
  end if;
  if needs_lang and coalesce(array_length(p_languages, 1), 0) = 0 then
    raise exception 'languages_required';
  end if;
  if (select count(*) from public.listings
       where owner_id = auth.uid() and status = 'pending') >= 5 then
    raise exception 'too_many_pending';
  end if;

  insert into public.listings (slug, name, category, province, city, address, phone, website,
                               languages, language_verified, status, source, owner_id)
  values (public.unique_slug(p_name, p_city), trim(p_name), p_category, p_province,
          nullif(trim(p_city), ''), nullif(trim(p_address), ''), nullif(trim(p_phone), ''),
          nullif(trim(p_website), ''), coalesce(p_languages, '{}'), true, 'pending', 'owner', auth.uid())
  returning id into new_id;
  return new_id;
end $$;

-- Owner replies once to a review on their listing.
create or replace function public.reply_to_review(p_review_id bigint, p_text text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.reviews r
     set owner_reply = left(trim(p_text), 1000), owner_replied_at = now()
   where r.id = p_review_id
     and r.owner_reply is null
     and public.owns_listing(r.listing_id);
  if not found then
    raise exception 'reply_not_allowed';
  end if;
end $$;

-- Anonymous counters (call, directions, website, share, view).
create or replace function public.track_event(p_listing_id bigint, p_kind public.event_kind)
returns void
language sql security definer set search_path = '' as $$
  insert into public.listing_events (listing_id, kind)
  select id, p_kind from public.listings where id = p_listing_id and status = 'active'
$$;

create or replace function public.log_search(q text, p_category text, p_province text, p_results int)
returns void
language sql security definer set search_path = '' as $$
  insert into public.search_log (query, category, province, results)
  values (left(nullif(trim(q), ''), 100), p_category, p_province, p_results)
$$;

-- Owner statistics (premium) or admin.
create or replace function public.owner_stats(p_listing_id bigint, p_days int default 30)
returns table (kind public.event_kind, total bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.is_admin() or (public.owns_listing(p_listing_id) and public.listing_premium(p_listing_id))) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return query
    select e.kind, count(*)
      from public.listing_events e
     where e.listing_id = p_listing_id
       and e.created_at > now() - make_interval(days => least(greatest(p_days, 1), 365))
     group by e.kind;
end $$;

-- ---------------------------------------------------------------------------
-- Admin actions (each checks is_admin()).
-- ---------------------------------------------------------------------------
create or replace function public.assert_admin()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'admin_only' using errcode = '42501';
  end if;
end $$;

create or replace function public.admin_set_listing_status(p_listing_id bigint, p_status public.listing_status)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_admin();
  update public.listings set status = p_status where id = p_listing_id;
end $$;

-- Grant or remove premium by hand (e.g. M et Mme Falfoul, promos).
-- p_until null = no expiry.
create or replace function public.admin_set_premium(p_listing_id bigint, p_on boolean, p_until timestamptz default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_admin();
  update public.listings
     set is_premium = p_on,
         premium_until = case when p_on then p_until else null end,
         is_verified = p_on or is_verified
   where id = p_listing_id;
end $$;

create or replace function public.admin_decide_claim(p_claim_id bigint, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  c public.claims;
begin
  perform public.assert_admin();
  select * into c from public.claims where id = p_claim_id and status = 'pending' for update;
  if not found then raise exception 'claim_not_pending'; end if;

  update public.claims
     set status = case when p_approve then 'approved' else 'rejected' end::public.request_status,
         admin_note = p_note, decided_at = now()
   where id = p_claim_id;

  if p_approve then
    update public.listings set owner_id = c.user_id where id = c.listing_id;
    update public.profiles set role = 'owner' where id = c.user_id and role = 'user';
    -- other pending claims on the same listing are closed
    update public.claims set status = 'rejected', admin_note = 'listing_claimed', decided_at = now()
     where listing_id = c.listing_id and status = 'pending';
  end if;
end $$;

-- Approve a new listing from "Add your business": becomes active and the
-- submitter becomes an owner.
create or replace function public.admin_approve_listing(p_listing_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid;
begin
  perform public.assert_admin();
  update public.listings set status = 'active' where id = p_listing_id and status = 'pending'
  returning owner_id into uid;
  if uid is not null then
    update public.profiles set role = 'owner' where id = uid and role = 'user';
  end if;
end $$;

-- Owner edit requests: only these keys can ever be applied.
create or replace function public.admin_decide_edit(p_edit_id bigint, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  e public.listing_edits;
  ch jsonb;
begin
  perform public.assert_admin();
  select * into e from public.listing_edits where id = p_edit_id and status = 'pending' for update;
  if not found then raise exception 'edit_not_pending'; end if;

  if p_approve then
    ch := e.changes;
    update public.listings l set
      name        = coalesce(nullif(trim(ch ->> 'name'), ''), l.name),
      phone       = case when ch ? 'phone'   then nullif(trim(ch ->> 'phone'), '')   else l.phone   end,
      website     = case when ch ? 'website' then nullif(trim(ch ->> 'website'), '') else l.website end,
      address     = case when ch ? 'address' then nullif(trim(ch ->> 'address'), '') else l.address end,
      city        = case when ch ? 'city'    then nullif(trim(ch ->> 'city'), '')    else l.city    end,
      languages   = case when ch ? 'languages'
                         then array(select jsonb_array_elements_text(ch -> 'languages'))
                         else l.languages end,
      language_verified = case when ch ? 'languages' then true else l.language_verified end,
      description = case when jsonb_typeof(ch -> 'description') = 'object' then ch -> 'description' else l.description end,
      offer_text  = case when jsonb_typeof(ch -> 'offer_text')  = 'object' then ch -> 'offer_text'  else l.offer_text  end
    where l.id = e.listing_id;
  end if;

  update public.listing_edits
     set status = case when p_approve then 'approved' else 'rejected' end::public.request_status,
         admin_note = p_note, decided_at = now()
   where id = p_edit_id;
end $$;

create or replace function public.admin_decide_photo(p_photo_id bigint, p_approve boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  ph public.listing_photos;
begin
  perform public.assert_admin();
  update public.listing_photos
     set status = case when p_approve then 'approved' else 'rejected' end::public.request_status
   where id = p_photo_id
  returning * into ph;
  if not found then raise exception 'photo_not_found'; end if;
  if p_approve and ph.kind = 'logo' then
    -- one approved logo at a time
    update public.listing_photos set status = 'rejected'
     where listing_id = ph.listing_id and kind = 'logo' and status = 'approved' and id <> ph.id;
    update public.listings set logo_path = ph.storage_path where id = ph.listing_id;
  end if;
end $$;

create or replace function public.admin_set_review_status(p_review_id bigint, p_status public.review_status)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_admin();
  update public.reviews set status = p_status where id = p_review_id;
end $$;

create or replace function public.admin_update_report(p_report_id bigint, p_status public.report_status, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_admin();
  update public.reports set status = p_status, admin_note = coalesce(p_note, admin_note) where id = p_report_id;
end $$;

-- ---------------------------------------------------------------------------
-- Premium expiry. Listings stay; only is_premium is switched off.
-- ---------------------------------------------------------------------------
create or replace function public.expire_premium()
returns int language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  update public.listings
     set is_premium = false
   where is_premium and premium_until is not null and premium_until < now() - interval '1 day';
  get diagnostics n = row_count;
  return n;
end $$;

-- Run it daily with pg_cron when available (it is on Supabase).
-- If pg_cron cannot be enabled here, enable it in Dashboard → Integrations → Cron
-- and run the cron.schedule line by hand.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    execute $cron$ select cron.schedule('dalilak-expire-premium', '17 3 * * *', 'select public.expire_premium()') $cron$;
  end if;
exception when others then
  raise notice 'pg_cron not scheduled: %', sqlerrm;
end $$;

-- ---------------------------------------------------------------------------
-- First admin. Run once in the Supabase SQL editor after signing up:
--   select public.bootstrap_admin('you@example.com');
-- It also links listing 1 (M et Mme Falfoul) to that account.
-- ---------------------------------------------------------------------------
create or replace function public.bootstrap_admin(p_email text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  uid uuid;
begin
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid is null then
    raise exception 'no user with this email – sign up first';
  end if;
  insert into public.profiles (id) values (uid) on conflict (id) do nothing;
  update public.profiles set role = 'admin' where id = uid;
  update public.listings set owner_id = uid where id = 1;
  return 'ok: ' || uid::text;
end $$;

-- ---------------------------------------------------------------------------
-- Execute rights. Supabase grants EXECUTE to PUBLIC by default; close that
-- and open only what the app calls.
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function
  public.normalize_text(text), public.slugify(text),
  public.premium_active(public.listings), public.rating_score(public.listings),
  public.search_listings(text, text, text, boolean, int, int),
  public.top_rated(text, text, int),
  public.featured_listings(text, text, text, int),
  public.listing_reviews(bigint),
  public.track_event(bigint, public.event_kind),
  public.log_search(text, text, text, int),
  -- used inside RLS policies, so callers need execute on them
  public.is_admin(), public.owns_listing(bigint), public.listing_premium(bigint)
to anon, authenticated;

grant execute on function
  public.submit_listing(text, text, text, text, text, text, text[], text),
  public.reply_to_review(bigint, text),
  public.owner_stats(bigint, int),
  public.admin_set_listing_status(bigint, public.listing_status),
  public.admin_set_premium(bigint, boolean, timestamptz),
  public.admin_decide_claim(bigint, boolean, text),
  public.admin_approve_listing(bigint),
  public.admin_decide_edit(bigint, boolean, text),
  public.admin_decide_photo(bigint, boolean),
  public.admin_set_review_status(bigint, public.review_status),
  public.admin_update_report(bigint, public.report_status, text)
to authenticated;
-- bootstrap_admin, expire_premium, unique_slug: postgres / service_role only.
