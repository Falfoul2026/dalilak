import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLang, useT } from '../../i18n'
import { localePath } from '../../i18n/langs'
import { AdminGate } from '../../components/AdminGate'
import { AdminTabs } from '../../components/AdminTabs'
import { ErrorBox, Loading } from '../../components/ListState'
import { adminAllBanners, bannerState } from '../../lib/admin'
import { bannerImageUrl, type Banner } from '../../lib/banners'

export function Component() {
  return <AdminGate><AdminBanners /></AdminGate>
}

const STATE_KEY = { running: 'admin.stRunning', scheduled: 'admin.stScheduled', expired: 'admin.stExpired', hidden: 'admin.stHidden', noimage: 'admin.stNoImage' } as const

function AdminBanners() {
  const t = useT()
  const lang = useLang()
  const [items, setItems] = useState<Banner[] | null>(null)
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)
  useEffect(() => {
    setError('')
    adminAllBanners().then(setItems).catch((e) => setError((e as Error).message))
  }, [tick])
  return (
    <section className="stack">
      <AdminTabs active="banners" />
      <Link className="btn" to={localePath(lang, '/admin/banners/new')}>+ {t('admin.addBanner')}</Link>
      {error ? <><p className="form__error">{t('admin.error', { msg: error })}</p><ErrorBox onRetry={() => setTick((n) => n + 1)} /></> : items === null ? <Loading /> : (
        <>
          <p className="muted" style={{ margin: 0 }}>{t('admin.bannersCount', { count: items.length })}</p>
          <ul className="admin-list">
            {items.map((b) => {
              const st = bannerState(b)
              return (
                <li key={b.id} className="admin-row">
                  <span className="admin-thumb admin-thumb--wide" aria-hidden>{b.image_path ? <img src={bannerImageUrl(b.image_path)} alt="" loading="lazy" /> : '🖼️'}</span>
                  <Link to={localePath(lang, `/admin/banners/${b.id}`)} className="admin-row__main">
                    <b dir="auto">{b.title}</b>
                    <span className="muted" dir="ltr">{[b.starts_on, b.ends_on].map((d) => d ?? '…').join(' → ')}</span>
                    <span className="admin-row__tags"><span className={`badge ${st === 'running' ? 'badge--verified' : 'badge--verify'}`}>{t(STATE_KEY[st])}</span></span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}

export default Component
