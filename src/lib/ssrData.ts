// Build-time data for pre-rendering. Each query runs once per build and is
// shared by all ~1000 pages (4 languages), so Supabase is not hammered.
import { LISTING_COLUMNS, topRated } from './listings'
import { supabase } from './supabase'
import type { Listing } from './types'

const memo = new Map<string, Promise<unknown>>()
function once<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (!memo.has(key)) memo.set(key, fn())
  return memo.get(key) as Promise<T>
}

/** All active listings, ordered like the home list (Google rating, then review count). */
export function allActiveListings(): Promise<Listing[]> {
  return once('all', async () => {
    if (!supabase) return []
    const rows: Listing[] = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from('listings')
        .select(LISTING_COLUMNS)
        .eq('status', 'active')
        .order('rating_google', { ascending: false, nullsFirst: false })
        .order('reviews_google', { ascending: false })
        .order('id')
        .range(from, from + 999)
      if (error) throw new Error(`[build] listings query failed: ${error.message}`)
      rows.push(...(data as unknown as Listing[]))
      if (!data || data.length < 1000) break
    }
    return rows
  })
}

export const topRatedAll = () => once('top', () => (supabase ? topRated(null, null, 50) : Promise.resolve([])))

/** Visible ads for pre-rendering. Never fails the build (e.g. before migration 0007 is run). */
export const allVisibleAds = () => once('ads', async () => {
  try {
    const { fetchAds } = await import('./market')
    return await fetchAds()
  } catch (e) {
    console.warn('[build] ads skipped:', (e as Error).message)
    return []
  }
})
