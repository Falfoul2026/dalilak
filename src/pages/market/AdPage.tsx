import { useEffect, useState } from 'react'
import { Link, useLoaderData, useParams } from 'react-router-dom'
import { Head } from 'vite-react-ssg'
import { useLang, useT } from '../../i18n'
import { localePath } from '../../i18n/langs'
import { Loading } from '../../components/ListState'
import { backArrow, formatDate } from '../../lib/format'
import { AD_CATEGORIES, adPhotoUrl, adPhotos, adWhatsappLink, formatPrice, getAdBySlug, type Ad, type AdPhoto } from '../../lib/market'
import { isSupabaseConfigured } from '../../lib/supabase'

export async function loader({ params }: { params: { slug?: string } }) {
  if (!import.meta.env.SSR) return null
  const { allVisibleAds } = await import('../../lib/ssrData')
  return (await allVisibleAds()).find((a) => a.slug === params.slug) ?? null
}

export async function getStaticPaths() {
  const { allVisibleAds } = await import('../../lib/ssrData')
  return (await allVisibleAds()).map((a) => `market/${a.slug}`)
}

export function Component() {
  const t = useT()
  const lang = useLang()
  const { slug = '' } = useParams()
  const pre = useLoaderData() as Ad | null
  const [ad, setAd] = useState<Ad | null>(pre)
  const [missing, setMissing] = useState(false)
  const [photos, setPhotos] = useState<AdPhoto[]>([])

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let alive = true
    getAdBySlug(slug).then((a) => { if (!alive) return; setAd(a); setMissing(!a) }).catch(() => undefined)
    return () => { alive = false }
  }, [slug])
  useEffect(() => {
    if (ad) adPhotos(ad.id).then(setPhotos).catch(() => setPhotos([]))
  }, [ad?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const back = <Link to={localePath(lang, '/market')}>{backArrow(lang)} {t('market.back')}</Link>
  if (!ad) return missing ? <section className="stack">{back}<p className="muted">{t('market.notFound')}</p></section> : <Loading />

  const siteUrl = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '')
  const pageUrl = siteUrl ? `${siteUrl}${localePath(lang, `/market/${ad.slug}`)}` : null
  const price = formatPrice(ad.price_eur, lang)
  const sold = ad.status === 'sold'
  const wa = sold ? null : adWhatsappLink(ad, pageUrl)
  const icon = AD_CATEGORIES.find((c) => c.slug === ad.category)?.icon ?? '📦'
  const shownPhotos = photos.length ? photos : ad.cover_path ? [{ id: 0, storage_path: ad.cover_path, sort_order: 0 }] : []

  return (
    <article className="listing">
      <Head>
        <title>{`${ad.title}${price ? ` – ${price}` : ''} | ${t('app.name')}`}</title>
        <meta name="description" content={`${t(`adCategories.${ad.category}`)} · ${ad.city}${price ? ` · ${price}` : ''}. ${ad.description.slice(0, 140)}`} />
        <meta property="og:title" content={`${ad.title}${price ? ` – ${price}` : ''}`} />
        <meta property="og:description" content={`${t(`adCategories.${ad.category}`)} · ${ad.city}`} />
        {ad.cover_path && <meta property="og:image" content={adPhotoUrl(ad.cover_path)} />}
        {pageUrl && <meta property="og:url" content={pageUrl} />}
      </Head>
      {back}
      {shownPhotos.length > 0
        ? <div className="gallery gallery--ad">{shownPhotos.map((p) => <img key={p.id} src={adPhotoUrl(p.storage_path)} alt="" loading="lazy" />)}</div>
        : <div className="ad-noimg" aria-hidden>{icon}</div>}
      <header>
        <h1 className="listing__name" dir="auto">{ad.title}</h1>
        <p className="ad-price">{price ?? t('market.priceOnRequest')} {sold && <span className="badge badge--sold">{t('market.sold')}</span>}</p>
        <p className="listing__kind">{ad.city} · {t(`adCategories.${ad.category}`)} · {t('market.adNumber', { id: ad.id })}</p>
      </header>
      {sold
        ? <div className="card">{t('market.soldNote')}</div>
        : wa && <a className="btn btn--whatsapp btn--block" href={wa} target="_blank" rel="noopener">{t('market.contact')}</a>}
      {!sold && <p className="muted" style={{ margin: 0, fontSize: 14 }}>{t('market.middleman')}</p>}
      {ad.description && <section className="card"><p dir="auto" style={{ margin: 0, whiteSpace: 'pre-line' }}>{ad.description}</p></section>}
      <p className="muted" style={{ fontSize: 13 }}>{t('market.posted', { date: formatDate(ad.created_at, lang) })}</p>
    </article>
  )
}

export default Component
