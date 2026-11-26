import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLang, useT } from '../i18n'
import { localePath } from '../i18n/langs'
import { bannerImageUrl, fetchRunningBanners, type Banner } from '../lib/banners'
import { isSupabaseConfigured } from '../lib/supabase'

/** Paid banners on the home page. Each one is labelled "إعلان" (EU rules on advertising).
 *  Several banners slide every 6 seconds; swiping works too. Loaded in the browser so dates are always current. */
export function BannerStrip() {
  const t = useT()
  const lang = useLang()
  const [items, setItems] = useState<Banner[]>([])
  const [index, setIndex] = useState(0)
  const row = useRef<HTMLDivElement>(null)
  const paused = useRef(false)

  useEffect(() => {
    if (isSupabaseConfigured) fetchRunningBanners().then(setItems).catch(() => setItems([]))
  }, [])

  // auto-advance (not for users who prefer reduced motion)
  useEffect(() => {
    if (items.length < 2) return
    if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => {
      if (paused.current || !row.current) return
      const next = (index + 1) % items.length
      const el = row.current.children[next] as HTMLElement | undefined
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
    }, 6000)
    return () => clearInterval(id)
  }, [items.length, index])

  if (items.length === 0) return null
  const onScroll = () => {
    const el = row.current
    if (!el) return
    const w = el.clientWidth || 1
    setIndex(Math.min(items.length - 1, Math.round(Math.abs(el.scrollLeft) / w)))
  }
  return (
    <section className="banners" aria-label={t('banners.label')}>
      <div className="banners__row" ref={row} onScroll={onScroll}
        onPointerDown={() => { paused.current = true }} onMouseEnter={() => { paused.current = true }} onMouseLeave={() => { paused.current = false }}>
        {items.map((b) => {
          const body = (
            <>
              <img src={bannerImageUrl(b.image_path!)} alt={b.title} loading="lazy" />
              <span className="banner__ad">{t('banners.ad')}</span>
              <span className="banner__title" dir="auto">{b.title}</span>
            </>
          )
          return b.link_url
            ? <a key={b.id} className="banner" href={b.link_url} target="_blank" rel="sponsored noopener">{body}</a>
            : <div key={b.id} className="banner">{body}</div>
        })}
      </div>
      <div className="banners__foot">
        {items.length > 1 && (
          <span className="banners__dots" aria-hidden>{items.map((b, i) => <span key={b.id} className={i === index ? 'on' : ''} />)}</span>
        )}
        <Link to={localePath(lang, '/advertise')} className="banners__cta">{t('banners.advertise')}</Link>
      </div>
    </section>
  )
}
