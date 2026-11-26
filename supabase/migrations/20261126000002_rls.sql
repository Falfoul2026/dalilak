-- Dalilak – 0002 row level security and grants.
-- Principle: tables are read through RLS; anything that needs extra checks
-- (status changes, approvals, owner replies) goes through SECURITY DEFINER
-- functions in 0003. Admin actions always go through those functions.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

-- Computed column: usable from the API as  select=*,premium_active
create or replace function public.premium_active(l public.listings)
returns boolean language sql stable set search_path = '' as $$
  select l.is_premium and (l.premium_until is null or l.premium_until > now())
$$;

create or replace function public.owns_listing(p_listing_id bigint)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.listings where id = p_listing_id and owner_id = auth.uid())
$$;

create or replace function public.listing_premium(p_listing_id bigint)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select public.premium_active(l) from public.listings l where l.id = p_listing_id), false)
$$;

-- ---------------------------------------------------------------------------
-- Grants: start from nothing, then open exactly what the app needs.
-- ---------------------------------------------------------------------------
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant usage on schema public to anon, authenticated;

grant select on public.categories, public.provinces, public.listings,
                public.listing_photos, public.reviews, public.short_links
  to anon, authenticated;

grant insert (listing_id, review_id, kind, message, contact_email) on public.reports to anon, authenticated;

grant select, insert, update, delete on public.categories, public.provinces, public.short_links to authenticated; -- admin only (RLS)
grant select, update (display_name, preferred_lang)                  on public.profiles       to authenticated;
grant select, delete, insert (user_id, listing_id)                   on public.favorites      to authenticated;
grant delete, insert (listing_id, user_id, stars, text),
              update (stars, text)                                   on public.reviews        to authenticated;
grant select                                                         on public.reports        to authenticated;
grant select, insert (listing_id, user_id, proof_note)               on public.claims         to authenticated;
grant select, insert (listing_id, owner_id, changes)                 on public.listing_edits  to authenticated;
grant delete, insert (listing_id, kind, storage_path, sort_order)    on public.listing_photos to authenticated;
grant select                                                         on public.subscriptions  to authenticated;
grant select, delete, insert (user_id, token, platform)              on public.push_tokens    to authenticated;
-- listing_events / search_log: written only through track_event() / log_search().

-- Every table has RLS on.
alter table public.categories     enable row level security;
alter table public.provinces      enable row level security;
alter table public.profiles       enable row level security;
alter table public.listings       enable row level security;
alter table public.listing_photos enable row level security;
alter table public.listing_edits  enable row level security;
alter table public.favorites      enable row level security;
alter table public.reviews        enable row level security;
alter table public.reports        enable row level security;
alter table public.claims         enable row level security;
alter table public.subscriptions  enable row level security;
alter table public.listing_events enable row level security;
alter table public.search_log     enable row level security;
alter table public.push_tokens    enable row level security;
alter table public.short_links    enable row level security;

-- ---------------------------------------------------------------------------
-- Lookups: everyone reads, admin writes.
-- ---------------------------------------------------------------------------
create policy categories_read  on public.categories  for select using (true);
create policy categories_admin on public.categories  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy provinces_read   on public.provinces   for select using (true);
create policy provinces_admin  on public.provinces   for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy short_links_read  on public.short_links for select using (true);
create policy short_links_admin on public.short_links for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Profiles: own row (admin sees all). Role cannot be changed by the user:
-- only display_name / preferred_lang are granted for update.
-- ---------------------------------------------------------------------------
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- Listings: visitors see active ones; owners also see their own pending /
-- hidden ones; admin sees all. No direct writes (see submit_listing(),
-- approve_*() and listing_edits).
-- ---------------------------------------------------------------------------
create policy listings_select on public.listings for select
  using (status = 'active' or owner_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- Photos: public sees approved photos of listings with active premium.
-- Owner of a premium listing may add photos (pending) and delete own photos.
-- ---------------------------------------------------------------------------
create policy photos_select on public.listing_photos for select
  using (
    (status = 'approved' and public.listing_premium(listing_id))
    or public.owns_listing(listing_id)
    or public.is_admin()
  );
create policy photos_insert on public.listing_photos for insert to authenticated
  with check (
    status = 'pending'
    and public.owns_listing(listing_id)
    and public.listing_premium(listing_id)
    and storage_path like listing_id::text || '/%'
  );
create policy photos_delete on public.listing_photos for delete to authenticated
  using (public.owns_listing(listing_id) or public.is_admin());

-- ---------------------------------------------------------------------------
-- Owner edit requests
-- ---------------------------------------------------------------------------
create policy edits_select on public.listing_edits for select to authenticated
  using (owner_id = auth.uid() or public.is_admin());
create policy edits_insert on public.listing_edits for insert to authenticated
  with check (
    owner_id = auth.uid()
    and status = 'pending'
    and admin_note is null
    and decided_at is null
    and public.owns_listing(listing_id)
  );

-- ---------------------------------------------------------------------------
-- Favorites ("محفوظاتي")
-- ---------------------------------------------------------------------------
create policy favorites_own on public.favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Reviews: everyone reads visible ones; author sees own; one per listing.
-- Owner reply and hiding go through functions.
-- ---------------------------------------------------------------------------
create policy reviews_select on public.reviews for select
  using (status = 'visible' or user_id = auth.uid() or public.is_admin());
create policy reviews_insert on public.reviews for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'visible'
    and owner_reply is null
    and exists (select 1 from public.listings l where l.id = listing_id and l.status = 'active')
    and not public.owns_listing(listing_id)          -- no self-reviews
  );
create policy reviews_update on public.reviews for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy reviews_delete on public.reviews for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- Reports (complaints box): anyone can send; reporter fields are filled by
-- a trigger so nobody can spoof them. Reporter sees own; admin sees all.
-- ---------------------------------------------------------------------------
create policy reports_insert on public.reports for insert
  with check (status = 'new' and admin_note is null);
create policy reports_select on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

create or replace function public.reports_fill_reporter()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  r public.user_role;
begin
  new.reporter_id := auth.uid();
  if new.reporter_id is null then
    new.reporter_role := 'visitor';
  else
    select role into r from public.profiles where id = new.reporter_id;
    new.reporter_role := case when r in ('owner', 'admin') then 'owner'::public.reporter_role
                              else 'user'::public.reporter_role end;
  end if;
  new.status := 'new';
  new.admin_note := null;
  new.created_at := now();
  return new;
end $$;

create trigger reports_fill
  before insert on public.reports
  for each row execute function public.reports_fill_reporter();

-- ---------------------------------------------------------------------------
-- Claims ("Is this your business?")
-- ---------------------------------------------------------------------------
create policy claims_select on public.claims for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy claims_insert on public.claims for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and admin_note is null
    and exists (select 1 from public.listings l where l.id = listing_id and l.owner_id is null)
  );

-- ---------------------------------------------------------------------------
-- Subscriptions: owner reads own; only the Stripe webhook (service role,
-- which bypasses RLS) writes.
-- ---------------------------------------------------------------------------
create policy subscriptions_select on public.subscriptions for select to authenticated
  using (owner_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- Statistics: admin reads raw rows; owners get aggregates via owner_stats().
-- ---------------------------------------------------------------------------
create policy events_admin on public.listing_events for select to authenticated using (public.is_admin());
create policy search_admin on public.search_log     for select to authenticated using (public.is_admin());
grant select on public.listing_events, public.search_log to authenticated;

-- ---------------------------------------------------------------------------
-- Push tokens
-- ---------------------------------------------------------------------------
create policy push_own on public.push_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
