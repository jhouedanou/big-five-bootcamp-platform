import { NextResponse } from "next/server"
import { z } from "zod"
import { getAuthenticatedUser, getSupabaseAdmin } from "@/lib/supabase-server"
import { safeErrorMessage } from "@/lib/api-errors"
import { GA4_FORWARD_EVENTS, ACTIVITY_EVENTS } from "@/lib/analytics"
import { sendGA4ServerEvent } from "@/lib/ga4-mp"

export const dynamic = "force-dynamic"

const schema = z.object({
  event_name: z.string().trim().min(1).max(80),
  source: z.string().trim().max(40).optional().nullable(),
  page_url: z.string().trim().max(500).optional().nullable(),
  ga_client_id: z.string().trim().max(100).optional().nullable(),
  metadata: z.record(z.string(), z.any()).optional(),
})

/**
 * POST /api/analytics/track
 *
 * Source de vérité Supabase pour les événements + relais GA4 (Measurement
 * Protocol) pour les événements critiques. Best-effort : ne casse jamais l'UX.
 */
export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => null)
    const parsed = schema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 })
    }
    const { event_name, source, metadata } = parsed.data

    // page_url : valeur explicite, sinon Referer.
    const pageUrl = parsed.data.page_url || request.headers.get("referer") || null

    // Vérifie l'utilisateur connecté si disponible (user_id sinon null).
    const user = await getAuthenticatedUser()
    const supabase = getSupabaseAdmin()

    // 1) Source de vérité : Supabase.
    const { error } = await supabase.from("analytics_events").insert({
      user_id: user?.id ?? null,
      event_name,
      source: source || metadata?.source || "web",
      page_url: pageUrl,
      metadata: metadata ?? {},
    })

    if (error) {
      return NextResponse.json(
        { error: "Erreur tracking", details: safeErrorMessage(error) },
        { status: 500 }
      )
    }

    // Maj last_activity_at sur activité réelle (non bloquant).
    if (user && ACTIVITY_EVENTS.includes(event_name)) {
      void supabase
        .from("users")
        .update({ last_activity_at: new Date().toISOString() })
        .eq("id", user.id)
    }

    // 2) Relais GA4 (Measurement Protocol) pour les événements critiques.
    //    Non bloquant : on n'attend pas le résultat et on ignore les échecs.
    if (GA4_FORWARD_EVENTS.includes(event_name)) {
      void sendGA4ServerEvent(
        event_name,
        {
          ...(metadata ?? {}),
          source: source || metadata?.source || "web",
          page_url: pageUrl,
          user_id: user?.id ?? undefined,
        },
        parsed.data.ga_client_id
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    // Le tracking ne doit jamais casser l'expérience.
    return NextResponse.json(
      { error: "Erreur serveur", details: safeErrorMessage(err) },
      { status: 500 }
    )
  }
}
