import type { Metadata } from "next"
import { TempsFortsPageClient } from "@/components/temps-forts/temps-forts-page-client"

export const metadata: Metadata = {
  title: "Temps forts - Laveiye",
  description: "Explorez les campagnes marketing liées aux événements clés de l'année.",
}

export default function TempsFortsPage() {
  return <TempsFortsPageClient />
}
