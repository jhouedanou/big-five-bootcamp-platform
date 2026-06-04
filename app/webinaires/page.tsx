import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/supabase-server"
import { WebinairesClient } from "./WebinairesClient"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Webinaires #BigFiveDécrypte | Laveiye",
  robots: { index: false, follow: false },
}

/** Page programme webinaires (espace connecté). */
export default async function WebinairesPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>
}) {
  const user = await getAuthenticatedUser()
  const { session } = await searchParams
  if (!user) {
    const target = session ? `/webinaires?session=${encodeURIComponent(session)}` : "/webinaires"
    redirect(`/login?redirect=${encodeURIComponent(target)}`)
  }
  return <WebinairesClient highlightSlug={session} />
}
