import { Head } from 'vite-react-ssg'
import { Link } from 'react-router-dom'
import { ContactForm } from '../components/ContactForm'
import { useLang, useT } from '../i18n'
import { localePath } from '../i18n/langs'

/** "أضف محلك": shops send their details to Yousef by email (form). */
export function Component() {
  const t = useT()
  const lang = useLang()
  return (
    <section className="stack">
      <Head>
        <title>{`${t('contact.title')} | ${t('app.name')}`}</title>
        <meta name="description" content={t('contact.intro')} />
      </Head>
      <h1 className="page-title">{t('contact.title')}</h1>
      <p style={{ margin: 0 }}>{t('contact.intro')}</p>
      <ContactForm kind="add-shop" />
      <Link to={localePath(lang, '/advertise')}>{t('banners.pageTitle')}</Link>
      <p className="muted" style={{ margin: 0 }}>{t('contact.fix')}</p>
      <Link className="btn btn--ghost" to={localePath(lang, '/report')}>{t('contact.reportLink')}</Link>
    </section>
  )
}

export default Component
