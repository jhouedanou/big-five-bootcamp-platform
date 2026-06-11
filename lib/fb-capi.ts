import { createHash } from "crypto"

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

const FB_PIXEL_ID = "1889630218258683"
const GRAPH_URL = `https://graph.facebook.com/v21.0/${FB_PIXEL_ID}/events`

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

export interface FbCapiEventInput {
  eventName: "CompleteRegistration" | "InitiateCheckout" | "Purchase"
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
  const token = process.env.FB_CAPI_ACCESS_TOKEN
  if (!token) {
    // Pas configuré : silencieux (environnements de dev/test).
    return { ok: false, error: "FB_CAPI_ACCESS_TOKEN non configuré" }
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
    const response = await fetch(`${GRAPH_URL}?access_token=${encodeURIComponent(token)}`, {
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
