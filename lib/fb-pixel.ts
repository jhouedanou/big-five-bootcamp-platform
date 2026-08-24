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

import { hasMarketingConsent } from "@/lib/consent"

/** Repli si l'identifiant n'a pas été posé par le layout. */
const FALLBACK_FB_PIXEL_ID = "1889630218258683"

declare global {
  interface Window {
    fbq?: (...args: any[]) => void
    _fbq?: unknown
    /** Posé dans le <head> par app/layout.tsx, depuis /admin/integrations. */
    __LAVEIYE_FB_PIXEL_ID__?: string
  }
}

/**
 * Identifiant du pixel réellement utilisé par le navigateur.
 *
 * Il était codé en dur : changer le pixel dans /admin/integrations ne modifiait
 * que la moitié serveur, le navigateur continuait d'envoyer sur l'ancien. Les
 * deux moitiés du couple Pixel/CAPI pouvaient donc pointer sur deux pixels
 * différents, et la déduplication n'avait plus aucune chance de fonctionner.
 */
export function getFbPixelId(): string {
  if (typeof window === "undefined") return FALLBACK_FB_PIXEL_ID
  const fromLayout = window.__LAVEIYE_FB_PIXEL_ID__
  return typeof fromLayout === "string" && fromLayout.trim()
    ? fromLayout.trim()
    : FALLBACK_FB_PIXEL_ID
}

export { hasMarketingConsent }

let pixelLoaded = false
/** Identifiant réellement passé à `fbq('init')`, pour détecter un changement. */
let initializedPixelId: string | null = null

/**
 * Applique l'identifiant lu à l'exécution depuis /admin/integrations.
 *
 * Les pages publiques sont rendues à la construction : sans cet appel, un
 * changement en admin n'aurait d'effet qu'au redéploiement suivant. Si le pixel
 * est déjà initialisé sur un autre identifiant, on l'initialise sur le nouveau —
 * Meta accepte plusieurs `init`, les événements suivants partent alors sur les
 * deux, ce qui vaut mieux que de continuer sur un pixel abandonné.
 */
export function applyRuntimeFbPixelId(pixelId: string): void {
  if (typeof window === "undefined") return
  const next = pixelId.trim()
  if (!next || next === window.__LAVEIYE_FB_PIXEL_ID__) return

  window.__LAVEIYE_FB_PIXEL_ID__ = next

  if (pixelLoaded && initializedPixelId && initializedPixelId !== next) {
    try {
      window.fbq?.("init", next)
      initializedPixelId = next
    } catch {
      // La mesure ne doit jamais casser la page.
    }
  }
}

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

  initializedPixelId = getFbPixelId()
  w.fbq("init", initializedPixelId)
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
    | "Lead"
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
