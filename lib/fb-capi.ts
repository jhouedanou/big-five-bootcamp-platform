import { createHash } from "crypto"
import { getIntegrationValues } from "@/lib/integration-settings"

/**
 * Meta Conversions API (LOT F) — doublage serveur des conversions critiques
 * (CompleteRegistration, InitiateCheckout, Purchase).
 *
 * - Token : FB_CAPI_ACCESS_TOKEN, exclusivement en variable d'environnement.
 *   JAMAIS committé, JAMAIS exposé côté client (import "server-only").
 * - Dédoublonnage : event_id partagé avec le pixel client (fbTrack).
 * - Purchase : déclenché sur confirmation effective du paiement (webhook),
 *   avec value + currency XOF.
 */

/** Pixel par défaut, si rien n'est saisi dans /admin/integrations. */
const DEFAULT_FB_PIXEL_ID = "1889630218258683"

function graphUrl(pixelId: string): string {
  return `https://graph.facebook.com/v21.0/${pixelId}/events`
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

export interface FbCapiEventInput {
  // `Lead` ajouté pour le funnel des études téléchargeables : la soumission du
  // formulaire est une conversion serveur, donc fiable même si le pixel client
  // est bloqué. Cf. brief trackers, niveau 1.
  eventName: "CompleteRegistration" | "InitiateCheckout" | "Purchase" | "Lead"
  /** event_id partagé avec le pixel pour le dédoublonnage. */
  eventId: string
  email?: string | null
  phone?: string | null
  value?: number
  currency?: string
  eventSourceUrl?: string
  clientIp?: string | null
  userAgent?: string | null
  customData?: Record<string, unknown>
}

/**
 * Envoie un événement à la Conversions API. Best-effort : ne lève jamais,
 * retourne { ok } pour log éventuel. No-op si le token n'est pas configuré.
 */
export async function sendFbCapiEvent(input: FbCapiEventInput): Promise<{ ok: boolean; error?: string }> {
  // Jeton et pixel lus depuis /admin/integrations, avec repli sur les variables
  // d'environnement. Faire tourner un jeton compromis ne demande donc plus de
  // déploiement — c'est l'intérêt principal de ce basculement.
  const { meta_capi_token: token, meta_pixel_id: pixelId } = await getIntegrationValues([
    "meta_capi_token",
    "meta_pixel_id",
  ])

  if (!token) {
    // Pas configuré : silencieux (environnements de dev/test).
    return { ok: false, error: "Jeton Conversions API non configuré" }
  }

  const userData: Record<string, unknown> = {}
  if (input.email) {
    userData.em = [sha256(input.email.trim().toLowerCase())]
  }
  if (input.phone) {
    userData.ph = [sha256(input.phone.replace(/\D/g, ""))]
  }
  if (input.clientIp) userData.client_ip_address = input.clientIp
  if (input.userAgent) userData.client_user_agent = input.userAgent

  const customData: Record<string, unknown> = { ...(input.customData ?? {}) }
  if (typeof input.value === "number") customData.value = input.value
  if (input.currency) customData.currency = input.currency

  const body = {
    data: [
      {
        event_name: input.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        action_source: "website",
        event_source_url: input.eventSourceUrl,
        user_data: userData,
        custom_data: Object.keys(customData).length ? customData : undefined,
      },
    ],
  }

  try {
    const url = graphUrl(pixelId || DEFAULT_FB_PIXEL_ID)
    const response = await fetch(`${url}?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error("[fb-capi] send failed:", response.status, text.slice(0, 300))
      return { ok: false, error: `Meta CAPI ${response.status}` }
    }
    return { ok: true }
  } catch (err) {
    console.error("[fb-capi] unexpected error:", err)
    return { ok: false, error: err instanceof Error ? err.message : "unknown" }
  }
}
