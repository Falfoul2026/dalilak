-- Dalilak – 0007 Buy & Sell ("بيع وشراء").
-- Ads are created only by the admin. Buyers contact Yousef (WhatsApp), never the seller,
-- so seller details and the commission live in a separate admin-only table.
-- Run once in the Supabase SQL editor on the existing project.

create type public.ad_category as enum ('business', 'real_estate', 'cars', 'furniture', 'other');
create type public.ad_status   as enum ('active', 'sold', 'hidden');

create table public.ads (
  id          bigint generated always as identity primary key,
  slug        text unique,                      -- "<id>-<latin title>", set on insert
  title       text not null check (char_length(title) between 2 and 140),
  category    public.ad_category not null,
  city        text not null check (char_length(city) between 1 and 80),
  price_eur   numeric(12, 2) check (price_eur >= 0),   -- null = "price on request"
  description text not null default '' check (char_length(description) <= 5000),
  status      public.ad_status not null default 'active',
  cover_path  text,                             -- first photo, kept in sync by the photo functions
  sold_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on public.ads (status, category, created_at desc);
create trigger ads_touch before update on public.ads for each row execute function public.touch_updated_at();

-- Admin-only: who sells, the commission, notes. Never readable by the public.
create table public.ads_private (
  ad_id        bigint primary key references public.ads on delete cascade,
  commission   text check (char_length(commission) <= 200),
  seller_name  text check (char_length(seller_name) <= 120),
  seller_phone text check (char_length(seller_phone) <= 40),
  notes        text check (char_length(notes) <= 2000)
);

create table public.ad_photos (
  id           bigint generated always as identity primary key,
  ad_id        bigint not null references public.ads on delete cascade,
  storage_path text not null unique,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);
create index on public.ad_photos (ad_id, sort_order);

create or replace function public.check_ad_photo_limit()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.ad_photos where ad_id = new.ad_id) >= 8 then
    raise exception 'photo_limit: max 8 photos per ad' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger ad_photos_limit before insert on public.ad_photos for each row execute function public.check_ad_photo_limit();

-- ---------------------------------------------------------------------------
-- RLS: the public sees active and sold ads (and their photos); admin sees all.
-- ---------------------------------------------------------------------------
revoke all on public.ads, public.ads_private, public.ad_photos from anon, authenticated;
grant select on public.ads, public.ad_photos to anon, authenticated;
grant select on public.ads_private to authenticated;   -- admin only (RLS)

alter table public.ads         enable row level security;
alter table public.ads_private enable row level security;
alter table public.ad_photos   enable row level security;

create policy ads_select on public.ads for select
  using (status in ('active', 'sold') or public.is_admin());
create policy ads_private_admin on public.ads_private for select to authenticated
  using (public.is_admin());
create policy ad_photos_select on public.ad_photos for select
  using (exists (select 1 from public.ads a where a.id = ad_id and (a.status in ('active', 'sold') or public.is_admin())));

-- ---------------------------------------------------------------------------
-- Admin functions
-- ---------------------------------------------------------------------------
-- Create (p_id null) or update an ad, including its private fields. Returns the id.
create or replace function public.admin_save_ad(p_id bigint, p jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_id bigint := p_id;
  st public.ad_status := coalesce((p ->> 'status')::public.ad_status, 'active');
  price numeric := nullif(trim(coalesce(p ->> 'price_eur', '')), '')::numeric;
begin
  perform public.assert_admin();
  if v_id is null then
    insert into public.ads (title, category, city, price_eur, description, status, sold_at)
    values (trim(p ->> 'title'), (p ->> 'category')::public.ad_category, trim(p ->> 'city'), price,
            coalesce(p ->> 'description', ''), st, case when st = 'sold' then now() end)
    returning id into v_id;
    update public.ads
       set slug = v_id::text || coalesce('-' || nullif(left(public.slugify(p ->> 'title'), 60), ''), '')
     where id = v_id;
  else
    update public.ads set
      title = trim(p ->> 'title'),
      category = (p ->> 'category')::public.ad_category,
      city = trim(p ->> 'city'),
      price_eur = price,
      description = coalesce(p ->> 'description', ''),
      sold_at = case when st = 'sold' then coalesce(sold_at, now()) else null end,
      status = st
    where id = v_id;
    if not found then raise exception 'ad_not_found'; end if;
  end if;

  insert into public.ads_private (ad_id, commission, seller_name, seller_phone, notes)
  values (v_id, nullif(trim(p ->> 'commission'), ''), nullif(trim(p ->> 'seller_name'), ''),
          nullif(trim(p ->> 'seller_phone'), ''), nullif(trim(p ->> 'notes'), ''))
  on conflict (ad_id) do update set
    commission = excluded.commission, seller_name = excluded.seller_name,
    seller_phone = excluded.seller_phone, notes = excluded.notes;
  return v_id;
end $$;

create or replace function public.admin_set_ad_status(p_id bigint, p_status public.ad_status)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_admin();
  update public.ads
     set status = p_status,
         sold_at = case when p_status = 'sold' then coalesce(sold_at, now()) else null end
   where id = p_id;
end $$;

create or replace function public.refresh_ad_cover(p_ad_id bigint)
returns void language sql security definer set search_path = '' as $$
  update public.ads
     set cover_path = (select storage_path from public.ad_photos where ad_id = p_ad_id order by sort_order, id limit 1)
   where id = p_ad_id
$$;

create or replace function public.admin_add_ad_photo(p_ad_id bigint, p_path text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  new_id bigint;
begin
  perform public.assert_admin();
  if public.path_listing_id(p_path) is distinct from p_ad_id then
    raise exception 'path_must_start_with_ad_id';
  end if;
  insert into public.ad_photos (ad_id, storage_path, sort_order)
  values (p_ad_id, p_path, (select coalesce(max(sort_order), 0) + 1 from public.ad_photos where ad_id = p_ad_id))
  returning id into new_id;
  perform public.refresh_ad_cover(p_ad_id);
  return new_id;
end $$;

create or replace function public.admin_delete_ad_photo(p_photo_id bigint)
returns text language plpgsql security definer set search_path = '' as $$
declare
  ph public.ad_photos;
begin
  perform public.assert_admin();
  delete from public.ad_photos where id = p_photo_id returning * into ph;
  if not found then raise exception 'photo_not_found'; end if;
  perform public.refresh_ad_cover(ph.ad_id);
  return ph.storage_path;
end $$;

-- Make one photo the cover (moves it to the front).
create or replace function public.admin_set_ad_cover(p_photo_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare
  ph public.ad_photos;
begin
  perform public.assert_admin();
  select * into ph from public.ad_photos where id = p_photo_id;
  if not found then raise exception 'photo_not_found'; end if;
  update public.ad_photos set sort_order = (select coalesce(min(sort_order), 0) - 1 from public.ad_photos where ad_id = ph.ad_id)
   where id = p_photo_id;
  perform public.refresh_ad_cover(ph.ad_id);
end $$;

revoke execute on function
  public.admin_save_ad(bigint, jsonb), public.admin_set_ad_status(bigint, public.ad_status),
  public.refresh_ad_cover(bigint), public.admin_add_ad_photo(bigint, text),
  public.admin_delete_ad_photo(bigint), public.admin_set_ad_cover(bigint),
  public.check_ad_photo_limit()
from public, anon, authenticated;

grant execute on function
  public.admin_save_ad(bigint, jsonb), public.admin_set_ad_status(bigint, public.ad_status),
  public.admin_add_ad_photo(bigint, text), public.admin_delete_ad_photo(bigint), public.admin_set_ad_cover(bigint)
to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: public bucket for ad photos (path "<ad_id>/<file>"), admin writes.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ad-photos', 'ad-photos', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "admin uploads ad photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'ad-photos' and public.is_admin() and public.path_listing_id(name) is not null);

create policy "admin deletes ad photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'ad-photos' and public.is_admin());
