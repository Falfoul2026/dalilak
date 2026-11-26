import { describe, expect, it } from 'vitest'
import { buildImportSql, lit, mapAll, mapEntry, rowToSql, type RawEntry } from '../scripts/lib/mapData'
import data from '../data/dalilak-data.json'

const raw = data as RawEntry[]

describe('data mapping', () => {
  const rows = mapAll(raw)
  it('maps every entry', () => expect(rows).toHaveLength(raw.length))
  it('M et Mme Falfoul is premium and verified', () => {
    const f = rows.find((r) => r.id === 1)!
    expect(f.name).toBe('M et Mme Falfoul')
    expect(f.is_premium && f.is_verified).toBe(true)
    expect(f.description.ar).toContain('أردني')
    expect(rows.filter((r) => r.is_premium)).toHaveLength(1)
  })
  it('v:1 → Arabic not verified', () => {
    expect(rows.filter((r) => !r.language_verified)).toHaveLength(raw.filter((e) => e.v === 1).length)
    expect(rows.filter((r) => !r.language_verified).every((r) => r.languages.length === 0)).toBe(true)
  })
  it('maps provinces', () => {
    expect(new Set(rows.map((r) => r.province))).toEqual(new Set(['brussels', 'antwerp', 'liege', 'flemish-brabant']))
  })
  it('rejects bad input', () => {
    expect(() => mapEntry({ id: 9, n: 'x', c: 'pizza', p: 'Anvers' })).toThrow(/category/)
    expect(() => mapEntry({ id: 9, n: 'x', c: 'food', p: 'Paris' })).toThrow(/province/)
    expect(() => mapAll([{ id: 1, n: 'a', c: 'food', p: 'Anvers' }, { id: 1, n: 'b', c: 'food', p: 'Anvers' }])).toThrow(/duplicate/)
  })
  it('escapes quotes in single-row SQL', () => {
    expect(lit("O'Syrie")).toBe("'O''Syrie'")
    expect(rowToSql(rows.find((r) => r.name.includes("O'Syrie"))!)).toContain("'Restaurant O''Syrie'")
  })
  it('builds one import block with every row', () => {
    const sql = buildImportSql(rows)
    expect(sql).toContain("Restaurant O'Syrie")
    expect(sql.match(/"id":/g)).toHaveLength(raw.length)
    expect(sql.split('$dalilak$')).toHaveLength(3)
  })
})
