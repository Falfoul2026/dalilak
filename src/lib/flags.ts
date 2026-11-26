const on = (v: unknown) => String(v).toLowerCase() === 'true'
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

export const flags = {
  /** Visitor accounts (Saved, reviews, reports, claims). Off for now: Yousef adds shops himself. */
  userAccounts: on(import.meta.env.VITE_USER_ACCOUNTS),
  /** Phone login needs an SMS provider (paid). Off until Yousef approves one. */
  smsLogin: on(import.meta.env.VITE_SMS_LOGIN_ENABLED),
  googleLogin: on(import.meta.env.VITE_GOOGLE_LOGIN_ENABLED),
}

/** Public contact shown on the "Add your shop" page (set in netlify.toml). */
export const contact = {
  whatsapp: str(import.meta.env.VITE_CONTACT_WHATSAPP).replace(/[^\d]/g, ''), // international format, e.g. 32472000000
  email: str(import.meta.env.VITE_CONTACT_EMAIL),
}
