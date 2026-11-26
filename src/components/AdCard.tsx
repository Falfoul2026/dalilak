import { Link } from 'react-router-dom'
import { useLang, useT } from '../i18n'
import { localePath } from '../i18n/langs'
import { AD_CATEGORIES, adPhotoUrl, formatPrice, type Ad } from '../lib/market'

export function AdCard({ ad }: { ad: Ad }) {
  const t = useT()
  const lang = useLang()
  const price = formatPrice(ad.price_eur, lang)
  const icon = AD_CATEGORIES.find((c) => c.slug === ad.category)?.icon ?? '📦'
  return (
    <Link to={localePath(lang, `/market/${ad.slug}`)} className={`ad-card${ad.status === 'sold' ? ' ad-card--sold' : ''}`}>
      <span className="ad-card__photo">
        {ad.cover_path ? <img src={adPhotoUrl(ad.cover_path)} alt="" loading="lazy" /> : <span aria-hidden>{icon}</span>}
        {ad.status === 'sold' && <span className="ad-card__sold">{t('market.sold')}</span>}
      </span>
      <span className="ad-card__body">
        <span className="ad-card__title" dir="auto">{ad.title}</span>
        <span className="ad-card__price">{price ?? t('market.priceOnRequest')}</span>
        <span className="ad-card__meta">{ad.city} · {t(`adCategories.${ad.category}`)}</span>
      </span>
    </Link>
  )
}
