import { describe, expect, it } from 'vitest'
import { buildWhatsappUrl, parseWhatsappUrl, type Banner } from '../src/lib/banners'
import { bannerState } from '../src/lib/admin'

const b = (p: Partial<Banner>): Banner => ({ id: 1, title: 'x', image_path: '1/a.webp', link_url: null, starts_on: null, ends_on: null, is_visible: true, sort_order: 0, ...p })

describe('banner links', () => {
  it('round-trips WhatsApp links', () => {
    const url = buildWhatsappUrl('+32 470 00 00 00', 'مرحبا')
    expect(url).toBe('https://wa.me/32470000000?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7')
    expect(parseWhatsappUrl(url)).toEqual({ number: '32470000000', message: 'مرحبا' })
    expect(buildWhatsappUrl('0032470000000', '')).toBe('https://wa.me/32470000000')
    expect(parseWhatsappUrl('https://example.be')).toBeNull()
  })
})

describe('banner state', () => {
  const today = '2026-12-10'
  it('follows the dates', () => {
    expect(bannerState(b({}), today)).toBe('running')
    expect(bannerState(b({ ends_on: '2026-12-10' }), today)).toBe('running')
    expect(bannerState(b({ ends_on: '2026-12-09' }), today)).toBe('expired')
    expect(bannerState(b({ starts_on: '2026-12-11' }), today)).toBe('scheduled')
    expect(bannerState(b({ is_visible: false }), today)).toBe('hidden')
    expect(bannerState(b({ image_path: null }), today)).toBe('noimage')
  })
})
