import { Link } from 'react-router-dom'
import { useLang, useT } from '../i18n'
import { localePath } from '../i18n/langs'

export default function NotFound() {
  const t = useT()
  const lang = useLang()
  return (
    <section>
      <h1 className="page-title">{t('notFound.title')}</h1>
      <Link to={localePath(lang, '/')}>{t('common.back')}</Link>
    </section>
  )
}
