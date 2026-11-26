// Per-device preferences. Storage can be blocked (private mode), so every
// access is wrapped and the app works without it.
export type ThemePref = 'system' | 'light' | 'dark'

const KEY_THEME = 'dalilak.theme'
const KEY_LANG = 'dalilak.lang'

function read(key: string): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key)
  } catch {
    return null
  }
}
function write(key: string, value: string | null) {
  try {
    if (typeof localStorage === 'undefined') return
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* ignore */
  }
}

export function getTheme(): ThemePref {
  const v = read(KEY_THEME)
  return v === 'light' || v === 'dark' ? v : 'system'
}

export function setTheme(t: ThemePref) {
  write(KEY_THEME, t === 'system' ? null : t)
  if (typeof document === 'undefined') return
  if (t === 'system') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = t
}

export const getSavedLang = () => read(KEY_LANG)
export const saveLang = (l: string) => write(KEY_LANG, l)
