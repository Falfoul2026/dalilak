const on = (v: unknown) => String(v).toLowerCase() === 'true'

export const flags = {
  /** Phone login needs an SMS provider (paid). Off until Yousef approves one. */
  smsLogin: on(import.meta.env.VITE_SMS_LOGIN_ENABLED),
  googleLogin: on(import.meta.env.VITE_GOOGLE_LOGIN_ENABLED),
}
