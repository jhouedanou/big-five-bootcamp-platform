import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Contact Laveiye | Veille créative et campagnes marketing Afrique",
  description:
    "Contactez l'équipe Laveiye pour une question, une démonstration ou une demande de veille concurrentielle marketing en Afrique francophone.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "Contact Laveiye | Veille créative et campagnes marketing Afrique",
    description:
      "Contactez l'équipe Laveiye pour une question, une démonstration ou une demande de veille concurrentielle marketing en Afrique francophone.",
    url: "/contact",
    type: "website",
  },
}

export default function ContactLayout({ children }: { children: ReactNode }) {
  return children
}
