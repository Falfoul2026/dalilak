import { useEffect, useState } from 'react'
import { useLoaderData } from 'react-router-dom'
import { Head } from 'vite-react-ssg'
import { useT } from '../i18n'
import { CategoryChips, ProvinceSelect } from '../components/Filters'
import { ListingCard } from '../components/ListingCard'
import { Empty, ErrorBox, Loading } from '../components/ListState'
import { topRated } from '../lib/listings'
import { isSupabaseConfigured } from '../lib/supabase'
import type { Listing } from '../lib/types'

/** "الأعلى تقييماً": ranked by real ratings only – payment never changes this order. */
export async function loader() {
  if (!import.meta.env.SSR) return null
  const { topRatedAll } = await import('../lib/ssrData')
  return { items: await topRatedAll() }
}

export function Component() {
  const t = useT()
  const pre = useLoaderData() as { items: Listing[] } | null
  const [category, setCategory] = useState<string | null>(null)
  const [province, setProvince] = useState<string | null>(null)
  const [items, setItems] = useState<Listing[] | null>(pre?.items ?? null)
  const [error, setError] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let alive = true
    setError(false)
    topRated(category, province)
      .then((r) => alive && setItems(r))
      .catch(() => alive && setError(true))
    return () => { alive = false }
  }, [category, province, tick])

  return (
    <section className="stack">
      <Head>
        <title>{`${t('pages.top.title')} | ${t('app.name')}`}</title>
        <meta name="description" content={t('pages.top.desc')} />
      </Head>
      <div>
        <h1 className="page-title">{t('pages.top.title')}</h1>
        <p className="muted" style={{ margin: 0 }}>{t('pages.top.desc')}</p>
      </div>
      <CategoryChips value={category} onChange={setCategory} />
      <ProvinceSelect id="top-province" value={province} onChange={setProvince} />
      {error ? <ErrorBox onRetry={() => setTick((n) => n + 1)} /> : items === null ? <Loading /> : items.length === 0 ? <Empty text={t('list.empty')} /> : (
        <ol className="listing-list">
          {items.map((l, i) => <li key={l.id}><ListingCard l={l} rank={i + 1} /></li>)}
        </ol>
      )}
    </section>
  )
}

export default Component
