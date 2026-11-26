import { Link } from 'react-router-dom'
import { useLang, useT } from '../i18n'
import { localePath } from '../i18n/langs'
import { CATEGORIES } from '../data/categories'
import { typeLabel } from '../data/typeLabels'
import { photoUrl } from '../lib/listings'
import type { Listing } from '../lib/types'
import { FeaturedBadge, VerifyArabicTag } from './Badges'
import { RatingLine } from './Stars'

const icon = (cat: string) => CATEGORIES.find((c) => c.slug === cat)?.icon ?? '📍'

/** One row in a list. `featured` shows the paid label; pass it whenever the card's position comes from payment. */
export function ListingCard({ l, featured, rank }: { l: Listing; featured?: boolean; rank?: number }) {
  const t = useT()
  const lang = useLang()
  const showLogo = l.premium_active && l.logo_path
  return (
    <Link to={localePath(lang, `/l/${l.slug}`)} className={`listing-card${featured ? ' listing-card--featured' : ''}`}>
      {rank !== undefined && <span className="listing-card__rank" aria-label={t('top.rank', { n: rank })}>{rank}</span>}
      <span className="listing-card__thumb" aria-hidden>
        {showLogo ? <img src={photoUrl(l.logo_path!)} alt="" loading="lazy" width={52} height={52} /> : icon(l.category)}
      </span>
      <span className="listing-card__body">
        <span className="listing-card__name" dir="auto">{l.name}</span>
        <span className="listing-card__meta">
          {[typeLabel(l.type_label, lang) || t(`categories.${l.category}`), l.city].filter(Boolean).join(' · ')}
        </span>
        <RatingLine rating={l.rating_google} count={l.reviews_google} />
        {(featured || !l.language_verified) && (
          <span className="listing-card__badges">
            {featured && <FeaturedBadge />}
            {!l.language_verified && <VerifyArabicTag />}
          </span>
        )}
      </span>
    </Link>
  )
}
