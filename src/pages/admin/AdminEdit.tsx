import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLang, useT } from '../../i18n'
import { backArrow } from '../../lib/format'
import { LANGS, LANG_NAMES, localePath } from '../../i18n/langs'
import { AdminGate } from '../../components/AdminGate'
import { SubscriptionBox } from '../../components/SubscriptionBox'
import { Loading } from '../../components/ListState'
import { CATEGORIES } from '../../data/categories'
import { LAUNCH_PROVINCE_SLUGS, OTHER_PROVINCE_SLUGS } from '../../data/provinces'
import {
  MAX_GALLERY, adminCreateListing, adminDeletePhoto, adminGetListing, adminPhotos, adminSetFeatured,
  adminUpdateListing, adminUploadPhoto, type AdminPhoto, type ListingInput,
} from '../../lib/admin'
import { photoUrl } from '../../lib/listings'
import type { Listing } from '../../lib/types'

const SPOKEN = ['ar', 'fr', 'nl', 'en', 'de', 'es', 'tr', 'ber'] as const

const EMPTY: ListingInput = {
  name: '', category: 'food', type_label: '', province: 'brussels', city: '', address: '', phone: '', website: '',
  languages: ['ar'], language_verified: true, status: 'active', is_verified: false, description: {}, offer_text: {},
}

const toInput = (l: Listing): ListingInput => ({
  name: l.name, category: l.category, type_label: l.type_label ?? '', province: l.province, city: l.city ?? '',
  address: l.address ?? '', phone: l.phone ?? '', website: l.website ?? '', languages: l.languages,
  language_verified: l.language_verified, status: l.status, is_verified: l.is_verified,
  description: { ...l.description }, offer_text: { ...l.offer_text },
})

export function Component() {
  return <AdminGate><AdminEdit /></AdminGate>
}

function AdminEdit() {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const { id: idParam } = useParams()
  const id = idParam ? Number(idParam) : null
  const [listing, setListing] = useState<Listing | null>(null)
  const [form, setForm] = useState<ListingInput | null>(id ? null : EMPTY)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!id) { setListing(null); setForm(EMPTY); return }
    adminGetListing(id).then((l) => { setListing(l); if (l) setForm(toInput(l)) }).catch((e) => setMsg(t('admin.error', { msg: e.message })))
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!form) return msg ? <div className="card">{msg}</div> : <Loading />
  const set = <K extends keyof ListingInput>(k: K, v: ListingInput[K]) => setForm({ ...form, [k]: v })

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg(t('admin.saving'))
    try {
      if (id) {
        await adminUpdateListing(id, form)
        setListing(await adminGetListing(id))
        setMsg(t('admin.saved'))
      } else {
        const newId = await adminCreateListing(form)
        navigate(localePath(lang, `/admin/l/${newId}`), { replace: true })
        setMsg(t('admin.saved'))
      }
    } catch (err) {
      setMsg(t('admin.error', { msg: (err as Error).message }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="stack">
      <Link to={localePath(lang, '/admin')}>{backArrow(lang)} {t('admin.back')}</Link>
      <h1 className="page-title" style={{ marginTop: 0 }} dir="auto">{id ? listing?.name ?? t('admin.editShop') : t('admin.newShop')}</h1>
      {listing && listing.status === 'active' && (
        <a href={localePath(lang, `/l/${listing.slug}`)} target="_blank" rel="noopener">{t('admin.view')} ↗</a>
      )}

      {listing && <FeaturedBox listing={listing} onChange={setListing} />}
      {listing && <SubscriptionBox listingId={listing.id} onChange={() => void adminGetListing(listing.id).then(setListing)} />}

      <form className="card form" onSubmit={(e) => void save(e)}>
        <label>{t('admin.name')}<input required minLength={2} maxLength={200} dir="auto" value={form.name} onChange={(e) => set('name', e.target.value)} /></label>
        <div className="form__row">
          <label>{t('admin.category')}
            <select value={form.category} onChange={(e) => set('category', e.target.value)}>
              {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.icon} {t(`categories.${c.slug}`)}</option>)}
            </select>
          </label>
          <label>{t('admin.province')}
            <select value={form.province} onChange={(e) => set('province', e.target.value)}>
              {[...LAUNCH_PROVINCE_SLUGS, ...OTHER_PROVINCE_SLUGS].map((p) => <option key={p} value={p}>{t(`provinces.${p}`)}</option>)}
            </select>
          </label>
        </div>
        <label>{t('admin.typeLabel')}<input dir="auto" value={form.type_label} onChange={(e) => set('type_label', e.target.value)} /></label>
        <div className="form__row">
          <label>{t('admin.city')}<input dir="auto" value={form.city} onChange={(e) => set('city', e.target.value)} /></label>
          <label>{t('admin.phone')}<input type="tel" dir="ltr" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></label>
        </div>
        <label>{t('admin.address')}<input dir="auto" value={form.address} onChange={(e) => set('address', e.target.value)} /></label>
        <label>{t('admin.website')}<input type="url" dir="ltr" placeholder="https://" value={form.website} onChange={(e) => set('website', e.target.value)} /></label>

        <fieldset>
          <legend>{t('admin.languages')}</legend>
          <div className="checks">
            {SPOKEN.map((c) => (
              <label key={c} className="check">
                <input type="checkbox" checked={form.languages.includes(c)}
                  onChange={(e) => set('languages', e.target.checked ? [...form.languages, c] : form.languages.filter((x) => x !== c))} />
                {t(`langNames.${c}`)}
              </label>
            ))}
          </div>
          <label className="check"><input type="checkbox" checked={form.language_verified} onChange={(e) => set('language_verified', e.target.checked)} />{t('admin.languageVerified')}</label>
        </fieldset>

        <label className="check"><input type="checkbox" checked={form.status === 'active'} onChange={(e) => set('status', e.target.checked ? 'active' : 'hidden')} />{t('admin.visible')}</label>
        <label className="check"><input type="checkbox" checked={form.is_verified} onChange={(e) => set('is_verified', e.target.checked)} />{t('admin.verified')}</label>

        <fieldset>
          <legend>{t('admin.description')}</legend>
          {LANGS.map((l) => (
            <label key={l}>{LANG_NAMES[l]}
              <textarea rows={3} lang={l} dir={l === 'ar' ? 'rtl' : 'ltr'} maxLength={1500} value={form.description[l] ?? ''}
                onChange={(e) => set('description', { ...form.description, [l]: e.target.value })} />
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>{t('admin.offer')}</legend>
          {LANGS.map((l) => (
            <label key={l}>{LANG_NAMES[l]}
              <input lang={l} dir={l === 'ar' ? 'rtl' : 'ltr'} maxLength={200} value={form.offer_text[l] ?? ''}
                onChange={(e) => set('offer_text', { ...form.offer_text, [l]: e.target.value })} />
            </label>
          ))}
        </fieldset>

        {msg && <p className="form__msg" role="status">{msg}</p>}
        <button className="btn" disabled={busy}>{busy ? t('admin.saving') : id ? t('admin.save') : t('admin.create')}</button>
      </form>

      {id ? <PhotosBox listingId={id} onLogoChange={() => adminGetListing(id).then(setListing)} /> : <p className="muted">{t('admin.saveFirst')}</p>}
    </section>
  )
}

/** Featured on/off with an optional end date. */
function FeaturedBox({ listing, onChange }: { listing: Listing; onChange: (l: Listing) => void }) {
  const t = useT()
  const [until, setUntil] = useState(listing.premium_until ? listing.premium_until.slice(0, 10) : '')
  const [busy, setBusy] = useState(false)
  const on = listing.premium_active
  const apply = async (next: boolean) => {
    setBusy(true)
    try {
      // end of the chosen day, Brussels time is close enough to 23:59 UTC
      await adminSetFeatured(listing.id, next, next && until ? `${until}T23:59:59Z` : null)
      const fresh = await adminGetListing(listing.id)
      if (fresh) onChange(fresh)
    } catch (e) {
      alert(t('admin.error', { msg: (e as Error).message }))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className={`card stack featured-box${on ? ' featured-box--on' : ''}`}>
      <b>{on ? t('admin.featuredOn') : t('admin.featuredOff')}</b>
      <label>{t('admin.featuredUntil')}<input type="date" value={until} onChange={(e) => setUntil(e.target.value)} /></label>
      <div className="segmented">
        {on && <button type="button" disabled={busy} onClick={() => void apply(true)}>{t('admin.save')}</button>}
        <button type="button" className={on ? '' : 'btn'} disabled={busy} onClick={() => void apply(!on)}>
          {on ? t('admin.turnOff') : t('admin.turnOn')}
        </button>
      </div>
    </div>
  )
}

function PhotosBox({ listingId, onLogoChange }: { listingId: number; onLogoChange: () => void }) {
  const t = useT()
  const [photos, setPhotos] = useState<AdminPhoto[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const logoInput = useRef<HTMLInputElement>(null)
  const galleryInput = useRef<HTMLInputElement>(null)

  // a failed request shows a message instead of an unhandled error
  const reload = () => adminPhotos(listingId).then(setPhotos).catch((e) => { setPhotos((prev) => prev ?? []); setMsg(t('admin.error', { msg: (e as Error).message ?? String(e) })) })
  useEffect(() => { void reload() }, [listingId]) // eslint-disable-line react-hooks/exhaustive-deps

  const logo = photos?.find((p) => p.kind === 'logo')
  const gallery = photos?.filter((p) => p.kind === 'gallery') ?? []
  const room = MAX_GALLERY - gallery.length

  const upload = async (kind: 'logo' | 'gallery', files: FileList | null) => {
    if (!files?.length) return
    const list = kind === 'logo' ? [files[0]] : Array.from(files).slice(0, room)
    setBusy(true)
    setMsg(t('admin.uploading'))
    try {
      for (const f of list) await adminUploadPhoto(listingId, kind, f)
      await reload()
      if (kind === 'logo') onLogoChange()
      setMsg(files.length > list.length ? t('admin.galleryFull') : '')
    } catch (e) {
      setMsg(t('admin.error', { msg: (e as Error).message }))
      await reload()
    } finally {
      setBusy(false)
      if (logoInput.current) logoInput.current.value = ''
      if (galleryInput.current) galleryInput.current.value = ''
    }
  }

  const remove = async (p: AdminPhoto) => {
    if (!confirm(t('admin.confirmDelete'))) return
    setBusy(true)
    try {
      await adminDeletePhoto(p.id)
      await reload()
      if (p.kind === 'logo') onLogoChange()
    } catch (e) {
      setMsg(t('admin.error', { msg: (e as Error).message }))
    } finally {
      setBusy(false)
    }
  }

  if (!photos) return <Loading />
  return (
    <section className="card stack">
      <h2 className="section-title">{t('admin.photos')}</h2>
      <p className="muted" style={{ margin: 0 }}>{t('admin.photosNote')}</p>

      <h3 className="admin-sub">{t('admin.logo')}</h3>
      <div className="admin-photos">
        {logo && <Thumb p={logo} onDelete={() => void remove(logo)} busy={busy} />}
        <label className={`upload${busy ? ' upload--busy' : ''}`}>
          <input ref={logoInput} type="file" accept="image/*" disabled={busy} onChange={(e) => void upload('logo', e.target.files)} />
          + {t('admin.uploadLogo')}
        </label>
      </div>

      <h3 className="admin-sub">{t('admin.gallery', { n: gallery.length, max: MAX_GALLERY })}</h3>
      <div className="admin-photos">
        {gallery.map((p) => <Thumb key={p.id} p={p} onDelete={() => void remove(p)} busy={busy} />)}
        {room > 0 && (
          <label className={`upload${busy ? ' upload--busy' : ''}`}>
            <input ref={galleryInput} type="file" accept="image/*" multiple disabled={busy} onChange={(e) => void upload('gallery', e.target.files)} />
            + {t('admin.uploadPhotos')}
          </label>
        )}
      </div>
      {msg && <p className="form__msg" role="status">{msg}</p>}
    </section>
  )
}

function Thumb({ p, onDelete, busy }: { p: AdminPhoto; onDelete: () => void; busy: boolean }) {
  const t = useT()
  return (
    <figure className="thumb">
      <img src={photoUrl(p.storage_path)} alt="" loading="lazy" />
      <button type="button" className="thumb__del" disabled={busy} onClick={onDelete} aria-label={t('admin.delete')}>✕</button>
    </figure>
  )
}

export default Component
