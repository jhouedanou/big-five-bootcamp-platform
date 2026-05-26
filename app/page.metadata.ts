import type { Metadata } from "next"

const homePreview = {
  title: "Laveiye | Bibliothèque de campagnes marketing africaines",
  description:
    "Accédez à une bibliothèque de campagnes marketing réelles en Afrique. Analysez, benchmarkez et trouvez des inspirations créatives par pays, secteur et marque.",
  imageAlt: "Laveiye - Bibliothèque de campagnes marketing africaines",
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
