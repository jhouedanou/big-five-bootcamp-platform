export const dynamic = "force-dynamic"

import { getBulkEditorCampaigns } from "@/app/actions/bulk-editor"
import { BulkEditorClient } from "./bulk-editor-client"

export default async function BulkEditorPage() {
  const res = await getBulkEditorCampaigns()

  if (!res.success || !res.data) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        Échec du chargement des campagnes : {res.error || "erreur inconnue"}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Éditeur en masse</h1>
        <p className="text-muted-foreground">
          Modifiez images, vidéos et métadonnées de plusieurs campagnes à la fois.
        </p>
      </div>
      <BulkEditorClient campaigns={res.data} />
    </div>
  )
}
