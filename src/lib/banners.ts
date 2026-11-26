// Paid banner ads ("إعلاناتكم"). The database only returns banners that are running today.
import { supabase } from './supabase'

export interface Banner {
  id: number
  title: string
  image_path: string | null
  link_url: string | null
  starts_on: string | null
  ends_on: string | null
  is_visible: boolean
  sort_order: number
}

export const BANNER_COLUMNS = 'id,title,image_path,link_url,starts_on,ends_on,is_visible,sort_order'

const missingTable = (e: { code?: string; message?: string } | null) =>
  Boolean(e && (e.code === '42P01' || e.code === 'PGRST205' || /does not exist|Could not find the table/i.test(e.message ?? '')))

/** Running banners in a fresh random order on every visit (equal exposure for advertisers). */
export async function fetchRunningBanners(): Promise<Banner[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('banners').select(BANNER_COLUMNS).limit(20)
  if (missingTable(error) || error) return []
  const rows = (data as Banner[]).filter((b) => b.image_path)
  for (let i = rows.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[rows[i], rows[j]] = [rows[j], rows[i]]
  }
  return rows
}

export function bannerImageUrl(path: string): string {
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''
  return `${base}/storage/v1/object/public/banners/${path.split('/').map(encodeURIComponent).join('/')}`
}

/** wa.me link <-> number + message, for the admin form. */
export function buildWhatsappUrl(number: string, message: string): string {
  const digits = number.replace(/[^\d]/g, '').replace(/^00/, '')
  return `https://wa.me/${digits}${message.trim() ? `?text=${encodeURIComponent(message.trim())}` : ''}`
}

export function parseWhatsappUrl(url: string | null): { number: string; message: string } | null {
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.hostname !== 'wa.me') return null
    return { number: u.pathname.replace(/\//g, ''), message: u.searchParams.get('text') ?? '' }
  } catch {
    return null
  }
}
