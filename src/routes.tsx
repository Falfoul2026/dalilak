import type { RouteRecord } from 'vite-react-ssg'
import { Layout } from './components/Layout'
import { RouteError } from './components/RouteError'
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
  errorElement: <RouteError />,
  children: [
    { index: true, lazy: () => import('./pages/Home') },
    { path: 'l/:slug', lazy: () => import('./pages/Listing') },
    { path: 'top', lazy: () => import('./pages/TopRated') },
    { path: 'picks', lazy: () => import('./pages/OurPicks') },
    { path: 'saved', lazy: () => import('./pages/Saved') },
    { path: 'settings', Component: Settings },
    { path: 'add', lazy: () => import('./pages/Contact') },
    { path: 'advertise', lazy: () => import('./pages/Advertise') },
    { path: 'market', lazy: () => import('./pages/market/Market') },
    { path: 'market/sell', lazy: () => import('./pages/market/Sell') },
    { path: 'market/:slug', lazy: () => import('./pages/market/AdPage') },
    { path: 'admin', lazy: () => import('./pages/admin/AdminList') },
    { path: 'admin/new', lazy: () => import('./pages/admin/AdminEdit') },
    { path: 'admin/l/:id', lazy: () => import('./pages/admin/AdminEdit') },
    { path: 'admin/banners', lazy: () => import('./pages/admin/AdminBanners') },
    { path: 'admin/banners/new', lazy: () => import('./pages/admin/AdminBannerEdit') },
    { path: 'admin/banners/:id', lazy: () => import('./pages/admin/AdminBannerEdit') },
    { path: 'admin/ads', lazy: () => import('./pages/admin/AdminAds') },
    { path: 'admin/ads/new', lazy: () => import('./pages/admin/AdminAdEdit') },
    { path: 'admin/ads/:id', lazy: () => import('./pages/admin/AdminAdEdit') },
    { path: 'login', Component: Login },
    { path: 'report', Component: Report },
    { path: 'claim', Component: Claim },
    { path: 'privacy', Component: Privacy },
    { path: 'terms', Component: Terms },
    { path: '*', Component: NotFound },
  ],
}))
