import { NextRequest, NextResponse } from "next/server"
import { checkAdmin } from "@/lib/admin-auth"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { safeErrorMessage } from "@/lib/api-errors"

export const dynamic = "force-dynamic"

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

/**
 * GET /api/admin/users/:id/activity
 * Historique des actions importantes d'un utilisateur (QA T55) :
 * connexions, consultations campagnes, inscriptions webinaires, paiements…
 * Source : analytics_events (qui a fait quoi, depuis quelle page).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await checkAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const { id } = await params
    const rawLimit = Number(request.nextUrl.searchParams.get("limit"))
    const limit = Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, MAX_LIMIT)
      : DEFAULT_LIMIT

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from("analytics_events")
      .select("id, event_name, source, page_url, metadata, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json(
        { error: "Erreur chargement activité", details: safeErrorMessage(error) },
        { status: 500 }
      )
    }

    return NextResponse.json({ events: data ?? [] })
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur serveur", details: safeErrorMessage(err) },
      { status: 500 }
    )
  }
}
