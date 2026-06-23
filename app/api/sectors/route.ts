import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { safeErrorMessage } from "@/lib/api-errors"

export const dynamic = "force-dynamic"

/**
 * GET /api/sectors
 * Liste des secteurs actifs (source de vérité Supabase), triés par display_order.
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from("sectors")
      .select("id, name, slug, display_order")
      .eq("is_active", true)
      .order("display_order", { ascending: true })

    if (error) {
      return NextResponse.json(
        { error: "Impossible de charger les secteurs", details: safeErrorMessage(error) },
        { status: 500 }
      )
    }

    return NextResponse.json({ sectors: data ?? [] })
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur serveur", details: safeErrorMessage(err) },
      { status: 500 }
    )
  }
}
