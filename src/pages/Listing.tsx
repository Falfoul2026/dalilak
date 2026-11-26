import { useEffect, useState } from 'react'
import { Link, useLoaderData, useParams } from 'react-router-dom'
import { Head } from 'vite-react-ssg'
import { useLang, useT } from '../i18n'
import { localePath } from '../i18n/langs'
import { typeLabel } from '../data/typeLabels'
import { FeaturedBadge, VerifiedBadge, VerifyArabicTag } from '../components/Badges'
import { IconFlag, IconGlobe, IconMap, IconPhone, IconShare } from '../components/Icons'
import { Loading } from '../components/ListState'
import { SaveButton } from '../components/SaveButton'
import { RatingLine, StarRow } from '../components/Stars'
import { directionsUrl, formatDate, formatRating, pickLang, safeWebsite, telHref } from '../lib/format'
import { getListingBySlug, listingPhotos, listingReviews, photoUrl, track } from '../lib/listings'
import { isSupabaseConfigured } from '../lib/supabase'
import { WHATSAPP_MESSAGES, flags, whatsappLink } from '../lib/flags'
import { publicUrl, shareLink } from '../lib/native'
import type { Listing, Photo, Review } from '../lib/types'

/** Build time: listing data goes into the static HTML for Google. */
export async function loader({ params }: { params: { slug?: string } }) {
  if (!import.meta.env.SSR) return null
  const { allActiveListings } = await import('../lib/ssrData')
  return (await allActiveListings()).find((l) => l.slug === params.slug) ?? null
}

/** Every active listing gets its own pre-rendered page. */
export async function getStaticPaths() {
  const { allActiveListings } = await import('../lib/ssrData')
  return (await allActiveListings()).map((l) => `l/${l.slug}`)
}

export function Component() {
  const t = useT()
  const lang = useLang()
  const { slug = '' } = useParams()
  const pre = useLoaderData() as Listing | null
  const [l, setL] = useState<Listing | null>(pre)
  const [missing, setMissing] = useState(false)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [reviews, setReviews] = useState<Review[] | null>(null)
  const [toast, setToast] = useState('')

  // Always refresh in the browser: premium status, phone etc. may have changed since the build.
  useEffect(() => {
    if (!isSupabaseConfigured) return
    let alive = true
    setMissing(false)
    getListingBySlug(slug)
      .then((fresh) => {
        if (!alive) return
        if (fresh) setL(fresh)
        else { setL(null); setMissing(true) }
      })
      .catch(() => undefined)
    return () => { alive = false }
  }, [slug])

  const id = l?.id
  const premium = Boolean(l?.premium_active)
  useEffect(() => {
    if (!id) return
    track(id, 'view')
    listingReviews(id).then(setReviews).catch(() => setReviews([]))
  }, [id])
  useEffect(() => {
    if (!id || !premium) { setPhotos([]); return }
    listingPhotos(id).then(setPhotos).catch(() => setPhotos([]))
  }, [id, premium])

  if (!l) {
    return missing
      ? <section><h1 className="page-title">{t('notFound.title')}</h1><p className="muted">{t('listing.notFound')}</p><Link to={localePath(lang, '/')}>{t('common.back')}</Link></section>
      : <Loading />
  }

  const kind = typeLabel(l.type_label, lang) || t(`categories.${l.category}`)
  const place = l.city || t(`provinces.${l.province}`)
  const comma = lang === 'ar' ? '، ' : ', '
  const website = premium ? safeWebsite(l.website) : null           // website link is premium only
  const description = premium ? pickLang(l.description, lang) : ''
  const offer = premium ? pickLang(l.offer_text, lang) : ''
  const reportLink = whatsappLink(WHATSAPP_MESSAGES.report)
  const gallery = photos.filter((p) => p.kind === 'gallery')
  const siteUrl = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '')
  const pageUrl = siteUrl ? `${siteUrl}${localePath(lang, `/l/${l.slug}`)}` : undefined

  const share = async () => {
    track(l.id, 'share')
    // always the public website address (inside the app the page itself is on https://localhost)
    const url = publicUrl(localePath(lang, `/l/${l.slug}`))
    try {
      if (!(await shareLink({ title: l.name, text: `${l.name} – ${kind}`, url }))) {
        await navigator.clipboard.writeText(url)
        setToast(t('listing.linkCopied'))
        setTimeout(() => setToast(''), 2500)
      }
    } catch { /* user cancelled */ }
  }

  return (
    <article className="listing">
      <Head>
        <title>{`${l.name} – ${kind}${comma}${place} | ${t('app.name')}`}</title>
        <meta name="description" content={[kind, l.address, l.phone].filter(Boolean).join(' · ')} />
        <meta property="og:title" content={l.name} />
        <meta property="og:description" content={`${kind} · ${place}`} />
        <meta property="og:type" content="business.business" />
        {pageUrl && <meta property="og:url" content={pageUrl} />}
        <script type="application/ld+json">{JSON.stringify(jsonLd(l, kind, pageUrl, website))}</script>
      </Head>

      <header className="listing__head">
        {premium && l.logo_path && <img className="listing__logo" src={photoUrl(l.logo_path)} alt="" width={72} height={72} />}
        <div>
          <h1 className="listing__name" dir="auto">{l.name}</h1>
          <p className="listing__kind">{kind} · {place}</p>
          <div className="listing__badges">
            {premium && <FeaturedBadge />}
            {premium && l.is_verified && <VerifiedBadge />}
            {!l.language_verified && <VerifyArabicTag />}
          </div>
        </div>
      </header>

      <div className="actions" role="group">
        {l.phone && <a className="action" href={telHref(l.phone)} onClick={() => track(l.id, 'call')}><IconPhone /><span>{t('listing.call')}</span></a>}
        <a className="action" href={directionsUrl(l.name, l.address, l.city)} target="_blank" rel="noopener" onClick={() => track(l.id, 'directions')}><IconMap /><span>{t('listing.directions')}</span></a>
        {website && <a className="action" href={website} target="_blank" rel="noopener" onClick={() => track(l.id, 'website')}><IconGlobe /><span>{t('listing.website')}</span></a>}
        <button type="button" className="action" onClick={() => void share()}><IconShare /><span>{t('listing.share')}</span></button>
        {flags.userAccounts && <SaveButton listingId={l.id} />}
      </div>

      {offer && <div className="offer"><b>{t('listing.offer')}:</b> {offer}</div>}

      <dl className="card details">
        {l.address && <><dt>{t('listing.address')}</dt><dd dir="auto">{l.address}</dd></>}
        {l.phone && <><dt>{t('listing.phone')}</dt><dd><a href={telHref(l.phone)} dir="ltr" onClick={() => track(l.id, 'call')}>{l.phone}</a></dd></>}
        <dt>{t('listing.googleRating')}</dt>
        <dd><RatingLine rating={l.rating_google} count={l.reviews_google} /></dd>
        {l.app_reviews_count > 0 && l.app_rating_avg !== null && (
          <><dt>{t('listing.appRating')}</dt><dd><span className="rating"><span className="rating__star" aria-hidden>★</span><b>{formatRating(l.app_rating_avg, lang)}</b><span className="muted">({l.app_reviews_count})</span></span></dd></>
        )}
        {l.languages.length > 0 && <><dt>{t('listing.languages')}</dt><dd>{l.languages.map((c) => t(`langNames.${c}`, { defaultValue: c })).join('، ')}</dd></>}
      </dl>

      {description && <section className="card"><h2 className="section-title">{t('listing.about')}</h2><p dir="auto" style={{ marginBottom: 0, whiteSpace: 'pre-line' }}>{description}</p></section>}

      {gallery.length > 0 && (
        <section aria-label={t('listing.photos')}>
          <div className="gallery">
            {gallery.map((p) => <img key={p.id} src={photoUrl(p.storage_path)} alt="" loading="lazy" />)}
          </div>
        </section>
      )}

      {(flags.userAccounts || (reviews?.length ?? 0) > 0) && <section className="stack">
        <h2 className="section-title">{t('listing.reviews')}</h2>
        {reviews === null ? <Loading /> : reviews.length === 0 ? <p className="muted">{t('listing.noReviews')}</p> : (
          <ul className="reviews">
            {reviews.map((r) => (
              <li key={r.id} className="card">
                <div className="review__head"><StarRow stars={r.stars} /><b dir="auto">{r.author || t('listing.anonymous')}</b><span className="muted">{formatDate(r.created_at, lang)}</span></div>
                {r.text && <p dir="auto">{r.text}</p>}
                {r.owner_reply && <blockquote className="review__reply"><b>{t('listing.ownerReply')}:</b> <span dir="auto">{r.owner_reply}</span></blockquote>}
              </li>
            ))}
          </ul>
        )}
        {flags.userAccounts && <Link className="btn btn--ghost" to={`${localePath(lang, '/login')}?next=${encodeURIComponent(localePath(lang, `/l/${l.slug}`))}`}>{t('listing.writeReview')}</Link>}
      </section>}

      <div className="listing__footer">
        {/* Until visitor accounts exist, reports and claims go to the contact page. */}
        {flags.userAccounts || !reportLink
          ? <Link to={flags.userAccounts ? `${localePath(lang, '/report')}?listing=${l.id}` : localePath(lang, '/add')} className="muted-link"><IconFlag size={16} /> {t('listing.report')}</Link>
          : <a href={reportLink} target="_blank" rel="noopener" className="muted-link"><IconFlag size={16} /> {t('contact.reportViaWhatsapp')}</a>}
        {!l.owner_id && <Link to={flags.userAccounts ? `${localePath(lang, '/claim')}?listing=${l.id}` : localePath(lang, '/add')} className="muted-link">{t('listing.claim')}</Link>}
        {l.source === 'google_maps' && <p className="muted source-note">{t('labels.sourceNote')}</p>}
      </div>

      {toast && <div className="toast" role="status">{toast}</div>}
    </article>
  )
}

/** schema.org LocalBusiness. Google ratings are not included (third-party ratings are not allowed in this markup). */
function jsonLd(l: Listing, kind: string, url: string | undefined, website: string | null) {
  return {
    '@context': 'https://schema.org',
    '@type': l.type_label === 'مسجد' ? 'Mosque' : ldType(l.category),
    name: l.name,
    description: kind,
    ...(url ? { url } : {}),
    ...(l.phone ? { telephone: l.phone } : {}),
    ...(l.address ? { address: { '@type': 'PostalAddress', streetAddress: l.address, addressLocality: l.city ?? undefined, addressCountry: 'BE' } } : {}),
    ...(l.lat && l.lng ? { geo: { '@type': 'GeoCoordinates', latitude: l.lat, longitude: l.lng } } : {}),
    ...(website ? { sameAs: [website] } : {}),
    ...(l.app_reviews_count > 0 && l.app_rating_avg ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: l.app_rating_avg, reviewCount: l.app_reviews_count } } : {}),
  }
}

function ldType(category: string): string {
  return ({ food: 'Restaurant', meat: 'Store', sweets: 'Bakery', cloth: 'ClothingStore', beauty: 'BeautySalon', doc: 'MedicalBusiness', legal: 'LegalService', travel: 'TravelAgency', edu: 'Organization' } as Record<string, string>)[category] ?? 'LocalBusiness'
}

export default Component
