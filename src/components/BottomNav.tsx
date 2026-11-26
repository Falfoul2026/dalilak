import { NavLink } from 'react-router-dom'
import { useLang, useT } from '../i18n'
import { localePath } from '../i18n/langs'
import { IconBookmark, IconHeart, IconHome, IconSettings, IconStar } from './Icons'

export function BottomNav() {
  const t = useT()
  const lang = useLang()
  const items = [
    { to: '/', label: t('nav.home'), icon: <IconHome />, end: true },
    { to: '/top', label: t('nav.top'), icon: <IconStar /> },
    { to: '/picks', label: t('nav.picks'), icon: <IconHeart /> },
    { to: '/saved', label: t('nav.saved'), icon: <IconBookmark /> },
    { to: '/settings', label: t('nav.settings'), icon: <IconSettings /> },
  ]
  return (
    <nav className="bottom-nav" aria-label={t('app.name')}>
      <ul>
        {items.map((i) => (
          <li key={i.to}>
            <NavLink to={localePath(lang, i.to)} end={i.end}>
              {i.icon}
              <span>{i.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
