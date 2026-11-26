import { useT } from '../i18n'

/** Placeholder for pages built in the next steps. */
export function InfoPage({ page }: { page: 'top' | 'picks' | 'saved' }) {
  const t = useT()
  return (
    <section>
      <h1 className="page-title">{t(`pages.${page}.title`)}</h1>
      <p className="muted">{t(`pages.${page}.desc`)}</p>
      <div className="card">{t('common.soon')}</div>
    </section>
  )
}

export const TopRated = () => <InfoPage page="top" />
export const OurPicks = () => <InfoPage page="picks" />
export const Saved = () => <InfoPage page="saved" />

/** Privacy / terms: real texts come in the legal step. */
export function LegalPage({ which }: { which: 'privacy' | 'terms' }) {
  const t = useT()
  return (
    <section>
      <h1 className="page-title">{t(`settings.${which}`)}</h1>
      <div className="card">{t('common.soon')}</div>
    </section>
  )
}
export const Privacy = () => <LegalPage which="privacy" />
export const Terms = () => <LegalPage which="terms" />
