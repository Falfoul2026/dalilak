-- Dalilak – 0006 admin tools: create/edit listings, logo and photos, from the admin panel.
-- Run once in the Supabase SQL editor on the existing project (safe to re-run).

-- ---------------------------------------------------------------------------
-- Create a listing (active straight away, source 'admin'). Returns the new id.
-- ---------------------------------------------------------------------------
create or replace function public.admin_create_listing(p jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  new_id bigint;
begin
  perform public.assert_admin();
  insert into public.listings (slug, name, category, type_label, province, city, address, phone, website,
                               languages, language_verified, status, source, description, offer_text)
  values (
    public.unique_slug(p ->> 'name', p ->> 'city'),
    trim(p ->> 'name'),
    p ->> 'category',
    nullif(trim(p ->> 'type_label'), ''),
    p ->> 'province',
    nullif(trim(p ->> 'city'), ''),
    nullif(trim(p ->> 'address'), ''),
    nullif(trim(p ->> 'phone'), ''),
    nullif(trim(p ->> 'website'), ''),
    coalesce(array(select jsonb_array_elements_text(p -> 'languages')), '{}'),
    coalesce((p ->> 'language_verified')::boolean, true),
    coalesce((p ->> 'status')::public.listing_status, 'active'),
    'admin',
    case when jsonb_typeof(p -> 'description') = 'object' then p -> 'description' else '{}'::jsonb end,
    case when jsonb_typeof(p -> 'offer_text')  = 'object' then p -> 'offer_text'  else '{}'::jsonb end
  )
  returning id into new_id;
  return new_id;
end $$;

-- ---------------------------------------------------------------------------
-- Edit a listing. Only keys present in p are changed. The URL (slug) never
-- changes, so links and Google stay valid when a name is corrected.
-- Featured is changed with admin_set_premium().
-- ---------------------------------------------------------------------------
create or replace function public.admin_update_listing(p_id bigint, p jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_admin();
  update public.listings l set
    name              = case when p ? 'name'       then trim(p ->> 'name') else l.name end,
    category          = case when p ? 'category'   then p ->> 'category' else l.category end,
    type_label        = case when p ? 'type_label' then nullif(trim(p ->> 'type_label'), '') else l.type_label end,
    province          = case when p ? 'province'   then p ->> 'province' else l.province end,
    city              = case when p ? 'city'       then nullif(trim(p ->> 'city'), '') else l.city end,
    address           = case when p ? 'address'    then nullif(trim(p ->> 'address'), '') else l.address end,
    phone             = case when p ? 'phone'      then nullif(trim(p ->> 'phone'), '') else l.phone end,
    website           = case when p ? 'website'    then nullif(trim(p ->> 'website'), '') else l.website end,
    languages         = case when p ? 'languages'  then coalesce(array(select jsonb_array_elements_text(p -> 'languages')), '{}') else l.languages end,
    language_verified = case when p ? 'language_verified' then (p ->> 'language_verified')::boolean else l.language_verified end,
    status            = case when p ? 'status'     then (p ->> 'status')::public.listing_status else l.status end,
    is_verified       = case when p ? 'is_verified' then (p ->> 'is_verified')::boolean else l.is_verified end,
    description       = case when jsonb_typeof(p -> 'description') = 'object' then p -> 'description' else l.description end,
    offer_text        = case when jsonb_typeof(p -> 'offer_text')  = 'object' then p -> 'offer_text'  else l.offer_text  end
  where l.id = p_id;
  if not found then raise exception 'listing_not_found'; end if;
end $$;

-- ---------------------------------------------------------------------------
-- Photos added by the admin are approved immediately.
-- A new logo replaces the old one; the old file paths are returned so the
-- panel can delete them from storage.
-- ---------------------------------------------------------------------------
create or replace function public.admin_add_photo(p_listing_id bigint, p_kind public.photo_kind, p_path text)
returns text[] language plpgsql security definer set search_path = '' as $$
declare
  old_paths text[] := '{}';
  next_order int;
begin
  perform public.assert_admin();
  if public.path_listing_id(p_path) is distinct from p_listing_id then
    raise exception 'path_must_start_with_listing_id';
  end if;
  if p_kind = 'logo' then
    with gone as (
      delete from public.listing_photos where listing_id = p_listing_id and kind = 'logo' returning storage_path
    ) select coalesce(array_agg(storage_path), '{}') into old_paths from gone;
  end if;
  select coalesce(max(sort_order), 0) + 1 into next_order
    from public.listing_photos where listing_id = p_listing_id and kind = p_kind;
  insert into public.listing_photos (listing_id, kind, storage_path, sort_order, status)
  values (p_listing_id, p_kind, p_path, next_order, 'approved');
  if p_kind = 'logo' then
    update public.listings set logo_path = p_path where id = p_listing_id;
  end if;
  return old_paths;
end $$;

-- Removes the photo row and returns its storage path (the panel deletes the file).
create or replace function public.admin_delete_photo(p_photo_id bigint)
returns text language plpgsql security definer set search_path = '' as $$
declare
  ph public.listing_photos;
begin
  perform public.assert_admin();
  delete from public.listing_photos where id = p_photo_id returning * into ph;
  if not found then raise exception 'photo_not_found'; end if;
  if ph.kind = 'logo' then
    update public.listings set logo_path = null where id = ph.listing_id and logo_path = ph.storage_path;
  end if;
  return ph.storage_path;
end $$;

-- Admin may upload into any listing folder of the bucket (deleting was already allowed).
drop policy if exists "admin uploads photos" on storage.objects;
create policy "admin uploads photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'listing-photos'
    and public.is_admin()
    and public.path_listing_id(name) is not null
  );

revoke execute on function
  public.admin_create_listing(jsonb),
  public.admin_update_listing(bigint, jsonb),
  public.admin_add_photo(bigint, public.photo_kind, text),
  public.admin_delete_photo(bigint)
from public, anon;

grant execute on function
  public.admin_create_listing(jsonb),
  public.admin_update_listing(bigint, jsonb),
  public.admin_add_photo(bigint, public.photo_kind, text),
  public.admin_delete_photo(bigint)
to authenticated;
