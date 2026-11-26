import { Link, Outlet, useLocation } from 'react-router-dom'
import { Head } from 'vite-react-ssg'
import { LangContext, useT } from '../i18n'
import { LANGS, LANG_NAMES, LANG_SHORT, dirOf, localePath, splitLocale, type Lang } from '../i18n/langs'
import { BottomNav } from './BottomNav'
import { InstallHint } from './InstallHint'
import { Logo } from './Logo'
import { AuthProvider } from '../lib/auth'
import { FavoritesProvider } from '../lib/favorites'

export function Layout({ lang }: { lang: Lang }) {
  return (
    <LangContext.Provider value={lang}>
      <AuthProvider>
        <FavoritesProvider>
          <Shell lang={lang} />
        </FavoritesProvider>
      </AuthProvider>
    </LangContext.Provider>
  )
}

function Shell({ lang }: { lang: Lang }) {
  const t = useT()
  const { pathname } = useLocation()
  const rest = splitLocale(pathname).rest
  const siteUrl = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '')
  return (
    <div className="app" dir={dirOf(lang)} lang={lang}>
      <Head>
        <html lang={lang} dir={dirOf(lang)} />
        <title>{`${t('app.name')} – ${t('app.tagline')}`}</title>
        <meta name="description" content={t('app.tagline')} />
        {siteUrl && LANGS.map((l) => (
          <link key={l} rel="alternate" hrefLang={l} href={`${siteUrl}${localePath(l, rest)}`} />
        ))}
        {siteUrl && <link rel="canonical" href={`${siteUrl}${localePath(lang, rest)}`} />}
        {siteUrl && <link rel="alternate" hrefLang="x-default" href={`${siteUrl}${localePath('ar', rest)}`} />}
      </Head>
      <header className="header">
        <div className="container header__row">
          <Link to={localePath(lang, '/')} className="brand">
            <Logo className="brand__logo" />
            <span>
              <span className="brand__name">{t('app.name')}</span>
              <p className="brand__tagline">{t('app.tagline')}</p>
            </span>
          </Link>
          <nav className="lang-switch" aria-label="Language">
            {LANGS.filter((l) => l !== lang).map((l) => (
              <Link key={l} to={localePath(l, rest)} hrefLang={l} lang={l} aria-label={LANG_NAMES[l]}>{LANG_SHORT[l]}</Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
      <InstallHint />
      <BottomNav />
    </div>
  )
}
