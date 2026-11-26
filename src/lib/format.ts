import type { Lang } from '../i18n/langs'

// Western digits in Arabic too (common in Belgium) and identical on server and browser.
const locale = (lang: Lang) => (lang === 'ar' ? 'ar-u-nu-latn' : `${lang}-BE`)

export const formatNumber = (n: number, lang: Lang) => new Intl.NumberFormat(locale(lang)).format(n)
export const formatRating = (n: number, lang: Lang) =>
  new Intl.NumberFormat(locale(lang), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n)
export const formatDate = (iso: string, lang: Lang) =>
  new Intl.DateTimeFormat(locale(lang), { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Europe/Brussels' }).format(new Date(iso))

/** "0472 38 05 58" -> "tel:0472380558" */
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`

export const directionsUrl = (name: string, address: string | null, city: string | null) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([name, address ?? city].filter(Boolean).join(', '))}`

export function safeWebsite(url: string | null): string | null {
  if (!url) return null
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null
  } catch {
    return null
  }
}

/** Text in the visitor's language, falling back to Arabic, then any. */
export function pickLang(map: Record<string, string> | null | undefined, lang: Lang): string {
  if (!map) return ''
  return map[lang] || map.ar || Object.values(map)[0] || ''
}

/** Same idea as normalize_text() in SQL: lowercase, no accents, Arabic letter variants unified. */
export function normalizeForSearch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[أإآٱ]/g, 'ا') // before NFD, which would split أ into ا + hamza
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .normalize('NFD')
    .replace(/[\u0300-\u036f\u064B-\u0655\u0640]/g, '')
    .trim()
}
