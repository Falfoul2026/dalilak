// Writes dist/sitemap.xml (all pages × 4 languages with hreflang alternates)
// and adds the Sitemap line to robots.txt. Called at the end of `npm run build`.
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const LANGS = ['ar', 'fr', 'nl', 'en'] as const
const STATIC_PATHS = ['/', '/top', '/picks', '/market', '/market/sell', '/add']

const loc = (site: string, lang: string, path: string) => {
  const p = lang === 'ar' ? path : `/${lang}${path === '/' ? '' : path}`
  return `${site}${p}`
}
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function buildSitemap(site: string, slugs: string[], today = new Date().toISOString().slice(0, 10), adSlugs: string[] = []): string {
  const paths = [
    ...STATIC_PATHS,
    ...slugs.map((s) => `/l/${encodeURIComponent(s)}`),
    ...adSlugs.map((s) => `/market/${encodeURIComponent(s)}`),
  ]
  const urls = paths.flatMap((path) =>
    LANGS.map((lang) => {
      const alts = LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${esc(loc(site, l, path))}"/>`).join('\n')
      return `  <url>\n    <loc>${esc(loc(site, lang, path))}</loc>\n    <lastmod>${today}</lastmod>\n${alts}\n    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(loc(site, 'ar', path))}"/>\n  </url>`
    }),
  )
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`
}

export async function writeSitemap(dir: string, env: Record<string, string>) {
  const site = env.VITE_SITE_URL?.replace(/\/$/, '')
  const url = env.VITE_SUPABASE_URL
  const key = env.VITE_SUPABASE_ANON_KEY
  if (!site || !url || !key) {
    console.warn('[sitemap] skipped: VITE_SITE_URL / Supabase env missing')
    return
  }
  const res = await fetch(`${url}/rest/v1/listings?select=slug&status=eq.active&order=id`, { headers: { apikey: key } })
  if (!res.ok) throw new Error(`[sitemap] Supabase ${res.status}`)
  const slugs = ((await res.json()) as { slug: string }[]).map((r) => r.slug)
  // Ads: only if the table exists (migration 0007) – never fail the build because of it.
  let adSlugs: string[] = []
  const adsRes = await fetch(`${url}/rest/v1/ads?select=slug&status=eq.active&order=id`, { headers: { apikey: key } }).catch(() => null)
  if (adsRes?.ok) adSlugs = ((await adsRes.json()) as { slug: string }[]).map((r) => r.slug).filter(Boolean)
  await writeFile(join(dir, 'sitemap.xml'), buildSitemap(site, slugs, undefined, adSlugs))
  const robotsPath = join(dir, 'robots.txt')
  const robots = await readFile(robotsPath, 'utf8').catch(() => 'User-agent: *\nAllow: /\n')
  await writeFile(robotsPath, `${robots.trimEnd()}\n\nSitemap: ${site}/sitemap.xml\n`)
  console.log(`[sitemap] ${slugs.length} listings + ${adSlugs.length} ads × ${LANGS.length} languages`)
}
