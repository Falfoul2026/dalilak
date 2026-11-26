-- Dalilak – 0008 paid banner ads ("إعلاناتكم").
-- Banners are created only by the admin. A banner is public only while it is visible and
-- today (Brussels time) is between its start and end dates, so it hides itself after the end date.
-- Advertiser name, price and notes live in an admin-only table.
-- Run once in the Supabase SQL editor on the existing project.

create table public.banners (
  id         bigint generated always as identity primary key,
  title      text not null check (char_length(title) between 2 and 120),
  image_path text,                                  -- storage path in bucket "banners"
  link_url   text check (link_url is null or link_url ~* '^https://'),
  starts_on  date,                                  -- null = from now
  ends_on    date,                                  -- null = no end
  is_visible boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
create trigger banners_touch before update on public.banners for each row execute function public.touch_updated_at();

create table public.banners_private (
  banner_id       bigint primary key references public.banners on delete cascade,
  advertiser_name text check (char_length(advertiser_name) <= 120),
  price_paid      text check (char_length(price_paid) <= 100),
  notes           text check (char_length(notes) <= 2000)
);

-- Today in Belgium (banners switch at local midnight, not UTC).
create or replace function public.today_brussels()
returns date language sql stable set search_path = '' as $$
  select (now() at time zone 'Europe/Brussels')::date
$$;

revoke all on public.banners, public.banners_private from anon, authenticated;
grant select on public.banners to anon, authenticated;
grant select on public.banners_private to authenticated;   -- admin only (RLS)

alter table public.banners         enable row level security;
alter table public.banners_private enable row level security;

create policy banners_select on public.banners for select
  using (
    (is_visible
     and image_path is not null
     and (starts_on is null or starts_on <= public.today_brussels())
     and (ends_on is null or ends_on >= public.today_brussels()))
    or public.is_admin()
  );
create policy banners_private_admin on public.banners_private for select to authenticated
  using (public.is_admin());

-- Create (p_id null) or update a banner and its private fields. Returns the id.
create or replace function public.admin_save_banner(p_id bigint, p jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_id bigint := p_id;
begin
  perform public.assert_admin();
  if v_id is null then
    insert into public.banners (title, link_url, starts_on, ends_on, is_visible, sort_order)
    values (trim(p ->> 'title'), nullif(trim(p ->> 'link_url'), ''),
            nullif(p ->> 'starts_on', '')::date, nullif(p ->> 'ends_on', '')::date,
            coalesce((p ->> 'is_visible')::boolean, true), coalesce(nullif(p ->> 'sort_order', '')::int, 0))
    returning id into v_id;
  else
    update public.banners set
      title = trim(p ->> 'title'),
      link_url = nullif(trim(p ->> 'link_url'), ''),
      starts_on = nullif(p ->> 'starts_on', '')::date,
      ends_on = nullif(p ->> 'ends_on', '')::date,
      is_visible = coalesce((p ->> 'is_visible')::boolean, is_visible),
      sort_order = coalesce(nullif(p ->> 'sort_order', '')::int, sort_order)
    where id = v_id;
    if not found then raise exception 'banner_not_found'; end if;
  end if;

  insert into public.banners_private (banner_id, advertiser_name, price_paid, notes)
  values (v_id, nullif(trim(p ->> 'advertiser_name'), ''), nullif(trim(p ->> 'price_paid'), ''), nullif(trim(p ->> 'notes'), ''))
  on conflict (banner_id) do update set
    advertiser_name = excluded.advertiser_name, price_paid = excluded.price_paid, notes = excluded.notes;
  return v_id;
end $$;

-- Set the banner image; returns the previous path so the panel can delete that file.
create or replace function public.admin_set_banner_image(p_id bigint, p_path text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  old_path text;
begin
  perform public.assert_admin();
  if public.path_listing_id(p_path) is distinct from p_id then
    raise exception 'path_must_start_with_banner_id';
  end if;
  select image_path into old_path from public.banners where id = p_id for update;
  if not found then raise exception 'banner_not_found'; end if;
  update public.banners set image_path = p_path where id = p_id;
  return old_path;
end $$;

revoke execute on function public.admin_save_banner(bigint, jsonb), public.admin_set_banner_image(bigint, text)
  from public, anon, authenticated;
grant execute on function public.admin_save_banner(bigint, jsonb), public.admin_set_banner_image(bigint, text)
  to authenticated;
grant execute on function public.today_brussels() to anon, authenticated;

-- Storage: public bucket "banners" (path "<banner_id>/<file>"), admin writes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('banners', 'banners', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "admin uploads banners"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'banners' and public.is_admin() and public.path_listing_id(name) is not null);

create policy "admin deletes banners"
  on storage.objects for delete to authenticated
  using (bucket_id = 'banners' and public.is_admin());
