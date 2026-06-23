"use client"

/**
 * Pixel Facebook « Site web Laveiye » (LOT F).
 *
 * - Chargé UNIQUEMENT après consentement RGPD "marketing" (bandeau existant,
 *   cf. components/rgpd-bottom-sheet.tsx — localStorage laveiye-rgpd-consent-v1
 *   + CustomEvent "laveiye:rgpd-consent").
 * - Les événements de conversion critiques (CompleteRegistration,
 *   InitiateCheckout, Purchase) sont doublés côté serveur via la Conversions
 *   API (lib/fb-capi.ts) avec dédoublonnage par event_id partagé.
 */

export const FB_PIXEL_ID = "1889630218258683"

const CONSENT_STORAGE_KEY = "laveiye-rgpd-consent-v1"

declare global {
  interface Window {
    fbq?: (...args: any[]) => void
    _fbq?: unknown
  }
}

/** Consentement marketing accordé ? (lecture du stockage du bandeau RGPD) */
export function hasMarketingConsent(): boolean {
  if (typeof window === "undefined") return false
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY)
    if (!raw) return false
    const payload = JSON.parse(raw) as { marketing?: boolean }
    return payload.marketing === true
  } catch {
    return false
  }
}

let pixelLoaded = false

/** Injecte le script fbevents.js et initialise le pixel. Idempotent. */
export function loadFbPixel(): void {
  if (typeof window === "undefined" || pixelLoaded) return
  pixelLoaded = true

  // Stub officiel Meta (équivalent du snippet <script> fourni par le
  // gestionnaire d'événements), sans PageView automatique global : les
  // PageView sont déclenchés explicitement sur home et pricing (spec LOT F).
  const w = window as any
  if (!w.fbq) {
    const fbq: any = function (...args: any[]) {
      fbq.callMethod ? fbq.callMethod.apply(fbq, args) : fbq.queue.push(args)
    }
    fbq.push = fbq
    fbq.loaded = true
    fbq.version = "2.0"
    fbq.queue = []
    w.fbq = fbq
    w._fbq = fbq

    const script = document.createElement("script")
    script.async = true
    script.src = "https://connect.facebook.net/en_US/fbevents.js"
    document.head.appendChild(script)
  }

  w.fbq("init", FB_PIXEL_ID)
}

/** event_id partagé pixel/CAPI pour le dédoublonnage Meta. */
export function newFbEventId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  }
}

/**
 * Envoie un événement standard au pixel (si consenti + chargé).
 * `eventId` doit être réutilisé côté CAPI pour le dédoublonnage.
 */
export function fbTrack(
  eventName:
    | "PageView"
    | "ViewContent"
    | "Search"
    | "CompleteRegistration"
    | "InitiateCheckout"
    | "Purchase",
  params: Record<string, unknown> = {},
  eventId?: string
): void {
  if (typeof window === "undefined") return
  if (!hasMarketingConsent()) return
  loadFbPixel()
  try {
    window.fbq?.("track", eventName, params, eventId ? { eventID: eventId } : undefined)
  } catch {
    // Le tracking ne doit jamais casser l'UX.
  }
}
