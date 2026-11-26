-- Dalilak – 0004 storage: bucket for premium logos and gallery photos.
-- Path layout: listing-photos/<listing_id>/<file>.webp  (public read, max 3 MB)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-photos', 'listing-photos', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create or replace function public.path_listing_id(p_name text)
returns bigint language sql immutable set search_path = '' as $$
  select case when split_part(p_name, '/', 1) ~ '^[0-9]{1,18}$'
              then split_part(p_name, '/', 1)::bigint end
$$;
grant execute on function public.path_listing_id(text) to authenticated;

create policy "premium owner uploads photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'listing-photos'
    and public.owns_listing(public.path_listing_id(name))
    and public.listing_premium(public.path_listing_id(name))
  );

create policy "owner or admin deletes photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'listing-photos'
    and (public.owns_listing(public.path_listing_id(name)) or public.is_admin())
  );
