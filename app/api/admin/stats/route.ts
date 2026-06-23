import { NextResponse } from "next/server"
import { checkAdmin } from "@/lib/admin-auth"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { safeErrorMessage } from "@/lib/api-errors"

export const dynamic = "force-dynamic"

/** event_names considérés comme "activité réelle" pour le KPI actifs. */
const ACTIVE_EVENTS = [
  "login_success",
  "login", // legacy
  "campaign_viewed",
  "search_performed",
  "filter_used",
  "campaign_saved",
  "brand_viewed",
  "premium_content_clicked",
  "webinar_registration_completed",
]

const ACTIVE_WINDOW_DAYS = 30

/**
 * GET /api/admin/stats
 * KPI du dashboard admin (admin only).
 */
export async function GET() {
  try {
    const admin = await checkAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const supabase = getSupabaseAdmin()
    const since = new Date(Date.now() - ACTIVE_WINDOW_DAYS * 86_400_000).toISOString()

    const planCount = (plan: string) =>
      supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("plan", plan)

    const [
      campaigns,
      brandsRes,
      countriesRes,
      events,
      recentLogins,
      discovery,
      discoveryFr,
      basic,
      pro,
    ] = await Promise.all([
      supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("status", "Publié"),
      supabase.from("campaigns").select("brand").eq("status", "Publié").not("brand", "is", null),
      supabase.from("campaigns").select("country").eq("status", "Publié").not("country", "is", null),
      supabase
        .from("analytics_events")
        .select("user_id")
        .in("event_name", ACTIVE_EVENTS)
        .gte("created_at", since)
        .not("user_id", "is", null),
      supabase
        .from("users")
        .select("id")
        .or(`last_activity_at.gte.${since},last_login_at.gte.${since}`),
      planCount("Discovery"),
      planCount("Découverte"),
      planCount("Basic"),
      planCount("Pro"),
    ])

    // Utilisateurs actifs = union (événements d'action 30j) ∪ (dernière connexion 30j)
    const activeSet = new Set<string>()
    for (const e of events.data ?? []) if (e.user_id) activeSet.add(e.user_id)
    for (const u of recentLogins.data ?? []) activeSet.add(u.id)

    const uniqueBrands = new Set((brandsRes.data ?? []).map((c: any) => c.brand).filter(Boolean)).size
    const uniqueCountries = new Set((countriesRes.data ?? []).map((c: any) => c.country).filter(Boolean)).size

    return NextResponse.json({
      campaigns: campaigns.count ?? 0,
      activeUsers: activeSet.size,
      brands: uniqueBrands,
      countries: uniqueCountries,
      subscribers: {
        decouverte: (discovery.count ?? 0) + (discoveryFr.count ?? 0),
        basic: basic.count ?? 0,
        pro: pro.count ?? 0,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur serveur", details: safeErrorMessage(err) },
      { status: 500 }
    )
  }
}
