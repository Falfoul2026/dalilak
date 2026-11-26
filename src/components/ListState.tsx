import { useT } from '../i18n'

export function Loading() {
  return (
    <div className="stack" aria-busy="true" aria-label={useT()('list.loading')}>
      {[0, 1, 2].map((i) => <div key={i} className="skeleton" />)}
    </div>
  )
}

export function ErrorBox({ onRetry }: { onRetry: () => void }) {
  const t = useT()
  return (
    <div className="card" role="alert">
      <p style={{ marginTop: 0 }}>{t('list.error')}</p>
      <button type="button" className="btn" onClick={onRetry}>{t('list.retry')}</button>
    </div>
  )
}

export const Empty = ({ text }: { text: string }) => <div className="card muted">{text}</div>
