import type { Metadata } from "next"

const homePreview = {
  title: "Bibliothèque de campagnes marketing en Afrique | Laveiye",
  description:
    "Analysez les campagnes publicitaires et social media d'Afrique francophone : filtres par pays, secteur, format, marque. Veille dès 1 000 FCFA/mois.",
  imageAlt: "Laveiye — bibliothèque de campagnes marketing africaines",
}

export const homeMetadata: Metadata = {
  title: homePreview.title,
  description: homePreview.description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: homePreview.title,
    description: homePreview.description,
    url: "/",
    type: "website",
    siteName: "Laveiye",
    locale: "fr_FR",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: homePreview.imageAlt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: homePreview.title,
    description: homePreview.description,
    images: [
      {
        url: "/logo.png",
        alt: homePreview.imageAlt,
      },
    ],
  },
}
