import React from "react"
import type { Metadata, Viewport } from 'next'
import { Josefin_Sans, Poppins } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const josefinSans = Josefin_Sans({ 
  subsets: ["latin"], 
  weight: ["100", "300", "400", "500", "700"],
  variable: "--font-heading" 
});
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body"
});

export const metadata: Metadata = {
  title: 'Big Five Bootcamp | Laissez Votre Empreinte',
  description: 'Bootcamps intensifs pour professionnels du digital. Développez vos compétences avec Big Five, agence de stratégie digitale basée à Abidjan.',
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
  themeColor: '#80368D',
}

import { Providers } from "@/components/providers"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${josefinSans.variable} ${poppins.variable} font-sans antialiased`}>
        <Providers>
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
