/**
 * Quotas selon le plan d'abonnement.
 *
 * Specs produit :
 *   Decouverte (free)  : 3 consultations / jour, 3 recherches par filtre / jour
 *   Basic              : consultations illimitees, 15 recherches par filtre / jour
 *   Pro                : consultations illimitees, recherches illimitees
 */

export const UNLIMITED = Number.POSITIVE_INFINITY

export type PlanTier = 'free' | 'basic' | 'pro'

export interface PlanQuotas {
  tier: PlanTier
  /** Consultations de campagnes par jour (Infinity = illimite). */
  dailyClickLimit: number
  /** Recherches par filtre et par jour (Infinity = illimite). */
  dailySearchPerFilter: number
}

export const QUOTAS: Record<PlanTier, PlanQuotas> = {
  free: { tier: 'free', dailyClickLimit: 3, dailySearchPerFilter: 3 },
  basic: { tier: 'basic', dailyClickLimit: UNLIMITED, dailySearchPerFilter: 15 },
  pro: { tier: 'pro', dailyClickLimit: UNLIMITED, dailySearchPerFilter: UNLIMITED },
}

/**
 * Determine le tier effectif depuis le plan utilisateur et son statut d'abonnement.
 * Un utilisateur avec plan "basic"/"pro" mais subscription_status != "active"
 * est considere comme "free".
 */
export function resolveTier(
  plan?: string | null,
  subscriptionStatus?: string | null
): PlanTier {
  const normalized = (plan || '').toLowerCase()
  const active = subscriptionStatus === 'active'
  if (active && normalized === 'pro') return 'pro'
  if (active && normalized === 'basic') return 'basic'
  return 'free'
}

/** Date du jour au format YYYY-MM-DD, en UTC pour eviter les decalages tz. */
export function todayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Incremente la map JSONB `daily_search_count` pour un filtre donne.
 * Retourne la nouvelle map.
 */
export function bumpSearchCount(
  current: Record<string, number> | null | undefined,
  filterId: string
): Record<string, number> {
  const next = { ...(current || {}) }
  next[filterId] = (next[filterId] || 0) + 1
  return next
}
