import { NextResponse } from "next/server"
import { getAuthenticatedUser, getSupabaseAdmin } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

/**
 * POST /api/me/login-ping
 * Horodate la dernière connexion (users.last_login_at) et enregistre un
 * événement "login" dans analytics_events (alimente le KPI utilisateurs actifs).
 */
export async function POST(request: Request) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  // Le brief §6 exige `method` sur `login`. Seul le client sait par quel moyen
  // la connexion s'est faite ; la route l'écrivait avec des métadonnées vides,
  // et le paramètre manquait donc sur toutes les lignes.
  let method = "password"
  try {
    const body = await request.json().catch(() => null)
    if (body && typeof body.method === "string" && body.method.trim()) {
      method = body.method.trim().slice(0, 40)
    }
  } catch {
    // Corps absent (anciens appels) : la connexion par mot de passe reste le
    // seul moyen mesuré aujourd'hui, le repli dit donc la vérité.
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
      metadata: { method },
    }),
  ])

  return NextResponse.json({ success: true })
}
