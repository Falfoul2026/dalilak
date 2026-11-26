import { useT } from '../i18n'
import { CATEGORIES } from '../data/categories'
import { LAUNCH_PROVINCE_SLUGS, OTHER_PROVINCE_SLUGS } from '../data/provinces'

export function CategoryChips({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const t = useT()
  return (
    <div className="chips" role="group" aria-label={t('home.allCategories')}>
      <button type="button" className="chip" aria-pressed={value === null} onClick={() => onChange(null)}>
        {t('home.allCategories')}
      </button>
      {CATEGORIES.map((c) => (
        <button key={c.slug} type="button" className="chip" aria-pressed={value === c.slug} onClick={() => onChange(c.slug)}>
          <span aria-hidden>{c.icon}</span>
          {t(`categories.${c.slug}`)}
        </button>
      ))}
    </div>
  )
}

export function ProvinceSelect({ value, onChange, id = 'province' }: { value: string | null; onChange: (v: string | null) => void; id?: string }) {
  const t = useT()
  return (
    <>
      <label className="visually-hidden" htmlFor={id}>{t('home.allProvinces')}</label>
      <select id={id} className="select" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">{t('home.allProvinces')}</option>
        {LAUNCH_PROVINCE_SLUGS.map((p) => <option key={p} value={p}>{t(`provinces.${p}`)}</option>)}
        <optgroup label={t('provinces.other')}>
          {OTHER_PROVINCE_SLUGS.map((p) => <option key={p} value={p}>{t(`provinces.${p}`)}</option>)}
        </optgroup>
      </select>
    </>
  )
}
