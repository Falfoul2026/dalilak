import { Head } from 'vite-react-ssg'
import { Link } from 'react-router-dom'
import { useLang, useT } from '../i18n'
import { localePath } from '../i18n/langs'
import { WHATSAPP_MESSAGES, whatsappLink } from '../lib/flags'

/** "أضف محلك": shops contact Yousef directly (WhatsApp / email). */
export function Component() {
  const t = useT()
  const lang = useLang()
  const addLink = whatsappLink(WHATSAPP_MESSAGES.addShop)
  const reportLink = whatsappLink(WHATSAPP_MESSAGES.report)
  return (
    <section className="stack">
      <Head>
        <title>{`${t('contact.title')} | ${t('app.name')}`}</title>
        <meta name="description" content={t('contact.intro')} />
      </Head>
      <h1 className="page-title">{t('contact.title')}</h1>
      <p style={{ margin: 0 }}>{t('contact.intro')}</p>
      {addLink && <a className="btn btn--whatsapp" href={addLink} target="_blank" rel="noopener">{t('contact.addViaWhatsapp')}</a>}
      <Link to={localePath(lang, '/advertise')}>{t('banners.pageTitle')}</Link>
      <p className="muted" style={{ margin: 0 }}>{t('contact.fix')}</p>
      {reportLink && <a className="btn btn--ghost" href={reportLink} target="_blank" rel="noopener">{t('contact.reportViaWhatsapp')}</a>}
    </section>
  )
}

export default Component
