// "Install the app" (Chrome on Android): the browser fires beforeinstallprompt once, early, so it is caught here.
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let deferred: InstallEvent | null = null
let started = false
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((f) => f())

export function initInstallPrompt(): void {
  if (started || typeof window === 'undefined') return
  started = true
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as InstallEvent; notify() })
  window.addEventListener('appinstalled', () => { deferred = null; notify() })
}

export const canPromptInstall = () => deferred !== null

export function subscribeInstall(fn: () => void): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

export async function promptInstall(): Promise<void> {
  if (!deferred) return
  const ev = deferred
  deferred = null
  notify()
  await ev.prompt()
  await ev.userChoice.catch(() => undefined)
}

/** Already running as an installed app (home-screen icon). */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true
}
