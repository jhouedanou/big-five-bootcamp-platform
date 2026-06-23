import { NextResponse } from "next/server"
import { getAuthenticatedUser, getSupabaseAdmin } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

/**
 * POST /api/me/login-ping
 * Horodate la dernière connexion (users.last_login_at) et enregistre un
 * événement "login" dans analytics_events (alimente le KPI utilisateurs actifs).
 */
export async function POST() {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const now = new Date().toISOString()

  await Promise.all([
    supabase
      .from("users")
      .update({ last_login_at: now, last_activity_at: now })
      .eq("id", user.id),
    supabase.from("analytics_events").insert({
      user_id: user.id,
      event_name: "login_success",
      source: "web",
      metadata: {},
    }),
  ])

  return NextResponse.json({ success: true })
}
