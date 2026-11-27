import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLang, useT } from '../../i18n'
import { localePath } from '../../i18n/langs'
import { AdminGate } from '../../components/AdminGate'
import { AdminTabs } from '../../components/AdminTabs'
import { ErrorBox, Loading } from '../../components/ListState'
import { adminBillingOverview, adminReminderLog, daysBetween, todayBrussels, type BillingOverviewRow, type ReminderLogRow } from '../../lib/admin'
import { formatDate } from '../../lib/format'

export function Component() {
  return <AdminGate><AdminSubs /></AdminGate>
}

/** Dashboard: places ending within 7 days, expired places, and the log of reminders sent. */
function AdminSubs() {
  const t = useT()
  const lang = useLang()
  const [rows, setRows] = useState<BillingOverviewRow[] | null>(null)
  const [log, setLog] = useState<ReminderLogRow[]>([])
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)
  const today = todayBrussels()

  useEffect(() => {
    setError('')
    Promise.all([adminBillingOverview(), adminReminderLog(50)])
      .then(([b, l]) => { setRows(b); setLog(l) })
      .catch((e) => setError((e as Error).message))
  }, [tick])

  const sentFor = (r: BillingOverviewRow) => log.some((x) => x.kind === 'reminder' && x.listing_id === r.listing_id && x.period_end === r.ends_on && x.status === 'sent')
  const soon = (rows ?? []).filter((r) => r.ends_on >= today && daysBetween(today, r.ends_on) <= 7)
  const expired = (rows ?? []).filter((r) => r.ends_on < today).reverse()
  const link = (r: BillingOverviewRow) => localePath(lang, `/admin/l/${r.listing_id}`)

  return (
    <section className="stack">
      <AdminTabs active="subs" />
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>{t('admin.autoNote')}</p>
      {error ? <><p className="form__error">{t('admin.error', { msg: error })}</p><ErrorBox onRetry={() => setTick((n) => n + 1)} /></> : rows === null ? <Loading /> : (
        <>
          <h2 className="section-title">⏳ {t('admin.expiringSoon')} ({soon.length})</h2>
          {soon.length === 0 ? <p className="muted" style={{ margin: 0 }}>{t('admin.noneHere')}</p> : (
            <ul className="admin-list">
              {soon.map((r) => (
                <li key={r.listing_id} className="admin-row">
                  <Link to={link(r)} className="admin-row__main">
                    <b dir="auto">{r.listing?.name ?? `#${r.listing_id}`}</b>
                    <span className="muted">{formatDate(r.ends_on, lang)} · {t('admin.daysLeft', { n: daysBetween(today, r.ends_on) })} · <span dir="ltr">{r.owner_email ?? '—'}</span></span>
                    <span className="admin-row__tags">
                      <span className={`badge ${sentFor(r) ? 'badge--verified' : 'badge--verify'}`}>{r.owner_email ? t(sentFor(r) ? 'admin.reminderDone' : 'admin.reminderPending') : t('admin.noEmail')}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <h2 className="section-title">⛔ {t('admin.expiredList')} ({expired.length})</h2>
          {expired.length === 0 ? <p className="muted" style={{ margin: 0 }}>{t('admin.noneHere')}</p> : (
            <ul className="admin-list">
              {expired.map((r) => (
                <li key={r.listing_id} className="admin-row">
                  <Link to={link(r)} className="admin-row__main">
                    <b dir="auto">{r.listing?.name ?? `#${r.listing_id}`}</b>
                    <span className="muted">{t('admin.endedOn', { date: formatDate(r.ends_on, lang) })} · <span dir="ltr">{r.owner_email ?? '—'}</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <h2 className="section-title">✉️ {t('admin.reminderLog')}</h2>
          {log.length === 0 ? <p className="muted" style={{ margin: 0 }}>{t('admin.noneHere')}</p> : (
            <ul className="log-list card">
              {log.map((r) => (
                <li key={r.id}>
                  <span dir="ltr">{formatDate(r.created_at, lang)}</span> · <b dir="auto">{r.listing?.name ?? '—'}</b> · {t(r.kind === 'test' ? 'admin.kindTest' : 'admin.kindReminder')} · <span dir="ltr">{r.to_email}</span> ·{' '}
                  <b className={r.status === 'error' ? 'form__error' : ''}>{t(r.status === 'sent' ? 'admin.remSent' : r.status === 'error' ? 'admin.remError' : 'admin.remSending')}</b>
                  {r.error && <span className="muted"> ({r.error})</span>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}

export default Component
