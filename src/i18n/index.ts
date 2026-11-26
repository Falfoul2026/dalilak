import i18n from 'i18next'
import { initReactI18next, useTranslation } from 'react-i18next'
import { createContext, useContext } from 'react'
import ar from './locales/ar.json'
import fr from './locales/fr.json'
import nl from './locales/nl.json'
import en from './locales/en.json'
import { DEFAULT_LANG, type Lang } from './langs'

export const resources = {
  ar: { translation: ar },
  fr: { translation: fr },
  nl: { translation: nl },
  en: { translation: en },
} as const

i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LANG,
  fallbackLng: DEFAULT_LANG,
  interpolation: { escapeValue: false },
  initAsync: false,
})

/** The language comes from the URL, not from global state, so pre-rendering
 *  "/", "/fr", "/nl" and "/en" in one build never mixes languages. */
export const LangContext = createContext<Lang>(DEFAULT_LANG)
export const useLang = () => useContext(LangContext)

export function useT() {
  const lang = useLang()
  return useTranslation(undefined, { lng: lang }).t
}

export default i18n
