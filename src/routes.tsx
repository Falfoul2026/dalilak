import type { RouteRecord } from 'vite-react-ssg'
import { Layout } from './components/Layout'
import { LANGS, prefixOf } from './i18n/langs'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'
import { Claim, Login, Privacy, Report, Terms } from './pages/InfoPage'

// The same pages exist under "/", "/fr", "/nl" and "/en". Each tree is
// pre-rendered to static HTML at build time (good for Google).
// Pages with data are lazy so their loaders/getStaticPaths run at build time.
export const routes: RouteRecord[] = LANGS.map((lang) => ({
  path: prefixOf(lang) || '/',
  element: <Layout lang={lang} />,
  children: [
    { index: true, lazy: () => import('./pages/Home') },
    { path: 'l/:slug', lazy: () => import('./pages/Listing') },
    { path: 'top', lazy: () => import('./pages/TopRated') },
    { path: 'picks', lazy: () => import('./pages/OurPicks') },
    { path: 'saved', lazy: () => import('./pages/Saved') },
    { path: 'settings', Component: Settings },
    { path: 'login', Component: Login },
    { path: 'report', Component: Report },
    { path: 'claim', Component: Claim },
    { path: 'privacy', Component: Privacy },
    { path: 'terms', Component: Terms },
    { path: '*', Component: NotFound },
  ],
}))
