import { AudienceManager } from "./AudienceManager"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Segmentation | Admin Laveiye",
  robots: { index: false, follow: false },
}

// L'accès admin est garanti côté client par app/admin/layout.tsx
// et côté serveur par checkAdmin() dans chaque route /api/admin/*.
export default function AdminAudiencePage() {
  return <AudienceManager />
}
