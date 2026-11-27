import { Link } from 'react-router-dom'
import { Head } from 'vite-react-ssg'
import { useLang, useT } from '../../i18n'
import { backArrow } from '../../lib/format'
import { localePath } from '../../i18n/langs'
import { ContactForm } from '../../components/ContactForm'

/** Sellers send their details to Yousef by email (form); he posts the ad. */
export function Component() {
  const t = useT()
  const lang = useLang()
  return (
    <section className="stack">
      <Head>
        <title>{`${t('market.sellTitle')} | ${t('app.name')}`}</title>
        <meta name="description" content={t('market.sellIntro')} />
      </Head>
      <Link to={localePath(lang, '/market')}>{backArrow(lang)} {t('market.back')}</Link>
      <h1 className="page-title" style={{ marginTop: 0 }}>{t('market.sellTitle')}</h1>
      <p style={{ margin: 0 }}>{t('market.sellIntro')}</p>
      <div className="card">{t('market.sellSteps')}</div>
      <ContactForm kind="sell" />
    </section>
  )
}

export default Component
