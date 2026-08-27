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

// Le `.replace` aligne ce fichier sur app/sitemap.ts, app/robots.ts et
// app/content/sitemap.ts : sans lui, un NEXT_PUBLIC_SITE_URL terminé par un
// slash produirait des canonicals en `//`.
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://laveiye.com').replace(/\/$/, '')

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  /**
   * Le mot-clé passe devant la marque : personne ne cherche « Laveiye »
   * sans déjà la connaître — 92 des 94 clics du trimestre étaient des
   * requêtes de navigation sur le nom.
   *
   * Pas de `title.template` ici : 18 pages écrivent déjà « … | Laveiye »
   * en dur, un template leur ajouterait un second suffixe.
   */
  title: 'Bibliothèque de campagnes marketing en Afrique | Laveiye',
  description: "Analysez les campagnes publicitaires et social media d'Afrique francophone : filtres par pays, secteur, format, marque. Veille dès 1 000 FCFA/mois.",
  // Les trois PNG ci-dessous portent le visuel du logo — l'artwork historique
  // de `favicon_onglet.png` (8779 x 8779 px, 568 Ko), réduit aux bonnes
  // tailles avec sharp. Le fichier source, lui, ne revient pas.
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
    title: 'Bibliothèque de campagnes marketing en Afrique | Laveiye',
    description: "Analysez les campagnes publicitaires et social media d'Afrique francophone : filtres par pays, secteur, format, marque. Veille dès 1 000 FCFA/mois.",
    url: siteUrl,
    locale: 'fr_FR',
    images: [
      {
        // og-cover.png fait réellement 1200 x 630 — l'ancien /logo.png
        // (379 x 80) déclaré à ces dimensions cassait les cartes de partage.
        url: '/og-cover.png',
        width: 1200,
        height: 630,
        alt: 'Laveiye — la bibliothèque de campagnes marketing d\'Afrique francophone',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bibliothèque de campagnes marketing en Afrique | Laveiye',
    description: "Analysez les campagnes publicitaires et social media d'Afrique francophone : filtres par pays, secteur, format, marque. Veille dès 1 000 FCFA/mois.",
    images: ['/og-cover.png'],
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
        {/* Seul asset réellement affiché parmi les icônes autrefois préchargées
            (navbar + profil). Les 6 autres SVG ne sont rendus par aucun composant
            — les précharger en priorité haute sur chaque page retardait la LCP
            pour rien. */}
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
