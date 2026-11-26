import { useEffect, useState } from 'react'
import { useT } from '../i18n'
import { isIosSafariBrowser, isNativeApp } from '../lib/platform'

const KEY = 'dalilak.installHintDismissed'

/** iPhone/Safari has no install prompt: show a one-time hint. */
export function InstallHint() {
  const t = useT()
  const [show, setShow] = useState(false)
  useEffect(() => {
    let dismissed = false
    try { dismissed = localStorage.getItem(KEY) === '1' } catch { /* ignore */ }
    setShow(!dismissed && !isNativeApp() && isIosSafariBrowser())
  }, [])
  if (!show) return null
  const close = () => {
    try { localStorage.setItem(KEY, '1') } catch { /* ignore */ }
    setShow(false)
  }
  return (
    <div className="install-hint card" role="status">
      <p>{t('install.ios')}</p>
      <button className="btn-link" onClick={close}>{t('install.dismiss')}</button>
    </div>
  )
}
