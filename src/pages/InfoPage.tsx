import { useT } from '../i18n'
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
  return (
    <section>
      <h1 className="page-title">{t(`settings.${which}`)}</h1>
      <div className="card"><p style={{ margin: 0 }}>{t(`legal.${which}Body`)}</p></div>
      {contact.email && <p className="muted"><a href={`mailto:${contact.email}`} dir="ltr">{contact.email}</a></p>}
    </section>
  )
}

export const Privacy = () => <LegalPage which="privacy" />
export const Terms = () => <LegalPage which="terms" />
export const Report = () => <SoonPage title={useT()('soonPage.report')} />
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
