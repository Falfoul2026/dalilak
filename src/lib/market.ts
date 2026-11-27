// Buy & Sell ("بيع وشراء"): public reads. Ads are written only from the admin panel.
import type { Lang } from '../i18n/langs'
import { supabase } from './supabase'

export type AdCategory = 'business' | 'real_estate' | 'cars' | 'furniture' | 'other'
export type AdStatus = 'active' | 'sold' | 'hidden'

export interface Ad {
  id: number
  slug: string
  title: string
  category: AdCategory
  city: string
  price_eur: number | null
  description: string
  status: AdStatus
  cover_path: string | null
  sold_at: string | null
  created_at: string
}

export interface AdPhoto {
  id: number
  storage_path: string
  sort_order: number
}

export const AD_CATEGORIES: { slug: AdCategory; icon: string }[] = [
  { slug: 'business', icon: '🏪' },
  { slug: 'real_estate', icon: '🏠' },
  { slug: 'cars', icon: '🚗' },
  { slug: 'furniture', icon: '🛋️' },
  { slug: 'other', icon: '📦' },
]

export const AD_COLUMNS = 'id,slug,title,category,city,price_eur,description,status,cover_path,sold_at,created_at'

/** The table may not exist yet (migration 0007 not run): treat that as "no ads" instead of breaking pages. */
const missingTable = (e: { code?: string; message?: string } | null) =>
  Boolean(e && (e.code === '42P01' || e.code === 'PGRST205' || /does not exist|Could not find the table/i.test(e.message ?? '')))

/** Visible ads: active first (newest first), then sold. */
export async function fetchAds(): Promise<Ad[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('ads').select(AD_COLUMNS).order('created_at', { ascending: false }).limit(500)
  if (missingTable(error)) return []
  if (error) throw error
  const ads = data as Ad[]
  return [...ads.filter((a) => a.status === 'active'), ...ads.filter((a) => a.status !== 'active')]
}

export async function getAdBySlug(slug: string): Promise<Ad | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('ads').select(AD_COLUMNS).eq('slug', slug).maybeSingle()
  if (missingTable(error)) return null
  if (error) throw error
  return data as Ad | null
}

export async function adPhotos(adId: number): Promise<AdPhoto[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('ad_photos').select('id,storage_path,sort_order').eq('ad_id', adId).order('sort_order').order('id')
  if (missingTable(error)) return []
  if (error) throw error
  return data as AdPhoto[]
}

export function adPhotoUrl(path: string): string {
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''
  return `${base}/storage/v1/object/public/ad-photos/${path.split('/').map(encodeURIComponent).join('/')}`
}

/** "8 500 €" style, without cents when the price is whole. null when no price. */
export function formatPrice(price: number | null, lang: Lang): string | null {
  if (price === null || price === undefined) return null
  const n = Number(price)
  return new Intl.NumberFormat(lang === 'ar' ? 'ar-u-nu-latn' : `${lang}-BE`, {
    style: 'currency', currency: 'EUR', maximumFractionDigits: Number.isInteger(n) ? 0 : 2,
  }).format(n)
}
