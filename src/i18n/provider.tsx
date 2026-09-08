'use client'
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'

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
  t: (key: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextType>({
  locale: 'en', setLocale: () => { }, t: (k) => k
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Pre-login default: a local cache with no account tied to it yet, so the
  // login page itself isn't stuck on English. Once a session exists, the
  // account's own saved locale (below) is the source of truth — this
  // prevents one shared browser-wide key from leaking a language change
  // from one logged-in role into a completely different account/session.
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('ridesafe-locale') as Locale) || 'en'
    }
    return 'en'
  })

  useEffect(() => {
    fetch('/api/auth/me').then(r => (r.ok ? r.json() : null)).then(d => {
      if (d?.user?.locale && translationMap[d.user.locale as Locale]) {
        setLocaleState(d.user.locale as Locale)
      }
    }).catch(() => { })
  }, [])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    if (typeof window !== 'undefined') localStorage.setItem('ridesafe-locale', l)
    // Persist to the logged-in account so it doesn't ride along with the
    // browser into a different role/session. No-ops (401) when logged out.
    fetch('/api/auth/me', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locale: l }),
    }).catch(() => { })
  }, [])

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const parts = key.split('.')
    let result: unknown = translationMap[locale]
    for (const part of parts) {
      result = (result as Record<string, unknown>)?.[part]
      if (result === undefined) {
        // Fallback to English
        let fallback: unknown = translationMap.en
        for (const p of parts) { fallback = (fallback as Record<string, unknown>)?.[p] }
        result = (fallback as string) || key
        break
      }
    }
    
    let str = result as string;
    if (params && typeof str === 'string') {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(new RegExp(`{{${k}}}`, 'g'), String(v))
      }
    }
    return str
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
    <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', padding: '4px', borderRadius: '10px', border: '1px solid var(--surface-border)' }}>
      {(['en', 'ms', 'zh'] as Locale[]).map(lang => (
        <button key={lang} onClick={() => setLocale(lang)}
          style={{ padding: '5px 10px', fontSize: '0.73rem', fontWeight: 700, border: 'none', background: locale === lang ? '#FFD60A' : 'transparent', color: locale === lang ? '#08080A' : 'var(--text-muted)', borderRadius: '7px', cursor: 'pointer', transition: 'all 0.15s ease', letterSpacing: '0.04em' }}>
          {labels[lang]}
        </button>
      ))}
    </div>
  )
}
