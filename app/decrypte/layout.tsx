import type { Metadata } from "next"
import type { ReactNode } from "react"

/**
 * La page est un client component et n'avait aucun layout : elle héritait
 * donc du titre et de la description de la page d'accueil.
 *
 * `/decrypte` est volontairement retiré de la liste noindex
 * (lib/seo/robots-policy.ts) : c'est du contenu public qui porte le cluster
 * « analyse de campagne publicitaire ».
 */
const title = "#BigFiveDécrypte : sessions d'analyse de campagnes | Laveiye"

const description =
  "Chaque mois, une session experte décortique les campagnes marquantes " +
  "d'Afrique francophone. Programme, replays et inscription aux prochaines sessions."

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/decrypte",
  },
  openGraph: {
    title,
    description,
    url: "/decrypte",
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

export default function DecrypteLayout({ children }: { children: ReactNode }) {
  return children
}
