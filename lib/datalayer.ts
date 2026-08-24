/**
 * Contrat dataLayer (brief tracking, §5).
 *
 * Le site pousse des ÉVÉNEMENTS MÉTIER stables ; Google Tag Manager les
 * traduit ensuite en balises GA4, Meta ou autre. Le développeur ne crée pas
 * une balise par action : il expose un vocabulaire, GTM décide des
 * destinations.
 *
 * Règles reprises du brief :
 * - noms en snake_case, identiques sur toutes les pages ;
 * - déclenchement APRÈS confirmation de l'action, jamais au simple clic ;
 * - jamais d'e-mail, de téléphone, de nom, de jeton ni de mot de passe —
 *   l'identification Mailchimp et WhatsApp se fait côté serveur ;
 * - `user_id` interne pseudonyme après authentification, jamais l'adresse.
 */

/** Événements métier du brief. P0 en premier. */
export type DataLayerEvent =
  // Acquisition et inscription
  | "page_view"
  | "view_pricing"
  | "generate_lead"
  | "guide_download"
  | "sign_up_started"
  | "account_created"
  | "email_verified"
  | "signup_completed"
  | "login"
  | "contact_opt_in_updated"
  // Activation et usage
  | "search"
  | "filter_applied"
  | "campaign_view"
  | "favorite_added"
  | "collection_created"
  | "export_used"
  | "activation_completed"
  | "plan_limit_reached"
  // Paiement et rétention
  | "begin_checkout"
  | "purchase"
  | "payment_failed"
  | "subscription_renewed"
  | "subscription_cancelled"
  // Événements personnalisés Laveiye. Le brief les autorise explicitement
  // (« Événement personnalisé, si nécessaire ») et ils portent des mesures que
  // l'équipe suit déjà : sans eux, le taux de conversion des bannières et le
  // funnel des études disparaîtraient de GA4 le jour de la bascule GTM.
  | "banner_impression"
  | "banner_click"
  | "study_page_view"
  | "study_form_open"
  | "webinar_registration_completed"

/** Paramètres transversaux du brief (§5). */
export interface DataLayerContext {
  /** Obligatoire pour tout événement dédupliqué Pixel/CAPI. */
  event_id?: string
  /** Identifiant interne pseudonyme, jamais l'e-mail. */
  user_id?: string
  user_stage?: "lead" | "account_created" | "signup_completed" | "activated" | "paid" | "dormant"
  subscription_plan?: string
  source_context?: string
}

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const

/** Clés interdites dans le dataLayer : données personnelles directes. */
const FORBIDDEN_KEYS = new Set([
  "email",
  "e_mail",
  "mail",
  "phone",
  "telephone",
  "tel",
  "name",
  "nom",
  "prenom",
  "password",
  "token",
  "access_token",
])

declare global {
  interface Window {
    dataLayer?: any[]
  }
}

/**
 * `production` ou `staging`, déduit de l'hôte.
 *
 * Le brief demande de séparer les environnements pour que les données de test
 * n'entrent pas dans la propriété de production.
 */
function environment(): "production" | "staging" {
  if (typeof window === "undefined") return "production"
  const host = window.location.hostname
  if (host === "localhost" || host.endsWith(".local") || host.startsWith("127.")) return "staging"
  if (host.endsWith(".vercel.app")) return "staging"
  return "production"
}

/** UTM de la page courante, pour l'attribution du premier contact. */
function currentUtm(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const out: Record<string, string> = {}
  try {
    const params = new URLSearchParams(window.location.search)
    for (const key of UTM_KEYS) {
      const value = params.get(key)
      if (value) out[key] = value
    }
  } catch {
    // URL exotique : l'attribution est un bonus, pas un prérequis.
  }
  return out
}

/**
 * Pousse un événement métier dans le dataLayer.
 *
 * Ne lève jamais et n'exige pas que GTM soit chargé : le tableau existe dès le
 * <head>, le conteneur consomme ce qui s'y trouve à son démarrage.
 */
export function pushDataLayer(
  event: DataLayerEvent,
  params: Record<string, unknown> = {},
  context: DataLayerContext = {}
): void {
  if (typeof window === "undefined") return

  const payload: Record<string, unknown> = {
    event,
    environment: environment(),
    ...currentUtm(),
    ...context,
  }

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    // Garde-fou : une donnée personnelle poussée par erreur partirait dans GA4
    // et chez Meta sans possibilité de rattrapage.
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[dataLayer] paramètre « ${key} » ignoré : donnée personnelle.`)
      }
      continue
    }
    payload[key] = value
  }

  try {
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push(payload)
  } catch {
    // La mesure ne doit jamais casser la page.
  }
}

/**
 * Correspondance entre les noms d'événements historiques du site et le
 * vocabulaire du brief. Le site continue d'appeler `trackEvent` avec ses noms ;
 * le dataLayer, lui, ne parle que la langue du brief.
 *
 * Un nom absent de cette table n'est pas poussé : le dataLayer reste un
 * vocabulaire fermé, sinon GTM se remplit d'événements non spécifiés.
 */
export const LEGACY_EVENT_MAP: Record<string, DataLayerEvent> = {
  study_page_view: "study_page_view",
  study_form_open: "study_form_open",
  study_form_submitted: "generate_lead",
  study_download: "guide_download",
  sign_up: "account_created",
  email_verified: "email_verified",
  onboarding_completed: "signup_completed",
  login_success: "login",
  search_performed: "search",
  filter_used: "filter_applied",
  campaign_viewed: "campaign_view",
  campaign_saved: "favorite_added",
  premium_content_clicked: "plan_limit_reached",
  checkout_option_selected: "begin_checkout",
  payment_successful: "purchase",
  payment_failed: "payment_failed",
  plan_upgraded: "subscription_renewed",
  banner_impression: "banner_impression",
  banner_click: "banner_click",
  webinar_registration_completed: "webinar_registration_completed",
}

/**
 * Événements internes VOLONTAIREMENT absents du dataLayer.
 *
 * Ils restent mesurés dans `analytics_events` (Supabase), qui est la source de
 * vérité des tableaux de bord internes — mais ils ne partent ni dans GA4 ni
 * chez Meta : ce sont des signaux d'interface ou d'administration, sans valeur
 * pour la mesure publicitaire, et le brief demande de garder le vocabulaire du
 * conteneur court et spécifié.
 *
 * Documenté ici pour que la disparition soit un choix lisible et non une
 * surprise au moment de la bascule GTM.
 */
export const NOT_FORWARDED_TO_DATALAYER = [
  "onboarding_started",
  "profile_completion_popup_displayed",
  "sector_selected",
  "job_function_selected",
  "admin_users_filtered",
  "admin_users_exported",
  "admin_tag_created",
  "admin_tag_applied",
  "admin_bulk_tag_applied",
  "promo_banner_viewed",
  "promo_popup_viewed",
  "promo_popup_closed",
  "webinar_block_viewed",
  "webinar_preview_viewed",
  "webinar_calendar_clicked",
  "webinar_confirmation_email_sent",
  "webinar_calendar_added",
  "brand_viewed",
  "search_no_result",
] as const
