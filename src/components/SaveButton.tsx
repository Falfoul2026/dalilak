import { useLocation, useNavigate } from 'react-router-dom'
import { useLang, useT } from '../i18n'
import { localePath } from '../i18n/langs'
import { useAuth } from '../lib/auth'
import { useFavorites } from '../lib/favorites'
import { IconBookmark } from './Icons'

/** Save to "محفوظاتي". Visitors are sent to login first (login is only asked when needed). */
export function SaveButton({ listingId }: { listingId: number }) {
  const t = useT()
  const lang = useLang()
  const { session } = useAuth()
  const { ids, toggle } = useFavorites()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const saved = ids.has(listingId)
  return (
    <button
      type="button"
      className={`action${saved ? ' action--on' : ''}`}
      aria-pressed={saved}
      onClick={() => {
        if (!session) navigate(`${localePath(lang, '/login')}?next=${encodeURIComponent(pathname)}`)
        else void toggle(listingId)
      }}
    >
      <IconBookmark />
      <span>{saved ? t('listing.saved') : t('listing.save')}</span>
    </button>
  )
}
