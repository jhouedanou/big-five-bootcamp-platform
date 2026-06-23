import { NextRequest, NextResponse } from "next/server"
import { checkAdmin } from "@/lib/admin-auth"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { safeErrorMessage } from "@/lib/api-errors"

export const dynamic = "force-dynamic"

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 500

/**
 * GET /api/admin/users/:id/payments
 * Historique des paiements d'un utilisateur (admin only). Chargé à la demande
 * depuis la fiche utilisateur (popup), plus à l'ouverture de la page.
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

    // Les paiements sont liés par email (contrat existant de la table payments).
    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select("email")
      .eq("id", id)
      .maybeSingle()

    if (userError || !userRow?.email) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 })
    }

    const { data, error } = await supabase
      .from("payments")
      .select(
        "id, ref_command, amount, currency, payment_method, status, user_email, item_name, created_at, completed_at"
      )
      .eq("user_email", userRow.email)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json(
        { error: "Erreur chargement paiements", details: safeErrorMessage(error) },
        { status: 500 }
      )
    }

    return NextResponse.json({ payments: data ?? [] })
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur serveur", details: safeErrorMessage(err) },
      { status: 500 }
    )
  }
}
