import { useState, type FormEvent } from 'react'
import { useLang, useT } from '../i18n'
import { submitForm, type FormKind } from '../lib/forms'

type Field = { key: string; required?: boolean; type?: 'text' | 'email' | 'tel' | 'textarea' | 'checkbox'; label?: string }

/** Which fields each form has. Field names must match public/__forms.html. */
const FORMS: Record<FormKind, Field[]> = {
  'add-shop': [
    { key: 'shopName', required: true }, { key: 'city', required: true }, { key: 'name', required: true },
    { key: 'email', type: 'email' }, { key: 'phone', type: 'tel' },
    { key: 'featured', type: 'checkbox' }, { key: 'message', type: 'textarea' },
  ],
  report: [
    { key: 'shopName', required: true }, { key: 'message', type: 'textarea', required: true, label: 'whatWrong' },
    { key: 'email', type: 'email' }, { key: 'phone', type: 'tel' },
  ],
  advertise: [
    { key: 'business', required: true }, { key: 'name', required: true },
    { key: 'email', type: 'email' }, { key: 'phone', type: 'tel' }, { key: 'message', type: 'textarea' },
  ],
  sell: [
    { key: 'whatSell', required: true }, { key: 'city', required: true }, { key: 'price' }, { key: 'name', required: true },
    { key: 'email', type: 'email' }, { key: 'phone', type: 'tel' }, { key: 'message', type: 'textarea' },
  ],
  'ad-interest': [
    { key: 'name', required: true }, { key: 'email', type: 'email' }, { key: 'phone', type: 'tel' }, { key: 'message', type: 'textarea' },
  ],
}

const AUTOCOMPLETE: Record<string, string> = { name: 'name', email: 'email', phone: 'tel' }

/** A short form that is sent to Yousef's email (no WhatsApp). At least an email or a phone is needed to reply. */
export function ContactForm({ kind, hidden = {}, defaults = {} }: { kind: FormKind; hidden?: Record<string, string>; defaults?: Record<string, string> }) {
  const t = useT()
  const lang = useLang()
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState('')

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (fd.get('bot-field')) return // a bot filled the hidden field
    const data: Record<string, string> = { ...hidden, lang, page: window.location.href }
    for (const f of FORMS[kind]) {
      const v = fd.get(f.key)
      if (v !== null && String(v).trim()) data[f.key] = String(v).trim()
    }
    if (!data.email && !data.phone) { setError(t('form.needContact')); return }
    setError('')
    setState('sending')
    try {
      await submitForm(kind, data)
      setState('sent')
    } catch {
      setState('idle')
      setError(t('form.error'))
    }
  }

  if (state === 'sent') {
    return (
      <div className="card form__done" role="status">
        <b>{t('form.sent')}</b>
        <p className="muted" style={{ margin: '4px 0 0' }}>{t('form.sentSub')}</p>
      </div>
    )
  }

  return (
    <form className="form card" onSubmit={onSubmit} noValidate={false}>
      <p className="visually-hidden" aria-hidden>
        <label>Do not fill this: <input name="bot-field" tabIndex={-1} autoComplete="off" /></label>
      </p>
      {FORMS[kind].map((f) => {
        const label = t(`form.${f.label ?? f.key}`)
        if (f.type === 'checkbox') {
          return <label key={f.key} className="check"><input type="checkbox" name={f.key} value="yes" /> {label}</label>
        }
        return (
          <label key={f.key}>
            <span>{label}{f.required ? ' *' : ''}</span>
            {f.type === 'textarea'
              ? <textarea name={f.key} rows={4} required={f.required} dir="auto" defaultValue={defaults[f.key]} />
              : <input name={f.key} type={f.type ?? 'text'} required={f.required} autoComplete={AUTOCOMPLETE[f.key] ?? 'off'} defaultValue={defaults[f.key]}
                  dir={f.type === 'email' || f.type === 'tel' ? 'ltr' : 'auto'} inputMode={f.type === 'tel' ? 'tel' : undefined} />}
          </label>
        )
      })}
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>{t('form.replyHint')}</p>
      {error && <p className="form__error" role="alert">{error}</p>}
      <button className="btn btn--block" type="submit" disabled={state === 'sending'}>
        {state === 'sending' ? t('form.sending') : t('form.send')}
      </button>
    </form>
  )
}
