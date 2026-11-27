import { Head } from 'vite-react-ssg'
import { useT } from '../i18n'
import { ContactForm } from '../components/ContactForm'

/** "أعلن معنا": how banner advertising works, and a form that goes to Yousef's email. */
export function Component() {
  const t = useT()
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
      <h2 className="section-title">{t('banners.contact')}</h2>
      <ContactForm kind="advertise" />
    </section>
  )
}

export default Component
