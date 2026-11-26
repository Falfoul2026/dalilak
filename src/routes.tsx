import type { RouteRecord } from 'vite-react-ssg'
import { Layout } from './components/Layout'
import { LANGS, prefixOf } from './i18n/langs'
import Home from './pages/Home'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'
import { OurPicks, Privacy, Saved, Terms, TopRated } from './pages/InfoPage'

// The same pages exist under "/", "/fr", "/nl" and "/en". Each tree is
// pre-rendered to static HTML at build time (good for Google).
export const routes: RouteRecord[] = LANGS.map((lang) => ({
  path: prefixOf(lang) || '/',
  element: <Layout lang={lang} />,
  children: [
    { index: true, Component: Home },
    { path: 'top', Component: TopRated },
    { path: 'picks', Component: OurPicks },
    { path: 'saved', Component: Saved },
    { path: 'settings', Component: Settings },
    { path: 'privacy', Component: Privacy },
    { path: 'terms', Component: Terms },
    { path: '*', Component: NotFound },
  ],
}))
