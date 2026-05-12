/**
 * Source de vérité des plans d'abonnement.
 *
 * 3 plans officiels :
 *   - Découverte (DB key: "Free") : entrée de gamme payante, accès limité
 *   - Basic                       : indépendants, accès illimité
 *   - Pro                         : pros, tout débloqué + séances expert
 *
 * L'identifiant technique en base reste "Free" pour éviter les problèmes
 * d'encodage (é) et les cascades de refactoring.
 */

export const PLAN_FREE = {
  name: "Découverte",
  tagline: "Pour explorer la plateforme",
  price: 1000,
  annualPrice: 10000,
  clicksPerMonth: 10,
  searchesPerMonth: 5,
  features: {
    library: "preview_scroll" as const,
    filters: "basic" as const,
    campaignsPerMonth: 10,
    favorites: false,
    brandCollection: false,
    weeklyEmail: true,
    brandTracking: false,
    debriefSession: false,
    download: false,
    usageCounter: true,
    multiUsers: 1,
  },
}

export const PLAN_BASIC = {
  name: "Basic",
  tagline: "Pour les indépendants",
  price: 4900,
  annualPrice: 49000,
  clicksPerMonth: Infinity,
  searchesPerMonth: 30,
  features: {
    library: "full" as const,
    filters: "full" as const,
    campaignsPerMonth: Infinity,
    favorites: true,
    brandCollection: true,
    weeklyEmail: true,
    brandTracking: false,
    debriefSession: false,
    download: true,
    usageCounter: true,
    multiUsers: 1,
  },
}

export const PLAN_PRO = {
  name: "Pro",
  tagline: "Pour les créatifs exigeants",
  price: 9900,
  annualPrice: 99000,
  clicksPerMonth: Infinity,
  searchesPerMonth: Infinity,
  features: {
    library: "full" as const,
    filters: "full" as const,
    campaignsPerMonth: Infinity,
    favorites: true,
    brandCollection: true,
    weeklyEmail: true,
    brandTracking: true,
    debriefSession: true,
    download: true,
    usageCounter: true,
    multiUsers: 1,
  },
}

/** Identifiant technique stocké en base. L'accent de "Découverte" reste purement UI. */
export type PlanKey = "Free" | "Basic" | "Pro"

export const PLANS = {
  Free: PLAN_FREE,
  Basic: PLAN_BASIC,
  Pro: PLAN_PRO,
} as const

export function getPlanConfig(plan: string | null | undefined) {
  switch ((plan || "").toLowerCase()) {
    case "pro":
      return PLAN_PRO
    case "basic":
      return PLAN_BASIC
    default:
      return PLAN_FREE
  }
}

export function getPlanDisplayName(plan: string | null | undefined): string {
  return getPlanConfig(plan).name
}

/**
 * Indique si un plan donne accès illimité (Basic ou Pro).
 * Le plan Découverte (DB: "Free") a un accès limité même s'il est payant.
 */
export function isPaidPlan(plan: string | null | undefined): boolean {
  const p = (plan || "").toLowerCase()
  return p === "basic" || p === "pro"
}

/**
 * Indique si un plan donne accès aux campagnes "premium" (réservées Basic+).
 */
export function canAccessPremiumContent(plan: string | null | undefined): boolean {
  const p = (plan || "").toLowerCase()
  return p === "basic" || p === "pro"
}

/** Normalise vers un PlanKey canonique (les anciens noms sont rétro-compatibles). */
export function normalizePlan(plan: string | null | undefined): PlanKey {
  const p = (plan || "").toLowerCase()
  if (p === "pro" || p === "premium" || p === "agency" || p === "enterprise") return "Pro"
  if (p === "basic") return "Basic"
  return "Free"
}
