/** True inside the Android app (Capacitor). Payments are never shown there. */
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
  return Boolean(cap?.isNativePlatform?.())
}

export function isIosSafariBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
  const standalone = (navigator as unknown as { standalone?: boolean }).standalone === true
  return ios && !standalone && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)
}
