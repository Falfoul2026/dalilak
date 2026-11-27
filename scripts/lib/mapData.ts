// Maps raw entries of data/dalilak-data.json to listing rows and to SQL.
// Pure functions so they can be unit-tested.

export interface RawEntry {
  id: number
  n: string            // name
  c: string            // category slug
  p: string            // province (French name)
  city?: string
  t?: string           // Arabic type label
  a?: string | null    // address
  ph?: string | null   // phone
  w?: string | null    // website
  r?: number | null    // Google rating
  rv?: number | null   // Google review count
  d?: string | null    // Arabic description
  v?: number           // 1 = Arabic not confirmed
}

export const CATEGORY_SLUGS = ['food', 'meat', 'sweets', 'legal', 'doc', 'cloth', 'beauty', 'travel', 'shipping', 'edu'] as const

export const PROVINCE_MAP: Record<string, string> = {
  'Bruxelles-Capitale': 'brussels',
  'Anvers': 'antwerp',
  'Liège': 'liege',
  'Brabant flamand': 'flemish-brabant',
  'Brabant wallon': 'walloon-brabant',
  'Flandre-Orientale': 'east-flanders',
  'Flandre-Occidentale': 'west-flanders',
  'Limbourg': 'limburg',
  'Hainaut': 'hainaut',
  'Namur': 'namur',
  'Luxembourg': 'luxembourg',
}

/** Listing id 1 is M et Mme Falfoul: premium with no expiry. */
export const PREMIUM_FOREVER_IDS = new Set([1])

export interface ListingRow {
  id: number
  name: string
  category: string
  type_label: string | null
  province: string
  city: string | null
  address: string | null
  phone: string | null
  website: string | null
  rating_google: number | null
  reviews_google: number
  languages: string[]
  language_verified: boolean
  is_premium: boolean
  is_verified: boolean
  description: Record<string, string>
}

const clean = (s: string | null | undefined) => {
  const v = (s ?? '').trim()
  return v === '' ? null : v
}

export function mapEntry(e: RawEntry): ListingRow {
  if (!Number.isInteger(e.id) || e.id < 1) throw new Error(`bad id: ${JSON.stringify(e.id)}`)
  if (!clean(e.n)) throw new Error(`entry ${e.id}: missing name`)
  if (!(CATEGORY_SLUGS as readonly string[]).includes(e.c)) throw new Error(`entry ${e.id}: unknown category "${e.c}"`)
  const province = PROVINCE_MAP[e.p]
  if (!province) throw new Error(`entry ${e.id}: unknown province "${e.p}"`)
  const unverified = e.v === 1
  const premium = PREMIUM_FOREVER_IDS.has(e.id)
  const rating = typeof e.r === 'number' && e.r >= 0 && e.r <= 5 ? Math.round(e.r * 10) / 10 : null
  return {
    id: e.id,
    name: clean(e.n)!,
    category: e.c,
    type_label: clean(e.t),
    province,
    city: clean(e.city),
    address: clean(e.a),
    phone: clean(e.ph),
    website: clean(e.w),
    rating_google: rating,
    reviews_google: typeof e.rv === 'number' && e.rv > 0 ? Math.round(e.rv) : 0,
    languages: unverified ? [] : ['ar'],
    language_verified: !unverified,
    is_premium: premium,
    is_verified: premium,
    description: clean(e.d) ? { ar: clean(e.d)! } : {},
  }
}

export function mapAll(entries: RawEntry[]): ListingRow[] {
  const seen = new Set<number>()
  return entries.map((e) => {
    if (seen.has(e.id)) throw new Error(`duplicate id ${e.id}`)
    seen.add(e.id)
    return mapEntry(e)
  })
}

export const lit = (v: string | null) => (v === null ? 'null' : `'${v.replace(/'/g, "''")}'`)
const num = (v: number | null) => (v === null ? 'null' : String(v))
const arr = (a: string[]) => `${lit(`{${a.join(',')}}`)}::text[]`

/**
 * Idempotent upsert. Re-running never duplicates rows and never overwrites a
 * listing that has an owner or was created/edited outside the Google import.
 * Status, premium and slug are only set on first insert.
 */
export function rowToSql(r: ListingRow): string {
  return `insert into public.listings (id, slug, name, category, type_label, province, city, address, phone, website,
  rating_google, reviews_google, languages, language_verified, status, is_premium, premium_until, is_verified, description, source)
values (${r.id}, public.unique_slug(${lit(r.name)}, ${lit(r.city)}), ${lit(r.name)}, ${lit(r.category)}, ${lit(r.type_label)},
  ${lit(r.province)}, ${lit(r.city)}, ${lit(r.address)}, ${lit(r.phone)}, ${lit(r.website)},
  ${num(r.rating_google)}, ${r.reviews_google}, ${arr(r.languages)}, ${r.language_verified}, 'active',
  ${r.is_premium}, null, ${r.is_verified}, ${lit(JSON.stringify(r.description))}::jsonb, 'google_maps')
on conflict (id) do update set
  name = excluded.name, category = excluded.category, type_label = excluded.type_label,
  province = excluded.province, city = excluded.city, address = excluded.address, phone = excluded.phone,
  website = excluded.website, rating_google = excluded.rating_google, reviews_google = excluded.reviews_google,
  languages = excluded.languages, language_verified = excluded.language_verified
where public.listings.source = 'google_maps' and public.listings.owner_id is null;`
}

/**
 * Idempotent upsert as one DO block reading a JSON array (small enough to
 * paste in the Supabase SQL editor). Same rules as rowToSql.
 */
export function buildImportSql(rows: ListingRow[]): string {
  const json = JSON.stringify(rows)
  if (json.includes('$dalilak$')) throw new Error('data contains the SQL quote tag')
  return `-- Dalilak data import (generated by scripts/import-data.ts). Safe to run more than once.
do $import$
declare
  r record;
begin
  for r in
    select * from jsonb_to_recordset($dalilak$${json}$dalilak$::jsonb) as x(
      id bigint, name text, category text, type_label text, province text, city text, address text,
      phone text, website text, rating_google numeric, reviews_google int, languages text[],
      language_verified boolean, is_premium boolean, is_verified boolean, description jsonb)
  loop
    insert into public.listings (id, slug, name, category, type_label, province, city, address, phone, website,
      rating_google, reviews_google, languages, language_verified, status, is_premium, premium_until,
      is_verified, description, source)
    values (r.id, public.unique_slug(r.name, r.city), r.name, r.category, r.type_label, r.province, r.city,
      r.address, r.phone, r.website, r.rating_google, r.reviews_google, coalesce(r.languages, '{}'),
      r.language_verified, 'active', r.is_premium, null, r.is_verified, coalesce(r.description, '{}'), 'google_maps')
    on conflict (id) do update set
      name = excluded.name, category = excluded.category, type_label = excluded.type_label,
      province = excluded.province, city = excluded.city, address = excluded.address, phone = excluded.phone,
      website = excluded.website, rating_google = excluded.rating_google, reviews_google = excluded.reviews_google,
      languages = excluded.languages, language_verified = excluded.language_verified
    where public.listings.source = 'google_maps' and public.listings.owner_id is null;
  end loop;
  perform setval(pg_get_serial_sequence('public.listings', 'id'), (select max(id) from public.listings));
end
$import$;
`
}
