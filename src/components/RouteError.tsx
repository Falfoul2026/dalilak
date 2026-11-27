import { useEffect } from 'react'
import { useRouteError } from 'react-router-dom'
import i18n from '../i18n'
import { splitLocale } from '../i18n/langs'

const KEY = 'dalilak.recovered'

/** Errors that mean "this page was opened from an older deploy" (stale cache, files that no longer exist). */
const isStaleDeploy = (e: unknown) =>
  /not valid JSON|Unexpected token|dynamically imported module|Importing a module script|Failed to fetch|Load failed/i.test(String((e as Error)?.message ?? e))

async function clearCachesAndReload() {
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations()) ?? []
    await Promise.all(regs.map((r) => r.unregister()))
    for (const k of await caches.keys()) await caches.delete(k)
  } catch { /* ignore */ }
  window.location.reload()
}

/** Shown instead of React Router's "Unexpected Application Error!". After a deploy it heals itself once. */
export function RouteError() {
  const error = useRouteError()
  const lang = typeof window === 'undefined' ? 'ar' : splitLocale(window.location.pathname).lang
  const t = (k: string) => i18n.t(k, { lng: lang })
  const auto = typeof window !== 'undefined' && isStaleDeploy(error) && (() => {
    try { return Date.now() - Number(sessionStorage.getItem(KEY) ?? 0) > 60_000 } catch { return false }
  })()
  useEffect(() => {
    if (!auto) return
    try { sessionStorage.setItem(KEY, String(Date.now())) } catch { /* ignore */ }
    void clearCachesAndReload()
  }, [auto])
  return (
    <div className="container" style={{ paddingBlock: 48, textAlign: 'center' }} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <h1 className="page-title">{t('error.title')}</h1>
      <p className="muted">{t('error.text')}</p>
      <button className="btn" onClick={() => void clearCachesAndReload()}>{t('error.reload')}</button>
    </div>
  )
}
