import { Link } from 'react-router-dom'
import { useLang, useT } from '../i18n'
import { localePath } from '../i18n/langs'

/** The two big choices at the top of Home and Buy & Sell. */
export function SectionSwitch({ active }: { active: 'places' | 'market' }) {
  const t = useT()
  const lang = useLang()
  const items = [
    { key: 'places', to: '/', icon: '🔍', title: t('home.choicePlaces'), sub: t('home.choicePlacesSub') },
    { key: 'market', to: '/market', icon: '🛒', title: t('home.choiceMarket'), sub: t('home.choiceMarketSub') },
  ] as const
  return (
    <nav className="section-switch" aria-label={t('app.name')}>
      {items.map((i) => (
        <Link key={i.key} to={localePath(lang, i.to)} className="section-switch__item" aria-current={active === i.key ? 'page' : undefined}>
          <span className="section-switch__icon" aria-hidden>{i.icon}</span>
          <span className="section-switch__title">{i.title}</span>
          <span className="section-switch__sub">{i.sub}</span>
        </Link>
      ))}
    </nav>
  )
}
