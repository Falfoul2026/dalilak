// Admin panel data access. Every write goes through admin_* SQL functions that
// check is_admin() on the server, so these calls are useless to anyone else.
import { LISTING_COLUMNS } from './listings'
import { AD_COLUMNS, type Ad, type AdCategory, type AdPhoto, type AdStatus } from './market'
import { BANNER_COLUMNS, type Banner } from './banners'
import { supabase } from './supabase'
import type { Listing } from './types'

export interface AdminPhoto {
  id: number
  kind: 'logo' | 'gallery'
  storage_path: string
  sort_order: number
  status: 'pending' | 'approved' | 'rejected'
}

/** Fields the panel can edit (see admin_update_listing). */
export interface ListingInput {
  name: string
  category: string
  type_label: string
  province: string
  city: string
  address: string
  phone: string
  website: string
  languages: string[]
  language_verified: boolean
  status: 'active' | 'hidden' | 'pending'
  is_verified: boolean
  description: Record<string, string>
  offer_text: Record<string, string>
}

export const MAX_GALLERY = 8
const BUCKET = 'listing-photos'

function db() {
  if (!supabase) throw new Error('supabase_not_configured')
  return supabase
}

export async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data } = await db().from('profiles').select('role').eq('id', userId).maybeSingle()
  return data?.role === 'admin'
}

/** All listings, any status (RLS lets the admin see everything). */
export async function adminAllListings(): Promise<Listing[]> {
  const rows: Listing[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db().from('listings').select(LISTING_COLUMNS).order('name').range(from, from + 999)
    if (error) throw error
    rows.push(...(data as unknown as Listing[]))
    if (!data || data.length < 1000) break
  }
  return rows
}

export async function adminGetListing(id: number): Promise<Listing | null> {
  const { data, error } = await db().from('listings').select(LISTING_COLUMNS).eq('id', id).maybeSingle()
  if (error) throw error
  return data as unknown as Listing | null
}

/** Drop empty translations so the site falls back to Arabic. */
const compact = (m: Record<string, string>) =>
  Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v !== ''))

const payload = (v: ListingInput) => ({ ...v, description: compact(v.description), offer_text: compact(v.offer_text) })

export async function adminCreateListing(v: ListingInput): Promise<number> {
  const { data, error } = await db().rpc('admin_create_listing', { p: payload(v) })
  if (error) throw error
  return data as number
}

export async function adminUpdateListing(id: number, v: ListingInput): Promise<void> {
  const { error } = await db().rpc('admin_update_listing', { p_id: id, p: payload(v) })
  if (error) throw error
}

/** Featured on/off. `until` null = no end date. */
export async function adminSetFeatured(id: number, on: boolean, until: string | null = null): Promise<void> {
  const { error } = await db().rpc('admin_set_premium', { p_listing_id: id, p_on: on, p_until: on ? until : null })
  if (error) throw error
}

export async function adminPhotos(listingId: number): Promise<AdminPhoto[]> {
  const { data, error } = await db()
    .from('listing_photos')
    .select('id,kind,storage_path,sort_order,status')
    .eq('listing_id', listingId)
    .order('kind')
    .order('sort_order')
  if (error) throw error
  return data as AdminPhoto[]
}

/**
 * Resize in the browser (phone photos are 3–8 MB) and upload.
 * Logo: max 256 px. Gallery: max 1200 px. WebP where the browser can encode it, else JPEG.
 */
export async function adminUploadPhoto(listingId: number, kind: 'logo' | 'gallery', file: File): Promise<void> {
  const { blob, ext } = await resizeImage(file, kind === 'logo' ? 256 : 1200, kind === 'logo' ? 0.9 : 0.8, kind === 'logo')
  const path = `${listingId}/${kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}.${ext}`
  const up = await db().storage.from(BUCKET).upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false })
  if (up.error) throw up.error
  const { data, error } = await db().rpc('admin_add_photo', { p_listing_id: listingId, p_kind: kind, p_path: path })
  if (error) {
    await db().storage.from(BUCKET).remove([path]) // do not leave an orphan file
    throw error
  }
  const old = (data as string[] | null) ?? []
  if (old.length) await db().storage.from(BUCKET).remove(old)
}

export async function adminDeletePhoto(photoId: number): Promise<void> {
  const { data, error } = await db().rpc('admin_delete_photo', { p_photo_id: photoId })
  if (error) throw error
  if (data) await db().storage.from(BUCKET).remove([data as string])
}

export async function resizeImage(file: File, max: number, quality: number, keepAlpha: boolean): Promise<{ blob: Blob; ext: string }> {
  if (!file.type.startsWith('image/')) throw new Error('not_an_image')
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * scale)
  const h = Math.round(bmp.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  if (!keepAlpha) {
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, w, h)
  }
  ctx.drawImage(bmp, 0, 0, w, h)
  bmp.close()
  const toBlob = (type: string) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, quality))
  const webp = await toBlob('image/webp')
  // Older Safari cannot encode WebP and silently returns PNG.
  if (webp && webp.type === 'image/webp') return { blob: webp, ext: 'webp' }
  const fallbackType = keepAlpha ? 'image/png' : 'image/jpeg'
  const blob = await toBlob(fallbackType)
  if (!blob) throw new Error('resize_failed')
  return { blob, ext: fallbackType === 'image/png' ? 'png' : 'jpg' }
}

// ---------------------------------------------------------------------------
// Buy & Sell ads
// ---------------------------------------------------------------------------

export interface AdInput {
  title: string
  category: AdCategory
  city: string
  price_eur: string
  description: string
  status: AdStatus
  commission: string
  seller_name: string
  seller_phone: string
  notes: string
}

export interface AdPrivate { commission: string | null; seller_name: string | null; seller_phone: string | null; notes: string | null }

const AD_BUCKET = 'ad-photos'
export const MAX_AD_PHOTOS = 8

export async function adminAllAds(): Promise<Ad[]> {
  const { data, error } = await db().from('ads').select(AD_COLUMNS).order('created_at', { ascending: false }).limit(1000)
  if (error) throw error
  return data as Ad[]
}

export async function adminGetAd(id: number): Promise<{ ad: Ad; priv: AdPrivate | null } | null> {
  const [{ data: ad, error }, { data: priv }] = await Promise.all([
    db().from('ads').select(AD_COLUMNS).eq('id', id).maybeSingle(),
    db().from('ads_private').select('commission,seller_name,seller_phone,notes').eq('ad_id', id).maybeSingle(),
  ])
  if (error) throw error
  return ad ? { ad: ad as Ad, priv: (priv as AdPrivate | null) ?? null } : null
}

/** Create (id null) or update. Returns the id. Price: digits, comma or dot accepted. */
export async function adminSaveAd(id: number | null, v: AdInput): Promise<number> {
  const price = v.price_eur.trim().replace(/\s/g, '').replace(',', '.')
  if (price && !/^\d+(\.\d{1,2})?$/.test(price)) throw new Error('price')
  const { data, error } = await db().rpc('admin_save_ad', { p_id: id, p: { ...v, price_eur: price } })
  if (error) throw error
  return data as number
}

export async function adminSetAdStatus(id: number, status: AdStatus): Promise<void> {
  const { error } = await db().rpc('admin_set_ad_status', { p_id: id, p_status: status })
  if (error) throw error
}

export async function adminAdPhotos(adId: number): Promise<AdPhoto[]> {
  const { data, error } = await db().from('ad_photos').select('id,storage_path,sort_order').eq('ad_id', adId).order('sort_order').order('id')
  if (error) throw error
  return data as AdPhoto[]
}

export async function adminUploadAdPhoto(adId: number, file: File): Promise<void> {
  const { blob, ext } = await resizeImage(file, 1200, 0.8, false)
  const path = `${adId}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}.${ext}`
  const up = await db().storage.from(AD_BUCKET).upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false })
  if (up.error) throw up.error
  const { error } = await db().rpc('admin_add_ad_photo', { p_ad_id: adId, p_path: path })
  if (error) {
    await db().storage.from(AD_BUCKET).remove([path])
    throw error
  }
}

export async function adminDeleteAdPhoto(photoId: number): Promise<void> {
  const { data, error } = await db().rpc('admin_delete_ad_photo', { p_photo_id: photoId })
  if (error) throw error
  if (data) await db().storage.from(AD_BUCKET).remove([data as string])
}

export async function adminSetAdCover(photoId: number): Promise<void> {
  const { error } = await db().rpc('admin_set_ad_cover', { p_photo_id: photoId })
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Banner ads
// ---------------------------------------------------------------------------
export interface BannerInput {
  title: string
  link_url: string
  starts_on: string
  ends_on: string
  is_visible: boolean
  sort_order: string
  advertiser_name: string
  price_paid: string
  notes: string
}
export interface BannerPrivate { advertiser_name: string | null; price_paid: string | null; notes: string | null }

export async function adminAllBanners(): Promise<Banner[]> {
  const { data, error } = await db().from('banners').select(BANNER_COLUMNS).order('created_at', { ascending: false })
  if (error) throw error
  return data as Banner[]
}

export async function adminGetBanner(id: number): Promise<{ banner: Banner; priv: BannerPrivate | null } | null> {
  const [{ data: banner, error }, { data: priv }] = await Promise.all([
    db().from('banners').select(BANNER_COLUMNS).eq('id', id).maybeSingle(),
    db().from('banners_private').select('advertiser_name,price_paid,notes').eq('banner_id', id).maybeSingle(),
  ])
  if (error) throw error
  return banner ? { banner: banner as Banner, priv: (priv as BannerPrivate | null) ?? null } : null
}

export async function adminSaveBanner(id: number | null, v: BannerInput): Promise<number> {
  const { data, error } = await db().rpc('admin_save_banner', { p_id: id, p: v })
  if (error) throw error
  return data as number
}

/** Banner image: max 1200 px wide, replaces the previous file. */
export async function adminUploadBannerImage(id: number, file: File): Promise<void> {
  const { blob, ext } = await resizeImage(file, 1200, 0.85, false)
  const path = `${id}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}.${ext}`
  const up = await db().storage.from('banners').upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false })
  if (up.error) throw up.error
  const { data, error } = await db().rpc('admin_set_banner_image', { p_id: id, p_path: path })
  if (error) {
    await db().storage.from('banners').remove([path])
    throw error
  }
  if (data) await db().storage.from('banners').remove([data as string])
}

/** Running / scheduled / expired / hidden, from today's date in Brussels. */
export function bannerState(b: Banner, today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(new Date())):
  'running' | 'scheduled' | 'expired' | 'hidden' | 'noimage' {
  if (!b.is_visible) return 'hidden'
  if (!b.image_path) return 'noimage'
  if (b.ends_on && b.ends_on < today) return 'expired'
  if (b.starts_on && b.starts_on > today) return 'scheduled'
  return 'running'
}

// ---------------------------------------------------------------------------
// Subscriptions (Featured places): owner email, dates, renewals, stats, reminders
// ---------------------------------------------------------------------------
export type EmailLang = 'ar' | 'fr' | 'nl' | 'en'
export interface Billing {
  listing_id: number
  owner_email: string | null
  email_lang: EmailLang
  starts_on: string
  period_start: string
  ends_on: string
}
export interface SubscriptionInput { owner_email: string; email_lang: EmailLang; starts_on: string; ends_on: string }
export interface PlaceStats { views: number; calls: number; directions: number }
export interface SubLogRow { id: number; action: 'start' | 'update' | 'renew' | 'expire'; old_ends_on: string | null; new_ends_on: string | null; created_at: string }
export interface ReminderLogRow {
  id: number; kind: 'reminder' | 'test'; period_end: string | null; to_email: string | null
  status: 'sending' | 'sent' | 'error'; error: string | null; created_at: string; sent_at: string | null
  listing_id: number | null; listing: { name: string } | null
}
export interface BillingOverviewRow extends Billing { listing: { id: number; name: string; slug: string; status: string } | null }

/** Today in Brussels, YYYY-MM-DD (same day boundary as the database). */
export const todayBrussels = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(new Date())
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000)

export async function adminGetBilling(listingId: number): Promise<Billing | null> {
  const { data, error } = await db().from('listing_billing').select('*').eq('listing_id', listingId).maybeSingle()
  if (error) throw error
  return data as Billing | null
}

export async function adminSaveSubscription(listingId: number, v: SubscriptionInput): Promise<void> {
  const { error } = await db().rpc('admin_save_subscription', { p_listing_id: listingId, p: v })
  if (error) throw error
}

/** "Renew +1 month". Returns the new end date. */
export async function adminRenewMonth(listingId: number): Promise<string> {
  const { data, error } = await db().rpc('admin_renew_month', { p_listing_id: listingId })
  if (error) throw error
  return data as string
}

export async function adminPlaceStats(listingId: number, from: string, to: string): Promise<PlaceStats> {
  const { data, error } = await db().rpc('place_stats', { p_listing_id: listingId, p_from: from, p_to: to })
  if (error) throw error
  const r = (Array.isArray(data) ? data[0] : data) ?? {}
  return { views: Number(r.views ?? 0), calls: Number(r.calls ?? 0), directions: Number(r.directions ?? 0) }
}

export async function adminSubscriptionLog(listingId: number): Promise<SubLogRow[]> {
  const { data, error } = await db().from('subscription_log').select('id,action,old_ends_on,new_ends_on,created_at')
    .eq('listing_id', listingId).order('created_at', { ascending: false }).limit(20)
  if (error) throw error
  return data as SubLogRow[]
}

export async function adminReminderLog(limit = 50, listingId?: number): Promise<ReminderLogRow[]> {
  let q = db().from('reminder_log').select('id,kind,period_end,to_email,status,error,created_at,sent_at,listing_id,listing:listings(name)')
    .order('created_at', { ascending: false }).limit(limit)
  if (listingId) q = q.eq('listing_id', listingId)
  const { data, error } = await q
  if (error) throw error
  return data as unknown as ReminderLogRow[]
}

export async function adminBillingOverview(): Promise<BillingOverviewRow[]> {
  const { data, error } = await db().from('listing_billing').select('*, listing:listings(id,name,slug,status)').order('ends_on')
  if (error) throw error
  return data as unknown as BillingOverviewRow[]
}

/** Admin button: the real reminder for this place, marked [TEST], sent to Yousef's own address (Netlify function). */
export async function adminSendTestReminder(listingId: number): Promise<{ to: string }> {
  const { data: s } = await db().auth.getSession()
  const token = s.session?.access_token
  if (!token) throw new Error('login_required')
  // In the Android app the page is not on the website: call the public address.
  const native = typeof window !== 'undefined' && Boolean((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.())
  const base = native ? ((import.meta.env.VITE_SITE_URL as string | undefined) ?? '').replace(/\/$/, '') : ''
  const res = await fetch(`${base}/.netlify/functions/send-test-reminder`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ listingId }),
  })
  const body = (await res.json().catch(() => ({}))) as { to?: string; error?: string; missing?: string[]; detail?: string }
  if (!res.ok) throw new Error([body.error ?? `HTTP ${res.status}`, body.missing?.join(', '), body.detail].filter(Boolean).join(': '))
  return { to: body.to ?? '' }
}
