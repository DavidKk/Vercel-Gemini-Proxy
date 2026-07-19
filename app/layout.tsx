import './globals.css'

import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { IBM_Plex_Sans, Space_Grotesk } from 'next/font/google'
import Script from 'next/script'
import type { ReactNode } from 'react'

import { SUPPRESS_ABORT_ERRORS_SCRIPT } from '@/lib/playground/suppress-abort-errors'

const display = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
})

const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata = {
  title: 'Gemini Relay',
  description: 'Gemini API relay proxy on Vercel with a streaming playground.',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon.png', type: 'image/png' },
    ],
    shortcut: ['/favicon.ico'],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export default function RootLayout(props: { children: ReactNode }) {
  return (
    <html lang="en" className={`h-full ${display.variable} ${sans.variable}`}>
      <Analytics />
      <SpeedInsights />
      <body className="h-full w-full overflow-hidden bg-canvas font-sans text-primary antialiased">
        <Script id="suppress-abort-errors" strategy="beforeInteractive">
          {SUPPRESS_ABORT_ERRORS_SCRIPT}
        </Script>
        {props.children}
      </body>
    </html>
  )
}
