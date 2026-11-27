import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { renderReminder, type EmailLang } from '../netlify/lib/reminderEmail'
import { readConfig, runReminders, todayBrussels, type Config, type Mail } from '../netlify/lib/reminders'

const base = { name: 'Baladi', endsOn: '2026-12-04', daysLeft: 7, periodStart: '2026-11-04', today: '2026-11-27',
  stats: { views: 1234, calls: 56, directions: 78 }, priceEur: '20', pageUrl: 'https://dalilak-mmn4.netlify.app/l/baladi-bruxelles' }

describe('reminder email', () => {
  it.each(['ar', 'fr', 'nl', 'en'] as EmailLang[])('%s: name, end date, the 3 numbers, price and reply-to-renew', (lang) => {
    const m = renderReminder({ ...base, lang })
    for (const part of [m.subject, m.text]) expect(part).toContain('Baladi')
    expect(m.text).toMatch(/1[,.   ]?234/)
    expect(m.text).toContain('56')
    expect(m.text).toContain('78')
    expect(m.text).toContain('20')
    expect(m.text).toContain(base.pageUrl)
    expect(m.html).toContain(lang === 'ar' ? 'dir="rtl"' : 'dir="ltr"')
    expect(m.text).toMatch(lang === 'ar' ? /ردّوا على هذا الإيميل/ : lang === 'fr' ? /répondre à cet e-mail/ : lang === 'nl' ? /Antwoord gewoon op deze e-mail/ : /reply to this email/)
  })
  it('Arabic says "after 7 days" and dates use western digits', () => {
    const m = renderReminder({ ...base, lang: 'ar' })
    expect(m.subject).toContain('بعد 7 أيام')
    expect(m.text).toContain('2026')
  })
  it('escapes HTML in names and marks tests', () => {
    const m = renderReminder({ ...base, lang: 'en', name: '<b>X</b>', test: true })
    expect(m.html).not.toContain('<b>X</b>')
    expect(m.subject.startsWith('[TEST] ')).toBe(true)
  })
})

describe('config', () => {
  it('lists missing settings and never needs secrets in code', () => {
    const { missing, config } = readConfig({ VITE_SUPABASE_URL: 'https://x.supabase.co' })
    expect(missing).toEqual(['SUPABASE_SERVICE_ROLE_KEY', 'GMAIL_APP_PASSWORD', 'REMINDER_REPLY_TO'])
    expect(config.gmailUser).toBe('daliladapp@gmail.com')
    expect(config.priceEur).toBe('20')
  })
  it('today in Brussels', () => {
    expect(todayBrussels(new Date('2026-11-27T23:30:00Z'))).toBe('2026-11-28')   // already the 28th in Brussels
  })
})

/** Minimal fake of the Supabase RPC calls used by runReminders. */
function fakeDb(due: object[], opts: { failStatsFor?: number } = {}) {
  const claimed = new Set<string>()
  const finished: { id: number; ok: boolean; error?: string }[] = []
  let nextId = 1
  const db = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn === 'expire_premium') return { data: 2, error: null }
      if (fn === 'reminders_due') return { data: due, error: null }
      if (fn === 'claim_reminder') {
        const key = `${args.p_listing_id}|${args.p_period_end}`
        if (claimed.has(key)) return { data: null, error: null }
        claimed.add(key)
        return { data: nextId++, error: null }
      }
      if (fn === 'place_stats') {
        if (args.p_listing_id === opts.failStatsFor) return { data: null, error: { message: 'boom' } }
        return { data: [{ views: 10, calls: 2, directions: 3 }], error: null }
      }
      if (fn === 'finish_reminder') { finished.push({ id: args.p_id as number, ok: args.p_ok as boolean, error: args.p_error as string }); return { data: null, error: null } }
      throw new Error(fn)
    },
  } as unknown as SupabaseClient
  return { db, finished }
}

const cfg: Config = { supabaseUrl: 'x', serviceKey: 'k', gmailUser: 'daliladapp@gmail.com', gmailPassword: 'p', replyTo: 'me@x.be', siteUrl: 'https://dalilak-mmn4.netlify.app', priceEur: '20' }
const row = (id: number, email: string, lang: string) => ({ listing_id: id, name: `Shop ${id}`, slug: `shop-${id}`, owner_email: email, email_lang: lang, period_start: '2026-11-04', ends_on: '2026-12-04', days_left: 7 })

describe('daily run', () => {
  it('sends one email per due place, in its language, and never twice', async () => {
    const { db, finished } = fakeDb([row(1, 'a@x.be', 'fr'), row(2, 'b@x.be', 'ar'), row(1, 'a@x.be', 'fr')])
    const sent: Mail[] = []
    const r = await runReminders(db, async (m) => { sent.push(m) }, cfg, new Date('2026-11-27T07:00:00Z'))
    expect(r).toMatchObject({ expired: 2, due: 3, sent: 2, skipped: 1, failed: [] })
    expect(sent.map((m) => m.to)).toEqual(['a@x.be', 'b@x.be'])
    expect(sent[0].subject).toContain('Shop 1')
    expect(sent[0].text).toContain('https://dalilak-mmn4.netlify.app/l/shop-1')
    expect(sent[1].text).toContain('ردّوا')
    expect(finished.every((f) => f.ok)).toBe(true)
  })
  it('a failing email is logged as an error and the others still go out', async () => {
    const { db, finished } = fakeDb([row(1, 'a@x.be', 'en'), row(2, 'b@x.be', 'en')])
    const r = await runReminders(db, async (m) => { if (m.to === 'a@x.be') throw new Error('SMTP 535') }, cfg)
    expect(r.sent).toBe(1)
    expect(r.failed).toEqual([{ listingId: 1, error: 'SMTP 535' }])
    expect(finished).toEqual([{ id: 1, ok: false, error: 'SMTP 535' }, { id: 2, ok: true, error: undefined }])
  })
})
