import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { cookies } from 'next/headers'
import { LanguageProvider } from '@/lib/i18n'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'USTAD — Trusted home services in Islamabad & Rawalpindi',
  description:
    'Book verified, background-checked home service technicians in Islamabad & Rawalpindi. Upfront pricing, quote approval before work, and pay only after the job is done.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#ffffff',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const locale = (cookieStore.get('ustad_locale')?.value || 'en') as 'en' | 'ur'

  return (
    <html lang={locale} dir={locale === 'ur' ? 'rtl' : 'ltr'} className={`light ${inter.variable}`}>
      <body className="bg-background font-sans antialiased">
        <LanguageProvider defaultLocale={locale}>
          {children}
        </LanguageProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
