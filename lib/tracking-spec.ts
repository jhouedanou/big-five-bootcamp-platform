import type { DataLayerEvent } from "@/lib/datalayer"

/**
 * Le brief tracking, exprimé en données.
 *
 * Cette table est la référence commune entre trois choses qui doivent rester
 * d'accord : ce que le brief exige, ce que le site émet, et ce que la page
 * /admin/tracking affiche. Un événement ajouté au brief se déclare ici, et la
 * page de suivi le réclame automatiquement.
 */

export type Priority = "P0" | "P1"

/**
 * Où l'événement est observable.
 *
 * - `supabase` : il laisse une trace dans `analytics_events`, donc la page de
 *   suivi peut le compter elle-même.
 * - `datalayer` : il ne part que vers GTM. Le compter en base demanderait de
 *   l'écrire à chaque occurrence — inutilement coûteux pour `page_view`. Sa
 *   vérification se fait dans Tag Assistant ou GA4.
 * - `absent` : le brief le prévoit, le produit n'a pas encore la fonction qui
 *   le déclencherait.
 */
export type Observability = "supabase" | "datalayer" | "absent"

export interface TrackingSpecEntry {
  /** Nom dans le dataLayer — le vocabulaire du brief. */
  event: DataLayerEvent
  priority: Priority
  section: string
  /** Ce qui déclenche l'événement, en français. */
  trigger: string
  /** Paramètres exigés par le brief. */
  params: string[]
  /** Noms internes écrits dans `analytics_events` pour cet événement. */
  sources: string[]
  observability: Observability
  /** Où le point de mesure se trouve dans le code. */
  where: string
  note?: string
}

export const TRACKING_SPEC: TrackingSpecEntry[] = [
  // ------------------------------------------------ §6 acquisition & inscription
  {
    event: "page_view",
    priority: "P0",
    section: "Acquisition",
    trigger: "Affichage initial ou changement de route réellement visible.",
    params: ["page_location", "page_title", "page_type"],
    sources: [],
    observability: "datalayer",
    where: "components/analytics/datalayer-route-tracker.tsx",
    note: "Volontairement non persisté : une ligne par page vue n'apprendrait rien que GA4 ne sache déjà.",
  },
  {
    event: "view_pricing",
    priority: "P1",
    section: "Acquisition",
    trigger: "Affichage de la page ou du bloc tarifs.",
    params: ["source_context"],
    sources: ["view_pricing"],
    observability: "supabase",
    where: "components/analytics/view-pricing.tsx",
  },
  {
    event: "generate_lead",
    priority: "P0",
    section: "Acquisition",
    trigger: "Formulaire guide ou demande de contact envoyé avec succès.",
    params: ["lead_type", "form_id", "guide_id"],
    sources: ["study_form_submitted"],
    observability: "supabase",
    where: "components/etudes/study-lead-modal.tsx",
  },
  {
    event: "guide_download",
    priority: "P0",
    section: "Acquisition",
    trigger: "Accès effectif au fichier ou clic de téléchargement confirmé.",
    params: ["guide_id", "source_context"],
    sources: ["study_download"],
    observability: "supabase",
    where: "app/etudes/telechargement/download-relay.tsx",
    note: "Émis à l'ouverture du lien du mail, pas à l'envoi du formulaire — celui-ci est déjà couvert par generate_lead. Le volume est donc plus bas, et c'est ce que le §9 suppose pour le segment « Lead guide ».",
  },
  {
    event: "sign_up_started",
    priority: "P1",
    section: "Inscription",
    trigger: "Première étape d'inscription réellement commencée.",
    params: ["signup_method"],
    sources: ["sign_up_started"],
    observability: "supabase",
    where: "app/register/page.tsx",
  },
  {
    event: "account_created",
    priority: "P0",
    section: "Inscription",
    trigger: "Compte créé avec succès dans la base.",
    params: ["user_id", "signup_method"],
    sources: ["sign_up"],
    observability: "supabase",
    where: "app/register/page.tsx",
  },
  {
    event: "email_verified",
    priority: "P0",
    section: "Inscription",
    trigger: "Vérification confirmée par le serveur.",
    params: ["user_id"],
    sources: ["email_verified"],
    observability: "supabase",
    where: "app/auth/verified/page.tsx",
    note: "Les deux flux de confirmation (token_hash et PKCE) passent par cet écran. Un lien sans paramètre `type` ne peut pas être reconnu comme une inscription : l'événement n'est alors pas émis.",
  },
  {
    event: "signup_completed",
    priority: "P0",
    section: "Inscription",
    trigger: "Toutes les étapes obligatoires du parcours sont terminées.",
    params: ["user_id", "profile_type"],
    sources: ["onboarding_completed"],
    observability: "supabase",
    where: "app/api/me/onboarding/route.ts",
    note: "Le serveur écrit la fonction déclarée sous son nom métier `job_function` ; la table de renommage de lib/datalayer.ts la présente comme `profile_type`, le nom du brief.",
  },
  {
    event: "login",
    priority: "P1",
    section: "Inscription",
    trigger: "Connexion réussie.",
    params: ["user_id", "method"],
    sources: ["login_success"],
    observability: "supabase",
    where: "app/api/me/login-ping/route.ts",
    note: "La ligne Supabase est écrite par le serveur ; `method` lui est transmis par l'appelant. Seule la connexion par mot de passe est mesurée aujourd'hui.",
  },
  {
    event: "contact_opt_in_updated",
    priority: "P0",
    section: "Inscription",
    trigger: "Le choix email ou WhatsApp est enregistré côté serveur.",
    params: ["channel", "status", "source_context"],
    sources: ["contact_opt_in_updated"],
    observability: "supabase",
    where: "app/register/page.tsx + app/settings/page.tsx + components/etudes/study-lead-modal.tsx",
    note: "Trois points de recueil : la case du formulaire d'étude, celle de l'inscription, et l'interrupteur des paramètres du compte — seul ce dernier produit status: denied, en révocation. Seul canal existant : l'e-mail.",
  },

  // ------------------------------------------------ §7 activation & usage
  {
    event: "search",
    priority: "P0",
    section: "Usage",
    trigger: "Recherche soumise ; jamais à chaque caractère saisi.",
    params: ["search_term", "search_type", "results_count"],
    sources: ["search_performed"],
    observability: "supabase",
    where: "app/dashboard/page.tsx",
  },
  {
    event: "filter_applied",
    priority: "P0",
    section: "Usage",
    trigger: "Un filtre modifie réellement les résultats.",
    params: ["filter_type", "filter_value", "results_count"],
    sources: ["filter_used"],
    observability: "supabase",
    where: "app/dashboard/page.tsx",
  },
  {
    event: "campaign_view",
    priority: "P0",
    section: "Usage",
    trigger: "Ouverture effective d'une fiche campagne.",
    params: ["content_id", "sector", "country"],
    sources: ["campaign_viewed"],
    observability: "supabase",
    where: "app/content/[id]/content-detail-client.tsx",
    note: "Émis une fois la fiche chargée ET la consultation comptée. Mesuré plus tôt, sector et country partaient vides à chaque consultation.",
  },
  {
    event: "favorite_added",
    priority: "P1",
    section: "Usage",
    trigger: "Ajout réussi d'une campagne aux favoris.",
    params: ["content_id"],
    sources: ["campaign_saved"],
    observability: "supabase",
    where: "hooks/use-favorites.ts",
  },
  {
    event: "collection_created",
    priority: "P1",
    section: "Usage",
    trigger: "Création confirmée d'une collection.",
    params: ["collection_id"],
    sources: ["collection_created"],
    observability: "supabase",
    where: "components/collections/add-to-collection-modal.tsx",
  },
  {
    event: "export_used",
    priority: "P1",
    section: "Usage",
    trigger: "Téléchargement ou export réellement lancé.",
    params: ["export_type", "content_count"],
    sources: ["export_used"],
    observability: "supabase",
    where: "components/ui/lightbox.tsx, et cinq autres points de téléchargement",
    note: "Six exports instrumentés, distingués par `export_type` : campaign_visual (visionneuse d'une campagne), payment_receipt (profil), payment_confirmation (page de succès), editorial_calendar (générateur de campagne), studio_image (Studio-Pub), webinar_calendar (.ics d'un webinaire). `content_count` vaut 1 partout, sauf pour le calendrier éditorial où il porte le nombre de publications exportées. Les exports de l'administration (CSV des contacts, erreurs du bulk-editor) sont volontairement hors périmètre : le §7 mesure l'usage produit, pas le back-office.",
  },
  {
    event: "activation_completed",
    priority: "P0",
    section: "Usage",
    trigger: "Première recherche suivie de l'ouverture d'une campagne. Une seule fois par utilisateur.",
    params: ["user_id", "activation_method"],
    sources: ["activation_completed"],
    observability: "supabase",
    where: "app/api/analytics/track/route.ts",
    note: "Constaté par le serveur : lui seul peut garantir le « une seule fois par utilisateur ».",
  },
  {
    event: "plan_limit_reached",
    priority: "P0",
    section: "Usage",
    trigger: "Une limite produit empêche l'action suivante.",
    params: ["limit_type", "limit_value", "current_plan"],
    sources: ["plan_limit_reached"],
    observability: "supabase",
    where: "components/upgrade-popup.tsx + fiche campagne",
  },

  // ------------------------------------------------ Landing de campagne
  // Hors vocabulaire du brief : le §10 autorise l'événement personnalisé
  // « si nécessaire ». Sans eux, on mesure l'arrivée et le lead, jamais ce qui
  // se joue entre les deux — donc jamais pourquoi la landing convertit ou non.
  {
    event: "study_preview_navigated",
    priority: "P1",
    section: "Landing étude",
    trigger: "Le visiteur change de vignette dans l'aperçu de l'étude.",
    params: ["study_slug", "slide_index", "method"],
    sources: ["study_preview_navigated"],
    observability: "supabase",
    where: "app/etudes/[slug]/study-landing-client.tsx",
  },
  {
    event: "study_faq_opened",
    priority: "P1",
    section: "Landing étude",
    trigger: "Ouverture d'une question de la FAQ. Une seule fois par question et par vue.",
    params: ["study_slug", "faq_index", "faq_question"],
    sources: ["study_faq_opened"],
    observability: "supabase",
    where: "app/etudes/[slug]/study-landing-client.tsx",
  },
  {
    event: "study_form_abandoned",
    priority: "P1",
    section: "Landing étude",
    trigger: "La modale du formulaire est fermée sans envoi réussi.",
    params: ["study_slug", "cta", "fields_filled"],
    sources: ["study_form_abandoned"],
    observability: "supabase",
    where: "components/etudes/study-lead-modal.tsx",
    note: "fields_filled est un compte de champs remplis, jamais une valeur saisie.",
  },

  // ------------------------------------------------ §8 paiement & rétention
  {
    event: "begin_checkout",
    priority: "P0",
    section: "Paiement",
    trigger: "Création effective d'une session ou intention de paiement.",
    params: ["plan_name", "value", "currency", "event_id"],
    sources: ["begin_checkout"],
    observability: "supabase",
    where: "app/checkout/CheckoutClient.tsx",
  },
  {
    event: "purchase",
    priority: "P0",
    section: "Paiement",
    trigger: "Paiement confirmé par le prestataire ou le back-end, jamais au clic sur Payer.",
    params: ["transaction_id", "plan_name", "value", "currency", "event_id"],
    sources: ["payment_successful"],
    observability: "supabase",
    where: "app/payment/success/page.tsx",
  },
  {
    event: "payment_failed",
    priority: "P1",
    section: "Paiement",
    trigger: "Échec de paiement confirmé.",
    params: ["payment_provider", "failure_type"],
    sources: ["payment_failed"],
    observability: "supabase",
    where: "app/payment/cancel/page.tsx + création de paiement",
  },
  {
    event: "subscription_renewed",
    priority: "P1",
    section: "Rétention",
    trigger: "Renouvellement confirmé.",
    params: ["transaction_id", "plan_name", "value", "currency"],
    sources: ["subscription_renewed"],
    observability: "supabase",
    where: "app/payment/success/page.tsx",
  },
  {
    event: "subscription_cancelled",
    priority: "P1",
    section: "Rétention",
    trigger: "Annulation confirmée.",
    params: ["plan_name", "cancellation_reason"],
    sources: ["subscription_cancelled"],
    observability: "supabase",
    where: "app/settings/page.tsx",
    note: "Le produit enregistre une demande d'annulation, traitée ensuite par l'admin.",
  },
]

/** Tous les noms internes attendus en base, dédoublonnés. */
export const OBSERVABLE_SOURCES: string[] = Array.from(
  new Set(TRACKING_SPEC.flatMap((e) => e.sources))
)
