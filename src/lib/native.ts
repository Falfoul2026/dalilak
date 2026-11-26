// Native features in the Android app (Capacitor). Everything here is a no-op on the website.
import { isNativeApp } from './platform'

let started = false

/** Called once in the browser: Android back button, status bar colour, hide the splash screen. */
export async function initNative(): Promise<void> {
  if (started || !isNativeApp()) return
  started = true
  document.documentElement.classList.add('native-app')
  const [{ App }, { StatusBar, Style }, { SplashScreen }] = await Promise.all([
    import('@capacitor/app'),
    import('@capacitor/status-bar'),
    import('@capacitor/splash-screen'),
  ])
  // Hardware back button: go back in the app, or leave the app on the home screen.
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack && window.location.pathname !== '/') window.history.back()
    else void App.exitApp()
  })
  await StatusBar.setBackgroundColor({ color: '#0b5d5b' }).catch(() => undefined)
  await StatusBar.setStyle({ style: Style.Dark }).catch(() => undefined)
  await SplashScreen.hide().catch(() => undefined)
}

/** System share sheet in the app; Web Share / clipboard on the website. Returns false if nothing was shown. */
export async function shareLink(data: { title: string; text?: string; url: string }): Promise<boolean> {
  if (isNativeApp()) {
    const { Share } = await import('@capacitor/share')
    await Share.share({ title: data.title, text: data.text, url: data.url, dialogTitle: data.title })
    return true
  }
  if (typeof navigator !== 'undefined' && navigator.share) {
    await navigator.share(data)
    return true
  }
  return false
}

/** Public web address of a page, also inside the app (where the page itself is served from https://localhost). */
export function publicUrl(path: string): string {
  const site = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '')
  if (site) return `${site}${path}`
  return typeof window !== 'undefined' ? `${window.location.origin}${path}` : path
}
