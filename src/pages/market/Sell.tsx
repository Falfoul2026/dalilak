import { Link } from 'react-router-dom'
import { Head } from 'vite-react-ssg'
import { useLang, useT } from '../../i18n'
import { backArrow } from '../../lib/format'
import { localePath } from '../../i18n/langs'
import { WHATSAPP_MESSAGES, whatsappLink } from '../../lib/flags'

/** Sellers send their details to Yousef on WhatsApp; he posts the ad. */
export function Component() {
  const t = useT()
  const lang = useLang()
  const wa = whatsappLink(WHATSAPP_MESSAGES.sell)
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
      {wa && <a className="btn btn--whatsapp btn--block" href={wa} target="_blank" rel="noopener">{t('market.sellButton')}</a>}
    </section>
  )
}

export default Component
