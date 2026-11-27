// Scheduled every day at 07:00 UTC (08:00/09:00 in Brussels): expire ended subscriptions and
// email renewal reminders 7 days before the end. Runs on Netlify, never in the visitor's browser.
import type { Config as NetlifyConfig } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import { gmailSender } from '../lib/mailer'
import { readConfig, runReminders } from '../lib/reminders'

export default async () => {
  const { config, missing } = readConfig(process.env)
  if (missing.length) {
    console.error('[reminders] not configured, missing:', missing.join(', '))
    return new Response(`missing: ${missing.join(', ')}`, { status: 500 })
  }
  const db = createClient(config.supabaseUrl, config.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  try {
    const result = await runReminders(db, gmailSender(config), config)
    console.log('[reminders]', JSON.stringify(result))
    return Response.json(result)
  } catch (e) {
    console.error('[reminders] failed:', (e as Error).message)
    return new Response('failed', { status: 500 })
  }
}

export const config: NetlifyConfig = { schedule: '0 7 * * *' }
