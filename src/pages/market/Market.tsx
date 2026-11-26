import { useEffect, useMemo, useState } from 'react'
import { Link, useLoaderData } from 'react-router-dom'
import { Head } from 'vite-react-ssg'
import { useLang, useT } from '../../i18n'
import { localePath } from '../../i18n/langs'
import { AdCard } from '../../components/AdCard'
import { IconSearch } from '../../components/Icons'
import { Empty, ErrorBox, Loading } from '../../components/ListState'
import { SectionSwitch } from '../../components/SectionSwitch'
import { normalizeForSearch } from '../../lib/format'
import { AD_CATEGORIES, fetchAds, type Ad, type AdCategory } from '../../lib/market'
import { isSupabaseConfigured } from '../../lib/supabase'

export async function loader() {
  if (!import.meta.env.SSR) return null
  const { allVisibleAds } = await import('../../lib/ssrData')
  return { ads: await allVisibleAds() }
}

/** "بيع وشراء": list of ads with category, city and text filters (all in the browser: few hundred ads at most). */
export function Component() {
  const t = useT()
  const lang = useLang()
  const pre = useLoaderData() as { ads: Ad[] } | null
  const [ads, setAds] = useState<Ad[] | null>(pre?.ads ?? null)
  const [error, setError] = useState(false)
  const [tick, setTick] = useState(0)
  const [q, setQ] = useState('')
  const [category, setCategory] = useState<AdCategory | null>(null)
  const [city, setCity] = useState('')

  useEffect(() => {
    if (!isSupabaseConfigured) return
    setError(false)
    fetchAds().then(setAds).catch(() => setError(true))
  }, [tick])

  const cities = useMemo(() => [...new Set((ads ?? []).map((a) => a.city.trim()))].sort((a, b) => a.localeCompare(b)), [ads])
  const shown = useMemo(() => {
    const nq = normalizeForSearch(q)
    return (ads ?? []).filter((a) =>
      (!category || a.category === category) &&
      (!city || a.city.trim() === city) &&
      (!nq || normalizeForSearch(`${a.title} ${a.description} ${a.city}`).includes(nq)))
  }, [ads, q, category, city])

  return (
    <>
      <Head>
        <title>{`${t('market.title')} | ${t('app.name')}`}</title>
        <meta name="description" content={t('market.desc')} />
      </Head>
      <SectionSwitch active="market" />
      <p className="muted" style={{ margin: '4px 0 0' }}>{t('market.desc')}</p>
      <Link className="btn btn--whatsapp btn--block" style={{ marginTop: 12 }} to={localePath(lang, '/market/sell')}>+ {t('market.sell')}</Link>

      <form className="search" role="search" onSubmit={(e) => e.preventDefault()}>
        <label className="visually-hidden" htmlFor="mq">{t('market.search')}</label>
        <IconSearch />
        <input id="mq" type="search" placeholder={t('market.search')} autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} />
      </form>
      <div className="chips" role="group" aria-label={t('admin.adCategory')}>
        <button type="button" className="chip" aria-pressed={category === null} onClick={() => setCategory(null)}>{t('home.allCategories')}</button>
        {AD_CATEGORIES.map((c) => (
          <button key={c.slug} type="button" className="chip" aria-pressed={category === c.slug} onClick={() => setCategory(c.slug)}>
            <span aria-hidden>{c.icon}</span>{t(`adCategories.${c.slug}`)}
          </button>
        ))}
      </div>
      <label className="visually-hidden" htmlFor="mcity">{t('market.allCities')}</label>
      <select id="mcity" className="select" value={city} onChange={(e) => setCity(e.target.value)}>
        <option value="">{t('market.allCities')}</option>
        {cities.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>

      <section className="stack" style={{ marginTop: 16 }} aria-label={t('market.title')}>
        {error ? <ErrorBox onRetry={() => setTick((n) => n + 1)} /> : ads === null ? <Loading /> : shown.length === 0 ? <Empty text={t('market.empty')} /> : (
          <ul className="ad-list">{shown.map((a) => <li key={a.id}><AdCard ad={a} /></li>)}</ul>
        )}
      </section>
    </>
  )
}

export default Component
