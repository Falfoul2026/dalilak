import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLang, useT } from '../i18n'
import { localePath } from '../i18n/langs'
import { ListingCard } from '../components/ListingCard'
import { Empty, Loading } from '../components/ListState'
import { useAuth } from '../lib/auth'
import { useFavorites } from '../lib/favorites'
import { getListingsByIds } from '../lib/listings'
import type { Listing } from '../lib/types'

/** "محفوظاتي": the logged-in user's saved listings. */
export function Component() {
  const t = useT()
  const lang = useLang()
  const { ready, session } = useAuth()
  const { ids, loaded } = useFavorites()
  const [items, setItems] = useState<Listing[] | null>(null)
  const key = [...ids].sort((a, b) => a - b).join(',')

  useEffect(() => {
    if (!loaded) return
    let alive = true
    getListingsByIds([...ids]).then((r) => alive && setItems(r)).catch(() => alive && setItems([]))
    return () => { alive = false }
  }, [loaded, key]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="stack">
      <div>
        <h1 className="page-title">{t('pages.saved.title')}</h1>
        <p className="muted" style={{ margin: 0 }}>{t('pages.saved.desc')}</p>
      </div>
      {!ready ? <Loading /> : !session ? (
        <div className="card stack">
          <p style={{ margin: 0 }}>{t('auth.loginNeeded')}</p>
          <Link className="btn" to={`${localePath(lang, '/login')}?next=${encodeURIComponent(localePath(lang, '/saved'))}`}>{t('auth.login')}</Link>
        </div>
      ) : items === null ? <Loading /> : items.length === 0 ? <Empty text={t('saved.empty')} /> : (
        <ul className="listing-list">
          {items.map((l) => <li key={l.id}><ListingCard l={l} /></li>)}
        </ul>
      )}
    </section>
  )
}

export default Component
