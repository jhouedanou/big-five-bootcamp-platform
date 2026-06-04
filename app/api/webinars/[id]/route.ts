import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser, getSupabaseAdmin } from "@/lib/supabase-server"
import { getWebinarById, getRegistrationCount } from "@/lib/webinars-server"
import { safeErrorMessage } from "@/lib/api-errors"

export const dynamic = "force-dynamic"

/**
 * GET /api/webinars/:id — détail d'un webinaire publié + méta.
 * Renvoie les champs publics seulement si la session est publiée.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const webinar = await getWebinarById(id)
    if (!webinar || webinar.status !== "published") {
      return NextResponse.json({ error: "Webinaire introuvable" }, { status: 404 })
    }

    const user = await getAuthenticatedUser()
    let isRegistered = false
    if (user) {
      const supabase = getSupabaseAdmin()
      const { data } = await supabase
        .from("webinar_registrations")
        .select("id")
        .eq("user_id", user.id)
        .eq("webinar_id", id)
        .eq("registration_status", "registered")
        .maybeSingle()
      isRegistered = !!data
    }

    const registrations_count = await getRegistrationCount(id)
    return NextResponse.json({ webinar: { ...webinar, registrations_count, is_registered: isRegistered } })
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur serveur", details: safeErrorMessage(err) },
      { status: 500 }
    )
  }
}
