import { AdminWebinarsClient } from "./AdminWebinarsClient"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Webinaires | Admin Laveiye",
  robots: { index: false, follow: false },
}

// Accès admin garanti par app/admin/layout.tsx (client) + checkAdmin() côté API.
export default function AdminWebinarsPage() {
  return <AdminWebinarsClient />
}
