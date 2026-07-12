'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import enTranslations from '../locales/en.json'
import urTranslations from '../locales/ur.json'
import { cn } from '@/lib/utils'

type Locale = 'en' | 'ur'

type TranslationContextType = {
  locale: Locale
  t: (key: string, variables?: Record<string, string>) => string
  changeLanguage: (newLocale: Locale) => void
  isRtl: boolean
}

const LanguageContext = createContext<TranslationContextType | undefined>(undefined)

const dictionaries: Record<Locale, Record<string, any>> = {
  en: enTranslations,
  ur: urTranslations,
}

// Flat key resolver helper, e.g., t("home.title")
function getNestedValue(obj: any, path: string): string | null {
  const parts = path.split('.')
  let current = obj
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return null
    current = current[part]
  }
  return typeof current === 'string' ? current : null
}

export function LanguageProvider({
  children,
  defaultLocale = 'en',
}: {
  children: React.ReactNode
  defaultLocale?: Locale
}) {
  const [locale, setLocale] = useState<Locale>(defaultLocale)
  const [mounted, setMounted] = useState(false)

  // Load language preference from localStorage on mount
  useEffect(() => {
    const savedLocale = localStorage.getItem('ustad_locale') as Locale
    if (savedLocale === 'ur' || savedLocale === 'en') {
      setLocale(savedLocale)
    }
    setMounted(true)
  }, [])

  // Sync HTML attributes and fonts when locale changes
  useEffect(() => {
    if (!mounted) return

    const dir = locale === 'ur' ? 'rtl' : 'ltr'
    document.documentElement.dir = dir
    document.documentElement.lang = locale

    localStorage.setItem('ustad_locale', locale)

    // Manage Urdu Google font injection
    const fontId = 'google-font-urdu-noto'
    let linkElement = document.getElementById(fontId) as HTMLLinkElement | null

    if (locale === 'ur') {
      if (!linkElement) {
        linkElement = document.createElement('link')
        linkElement.id = fontId
        linkElement.rel = 'stylesheet'
        linkElement.href = 'https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap'
        document.head.appendChild(linkElement)
      }
      document.body.classList.add('font-urdu')
    } else {
      document.body.classList.remove('font-urdu')
    }
  }, [locale, mounted])

  const t = (key: string, variables?: Record<string, string>): string => {
    const dict = dictionaries[locale]
    let text = getNestedValue(dict, key) || getNestedValue(dictionaries.en, key) || key

    if (variables) {
      Object.entries(variables).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, v)
      })
    }

    return text
  }

  const changeLanguage = (newLocale: Locale) => {
    setLocale(newLocale)
    document.cookie = `ustad_locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`
  }

  const isRtl = locale === 'ur'

  // Avoid hydrations mismatch by rendering an empty shell until mounted
  if (!mounted) {
    return <>{children}</>
  }

  return (
    <LanguageContext.Provider value={{ locale, t, changeLanguage, isRtl }}>
      <div className={locale === 'ur' ? 'font-urdu' : 'font-sans'}>
        {children}
      </div>
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    return {
      locale: 'en' as const,
      t: (key: string, variables?: Record<string, string>) => {
        const parts = key.split('.')
        let current = enTranslations as any
        for (const part of parts) {
          if (current == null || typeof current !== 'object') break
          current = current[part]
        }
        let text = typeof current === 'string' ? current : key
        if (variables) {
          Object.entries(variables).forEach(([k, v]) => {
            text = text.replace(`{${k}}`, v)
          })
        }
        return text
      },
      changeLanguage: () => {},
      isRtl: false,
    }
  }
  return context
}

export function TranslatedText({
  k,
  variables,
  className,
}: {
  k: string
  variables?: Record<string, string>
  className?: string
}) {
  const { t, locale } = useTranslation()
  const [displayText, setDisplayText] = useState(() => t(k, variables))
  const [opacity, setOpacity] = useState(1)

  useEffect(() => {
    setOpacity(0)
    const timer = setTimeout(() => {
      setDisplayText(t(k, variables))
      setOpacity(1)
    }, 100)
    return () => clearTimeout(timer)
  }, [locale, k, JSON.stringify(variables)])

  return (
    <span
      className={cn("transition-opacity duration-150 ease-out inline-block", className)}
      style={{ opacity }}
    >
      {displayText}
    </span>
  )
}
