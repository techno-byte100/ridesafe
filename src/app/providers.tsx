'use client'
import { LanguageProvider } from '@/i18n/provider'

export default function Providers({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>
}
