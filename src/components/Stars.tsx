import { useLang, useT } from '../i18n'
import { formatNumber, formatRating } from '../lib/format'

/** "★ 4.7 (2,701)" – Google rating plus review count. */
export function RatingLine({ rating, count }: { rating: number | null; count: number }) {
  const t = useT()
  const lang = useLang()
  if (rating === null || count === 0) return <span className="muted rating">{t('list.noRating')}</span>
  return (
    <span className="rating">
      <span className="rating__star" aria-hidden>★</span>
      <b>{formatRating(rating, lang)}</b>
      <span className="muted">({formatNumber(count, lang)})</span>
    </span>
  )
}

export function StarRow({ stars }: { stars: number }) {
  return (
    <span className="star-row" aria-label={`${stars} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => <span key={i} aria-hidden className={i <= stars ? 'on' : ''}>★</span>)}
    </span>
  )
}
