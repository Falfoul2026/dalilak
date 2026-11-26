export const LANGS = ['ar', 'fr', 'nl', 'en'] as const
export type Lang = (typeof LANGS)[number]
export const DEFAULT_LANG: Lang = 'ar'

export const LANG_NAMES: Record<Lang, string> = { ar: 'العربية', fr: 'Français', nl: 'Nederlands', en: 'English' }

export const LANG_SHORT: Record<Lang, string> = { ar: 'ع', fr: 'FR', nl: 'NL', en: 'EN' }

export const isLang = (v: unknown): v is Lang => typeof v === 'string' && (LANGS as readonly string[]).includes(v)
export const dirOf = (lang: Lang) => (lang === 'ar' ? 'rtl' : 'ltr')

/** URL prefix: Arabic is the default and has none ("/"), others use "/fr", "/nl", "/en". */
export const prefixOf = (lang: Lang) => (lang === DEFAULT_LANG ? '' : `/${lang}`)

/** Build a path in a language: path('fr', '/top') -> '/fr/top'. */
export function localePath(lang: Lang, path = '/'): string {
  const p = path.startsWith('/') ? path : `/${path}`
  const full = `${prefixOf(lang)}${p}`
  return full.length > 1 && full.endsWith('/') ? full.slice(0, -1) : full || '/'
}

/** Split "/fr/top" into { lang: 'fr', rest: '/top' }. */
export function splitLocale(pathname: string): { lang: Lang; rest: string } {
  const m = pathname.match(/^\/(fr|nl|en)(?=\/|$)(.*)$/)
  if (m) return { lang: m[1] as Lang, rest: m[2] || '/' }
  return { lang: DEFAULT_LANG, rest: pathname || '/' }
}
