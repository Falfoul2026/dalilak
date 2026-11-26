import { Head } from 'vite-react-ssg'
import { useT } from '../i18n'
import { WHATSAPP_MESSAGES, whatsappLink } from '../lib/flags'

/** "أعلن معنا": how banner advertising works, and a WhatsApp button to Yousef. */
export function Component() {
  const t = useT()
  const wa = whatsappLink(WHATSAPP_MESSAGES.advertise)
  return (
    <section className="stack">
      <Head>
        <title>{`${t('banners.pageTitle')} | ${t('app.name')}`}</title>
        <meta name="description" content={t('banners.pageIntro')} />
      </Head>
      <h1 className="page-title">{t('banners.pageTitle')}</h1>
      <p style={{ margin: 0 }}>{t('banners.pageIntro')}</p>
      <ul className="card advertise-points">
        <li>{t('banners.point1')}</li>
        <li>{t('banners.point2')}</li>
        <li>{t('banners.point3')}</li>
        <li>{t('banners.point4')}</li>
      </ul>
      {wa && <a className="btn btn--whatsapp btn--block" href={wa} target="_blank" rel="noopener">{t('banners.contact')}</a>}
    </section>
  )
}

export default Component
