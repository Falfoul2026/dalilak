import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLang, useT } from '../../i18n'
import { localePath } from '../../i18n/langs'
import { AdminGate } from '../../components/AdminGate'
import { FeaturedBadge } from '../../components/Badges'
import { ErrorBox, Loading } from '../../components/ListState'
import { adminAllListings, adminSetFeatured } from '../../lib/admin'
import { normalizeForSearch } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import type { Listing } from '../../lib/types'

type Show = 'all' | 'featured' | 'hidden'

export function Component() {
  return <AdminGate><AdminList /></AdminGate>
}

function AdminList() {
  const t = useT()
  const lang = useLang()
  const [items, setItems] = useState<Listing[] | null>(null)
  const [error, setError] = useState(false)
  const [q, setQ] = useState('')
  const [show, setShow] = useState<Show>('all')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    setError(false)
    adminAllListings().then(setItems).catch(() => setError(true))
  }, [tick])

  const visible = useMemo(() => {
    const nq = normalizeForSearch(q)
    return (items ?? []).filter((l) =>
      (show === 'all' || (show === 'featured' ? l.premium_active : l.status !== 'active')) &&
      (!nq || normalizeForSearch(`${l.name} ${l.city ?? ''} ${l.type_label ?? ''}`).includes(nq)))
  }, [items, q, show])

  const toggleFeatured = async (l: Listing) => {
    setBusyId(l.id)
    try {
      await adminSetFeatured(l.id, !l.premium_active)
      setItems((prev) => prev?.map((x) => (x.id === l.id ? { ...x, is_premium: !l.premium_active, premium_until: null, premium_active: !l.premium_active } : x)) ?? null)
    } catch (e) {
      alert(t('admin.error', { msg: (e as Error).message }))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="stack">
      <div className="section-head">
        <h1 className="page-title" style={{ margin: 0 }}>{t('admin.title')}</h1>
        <button type="button" className="btn-link" onClick={() => void supabase?.auth.signOut()}>{t('admin.signOut')}</button>
      </div>
      <Link className="btn" to={localePath(lang, '/admin/new')}>+ {t('admin.addShop')}</Link>
      <input className="input" type="search" placeholder={t('admin.search')} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="segmented">
        {(['all', 'featured', 'hidden'] as const).map((s) => (
          <button key={s} type="button" aria-pressed={show === s} onClick={() => setShow(s)}>
            {t(s === 'all' ? 'admin.all' : s === 'featured' ? 'admin.featuredOnly' : 'admin.hiddenOnly')}
          </button>
        ))}
      </div>
      {error ? <ErrorBox onRetry={() => setTick((n) => n + 1)} /> : items === null ? <Loading /> : (
        <>
          <p className="muted" style={{ margin: 0 }}>{t('admin.count', { count: visible.length })}</p>
          <ul className="admin-list">
            {visible.map((l) => (
              <li key={l.id} className="admin-row">
                <Link to={localePath(lang, `/admin/l/${l.id}`)} className="admin-row__main">
                  <b dir="auto">{l.name}</b>
                  <span className="muted">{[l.city, l.type_label].filter(Boolean).join(' · ')}</span>
                  <span className="admin-row__tags">
                    {l.premium_active && <FeaturedBadge />}
                    {l.status !== 'active' && <span className="badge badge--verify">{l.status === 'hidden' ? t('admin.hidden') : l.status}</span>}
                  </span>
                </Link>
                <label className="switch" title={t('admin.featured')}>
                  <input type="checkbox" checked={l.premium_active} disabled={busyId === l.id} onChange={() => void toggleFeatured(l)} />
                  <span className="visually-hidden">{t('admin.featured')}</span>
                  <span className="switch__ui" aria-hidden />
                </label>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

export default Component
