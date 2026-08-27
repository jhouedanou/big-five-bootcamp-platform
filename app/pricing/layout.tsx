import type { Metadata } from "next"
import type { ReactNode } from "react"
import { PLAN_BASIC, PLAN_DISCOVERY, PLAN_PRO } from "@/lib/pricing"

/**
 * Les trois montants sont visibles dans le snippet : sur une requête
 * tarifaire, le chiffre affiché est ce qui départage deux résultats.
 *
 * Ils sont composés depuis lib/pricing.ts plutôt qu'écrits en dur, sinon la
 * balise se désynchronise silencieusement à la première évolution de tarif
 * — et personne ne relit une meta description.
 */
const fmt = (amount: number) => amount.toLocaleString("fr-FR").replace(/ | /g, " ")

const title = `Tarifs Laveiye — veille créative dès ${fmt(PLAN_DISCOVERY.price)} FCFA/mois`

const description =
  `Trois formules d'accès à la bibliothèque de campagnes africaines : ` +
  `Découverte ${fmt(PLAN_DISCOVERY.price)}, Basic ${fmt(PLAN_BASIC.price)}, ` +
  `Pro ${fmt(PLAN_PRO.price)} FCFA/mois. Deux mois offerts en annuel.`

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title,
    description,
    url: "/pricing",
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

export default function PricingLayout({ children }: { children: ReactNode }) {
  return children
}
