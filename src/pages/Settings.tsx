import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLang, useT } from '../i18n'
import { LANGS, LANG_NAMES, localePath } from '../i18n/langs'
import { getTheme, saveLang, setTheme, type ThemePref } from '../lib/prefs'

export default function Settings() {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const [theme, setThemeState] = useState<ThemePref>('system')
  useEffect(() => setThemeState(getTheme()), [])

  const chooseTheme = (v: ThemePref) => {
    setTheme(v)
    setThemeState(v)
  }

  return (
    <section className="stack">
      <h1 className="page-title">{t('settings.title')}</h1>

      <div className="card stack">
        <h2 style={{ margin: 0, fontSize: 17 }}>{t('settings.language')}</h2>
        <div className="segmented">
          {LANGS.map((l) => (
            <button
              key={l}
              lang={l}
              aria-pressed={l === lang}
              onClick={() => {
                saveLang(l)
                navigate(localePath(l, '/settings'))
              }}
            >
              {LANG_NAMES[l]}
            </button>
          ))}
        </div>
      </div>

      <div className="card stack">
        <h2 style={{ margin: 0, fontSize: 17 }}>{t('settings.theme')}</h2>
        <div className="segmented">
          {(['system', 'light', 'dark'] as const).map((v) => (
            <button key={v} aria-pressed={theme === v} onClick={() => chooseTheme(v)}>
              {t(`settings.theme${v[0].toUpperCase()}${v.slice(1)}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="card stack">
        <Link to={localePath(lang, '/privacy')}>{t('settings.privacy')}</Link>
        <Link to={localePath(lang, '/terms')}>{t('settings.terms')}</Link>
        <span className="muted">{t('settings.deleteAccount')} – {t('common.soon')}</span>
      </div>
    </section>
  )
}
