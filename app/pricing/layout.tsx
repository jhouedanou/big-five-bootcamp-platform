import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Tarifs Laveiye | Veille créative et benchmark marketing Afrique",
  description:
    "Comparez les abonnements Laveiye pour accéder à la bibliothèque de campagnes marketing africaines, aux filtres avancés, aux favoris et à la veille concurrentielle.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "Tarifs Laveiye | Veille créative et benchmark marketing Afrique",
    description:
      "Comparez les abonnements Laveiye pour accéder à la bibliothèque de campagnes marketing africaines, aux filtres avancés, aux favoris et à la veille concurrentielle.",
    url: "/pricing",
    type: "website",
  },
}

export default function PricingLayout({ children }: { children: ReactNode }) {
  return children
}
