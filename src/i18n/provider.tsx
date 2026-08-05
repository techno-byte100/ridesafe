'use client'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

import en from '@/i18n/en.json'
import ms from '@/i18n/ms.json'
import zh from '@/i18n/zh.json'

type Locale = 'en' | 'ms' | 'zh'
type Translations = typeof en

const translationMap: Record<Locale, Translations> = { en, ms, zh }
const labels: Record<string, string> = { en: 'EN', ms: 'BM', zh: 'ZH' }

interface I18nContextType {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextType>({
  locale: 'en', setLocale: () => {}, t: (k) => k
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('ridesafe-locale') as Locale) || 'en'
    }
    return 'en'
  })

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    if (typeof window !== 'undefined') localStorage.setItem('ridesafe-locale', l)
  }, [])

  const t = useCallback((key: string): string => {
    const parts = key.split('.')
    let result: unknown = translationMap[locale]
    for (const part of parts) {
      result = (result as Record<string, unknown>)?.[part]
      if (result === undefined) {
        // Fallback to English
        let fallback: unknown = translationMap.en
        for (const p of parts) { fallback = (fallback as Record<string, unknown>)?.[p] }
        return (fallback as string) || key
      }
    }
    return result as string
  }, [locale])

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useTranslation() {
  return useContext(I18nContext)
}

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation()
  return (
    <div style={{ display:'flex', gap:4, background:'var(--surface)', padding:'4px', borderRadius:'10px', border:'1px solid var(--surface-border)' }}>
      {(['en', 'ms', 'zh'] as Locale[]).map(lang => (
        <button key={lang} onClick={() => setLocale(lang)}
          style={{ padding:'5px 10px', fontSize:'0.73rem', fontWeight:700, border:'none', background: locale === lang ? '#FFD60A' : 'transparent', color: locale === lang ? '#08080A' : 'var(--text-muted)', borderRadius:'7px', cursor:'pointer', transition:'all 0.15s ease', letterSpacing:'0.04em' }}>
          {labels[lang]}
        </button>
      ))}
    </div>
  )
}
