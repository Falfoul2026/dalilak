-- Minimal stand-in for what Supabase provides, so migrations and RLS can be
-- tested on a plain local Postgres. NOT for production.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb default '{}'::jsonb
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean,
  file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets, name text, owner uuid);
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated;
grant select, insert, delete on storage.objects to anon, authenticated;
create schema extensions;
grant usage on schema extensions to anon, authenticated, service_role;
-- Supabase gives the API roles ALL on new public tables by default; mimic it
-- so the migrations' own revokes/grants are what is actually tested.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
grant all on schema public to anon, authenticated, service_role;
