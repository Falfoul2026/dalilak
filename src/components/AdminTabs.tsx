import { Link } from 'react-router-dom'
import { useLang, useT } from '../i18n'
import { localePath } from '../i18n/langs'
import { supabase } from '../lib/supabase'

export function AdminTabs({ active }: { active: 'shops' | 'subs' | 'ads' | 'banners' }) {
  const t = useT()
  const lang = useLang()
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="section-head">
        <h1 className="page-title" style={{ margin: 0 }}>{t('admin.title')}</h1>
        <button type="button" className="btn-link" onClick={() => void supabase?.auth.signOut()}>{t('admin.signOut')}</button>
      </div>
      <div className="segmented">
        <Link to={localePath(lang, '/admin')} aria-current={active === 'shops' ? 'true' : undefined}>{t('admin.tabShops')}</Link>
        <Link to={localePath(lang, '/admin/subs')} aria-current={active === 'subs' ? 'true' : undefined}>{t('admin.tabSubs')}</Link>
        <Link to={localePath(lang, '/admin/ads')} aria-current={active === 'ads' ? 'true' : undefined}>{t('admin.tabAds')}</Link>
        <Link to={localePath(lang, '/admin/banners')} aria-current={active === 'banners' ? 'true' : undefined}>{t('admin.tabBanners')}</Link>
      </div>
    </div>
  )
}
