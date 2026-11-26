import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLang, useT } from '../i18n'
import { localePath } from '../i18n/langs'
import { featuredListings } from '../lib/listings'
import { isSupabaseConfigured } from '../lib/supabase'
import type { Listing } from '../lib/types'
import { ListingCard } from './ListingCard'

/** "خياراتنا المفضلة" strip on the home page. Order is reshuffled on every visit. */
export function FeaturedCarousel({ category, province }: { category: string | null; province: string | null }) {
  const t = useT()
  const lang = useLang()
  const [items, setItems] = useState<Listing[]>([])
  useEffect(() => {
    if (!isSupabaseConfigured) return
    let alive = true
    featuredListings(Math.random().toString(36).slice(2), category, province, 10)
      .then((r) => alive && setItems(r))
      .catch(() => alive && setItems([]))
    return () => { alive = false }
  }, [category, province])
  if (items.length === 0) return null
  return (
    <section className="featured" aria-labelledby="featured-title">
      <div className="section-head">
        <h2 id="featured-title">{t('nav.picks')}</h2>
        <Link to={localePath(lang, '/picks')}>{t('list.seeAll')}</Link>
      </div>
      <div className="featured__row">
        {items.map((l) => <ListingCard key={l.id} l={l} featured />)}
      </div>
    </section>
  )
}
