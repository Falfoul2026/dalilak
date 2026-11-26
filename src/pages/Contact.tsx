import { Head } from 'vite-react-ssg'
import { useT } from '../i18n'
import { contact } from '../lib/flags'

/** "أضف محلك": shops contact Yousef directly (WhatsApp / email). */
export function Component() {
  const t = useT()
  return (
    <section className="stack">
      <Head>
        <title>{`${t('contact.title')} | ${t('app.name')}`}</title>
        <meta name="description" content={t('contact.intro')} />
      </Head>
      <h1 className="page-title">{t('contact.title')}</h1>
      <p style={{ margin: 0 }}>{t('contact.intro')}</p>
      {(contact.whatsapp || contact.email) && (
        <div className="segmented">
          {contact.whatsapp && <a className="btn" href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noopener">{t('contact.whatsapp')}</a>}
          {contact.email && <a className="btn btn--ghost" href={`mailto:${contact.email}`} dir="ltr">{contact.email}</a>}
        </div>
      )}
      <p className="muted" style={{ margin: 0 }}>{t('contact.fix')}</p>
    </section>
  )
}

export default Component
