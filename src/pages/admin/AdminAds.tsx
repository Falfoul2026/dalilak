import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLang, useT } from '../../i18n'
import { localePath } from '../../i18n/langs'
import { AdminGate } from '../../components/AdminGate'
import { AdminTabs } from '../../components/AdminTabs'
import { ErrorBox, Loading } from '../../components/ListState'
import { adminAllAds } from '../../lib/admin'
import { normalizeForSearch } from '../../lib/format'
import { adPhotoUrl, formatPrice, type Ad, type AdStatus } from '../../lib/market'

export function Component() {
  return <AdminGate><AdminAds /></AdminGate>
}

const STATUS_KEY: Record<AdStatus, string> = { active: 'admin.statusActive', sold: 'admin.statusSold', hidden: 'admin.statusHidden' }

function AdminAds() {
  const t = useT()
  const lang = useLang()
  const [ads, setAds] = useState<Ad[] | null>(null)
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)
  const [q, setQ] = useState('')
  const [show, setShow] = useState<AdStatus | 'all'>('all')

  useEffect(() => {
    setError('')
    adminAllAds().then(setAds).catch((e) => setError((e as Error).message))
  }, [tick])

  const visible = useMemo(() => {
    const nq = normalizeForSearch(q)
    return (ads ?? []).filter((a) => (show === 'all' || a.status === show) && (!nq || normalizeForSearch(`${a.title} ${a.city}`).includes(nq)))
  }, [ads, q, show])

  return (
    <section className="stack">
      <AdminTabs active="ads" />
      <Link className="btn" to={localePath(lang, '/admin/ads/new')}>+ {t('admin.addAd')}</Link>
      <input className="input" type="search" placeholder={t('admin.search')} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="segmented">
        {(['all', 'active', 'sold', 'hidden'] as const).map((s) => (
          <button key={s} type="button" aria-pressed={show === s} onClick={() => setShow(s)}>{t(s === 'all' ? 'admin.all' : STATUS_KEY[s])}</button>
        ))}
      </div>
      {error ? <><p className="form__error">{t('admin.error', { msg: error })}</p><ErrorBox onRetry={() => setTick((n) => n + 1)} /></> : ads === null ? <Loading /> : (
        <>
          <p className="muted" style={{ margin: 0 }}>{t('admin.adsCount', { count: visible.length })}</p>
          <ul className="admin-list">
            {visible.map((a) => (
              <li key={a.id} className="admin-row">
                <span className="admin-thumb" aria-hidden>{a.cover_path ? <img src={adPhotoUrl(a.cover_path)} alt="" loading="lazy" /> : '📦'}</span>
                <Link to={localePath(lang, `/admin/ads/${a.id}`)} className="admin-row__main">
                  <b dir="auto">{a.title}</b>
                  <span className="muted">{[formatPrice(a.price_eur, lang), a.city].filter(Boolean).join(' · ')}</span>
                  <span className="admin-row__tags"><span className={`badge ${a.status === 'active' ? 'badge--verified' : 'badge--verify'}`}>{t(STATUS_KEY[a.status])}</span></span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

export default Component
