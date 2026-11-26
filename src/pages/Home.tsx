import { useCallback, useEffect, useRef, useState } from 'react'
import { useLoaderData } from 'react-router-dom'
import { useT } from '../i18n'
import { IconSearch } from '../components/Icons'
import { CategoryChips, ProvinceSelect } from '../components/Filters'
import { FeaturedCarousel } from '../components/FeaturedCarousel'
import { SectionSwitch } from '../components/SectionSwitch'
import { BannerStrip } from '../components/BannerStrip'
import { ListingCard } from '../components/ListingCard'
import { Empty, ErrorBox, Loading } from '../components/ListState'
import { PAGE_SIZE, logSearch, searchListings } from '../lib/listings'
import { isSupabaseConfigured } from '../lib/supabase'
import { useDebounced, useFilters } from '../lib/useFilters'
import type { Filters, Listing } from '../lib/types'

/** Build time: the first page of "All shops" goes into the static HTML (crawlable links).
 *  Premium listings are not in it: they are in the "خياراتنا المفضلة" strip above. */
export async function loader() {
  if (!import.meta.env.SSR) return null
  const { allActiveListings } = await import('../lib/ssrData')
  return { items: (await allActiveListings()).filter((l) => !l.premium_active).slice(0, PAGE_SIZE) }
}

type Status = 'idle' | 'loading' | 'error'

const isDefaultFilters = (f: Filters) => !f.q.trim() && !f.category && !f.province

export function Component() {
  const t = useT()
  const pre = useLoaderData() as { items: Listing[] } | null
  const { filters, update, ready, isDefault } = useFilters()
  const [qInput, setQInput] = useState('')
  const q = useDebounced(qInput)
  const [items, setItems] = useState<Listing[]>(pre?.items ?? [])
  const [status, setStatus] = useState<Status>(pre ? 'idle' : 'loading')
  const [more, setMore] = useState((pre?.items.length ?? 0) >= PAGE_SIZE)
  const req = useRef(0)
  /** rows received from the server so far (the next page starts here, even if some were hidden) */
  const fetched = useRef(0)

  useEffect(() => { if (ready) setQInput(filters.q) }, [ready]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (ready && q !== filters.q) update({ q }) }, [q]) // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async (offset: number) => {
    if (!isSupabaseConfigured) return
    const id = ++req.current
    setStatus('loading')
    try {
      const rows = await searchListings(filters, offset)
      if (id !== req.current) return
      fetched.current = offset + rows.length
      // Without search/filters the premium listings are shown in the strip above, so they are
      // left out here (no listing twice). With search/filters the strip is hidden and premium
      // listings stay first in the results, labelled "مميّز".
      const shown = isDefaultFilters(filters) ? rows.filter((l) => !l.premium_active) : rows
      setItems((prev) => (offset === 0 ? shown : [...prev, ...shown]))
      setMore(rows.length === PAGE_SIZE)
      setStatus('idle')
      if (offset === 0) logSearch(filters, rows.length)
    } catch {
      if (id === req.current) setStatus('error')
    }
  }, [filters])

  // Fresh data from the database once the page is in the browser (and on every filter change).
  useEffect(() => { if (ready) void load(0) }, [ready, load])

  const filtered = !isDefault
  return (
    <>
      <SectionSwitch active="places" />
      <form className="search" role="search" onSubmit={(e) => e.preventDefault()}>
        <label className="visually-hidden" htmlFor="q">{t('home.searchPlaceholder')}</label>
        <IconSearch />
        <input id="q" type="search" placeholder={t('home.searchPlaceholder')} autoComplete="off" enterKeyHint="search"
          value={qInput} onChange={(e) => setQInput(e.target.value)} />
      </form>

      <CategoryChips value={filters.category} onChange={(category) => update({ category })} />
      <ProvinceSelect value={filters.province} onChange={(province) => update({ province })} />

      {!filtered && <BannerStrip />}
      {!filtered && <FeaturedCarousel category={null} province={null} />}

      <section aria-labelledby="list-title" className="stack" style={{ marginTop: 16 }}>
        <h2 id="list-title" className="section-title">{filtered ? t('list.results') : t('list.allListings')}</h2>
        {status === 'error' && items.length === 0 && <ErrorBox onRetry={() => void load(0)} />}
        {status === 'loading' && items.length === 0 && <Loading />}
        {status === 'idle' && items.length === 0 && <Empty text={t('list.empty')} />}
        <ul className="listing-list" aria-busy={status === 'loading'}>
          {items.map((l) => (
            // Premium listings are placed first because they pay (filtered results), so they carry the paid label.
            <li key={l.id}><ListingCard l={l} featured={l.premium_active} /></li>
          ))}
        </ul>
        {more && items.length > 0 && (
          <button type="button" className="btn btn--block" disabled={status === 'loading'} onClick={() => void load(fetched.current)}>
            {status === 'loading' ? t('list.loading') : t('list.loadMore')}
          </button>
        )}
      </section>
    </>
  )
}

export default Component
