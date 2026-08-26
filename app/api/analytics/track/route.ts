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
 * Constate — au plus une fois par utilisateur — l'atteinte de la première
 * valeur produit (brief §7 : `activation_completed`).
 *
 * Définition du brief : « première recherche suivie de l'ouverture d'une
 * campagne ; déclenché une seule fois par utilisateur ». Le « une seule fois »
 * ne peut pas être garanti par le navigateur : un autre appareil, un autre
 * profil, un stockage vidé et l'événement repartirait. C'est donc le serveur
 * qui tranche, sur la trace déjà présente dans `analytics_events`.
 *
 * Renvoie `true` uniquement quand il vient de l'inscrire : l'appelant sait
 * alors qu'il doit relayer l'événement vers le dataLayer.
 */
async function markActivationIfEarned(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string
): Promise<boolean> {
  try {
    // Déjà activé ? C'est le cas le plus fréquent après quelques jours : on
    // sort sur une seule lecture.
    const { data: already } = await supabase
      .from("analytics_events")
      .select("id")
      .eq("user_id", userId)
      .eq("event_name", "activation_completed")
      .limit(1)
    if (already && already.length > 0) return false

    // Une recherche antérieure est la condition d'entrée. L'ouverture de
    // campagne qui déclenche cet appel est déjà, elle, en base.
    const { data: searched } = await supabase
      .from("analytics_events")
      .select("id")
      .eq("user_id", userId)
      .eq("event_name", "search_performed")
      .limit(1)
    if (!searched || searched.length === 0) return false

    const { error } = await supabase.from("analytics_events").insert({
      user_id: userId,
      event_name: "activation_completed",
      source: "web",
      metadata: { activation_method: "search_then_campaign" },
    })
    return !error
  } catch {
    // L'activation est une mesure : elle ne doit jamais faire échouer l'appel.
    return false
  }
}

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

    // 3) Première valeur produit : une recherche, puis l'ouverture d'une
    //    campagne. C'est cette seconde étape qui la scelle.
    let activationCompleted = false
    if (user && event_name === "campaign_viewed") {
      // Pas de relais Measurement Protocol ici : le navigateur pousse
      // l'événement dans le dataLayer à la lecture de cette réponse, avec le
      // vrai client_id. L'envoyer aussi depuis le serveur le compterait deux
      // fois — GA4, contrairement à Meta, ne dédoublonne pas.
      activationCompleted = await markActivationIfEarned(supabase, user.id)
    }

    return NextResponse.json({
      success: true,
      ...(activationCompleted
        ? { activation_completed: true, activation_method: "search_then_campaign" }
        : {}),
    })
  } catch (err) {
    // Le tracking ne doit jamais casser l'expérience.
    return NextResponse.json(
      { error: "Erreur serveur", details: safeErrorMessage(err) },
      { status: 500 }
    )
  }
}
