// Admin panel button "Send me a test reminder": builds the real reminder for one place (marked [TEST])
// and sends it to Yousef's own address (REMINDER_REPLY_TO), never to the shop. Admin login required.
import { createClient } from '@supabase/supabase-js'
import { gmailSender } from '../lib/mailer'
import { buildTestReminder, readConfig } from '../lib/reminders'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const reply = (status: number, body: Record<string, unknown>) => Response.json(body, { status, headers: cors })

export default async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return reply(405, { error: 'method' })
  const { config, missing } = readConfig(process.env)
  if (missing.length) return reply(500, { error: 'not_configured', missing })

  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return reply(401, { error: 'login_required' })
  const db = createClient(config.supabaseUrl, config.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: u, error: authError } = await db.auth.getUser(token)
  if (authError || !u.user) return reply(401, { error: 'login_required' })
  const { data: profile } = await db.from('profiles').select('role').eq('id', u.user.id).maybeSingle()
  if (profile?.role !== 'admin') return reply(403, { error: 'admin_only' })

  let listingId = 0
  try { listingId = Number((await req.json()).listingId) } catch { /* empty body */ }
  if (!Number.isInteger(listingId) || listingId < 1) return reply(400, { error: 'listingId' })

  try {
    const mail = await buildTestReminder(db, config, listingId)
    await gmailSender(config)({ to: config.replyTo, ...mail })
    await db.rpc('log_test_reminder', { p_listing_id: listingId, p_to: config.replyTo, p_ok: true })
    return reply(200, { ok: true, to: config.replyTo, subject: mail.subject })
  } catch (e) {
    const msg = (e as Error).message ?? String(e)
    await db.rpc('log_test_reminder', { p_listing_id: listingId, p_to: config.replyTo, p_ok: false, p_error: msg })
    return reply(500, { error: 'send_failed', detail: msg })
  }
}
