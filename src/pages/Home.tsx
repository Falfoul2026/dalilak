import { useEffect, useState } from 'react'
import { useT } from '../i18n'
import { CATEGORIES, LAUNCH_PROVINCES } from '../data/categories'
import { IconSearch } from '../components/Icons'
import { supabase } from '../lib/supabase'

type DbState = { kind: 'loading' } | { kind: 'missing' } | { kind: 'error' } | { kind: 'ok'; count: number }

export default function Home() {
  const t = useT()
  const [category, setCategory] = useState<string | null>(null)
  const [province, setProvince] = useState('')
  const [db, setDb] = useState<DbState>({ kind: 'loading' })

  // Step 2 check: shows how many listings the database holds.
  // Replaced by the real list in step 3.
  useEffect(() => {
    if (!supabase) return setDb({ kind: 'missing' })
    supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .then(({ count, error }) => setDb(error ? { kind: 'error' } : { kind: 'ok', count: count ?? 0 }))
  }, [])

  return (
    <>
      <form className="search" role="search" onSubmit={(e) => e.preventDefault()}>
        <label className="visually-hidden" htmlFor="q">{t('home.searchPlaceholder')}</label>
        <IconSearch />
        <input id="q" type="search" placeholder={t('home.searchPlaceholder')} autoComplete="off" />
      </form>

      <div className="chips" role="group" aria-label={t('home.allCategories')}>
        <button className="chip" aria-pressed={category === null} onClick={() => setCategory(null)}>
          {t('home.allCategories')}
        </button>
        {CATEGORIES.map((c) => (
          <button key={c.slug} className="chip" aria-pressed={category === c.slug} onClick={() => setCategory(c.slug)}>
            <span aria-hidden>{c.icon}</span>
            {t(`categories.${c.slug}`)}
          </button>
        ))}
      </div>

      <label className="visually-hidden" htmlFor="province">{t('home.allProvinces')}</label>
      <select id="province" className="select" value={province} onChange={(e) => setProvince(e.target.value)}>
        <option value="">{t('home.allProvinces')}</option>
        {LAUNCH_PROVINCES.map((p) => <option key={p} value={p}>{t(`provinces.${p}`)}</option>)}
        <option value="other">{t('provinces.other')}</option>
      </select>

      <div className="card" style={{ marginTop: 16 }}>
        <p style={{ margin: 0 }}>
          {db.kind === 'ok' && t('home.dbOk', { count: db.count })}
          {db.kind === 'missing' && t('home.dbMissing')}
          {db.kind === 'error' && t('home.dbError')}
          {db.kind === 'loading' && '…'}
        </p>
        <p className="muted" style={{ margin: '6px 0 0', fontSize: 14 }}>
          <span className="badge badge--featured">{t('labels.featured')}</span>{' '}
          <span className="badge badge--verify">{t('labels.verifyArabic')}</span>
        </p>
        <p className="muted" style={{ margin: '6px 0 0', fontSize: 13 }}>{t('labels.sourceNote')}</p>
      </div>
    </>
  )
}
