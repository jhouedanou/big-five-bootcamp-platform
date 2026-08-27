import type { Metadata } from "next"
import type { ReactNode } from "react"

/**
 * Le titre nomme les trois motifs réels de contact plutôt que le mot
 * « Contact » seul : le snippet répond avant le clic, et « ajout de marque »
 * capte une intention que le produit sert déjà via les demandes de marque.
 */
const title = "Contact Laveiye | Démo, accès équipe et ajout de marque"

const description =
  "Une question sur la bibliothèque, un accès pour votre équipe ou l'ajout " +
  "d'une marque à la veille ? Écrivez à l'équipe Laveiye depuis le formulaire."

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title,
    description,
    url: "/contact",
    type: "website",
    siteName: "Laveiye",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
}

export default function ContactLayout({ children }: { children: ReactNode }) {
  return children
}
