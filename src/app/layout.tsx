import type { Metadata } from 'next'
import { Sora, Plus_Jakarta_Sans } from 'next/font/google'
import Image from 'next/image'
import './globals.css'
import Providers from './providers'

const sora = Sora({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-sora',
  display: 'swap',
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'RideSafe — Transport Management System',
  description: 'Real-time transport management, attendance, and parent notifications — all in one place.',
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/ridesafe.png', type: 'image/png' }],
    apple: '/ridesafe.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sora.variable}>
      <body className={jakarta.className} style={{ background: '#08080A' }}>
        <div className="container">
          <nav style={{
            padding: '0.75rem 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #26262C',
            marginBottom: '0',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}>
            {/* Brand mark */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                background: '#FFFFFF', borderRadius: 12, padding: '8px 14px',
                display: 'flex', alignItems: 'center',
              }}>
                <Image src="/ridesafe-logo.png" alt="RideSafe" width={210} height={149} style={{ width: 'auto', height: 48 }} priority />
              </div>
            </div>

            {/* Tagline */}
            <div style={{ fontSize: '0.75rem', color: '#6E6E7A', textAlign: 'right' }}>
              <div style={{ fontWeight: 700, color: '#FFD60A', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Transport Management
              </div>
              <div style={{ marginTop: 2, color: '#A6A6B2' }}>Real-time tracking &amp; safety</div>
            </div>
          </nav>

          <main><Providers>{children}</Providers></main>
        </div>
      </body>
    </html>
  )
}
