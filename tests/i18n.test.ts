import { describe, expect, it } from 'vitest'
import ar from '../src/i18n/locales/ar.json'
import fr from '../src/i18n/locales/fr.json'
import nl from '../src/i18n/locales/nl.json'
import en from '../src/i18n/locales/en.json'
import { localePath, splitLocale } from '../src/i18n/langs'
import { TYPE_LABELS } from '../src/data/typeLabels'
import data from '../data/dalilak-data.json'

const keys = (o: object, p = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v, `${p}${k}.`) : [`${p}${k}`]))

describe('translations', () => {
  const base = keys(ar).sort()
  it.each([['fr', fr], ['nl', nl], ['en', en]])('%s has exactly the Arabic keys', (_l, loc) => {
    expect(keys(loc).sort()).toEqual(base)
  })
  it('no empty strings', () => {
    for (const loc of [ar, fr, nl, en]) {
      const flat = JSON.stringify(loc)
      expect(flat).not.toMatch(/:""/)
    }
  })
  it('every business type in the data has fr/nl/en labels', () => {
    const types = new Set((data as { t?: string }[]).map((d) => d.t).filter(Boolean) as string[])
    for (const t of types) expect(TYPE_LABELS[t], t).toBeDefined()
  })
})

describe('locale paths', () => {
  it('arabic has no prefix', () => {
    expect(localePath('ar', '/')).toBe('/')
    expect(localePath('ar', '/top')).toBe('/top')
    expect(localePath('fr', '/')).toBe('/fr')
    expect(localePath('nl', '/top')).toBe('/nl/top')
  })
  it('splits the language from the path', () => {
    expect(splitLocale('/fr/top')).toEqual({ lang: 'fr', rest: '/top' })
    expect(splitLocale('/en')).toEqual({ lang: 'en', rest: '/' })
    expect(splitLocale('/top')).toEqual({ lang: 'ar', rest: '/top' })
    expect(splitLocale('/french-fries')).toEqual({ lang: 'ar', rest: '/french-fries' })
  })
})
