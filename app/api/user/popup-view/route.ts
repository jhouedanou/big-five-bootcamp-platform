import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getAuthenticatedUser, getSupabaseAdmin } from "@/lib/supabase-server"
import { safeErrorMessage } from "@/lib/api-errors"

export const dynamic = "force-dynamic"

/**
 * GET /api/user/popup-view?type=promo_popup
 * Indique si l'utilisateur a déjà vu ce popup aujourd'hui (UTC).
 */
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ seenToday: false })

  const type = new URL(request.url).searchParams.get("type") || "promo_popup"
  const supabase = getSupabaseAdmin()

  const { data } = await supabase
    .from("user_popup_views")
    .select("last_seen_at")
    .eq("user_id", user.id)
    .eq("popup_type", type)
    .maybeSingle()

  let seenToday = false
  if (data?.last_seen_at) {
    const last = new Date(data.last_seen_at)
    const now = new Date()
    seenToday =
      last.getUTCFullYear() === now.getUTCFullYear() &&
      last.getUTCMonth() === now.getUTCMonth() &&
      last.getUTCDate() === now.getUTCDate()
  }

  return NextResponse.json({ seenToday })
}

const postSchema = z.object({
  popup_type: z.string().trim().min(1).max(60),
})

/**
 * POST /api/user/popup-view
 * Enregistre l'affichage du popup (1×/jour/utilisateur, source de vérité).
 */
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const json = await request.json().catch(() => null)
  const parsed = postSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from("user_popup_views").upsert(
    {
      user_id: user.id,
      popup_type: parsed.data.popup_type,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "user_id,popup_type" }
  )

  if (error) {
    return NextResponse.json(
      { error: "Enregistrement impossible", details: safeErrorMessage(error) },
      { status: 500 }
    )
  }
  return NextResponse.json({ success: true })
}
