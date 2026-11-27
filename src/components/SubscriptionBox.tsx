import { useEffect, useState, type FormEvent } from 'react'
import { useLang, useT } from '../i18n'
import { LANG_NAMES } from '../i18n/langs'
import {
  adminGetBilling, adminPlaceStats, adminReminderLog, adminRenewMonth, adminSaveSubscription, adminSendTestReminder,
  adminSubscriptionLog, daysBetween, todayBrussels,
  type Billing, type EmailLang, type PlaceStats, type ReminderLogRow, type SubLogRow, type SubscriptionInput,
} from '../lib/admin'
import { formatDate, formatNumber } from '../lib/format'

const addMonth = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + 1)
  return d.toISOString().slice(0, 10)
}

/** Admin: paid subscription of one place – owner email, language, dates, renew, stats, test reminder, logs. */
export function SubscriptionBox({ listingId, onChange }: { listingId: number; onChange: () => void }) {
  const t = useT()
  const lang = useLang()
  const today = todayBrussels()
  const [billing, setBilling] = useState<Billing | null | undefined>(undefined)
  const [form, setForm] = useState<SubscriptionInput>({ owner_email: '', email_lang: 'ar', starts_on: today, ends_on: addMonth(today) })
  const [stats, setStats] = useState<PlaceStats | null>(null)
  const [log, setLog] = useState<SubLogRow[]>([])
  const [reminders, setReminders] = useState<ReminderLogRow[]>([])
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const b = await adminGetBilling(listingId)
    setBilling(b)
    if (b) {
      setForm({ owner_email: b.owner_email ?? '', email_lang: b.email_lang, starts_on: b.starts_on, ends_on: b.ends_on })
      setStats(await adminPlaceStats(listingId, b.period_start, today < b.ends_on ? today : b.ends_on))
    } else setStats(null)
    setLog(await adminSubscriptionLog(listingId))
    setReminders(await adminReminderLog(10, listingId))
  }
  useEffect(() => { load().catch((e) => { setBilling(null); setMsg(t('admin.error', { msg: (e as Error).message })) }) }, [listingId]) // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (fn: () => Promise<string | void>) => {
    setBusy(true)
    setMsg(t('admin.saving'))
    try {
      const done = await fn()
      await load()
      onChange()
      setMsg(done || t('admin.saved'))
    } catch (e) {
      setMsg(t('admin.error', { msg: (e as Error).message }))
    } finally {
      setBusy(false)
    }
  }

  const save = (e: FormEvent) => { e.preventDefault(); void run(() => adminSaveSubscription(listingId, form)) }
  const renew = () => void run(async () => t('admin.renewed', { date: formatDate(await adminRenewMonth(listingId), lang) }))
  const test = () => void run(async () => t('admin.testSent', { to: (await adminSendTestReminder(listingId)).to }))

  if (billing === undefined) return null
  const left = billing ? daysBetween(today, billing.ends_on) : 0
  const status = !billing ? t('admin.subNone')
    : left > 0 ? t('admin.subActive', { date: formatDate(billing.ends_on, lang), n: left })
    : left === 0 ? t('admin.subEndsToday', { date: formatDate(billing.ends_on, lang) })
    : t('admin.subEnded', { date: formatDate(billing.ends_on, lang) })

  return (
    <section className={`card stack sub-box${billing && left >= 0 ? ' featured-box--on' : ''}`}>
      <h2 className="section-title">💳 {t('admin.subTitle')}</h2>
      <b>{status}</b>
      {billing && !billing.owner_email && <p className="form__error" style={{ margin: 0 }}>{t('admin.noEmail')}</p>}

      {billing && stats && (
        <div>
          <p className="muted" style={{ margin: '0 0 6px', fontSize: 13 }}>
            {t('admin.statsPeriod', { from: formatDate(billing.period_start, lang), to: formatDate(today < billing.ends_on ? today : billing.ends_on, lang) })}
          </p>
          <div className="stats-row">
            <span><b>{formatNumber(stats.views, lang)}</b>{t('admin.statViews')}</span>
            <span><b>{formatNumber(stats.calls, lang)}</b>{t('admin.statCalls')}</span>
            <span><b>{formatNumber(stats.directions, lang)}</b>{t('admin.statDirections')}</span>
          </div>
        </div>
      )}

      {billing && (
        <div className="segmented">
          <button type="button" className="btn" disabled={busy} onClick={renew}>+ {t('admin.renew')}</button>
          <button type="button" disabled={busy} onClick={test}>✉️ {t('admin.testReminder')}</button>
        </div>
      )}

      <form className="form" onSubmit={save}>
        <div className="form__row">
          <label>{t('admin.ownerEmail')}<input type="email" dir="ltr" value={form.owner_email} onChange={(e) => setForm({ ...form, owner_email: e.target.value })} /></label>
          <label>{t('admin.emailLang')}
            <select value={form.email_lang} onChange={(e) => setForm({ ...form, email_lang: e.target.value as EmailLang })}>
              {(['ar', 'fr', 'nl', 'en'] as const).map((l) => <option key={l} value={l}>{LANG_NAMES[l]}</option>)}
            </select>
          </label>
        </div>
        <div className="form__row">
          <label>{t('admin.subStart')}<input type="date" required value={form.starts_on} onChange={(e) => setForm({ ...form, starts_on: e.target.value })} /></label>
          <label>{t('admin.subEnd')}<input type="date" required min={form.starts_on} value={form.ends_on} onChange={(e) => setForm({ ...form, ends_on: e.target.value })} /></label>
        </div>
        {msg && <p className="form__msg" role="status">{msg}</p>}
        <button className="btn btn--ghost" disabled={busy}>{t('admin.saveSub')}</button>
      </form>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>{t('admin.autoNote')}</p>

      {(log.length > 0 || reminders.length > 0) && (
        <details>
          <summary>{t('admin.subLog')} / {t('admin.reminderLog')}</summary>
          <ul className="log-list">
            {log.map((r) => (
              <li key={`s${r.id}`}><span dir="ltr">{formatDate(r.created_at, lang)}</span> · {t(`admin.act_${r.action}`)}{r.new_ends_on ? ` → ${formatDate(r.new_ends_on, lang)}` : ''}</li>
            ))}
            {reminders.map((r) => (
              <li key={`r${r.id}`}><span dir="ltr">{formatDate(r.created_at, lang)}</span> · ✉️ {t(r.kind === 'test' ? 'admin.kindTest' : 'admin.kindReminder')} · {r.to_email} · <b className={r.status === 'error' ? 'form__error' : ''}>{t(r.status === 'sent' ? 'admin.remSent' : r.status === 'error' ? 'admin.remError' : 'admin.remSending')}</b>{r.error ? ` (${r.error})` : ''}</li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
