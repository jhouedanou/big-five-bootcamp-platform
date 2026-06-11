/**
 * Helpers de tracking Laveiye.
 *
 * - GA4 : marketing / comportemental (gtag), source secondaire.
 * - Supabase (table analytics_events) : miroir des événements critiques,
 *   source de vérité business.
 *
 * Côté client on déclenche toujours GA4, et pour les événements critiques on
 * relaie aussi vers POST /api/analytics/track qui écrit dans Supabase.
 */

export type AnalyticsEventName =
  | "onboarding_started"
  | "onboarding_completed"
  | "profile_completion_popup_displayed"
  | "profile_completion_popup_completed"
  | "sector_selected"
  | "job_function_selected"
  // Admin — segmentation / tags
  | "admin_users_filtered"
  | "admin_tag_created"
  | "admin_tag_applied"
  | "admin_bulk_tag_applied"
  // Promo — bannière / popup / checkout
  | "promo_banner_viewed"
  | "promo_banner_clicked"
  | "promo_popup_viewed"
  | "promo_popup_closed"
  | "promo_popup_clicked"
  | "checkout_option_selected"
  | "promo_offer_selected"
  | "payment_attempted"
  | "payment_successful"
  | "payment_failed"
  | "subscription_started"
  | "plan_upgraded"
  | "plan_downgraded"
  // Webinaires #BigFiveDécrypte
  | "webinar_block_viewed"
  | "webinar_program_clicked"
  | "webinar_preview_viewed"
  | "webinar_signup_clicked"
  | "webinar_calendar_clicked"
  | "webinar_registration_completed"
  | "webinar_confirmation_email_sent"
  | "webinar_calendar_added"
  // Bibliothèque / contenu
  | "login_success"
  | "campaign_viewed"
  | "brand_viewed"
  | "search_performed"
  | "search_no_result"
  | "filter_used"
  | "campaign_saved"
  | "premium_content_clicked"

/** Événements "activité réelle" (KPI actifs + maj last_activity_at). */
export const ACTIVITY_EVENTS: string[] = [
  "login_success",
  "campaign_viewed",
  "search_performed",
  "filter_used",
  "campaign_saved",
  "brand_viewed",
  "premium_content_clicked",
  "webinar_registration_completed",
  // Actions clés du funnel promo/checkout (QA T54 : clic bannière promo et
  // choix d'offre doivent mettre à jour la dernière activité).
  "promo_banner_clicked",
  "promo_popup_clicked",
  "promo_offer_selected",
  "checkout_option_selected",
]

/**
 * Événements d'activité déjà écrits côté serveur (login-ping, route
 * d'inscription webinaire) : ne PAS les re-persister depuis le client,
 * sinon doublon dans analytics_events.
 */
const SERVER_WRITTEN_EVENTS: string[] = [
  "login_success",
  "webinar_registration_completed",
  "webinar_confirmation_email_sent",
]

/** Sources standardisées (champ `source`). */
export type AnalyticsSource =
  | "header"
  | "popup"
  | "checkout"
  | "dashboard"
  | "external_link"
  | "webinar"
  | "admin"
  | "web"

/**
 * Événements persistés dans Supabase quand déclenchés côté client
 * (trackEvent sans `persist` explicite). Garder court : ces événements ne sont
 * PAS déjà écrits côté serveur, sinon doublon.
 */
export const CRITICAL_EVENTS: AnalyticsEventName[] = [
  "onboarding_completed",
  "profile_completion_popup_completed",
]

/**
 * Événements "réalité business" relayés vers GA4 via Measurement Protocol
 * (côté serveur) lorsqu'ils transitent par POST /api/analytics/track.
 * Permet aux événements critiques de remonter dans GA4 même sans gtag client.
 */
export const GA4_FORWARD_EVENTS: string[] = [
  "onboarding_completed",
  "promo_offer_selected",
  "payment_attempted",
  "payment_successful",
  "payment_failed",
  "subscription_started",
  "plan_upgraded",
  "plan_downgraded",
  "webinar_registration_completed",
]

declare global {
  interface Window {
    gtag?: (...args: any[]) => void
    dataLayer?: any[]
  }
}

/** URL de page courante (pathname + query), pour les métadonnées. */
function currentPageUrl(): string | undefined {
  if (typeof window === "undefined") return undefined
  return window.location.pathname + window.location.search
}

/** Récupère le client_id GA (cookie _ga) pour relayer côté serveur si besoin. */
export function getGaClientId(): string | undefined {
  if (typeof document === "undefined") return undefined
  const m = document.cookie.match(/_ga=GA\d\.\d\.(\d+\.\d+)/)
  return m?.[1]
}

/** Envoie un événement à GA4 si gtag est disponible. */
export function trackGA4(name: AnalyticsEventName, params: Record<string, any> = {}) {
  if (typeof window === "undefined") return
  if (typeof window.gtag === "function") {
    window.gtag("event", name, params)
  } else if (Array.isArray(window.dataLayer)) {
    // Fallback : pousser dans le dataLayer si gtag pas encore prêt.
    window.dataLayer.push({ event: name, ...params })
  }
}

/**
 * Helper front canonique : envoie un événement UI vers GA4.
 * Ajoute automatiquement page_url. N'écrit PAS dans Supabase (événements UI).
 * Ne lève jamais — le tracking ne doit pas casser l'UX.
 */
export function trackClientEvent(name: AnalyticsEventName, params: Record<string, any> = {}) {
  try {
    trackGA4(name, { page_url: currentPageUrl(), ...params })
  } catch {
    /* noop */
  }
}

/** Persiste un événement dans Supabase via l'API (best-effort, non bloquant). */
async function trackSupabase(name: AnalyticsEventName, metadata: Record<string, any> = {}) {
  try {
    await fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_name: name,
        source: metadata.source,
        page_url: currentPageUrl(),
        ga_client_id: getGaClientId(),
        metadata,
      }),
      keepalive: true,
    })
  } catch {
    // Le tracking ne doit jamais casser l'UX.
  }
}

/**
 * Track unifié côté client : GA4 systématiquement (+ page_url), Supabase pour
 * les événements critiques (ou si `persist` est forcé à true).
 */
export function trackEvent(
  name: AnalyticsEventName,
  metadata: Record<string, any> = {},
  persist = false
) {
  trackClientEvent(name, metadata)
  // Les événements d'activité réelle sont persistés dans Supabase pour
  // alimenter last_activity_at, le statut d'activité et le KPI actifs 30j
  // (QA T54/T18/T59) — sauf ceux déjà écrits côté serveur.
  const isClientActivity =
    ACTIVITY_EVENTS.includes(name) && !SERVER_WRITTEN_EVENTS.includes(name)
  if (persist || CRITICAL_EVENTS.includes(name) || isClientActivity) {
    void trackSupabase(name, metadata)
  }
}
