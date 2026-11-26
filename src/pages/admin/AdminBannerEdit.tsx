import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLang, useT } from '../../i18n'
import { localePath } from '../../i18n/langs'
import { AdminGate } from '../../components/AdminGate'
import { Loading } from '../../components/ListState'
import { adminGetBanner, adminSaveBanner, adminUploadBannerImage, bannerState, type BannerInput } from '../../lib/admin'
import { bannerImageUrl, buildWhatsappUrl, parseWhatsappUrl, type Banner } from '../../lib/banners'
import { backArrow } from '../../lib/format'

type LinkKind = 'none' | 'url' | 'whatsapp'

const EMPTY: BannerInput = { title: '', link_url: '', starts_on: '', ends_on: '', is_visible: true, sort_order: '', advertiser_name: '', price_paid: '', notes: '' }

export function Component() {
  return <AdminGate><AdminBannerEdit /></AdminGate>
}

function AdminBannerEdit() {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const { id: idParam } = useParams()
  const id = idParam ? Number(idParam) : null
  const [banner, setBanner] = useState<Banner | null>(null)
  const [form, setForm] = useState<BannerInput | null>(id ? null : EMPTY)
  const [kind, setKind] = useState<LinkKind>('none')
  const [wa, setWa] = useState({ number: '', message: '' })
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const file = useRef<HTMLInputElement>(null)

  const load = async (bid: number) => {
    const r = await adminGetBanner(bid)
    if (!r) { setMsg(t('admin.error', { msg: 'not found' })); return }
    setBanner(r.banner)
    const w = parseWhatsappUrl(r.banner.link_url)
    setKind(w ? 'whatsapp' : r.banner.link_url ? 'url' : 'none')
    setWa(w ?? { number: '', message: '' })
    setForm({
      title: r.banner.title, link_url: w ? '' : r.banner.link_url ?? '', starts_on: r.banner.starts_on ?? '', ends_on: r.banner.ends_on ?? '',
      is_visible: r.banner.is_visible, sort_order: String(r.banner.sort_order || ''),
      advertiser_name: r.priv?.advertiser_name ?? '', price_paid: r.priv?.price_paid ?? '', notes: r.priv?.notes ?? '',
    })
  }
  useEffect(() => {
    if (!id) { setBanner(null); setForm(EMPTY); setKind('none'); return }
    load(id).catch((e) => setMsg(t('admin.error', { msg: (e as Error).message })))
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!form) return msg ? <div className="card">{msg}</div> : <Loading />
  const set = <K extends keyof BannerInput>(k: K, v: BannerInput[K]) => setForm({ ...form, [k]: v })

  const save = async (e: FormEvent) => {
    e.preventDefault()
    const link = kind === 'none' ? '' : kind === 'whatsapp' ? (wa.number.replace(/\D/g, '') ? buildWhatsappUrl(wa.number, wa.message) : '') : form.link_url.trim()
    if (link && !/^https:\/\//i.test(link)) { setMsg(t('admin.badUrl')); return }
    setBusy(true)
    setMsg(t('admin.saving'))
    try {
      const savedId = await adminSaveBanner(id, { ...form, link_url: link })
      if (!id) navigate(localePath(lang, `/admin/banners/${savedId}`), { replace: true })
      else await load(savedId)
      setMsg(t('admin.saved'))
    } catch (err) {
      setMsg(t('admin.error', { msg: (err as Error).message }))
    } finally {
      setBusy(false)
    }
  }

  const upload = async (files: FileList | null) => {
    if (!id || !files?.length) return
    setBusy(true)
    setMsg(t('admin.uploading'))
    try {
      await adminUploadBannerImage(id, files[0])
      await load(id)
      setMsg(t('admin.saved'))
    } catch (err) {
      setMsg(t('admin.error', { msg: (err as Error).message }))
    } finally {
      setBusy(false)
      if (file.current) file.current.value = ''
    }
  }

  const st = banner ? bannerState(banner) : null
  return (
    <section className="stack">
      <Link to={localePath(lang, '/admin/banners')}>{backArrow(lang)} {t('admin.back')}</Link>
      <h1 className="page-title" style={{ marginTop: 0 }} dir="auto">{id ? banner?.title ?? t('admin.editBanner') : t('admin.newBanner')}</h1>
      {st && <p style={{ margin: 0 }}><span className={`badge ${st === 'running' ? 'badge--verified' : 'badge--verify'}`}>{t(`admin.st${{ running: 'Running', scheduled: 'Scheduled', expired: 'Expired', hidden: 'Hidden', noimage: 'NoImage' }[st]}`)}</span></p>}

      {id && (
        <section className="card stack">
          <h2 className="section-title">{t('admin.bannerImage')}</h2>
          {banner?.image_path && <img className="banner-preview" src={bannerImageUrl(banner.image_path)} alt="" />}
          <label className={`btn btn--ghost upload-btn${busy ? ' upload--busy' : ''}`}>
            <input ref={file} type="file" accept="image/*" disabled={busy} onChange={(e) => void upload(e.target.files)} />
            {banner?.image_path ? t('admin.replaceImage') : t('admin.uploadImage')}
          </label>
        </section>
      )}

      <form className="card form" onSubmit={(e) => void save(e)}>
        <label>{t('admin.bannerTitle')}<input required minLength={2} maxLength={120} dir="auto" value={form.title} onChange={(e) => set('title', e.target.value)} /></label>
        <fieldset>
          <legend>{t('admin.link')}</legend>
          <div className="segmented">
            {(['none', 'url', 'whatsapp'] as const).map((k) => (
              <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>
                {t(k === 'none' ? 'admin.linkNone' : k === 'url' ? 'admin.linkUrl' : 'admin.linkWhatsapp')}
              </button>
            ))}
          </div>
          {kind === 'url' && <label>{t('admin.url')}<input type="url" dir="ltr" placeholder="https://" value={form.link_url} onChange={(e) => set('link_url', e.target.value)} /></label>}
          {kind === 'whatsapp' && (
            <>
              <label>{t('admin.waNumber')}<input type="tel" dir="ltr" value={wa.number} onChange={(e) => setWa({ ...wa, number: e.target.value })} /></label>
              <label>{t('admin.waMessage')}<input dir="auto" maxLength={300} value={wa.message} onChange={(e) => setWa({ ...wa, message: e.target.value })} /></label>
            </>
          )}
        </fieldset>
        <div className="form__row">
          <label>{t('admin.startsOn')}<input type="date" value={form.starts_on} onChange={(e) => set('starts_on', e.target.value)} /></label>
          <label>{t('admin.endsOn')}<input type="date" min={form.starts_on || undefined} value={form.ends_on} onChange={(e) => set('ends_on', e.target.value)} /></label>
        </div>
        <label className="check"><input type="checkbox" checked={form.is_visible} onChange={(e) => set('is_visible', e.target.checked)} />{t('admin.shown')}</label>
        <fieldset className="private-box">
          <legend>🔒 {t('admin.private')}</legend>
          <div className="form__row">
            <label>{t('admin.advertiser')}<input maxLength={120} dir="auto" value={form.advertiser_name} onChange={(e) => set('advertiser_name', e.target.value)} /></label>
            <label>{t('admin.pricePaid')}<input maxLength={100} dir="auto" placeholder="150 €" value={form.price_paid} onChange={(e) => set('price_paid', e.target.value)} /></label>
          </div>
          <label>{t('admin.notes')}<textarea rows={3} dir="auto" maxLength={2000} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></label>
        </fieldset>
        {msg && <p className="form__msg" role="status">{msg}</p>}
        <button className="btn" disabled={busy}>{busy ? t('admin.saving') : id ? t('admin.save') : t('admin.createBanner')}</button>
      </form>
      {!id && <p className="muted">{t('admin.saveFirst')}</p>}
    </section>
  )
}

export default Component
