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
const FALLBACK_FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID || '1889630218258683'

/**
 * Identifiants de mesure, lus une fois côté serveur.
 *
 * Le pixel Meta était codé en dur dans lib/fb-pixel.ts : changer le pixel dans
 * /admin/integrations ne modifiait que la moitié serveur (CAPI), jamais le
 * navigateur — d'où « le nouveau jeton ne change rien » en recette. L'identifiant
 * est désormais résolu ici et posé sur window, comme celui de GA4.
 */
async function resolveTrackingIds(): Promise<{
  gaId: string
  gtmId: string
  fbPixelId: string
}> {
  try {
    const { getIntegrationValue } = await import('@/lib/integration-settings')
    const [gaId, gtmId, fbPixelId] = await Promise.all([
      getIntegrationValue('ga4_measurement_id'),
      getIntegrationValue('gtm_container_id'),
      getIntegrationValue('meta_pixel_id'),
    ])
    return {
      gaId: gaId || FALLBACK_GA_ID,
      gtmId: (gtmId || process.env.NEXT_PUBLIC_GTM_ID || '').trim(),
      fbPixelId: fbPixelId || FALLBACK_FB_PIXEL_ID,
    }
  } catch {
    // Base injoignable : la mesure ne doit pas empêcher la page de s'afficher.
    return {
      gaId: FALLBACK_GA_ID,
      gtmId: (process.env.NEXT_PUBLIC_GTM_ID || '').trim(),
      fbPixelId: FALLBACK_FB_PIXEL_ID,
    }
  }
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://laveiye.com'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Laveiye | Bibliothèque de campagnes marketing africaines',
  description: 'Analysez les campagnes publicitaires et social media en Afrique francophone. Benchmark, veille créative, inspirations et filtres par pays, secteur et marque.',
  // Un favicon se sert en tailles fixes. `favicon_onglet.png` faisait
  // 8779 x 8779 px pour 568 Ko sur les trois usages — les fichiers aux bonnes
  // dimensions existaient déjà dans public/, sans être référencés.
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
    ],
    shortcut: '/icon-light-32x32.png',
    apple: '/apple-icon.png',
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
import { RgpdBottomSheet } from "@/components/rgpd-bottom-sheet"
import { ConsentModeBridge } from "@/components/analytics/consent-mode"
import { TrackingConfig } from "@/components/analytics/tracking-config"
import { DataLayerRouteTracker } from "@/components/analytics/datalayer-route-tracker"
import { DataLayerIdentity } from "@/components/analytics/datalayer-identity"
import { CONSENT_MODE_BOOTSTRAP } from "@/lib/consent"

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { gaId: GA_ID, gtmId: GTM_ID, fbPixelId: FB_PIXEL_ID } = await resolveTrackingIds()
  // Un seul propriétaire des balises à la fois. Tant qu'aucun conteneur n'est
  // configuré, le site garde son gtag et son pixel Meta ; dès qu'un GTM- est
  // renseigné, GA4 et Meta passent dans le conteneur, le gtag direct s'efface
  // et le site cesse de charger le pixel (cf. lib/fb-pixel.ts) — sinon chaque
  // page_view, sign_up, Lead et purchase serait compté deux fois (§12 et §14).
  const useGtm = GTM_ID.startsWith('GTM-')

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `if(typeof globalThis.__name!=="function"){globalThis.__name=function(t,n){try{Object.defineProperty(t,"name",{value:n,configurable:true})}catch(e){}return t}}`,
          }}
        />
        {/* Consent Mode : l'état par défaut doit être posé AVANT toute balise,
            sinon une mesure part avant que le visiteur ait répondu. */}
        <script dangerouslySetInnerHTML={{ __html: CONSENT_MODE_BOOTSTRAP }} />
        {/* Identifiant du pixel Meta, piloté depuis /admin/integrations. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__LAVEIYE_FB_PIXEL_ID__=${JSON.stringify(FB_PIXEL_ID)};`,
          }}
        />
        {useGtm && (
          <script
            dangerouslySetInnerHTML={{
              __html: `window.__LAVEIYE_GTM_META__=true;(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${JSON.stringify(GTM_ID)});`,
            }}
          />
        )}
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
        {useGtm && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
              title="Google Tag Manager"
            />
          </noscript>
        )}
        <Providers>
          {/* Sous <Providers> : ce composant lit le contexte d'authentification
              pour poser user_id, user_stage et subscription_plan (brief §5). */}
          <DataLayerIdentity />
          {children}
        </Providers>
        {/* Bandeau RGPD sur TOUTES les routes. Monté sur la seule page d'accueil,
            un visiteur arrivant d'une publicité sur /etudes/finance ne pouvait
            jamais donner son consentement : le pixel n'était donc jamais chargé
            et Test Events ne voyait rien (recette du 19/08). */}
        <RgpdBottomSheet />
        <ConsentModeBridge />
        <TrackingConfig />
        <DataLayerRouteTracker />
        {!useGtm && (
          <>
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
          </>
        )}
        {/* Tawk.to live chat — hidden on /admin routes */}
        <TawkTo />
      </body>
    </html>
  )
}
