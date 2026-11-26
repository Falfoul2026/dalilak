// All reads of listing data go through here.
import { supabase } from './supabase'
import type { Filters, Listing, Photo, Review } from './types'

/** Columns sent to the browser (no search_doc, no timestamps). */
export const LISTING_COLUMNS =
  'id,slug,name,category,type_label,province,city,address,phone,website,rating_google,reviews_google,lat,lng,languages,' +
  'language_verified,status,is_premium,premium_until,is_verified,logo_path,description,offer_text,owner_id,source,' +
  'app_rating_avg,app_reviews_count,premium_active'

export const PAGE_SIZE = 30

function db() {
  if (!supabase) throw new Error('supabase_not_configured')
  return supabase
}

/** Home list / search: subscribed (premium) listings first – the UI labels them "مميّز" – then Google rating.
 *  Not used by "الأعلى تقييماً", which ranks by real ratings only (top_rated). */
export async function searchListings(f: Filters, offset = 0, limit = PAGE_SIZE): Promise<Listing[]> {
  const { data, error } = await db()
    .rpc('search_listings', {
      q: f.q.trim() || null,
      p_category: f.category,
      p_province: f.province,
      p_boost: true,
      p_limit: limit,
      p_offset: offset,
    })
    .select(LISTING_COLUMNS)
  if (error) throw error
  return data as unknown as Listing[]
}

export async function topRated(category: string | null, province: string | null, limit = 50): Promise<Listing[]> {
  const { data, error } = await db()
    .rpc('top_rated', { p_category: category, p_province: province, p_limit: limit })
    .select(LISTING_COLUMNS)
  if (error) throw error
  return data as unknown as Listing[]
}

/** Premium only, shuffled by `seed` so every premium business gets equal exposure. */
export async function featuredListings(seed: string, category: string | null = null, province: string | null = null, limit = 20): Promise<Listing[]> {
  const { data, error } = await db()
    .rpc('featured_listings', { p_category: category, p_province: province, p_seed: seed, p_limit: limit })
    .select(LISTING_COLUMNS)
  if (error) throw error
  return data as unknown as Listing[]
}

export async function getListingBySlug(slug: string): Promise<Listing | null> {
  const { data, error } = await db().from('listings').select(LISTING_COLUMNS).eq('slug', slug).maybeSingle()
  if (error) throw error
  return data as unknown as Listing | null
}

export async function getListingsByIds(ids: number[]): Promise<Listing[]> {
  if (ids.length === 0) return []
  const { data, error } = await db().from('listings').select(LISTING_COLUMNS).in('id', ids)
  if (error) throw error
  return data as unknown as Listing[]
}

export async function listingReviews(listingId: number): Promise<Review[]> {
  const { data, error } = await db().rpc('listing_reviews', { p_listing_id: listingId })
  if (error) throw error
  return data as Review[]
}

/** Approved photos; RLS returns them only while premium is active. */
export async function listingPhotos(listingId: number): Promise<Photo[]> {
  const { data, error } = await db()
    .from('listing_photos')
    .select('id,kind,storage_path,sort_order')
    .eq('listing_id', listingId)
    .eq('status', 'approved')
    .order('sort_order')
  if (error) throw error
  return data as Photo[]
}

export function photoUrl(path: string): string {
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''
  return `${base}/storage/v1/object/public/listing-photos/${path.split('/').map(encodeURIComponent).join('/')}`
}

export type EventKind = 'view' | 'call' | 'directions' | 'website' | 'share'

/** Anonymous counter; never blocks the UI. */
export function track(listingId: number, kind: EventKind) {
  supabase?.rpc('track_event', { p_listing_id: listingId, p_kind: kind }).then(() => undefined, () => undefined)
}

export function logSearch(f: Filters, results: number) {
  if (!f.q.trim()) return
  supabase
    ?.rpc('log_search', { q: f.q.trim(), p_category: f.category, p_province: f.province, p_results: results })
    .then(() => undefined, () => undefined)
}
