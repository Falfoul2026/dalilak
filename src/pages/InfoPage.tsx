import { Link, useSearchParams } from 'react-router-dom'
import { ContactForm } from '../components/ContactForm'
import { useLang, useT } from '../i18n'
import { localePath } from '../i18n/langs'
import { contact } from '../lib/flags'

/** Pages that arrive in the next steps. */
function SoonPage({ title }: { title: string }) {
  const t = useT()
  return (
    <section>
      <h1 className="page-title">{title}</h1>
      <div className="card">{t('common.soon')}</div>
    </section>
  )
}

function LegalPage({ which }: { which: 'privacy' | 'terms' }) {
  const t = useT()
  const lang = useLang()
  return (
    <section>
      <h1 className="page-title">{t(`settings.${which}`)}</h1>
      <div className="card stack">
        <p style={{ margin: 0 }}>{t(`legal.${which}Body`)}</p>
        {which === 'privacy' && <p style={{ margin: 0 }}>{t('legal.appNote')}</p>}
      </div>
      <p className="muted">
        {t('legal.contactLine')}{' '}
        <Link to={localePath(lang, '/add')}>{t('contact.title')}</Link>
        {contact.email && <> · <a href={`mailto:${contact.email}`} dir="ltr">{contact.email}</a></>}
      </p>
    </section>
  )
}

export const Privacy = () => <LegalPage which="privacy" />
export const Terms = () => <LegalPage which="terms" />
/** "Report wrong info or a closed shop": a form that goes to Yousef's email. */
export function Report() {
  const t = useT()
  const [params] = useSearchParams()
  const shop = params.get('shop') ?? ''
  const url = params.get('url') ?? ''
  return (
    <section className="stack">
      <h1 className="page-title">{t('contact.reportLink')}</h1>
      <p style={{ margin: 0 }}>{t('contact.fix')}</p>
      <ContactForm kind="report" defaults={shop ? { shopName: shop } : {}} hidden={url ? { shopUrl: url } : {}} />
    </section>
  )
}
export const Claim = () => <SoonPage title={useT()('soonPage.claim')} />

export function Login() {
  const t = useT()
  return (
    <section>
      <h1 className="page-title">{t('auth.loginTitle')}</h1>
      <p className="muted">{t('auth.loginNeeded')}</p>
      <div className="card">{t('auth.soon')}</div>
    </section>
  )
}
