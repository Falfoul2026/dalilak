import { describe, expect, it } from 'vitest'
import { buildSitemap } from '../scripts/sitemap'
import { directionsUrl, pickLang, safeWebsite, telHref } from '../src/lib/format'

describe('sitemap', () => {
  const xml = buildSitemap('https://dalilak.be', ['baladi-bruxelles'], '2026-11-26')
  it('has every page in every language with alternates', () => {
    expect(xml.match(/<url>/g)).toHaveLength((7 + 1) * 4)
    expect(xml).toContain('<loc>https://dalilak.be/l/baladi-bruxelles</loc>')
    expect(xml).toContain('<loc>https://dalilak.be/fr/l/baladi-bruxelles</loc>')
    expect(xml).toContain('<loc>https://dalilak.be/nl</loc>')
    expect(xml).toContain('hreflang="x-default" href="https://dalilak.be/top"')
  })
  it('includes ads', () => {
    const x = buildSitemap('https://dalilak.be', [], '2026-11-26', ['12-toyota'])
    expect(x).toContain('<loc>https://dalilak.be/market/12-toyota</loc>')
    expect(x).toContain('<loc>https://dalilak.be/en/market/12-toyota</loc>')
  })
})

describe('format helpers', () => {
  it('builds tel links', () => expect(telHref('0472 38 05 58')).toBe('tel:0472380558'))
  it('builds directions', () => expect(directionsUrl('Baladi', 'Rue X 1, 1000 Bruxelles', null)).toBe(
    'https://www.google.com/maps/search/?api=1&query=Baladi%2C%20Rue%20X%201%2C%201000%20Bruxelles'))
  it('accepts only http(s) websites', () => {
    expect(safeWebsite('www.baladi.be')).toBe('https://www.baladi.be/')
    expect(safeWebsite('javascript:alert(1)')?.startsWith('javascript')).not.toBe(true)
    expect(safeWebsite(null)).toBeNull()
  })
  it('picks language with Arabic fallback', () => {
    expect(pickLang({ ar: 'أ', fr: 'b' }, 'fr')).toBe('b')
    expect(pickLang({ ar: 'أ' }, 'nl')).toBe('أ')
    expect(pickLang({}, 'en')).toBe('')
  })
})

import { toSpaShell } from '../scripts/spaShell'
describe('404 shell', () => {
  it('empties the pre-rendered root and drops hydration data', () => {
    const html = '<html><body><div id="root" data-server-rendered="true"><main>Home</main><script>window.__staticRouterHydrationData = {}</script></div>\n<script>window.__VITE_REACT_SSG_HASH__ = \'x\'</script></body></html>'
    const out = toSpaShell(html)
    expect(out).toContain('<div id="root"></div>')
    expect(out).not.toContain('Home')
    expect(out).not.toContain('__staticRouterHydrationData')
    expect(out).toContain('__VITE_REACT_SSG_HASH__')
  })
})
