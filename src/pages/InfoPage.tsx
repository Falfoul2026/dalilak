import { useT } from '../i18n'

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

export const Privacy = () => <SoonPage title={useT()('settings.privacy')} />
export const Terms = () => <SoonPage title={useT()('settings.terms')} />
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
