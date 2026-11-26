import { useEffect, useState } from 'react'
import { Head } from 'vite-react-ssg'
import { useT } from '../i18n'
import { CategoryChips, ProvinceSelect } from '../components/Filters'
import { ListingCard } from '../components/ListingCard'
import { Empty, ErrorBox, Loading } from '../components/ListState'
import { featuredListings } from '../lib/listings'
import { isSupabaseConfigured } from '../lib/supabase'
import type { Listing } from '../lib/types'

/** "خياراتنا المفضلة": all premium businesses, freshly shuffled on every visit (equal exposure). */
export function Component() {
  const t = useT()
  const [category, setCategory] = useState<string | null>(null)
  const [province, setProvince] = useState<string | null>(null)
  const [items, setItems] = useState<Listing[] | null>(null)
  const [error, setError] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let alive = true
    setError(false)
    setItems(null)
    featuredListings(Math.random().toString(36).slice(2), category, province, 100)
      .then((r) => alive && setItems(r))
      .catch(() => alive && setError(true))
    return () => { alive = false }
  }, [category, province, tick])

  return (
    <section className="stack">
      <Head>
        <title>{`${t('pages.picks.title')} | ${t('app.name')}`}</title>
        <meta name="description" content={t('pages.picks.desc')} />
      </Head>
      <div>
        <h1 className="page-title">{t('pages.picks.title')}</h1>
        <p className="muted" style={{ margin: 0 }}>{t('pages.picks.desc')}</p>
      </div>
      <CategoryChips value={category} onChange={setCategory} />
      <ProvinceSelect id="picks-province" value={province} onChange={setProvince} />
      {error ? <ErrorBox onRetry={() => setTick((n) => n + 1)} /> : items === null ? <Loading /> : items.length === 0 ? <Empty text={t('list.empty')} /> : (
        <ul className="listing-list">
          {items.map((l) => <li key={l.id}><ListingCard l={l} featured /></li>)}
        </ul>
      )}
    </section>
  )
}

export default Component
