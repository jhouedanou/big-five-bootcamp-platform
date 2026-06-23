import "server-only"

/**
 * GA4 Measurement Protocol (côté serveur).
 *
 * Relaie les événements critiques vers GA4 même sans gtag client (webhooks,
 * routes serveur). Best-effort : ne lève jamais, ne bloque jamais l'appelant.
 *
 * Config (env) :
 *  - GA4_MEASUREMENT_ID  (ex: G-H34KN567Q2) — fallback NEXT_PUBLIC_GA_ID
 *  - GA4_API_SECRET      (créé dans Admin GA4 → Flux de données → MP API secrets)
 */

const MEASUREMENT_ID =
  process.env.GA4_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GA_ID || "G-H34KN567Q2"
const API_SECRET = process.env.GA4_API_SECRET

/** Sanitize les params pour MP : pas de null, valeurs scalaires. */
function sanitizeParams(params: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined) continue
    if (typeof v === "object") {
      out[k] = JSON.stringify(v).slice(0, 100)
    } else {
      out[k] = typeof v === "string" ? v.slice(0, 100) : v
    }
  }
  return out
}

/**
 * Envoie un événement à GA4 via Measurement Protocol.
 * @returns true si envoyé, false si non configuré / échec (jamais throw).
 */
export async function sendGA4ServerEvent(
  eventName: string,
  params: Record<string, any> = {},
  clientId?: string | null
): Promise<boolean> {
  if (!API_SECRET || !MEASUREMENT_ID) return false

  // MP exige un client_id. À défaut, on en dérive un stable depuis l'event
  // (les rapports temps réel restent corrects ; pas de stitching session).
  const client_id = clientId || `server.${Math.abs(hashCode(eventName + Date.now()))}`

  try {
    const res = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(
        MEASUREMENT_ID
      )}&api_secret=${encodeURIComponent(API_SECRET)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id,
          events: [{ name: eventName, params: sanitizeParams(params) }],
        }),
        // Ne pas bloquer : timeout court via AbortSignal.
        signal: AbortSignal.timeout(2500),
      }
    )
    return res.ok
  } catch {
    // Jamais casser l'appelant si GA4 échoue.
    return false
  }
}

function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return h
}
