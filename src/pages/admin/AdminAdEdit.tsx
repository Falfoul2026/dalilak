import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLang, useT } from '../../i18n'
import { backArrow } from '../../lib/format'
import { localePath } from '../../i18n/langs'
import { AdminGate } from '../../components/AdminGate'
import { Loading } from '../../components/ListState'
import {
  MAX_AD_PHOTOS, adminAdPhotos, adminDeleteAdPhoto, adminGetAd, adminSaveAd, adminSetAdCover, adminSetAdStatus,
  adminUploadAdPhoto, type AdInput,
} from '../../lib/admin'
import { AD_CATEGORIES, adPhotoUrl, type Ad, type AdPhoto, type AdStatus } from '../../lib/market'

const EMPTY: AdInput = {
  title: '', category: 'other', city: '', price_eur: '', description: '', status: 'active',
  commission: '', seller_name: '', seller_phone: '', notes: '',
}

export function Component() {
  return <AdminGate><AdminAdEdit /></AdminGate>
}

function AdminAdEdit() {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const { id: idParam } = useParams()
  const id = idParam ? Number(idParam) : null
  const [ad, setAd] = useState<Ad | null>(null)
  const [form, setForm] = useState<AdInput | null>(id ? null : EMPTY)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async (adId: number) => {
    const r = await adminGetAd(adId)
    if (!r) { setMsg(t('market.notFound')); return }
    setAd(r.ad)
    setForm({
      title: r.ad.title, category: r.ad.category, city: r.ad.city,
      price_eur: r.ad.price_eur === null ? '' : String(Number(r.ad.price_eur)), description: r.ad.description, status: r.ad.status,
      commission: r.priv?.commission ?? '', seller_name: r.priv?.seller_name ?? '', seller_phone: r.priv?.seller_phone ?? '', notes: r.priv?.notes ?? '',
    })
  }
  useEffect(() => {
    if (!id) { setAd(null); setForm(EMPTY); return }
    load(id).catch((e) => setMsg(t('admin.error', { msg: (e as Error).message })))
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!form) return msg ? <div className="card">{msg}</div> : <Loading />
  const set = <K extends keyof AdInput>(k: K, v: AdInput[K]) => setForm({ ...form, [k]: v })

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg(t('admin.saving'))
    try {
      const savedId = await adminSaveAd(id, form)
      if (!id) navigate(localePath(lang, `/admin/ads/${savedId}`), { replace: true })
      else await load(savedId)
      setMsg(t('admin.saved'))
    } catch (err) {
      setMsg(t('admin.error', { msg: (err as Error).message === 'price' ? t('admin.price') : (err as Error).message }))
    } finally {
      setBusy(false)
    }
  }

  const quickStatus = async (s: AdStatus) => {
    if (!id) return
    setBusy(true)
    try {
      await adminSetAdStatus(id, s)
      await load(id)
      setMsg(t('admin.saved'))
    } catch (err) {
      setMsg(t('admin.error', { msg: (err as Error).message }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="stack">
      <Link to={localePath(lang, '/admin/ads')}>{backArrow(lang)} {t('admin.back')}</Link>
      <h1 className="page-title" style={{ marginTop: 0 }} dir="auto">{id ? ad?.title ?? t('admin.editAd') : t('admin.newAd')}</h1>
      {ad && ad.status !== 'hidden' && <a href={localePath(lang, `/market/${ad.slug}`)} target="_blank" rel="noopener">{t('admin.view')} ↗</a>}

      {ad && (
        <div className="card stack">
          <b>{t('admin.status')}: {t(`admin.status${ad.status[0].toUpperCase()}${ad.status.slice(1)}`)}</b>
          <div className="segmented">
            {ad.status !== 'sold' && <button type="button" className="btn" disabled={busy} onClick={() => void quickStatus('sold')}>✓ {t('admin.markSold')}</button>}
            {ad.status !== 'active' && <button type="button" disabled={busy} onClick={() => void quickStatus('active')}>{t('admin.statusActive')}</button>}
            {ad.status !== 'hidden' && <button type="button" disabled={busy} onClick={() => void quickStatus('hidden')}>{t('admin.statusHidden')}</button>}
          </div>
        </div>
      )}

      <form className="card form" onSubmit={(e) => void save(e)}>
        <label>{t('admin.adTitle')}<input required minLength={2} maxLength={140} dir="auto" value={form.title} onChange={(e) => set('title', e.target.value)} /></label>
        <div className="form__row">
          <label>{t('admin.adCategory')}
            <select value={form.category} onChange={(e) => set('category', e.target.value as AdInput['category'])}>
              {AD_CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.icon} {t(`adCategories.${c.slug}`)}</option>)}
            </select>
          </label>
          <label>{t('admin.city')}<input required maxLength={80} dir="auto" value={form.city} onChange={(e) => set('city', e.target.value)} /></label>
        </div>
        <label>{t('admin.price')}<input inputMode="decimal" dir="ltr" placeholder="8500" value={form.price_eur} onChange={(e) => set('price_eur', e.target.value)} /></label>
        <label>{t('admin.adDescription')}<textarea rows={6} dir="auto" maxLength={5000} value={form.description} onChange={(e) => set('description', e.target.value)} /></label>
        {!id && (
          <label>{t('admin.status')}
            <select value={form.status} onChange={(e) => set('status', e.target.value as AdStatus)}>
              <option value="active">{t('admin.statusActive')}</option>
              <option value="hidden">{t('admin.statusHidden')}</option>
            </select>
          </label>
        )}
        <fieldset className="private-box">
          <legend>🔒 {t('admin.private')}</legend>
          <label>{t('admin.commission')}<input maxLength={200} dir="auto" placeholder="5% / 300 €" value={form.commission} onChange={(e) => set('commission', e.target.value)} /></label>
          <div className="form__row">
            <label>{t('admin.sellerName')}<input maxLength={120} dir="auto" value={form.seller_name} onChange={(e) => set('seller_name', e.target.value)} /></label>
            <label>{t('admin.sellerPhone')}<input type="tel" maxLength={40} dir="ltr" value={form.seller_phone} onChange={(e) => set('seller_phone', e.target.value)} /></label>
          </div>
          <label>{t('admin.notes')}<textarea rows={3} dir="auto" maxLength={2000} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></label>
        </fieldset>
        {msg && <p className="form__msg" role="status">{msg}</p>}
        <button className="btn" disabled={busy}>{busy ? t('admin.saving') : id ? t('admin.save') : t('admin.createAd')}</button>
      </form>

      {id ? <AdPhotosBox adId={id} onChange={() => void load(id)} /> : <p className="muted">{t('admin.saveFirst')}</p>}
    </section>
  )
}

function AdPhotosBox({ adId, onChange }: { adId: number; onChange: () => void }) {
  const t = useT()
  const [photos, setPhotos] = useState<AdPhoto[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const input = useRef<HTMLInputElement>(null)
  // a failed request shows a message instead of an unhandled error
  const reload = () => adminAdPhotos(adId).then(setPhotos).catch((e) => { setPhotos((prev) => prev ?? []); setMsg(t('admin.error', { msg: (e as Error).message ?? String(e) })) })
  useEffect(() => { void reload() }, [adId]) // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setMsg('')
    try {
      await fn()
    } catch (e) {
      setMsg(t('admin.error', { msg: (e as Error).message }))
    } finally {
      await reload()
      onChange()
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  if (!photos) return <Loading />
  const room = MAX_AD_PHOTOS - photos.length
  const upload = (files: FileList | null) => {
    if (!files?.length) return
    const list = Array.from(files).slice(0, room)
    void run(async () => {
      setMsg(t('admin.uploading'))
      for (const f of list) await adminUploadAdPhoto(adId, f)
      setMsg(files.length > list.length ? t('admin.galleryFull') : '')
    })
  }
  return (
    <section className="card stack">
      <h2 className="section-title">{t('admin.adPhotos', { n: photos.length, max: MAX_AD_PHOTOS })}</h2>
      <div className="admin-photos">
        {photos.map((p, i) => (
          <figure key={p.id} className="thumb">
            <img src={adPhotoUrl(p.storage_path)} alt="" loading="lazy" />
            {i === 0
              ? <span className="thumb__cover">{t('admin.cover')}</span>
              : <button type="button" className="thumb__make-cover" disabled={busy} onClick={() => void run(() => adminSetAdCover(p.id))}>{t('admin.makeCover')}</button>}
            <button type="button" className="thumb__del" disabled={busy} aria-label={t('admin.delete')}
              onClick={() => { if (confirm(t('admin.confirmDelete'))) void run(() => adminDeleteAdPhoto(p.id)) }}>✕</button>
          </figure>
        ))}
        {room > 0 && (
          <label className={`upload${busy ? ' upload--busy' : ''}`}>
            <input ref={input} type="file" accept="image/*" multiple disabled={busy} onChange={(e) => upload(e.target.files)} />
            + {t('admin.uploadPhotos')}
          </label>
        )}
      </div>
      {msg && <p className="form__msg" role="status">{msg}</p>}
    </section>
  )
}

export default Component
