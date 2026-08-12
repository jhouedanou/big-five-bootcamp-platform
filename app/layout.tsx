import React from "react"
import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import './globals.css'

/**
 * Identifiant GA4 du script client.
 *
 * Lu depuis /admin/integrations, avec repli sur la variable d'environnement puis
 * sur la valeur historique. La lecture se fait ici, dans un composant serveur :
 * un aller-retour côté navigateur avant de charger gtag ferait perdre des vues.
 */
const FALLBACK_GA_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-H34KN567Q2'

async function resolveGaId(): Promise<string> {
  try {
    const { getIntegrationValue } = await import('@/lib/integration-settings')
    return (await getIntegrationValue('ga4_measurement_id')) || FALLBACK_GA_ID
  } catch {
    // Base injoignable : la mesure ne doit pas empêcher la page de s'afficher.
    return FALLBACK_GA_ID
  }
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://laveiye.com'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Laveiye | Bibliothèque de campagnes marketing africaines',
  description: 'Analysez les campagnes publicitaires et social media en Afrique francophone. Benchmark, veille créative, inspirations et filtres par pays, secteur et marque.',
  icons: {
    icon: '/favicon_onglet.png',
    shortcut: '/favicon_onglet.png',
    apple: '/favicon_onglet.png',
  },
  openGraph: {
    type: 'website',
    siteName: 'Laveiye',
    title: 'Laveiye | Bibliothèque de campagnes marketing africaines',
    description: 'Analysez les campagnes publicitaires et social media en Afrique francophone. Benchmark, veille créative, inspirations et filtres par pays, secteur et marque.',
    url: siteUrl,
    locale: 'fr_FR',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: 'Laveiye',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Laveiye | Bibliothèque de campagnes marketing africaines',
    description: 'Analysez les campagnes publicitaires et social media en Afrique francophone. Benchmark, veille créative, inspirations et filtres par pays, secteur et marque.',
    images: ['/logo.png'],
  },
}

export const viewport: Viewport = {
  themeColor: '#F2B33D',
}

import { Providers } from "@/components/providers"
import { TawkTo } from "@/components/tawk-to"

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const GA_ID = await resolveGaId()

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `if(typeof globalThis.__name!=="function"){globalThis.__name=function(t,n){try{Object.defineProperty(t,"name",{value:n,configurable:true})}catch(e){}return t}}`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Karla:ital,wght@0,200..800;1,200..800&family=Outfit:wght@300;400;500;600;700;800&display=swap"
        />
        {/* Préchargement des icônes du menu utilisateur pour éviter le flash au survol/ouverture */}
        <link rel="preload" as="image" href="/icons/Bibliotheque.svg" />
        <link rel="preload" as="image" href="/icons/Temps_forts.svg" />
        <link rel="preload" as="image" href="/icons/Favoris.svg" />
        <link rel="preload" as="image" href="/icons/Collections.svg" />
        <link rel="preload" as="image" href="/icons/Veille.svg" />
        <link rel="preload" as="image" href="/icons/Profil.svg" />
        <link rel="preload" as="image" href="/icons/default-avatar.svg" />
      </head>
      <body className="font-sans antialiased">
        <Providers>
          {children}
        </Providers>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>
        {/* Tawk.to live chat — hidden on /admin routes */}
        <TawkTo />
      </body>
    </html>
  )
}
