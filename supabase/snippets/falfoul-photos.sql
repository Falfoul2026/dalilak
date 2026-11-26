-- M et Mme Falfoul (listing 1): logo + 7 gallery photos, approved.
-- 1. Supabase → Storage → bucket "listing-photos" → create folder "1" → upload the 8 .webp files.
-- 2. SQL Editor → paste this → Run. Safe to run more than once.
-- Only adds rows that are missing (the max-8 check runs on every insert attempt).
insert into public.listing_photos (listing_id, kind, storage_path, sort_order, status)
select 1, v.kind::public.photo_kind, v.path, v.ord, 'approved'
  from (values
    ('logo',    '1/logo.webp',                 0),
    ('gallery', '1/photo-1-mansaf.webp',       1),
    ('gallery', '1/photo-2-pie.webp',          2),
    ('gallery', '1/photo-3-dessert.webp',      3),
    ('gallery', '1/photo-4-sweet-potato.webp', 4),
    ('gallery', '1/photo-5-hummus.webp',       5),
    ('gallery', '1/photo-6-grape-leaves.webp', 6),
    ('gallery', '1/photo-7-mixed-grill.webp',  7)
  ) as v(kind, path, ord)
 where not exists (select 1 from public.listing_photos p where p.storage_path = v.path);

update public.listing_photos set status = 'approved'
 where listing_id = 1 and storage_path like '1/%.webp';

update public.listings set logo_path = '1/logo.webp' where id = 1;

select kind, count(*) from public.listing_photos where listing_id = 1 group by kind;
