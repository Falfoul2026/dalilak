import { isNativeApp } from './platform'

/** Contact forms. Each one is sent to Yousef's email by Netlify Forms (declared in public/__forms.html). */
export type FormKind = 'add-shop' | 'report' | 'advertise' | 'sell' | 'ad-interest'

export async function submitForm(kind: FormKind, data: Record<string, string>): Promise<void> {
  const native = isNativeApp()
  // Inside the Android app the page is not on the website, so post to the public address.
  const base = native ? ((import.meta.env.VITE_SITE_URL as string | undefined) ?? '').replace(/\/$/, '') : ''
  const body = new URLSearchParams({ 'form-name': kind, ...data }).toString()
  const res = await fetch(`${base}/__forms.html`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    ...(native ? { mode: 'no-cors' as RequestMode } : {}),
  })
  // A no-cors response is opaque (always "ok" to the browser), so only check real responses.
  if (!native && !res.ok) throw new Error(`form ${kind}: ${res.status}`)
}
