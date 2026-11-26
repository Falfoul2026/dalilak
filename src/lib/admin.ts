// Admin panel data access. Every write goes through admin_* SQL functions that
// check is_admin() on the server, so these calls are useless to anyone else.
import { LISTING_COLUMNS } from './listings'
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

async function resizeImage(file: File, max: number, quality: number, keepAlpha: boolean): Promise<{ blob: Blob; ext: string }> {
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
