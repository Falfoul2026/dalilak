// Shared logic of the daily reminder function and the admin test endpoint.
import type { SupabaseClient } from '@supabase/supabase-js'
import { renderReminder, type EmailLang } from './reminderEmail'

export interface Mail { to: string; subject: string; text: string; html: string }
export type SendMail = (m: Mail) => Promise<void>

export interface Config {
  supabaseUrl: string
  serviceKey: string
  gmailUser: string
  gmailPassword: string
  replyTo: string
  siteUrl: string
  priceEur: string
}

/** Reads settings from environment variables. Returns the names that are missing. */
export function readConfig(env: Record<string, string | undefined>): { config: Config; missing: string[] } {
  const config: Config = {
    supabaseUrl: (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').replace(/\/$/, ''),
    serviceKey: env.SUPABASE_SERVICE_ROLE_KEY || '',
    gmailUser: env.GMAIL_USER || 'daliladapp@gmail.com',
    gmailPassword: env.GMAIL_APP_PASSWORD || '',
    replyTo: env.REMINDER_REPLY_TO || '',
    siteUrl: (env.VITE_SITE_URL || env.URL || '').replace(/\/$/, ''),
    priceEur: env.RENEW_PRICE_EUR || '20',
  }
  const missing = [
    !config.supabaseUrl && 'VITE_SUPABASE_URL',
    !config.serviceKey && 'SUPABASE_SERVICE_ROLE_KEY',
    !config.gmailPassword && 'GMAIL_APP_PASSWORD',
    !config.replyTo && 'REMINDER_REPLY_TO',
  ].filter(Boolean) as string[]
  return { config, missing }
}

/** Today's date in Brussels as YYYY-MM-DD. */
export const todayBrussels = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(now)

const asLang = (l: unknown): EmailLang => (l === 'fr' || l === 'nl' || l === 'en' ? l : 'ar')

async function stats(db: SupabaseClient, listingId: number, from: string, to: string) {
  const { data, error } = await db.rpc('place_stats', { p_listing_id: listingId, p_from: from, p_to: to })
  if (error) throw new Error(`stats: ${error.message}`)
  const r = (Array.isArray(data) ? data[0] : data) ?? {}
  return { views: Number(r.views ?? 0), calls: Number(r.calls ?? 0), directions: Number(r.directions ?? 0) }
}

export interface RunResult { expired: number; due: number; sent: number; skipped: number; failed: { listingId: number; error: string }[] }

/**
 * Daily job: 1) turn off Featured for subscriptions that ended, 2) send one reminder per place and period
 * when the end date is 7 days away (or closer, if a day was missed). Each reminder is reserved in the
 * database before sending, so it can never be sent twice, even if two runs overlap.
 */
export async function runReminders(db: SupabaseClient, send: SendMail, cfg: Config, now = new Date()): Promise<RunResult> {
  const result: RunResult = { expired: 0, due: 0, sent: 0, skipped: 0, failed: [] }
  const exp = await db.rpc('expire_premium')
  if (exp.error) throw new Error(`expire_premium: ${exp.error.message}`)
  result.expired = Number(exp.data ?? 0)

  const { data: due, error } = await db.rpc('reminders_due')
  if (error) throw new Error(`reminders_due: ${error.message}`)
  const today = todayBrussels(now)
  result.due = due?.length ?? 0

  for (const r of due ?? []) {
    const claim = await db.rpc('claim_reminder', { p_listing_id: r.listing_id, p_period_end: r.ends_on, p_to: r.owner_email })
    if (claim.error) { result.failed.push({ listingId: r.listing_id, error: claim.error.message }); continue }
    if (!claim.data) { result.skipped++; continue }   // already sent or being sent
    try {
      const s = await stats(db, r.listing_id, r.period_start, today)
      const mail = renderReminder({
        lang: asLang(r.email_lang), name: r.name, endsOn: r.ends_on, daysLeft: r.days_left, periodStart: r.period_start,
        today, stats: s, priceEur: cfg.priceEur, pageUrl: cfg.siteUrl ? `${cfg.siteUrl}/l/${r.slug}` : null,
      })
      await send({ to: r.owner_email, ...mail })
      await db.rpc('finish_reminder', { p_id: claim.data, p_ok: true })
      result.sent++
    } catch (e) {
      const msg = (e as Error).message ?? String(e)
      await db.rpc('finish_reminder', { p_id: claim.data, p_ok: false, p_error: msg })
      result.failed.push({ listingId: r.listing_id, error: msg })
    }
  }
  return result
}

/** Builds the reminder for one place exactly as the owner would get it, marked [TEST], for the admin. */
export async function buildTestReminder(db: SupabaseClient, cfg: Config, listingId: number, now = new Date()) {
  const today = todayBrussels(now)
  const { data: l, error } = await db.from('listings').select('id,name,slug').eq('id', listingId).maybeSingle()
  if (error || !l) throw new Error('listing not found')
  const { data: b } = await db.from('listing_billing').select('email_lang,period_start,ends_on').eq('listing_id', listingId).maybeSingle()
  const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10)
  const periodStart = b?.period_start ?? addDays(today, -23)
  const endsOn = b?.ends_on ?? addDays(today, 7)
  const daysLeft = Math.round((Date.parse(`${endsOn}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400000)
  const s = await stats(db, listingId, periodStart, today)
  return renderReminder({
    lang: asLang(b?.email_lang), name: l.name, endsOn, daysLeft, periodStart, today, stats: s, priceEur: cfg.priceEur,
    pageUrl: cfg.siteUrl ? `${cfg.siteUrl}/l/${l.slug}` : null, test: true,
  })
}
