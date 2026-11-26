import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Head } from 'vite-react-ssg'
import { useT } from '../i18n'
import { checkIsAdmin } from '../lib/admin'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { Loading } from './ListState'

/** Shows children only to the admin; everyone else gets the admin login form.
 *  (Real protection is on the server: every admin_* function checks is_admin().) */
export function AdminGate({ children }: { children: ReactNode }) {
  const t = useT()
  const { ready, session } = useAuth()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    setIsAdmin(null)
    if (session) checkIsAdmin(session.user.id).then(setIsAdmin).catch(() => setIsAdmin(false))
  }, [session])

  const head = <Head><meta name="robots" content="noindex,nofollow" /><title>{t('admin.title')}</title></Head>
  if (!ready || (session && isAdmin === null)) return <>{head}<Loading /></>
  if (!session) return <>{head}<AdminLogin /></>
  if (!isAdmin) {
    return (
      <section className="stack">
        {head}
        <h1 className="page-title">{t('admin.title')}</h1>
        <div className="card">{t('admin.notAdmin')}</div>
        <button type="button" className="btn btn--ghost" onClick={() => void supabase?.auth.signOut()}>{t('admin.signOut')}</button>
      </section>
    )
  }
  return <>{head}{children}</>
}

function AdminLogin() {
  const t = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) setError(t('admin.badLogin'))
  }
  return (
    <section className="stack">
      <h1 className="page-title">{t('admin.login')}</h1>
      <form className="card form" onSubmit={(e) => void submit(e)}>
        <label>{t('admin.email')}<input type="email" dir="ltr" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>{t('admin.password')}<input type="password" dir="ltr" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {error && <p className="form__error" role="alert">{error}</p>}
        <button className="btn" disabled={busy}>{t('admin.signIn')}</button>
      </form>
    </section>
  )
}
