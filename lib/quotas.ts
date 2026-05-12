/**
 * Quotas selon le plan d'abonnement.
 *
 * Specs produit :
 *   Decouverte (Free)  : 10 consultations / mois, 5 recherches ou filtres / mois (compteur partage)
 *   Basic              : consultations illimitees, 30 recherches ou filtres / mois
 *   Pro                : consultations illimitees, recherches illimitees
 */

export const UNLIMITED = Number.POSITIVE_INFINITY

export type PlanTier = 'free' | 'basic' | 'pro'

export interface PlanQuotas {
  tier: PlanTier
  /** Consultations de campagnes par mois (Infinity = illimite). */
  monthlyClickLimit: number
  /** Recherches + filtres partages par mois (Infinity = illimite). */
  monthlySearchLimit: number
}

export const QUOTAS: Record<PlanTier, PlanQuotas> = {
  free:  { tier: 'free',  monthlyClickLimit: 10,        monthlySearchLimit: 5 },
  basic: { tier: 'basic', monthlyClickLimit: UNLIMITED, monthlySearchLimit: 30 },
  pro:   { tier: 'pro',   monthlyClickLimit: UNLIMITED, monthlySearchLimit: UNLIMITED },
}

/**
 * Determine le tier effectif depuis le plan utilisateur et son statut d'abonnement.
 * Un utilisateur avec plan "basic"/"pro" mais subscription_status != "active"
 * est considere comme "free" (Decouverte).
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

/**
 * Cle du mois courant au format YYYY-MM-01 (premier jour du mois, UTC).
 *
 * IMPORTANT : les colonnes `daily_click_reset` et `daily_search_reset` sont
 * de type DATE en PostgreSQL. On ne peut donc PAS y stocker une cle "YYYY-MM"
 * (format invalide pour DATE). On stocke le 1er du mois, ce qui permet de
 * comparer chaque mois comme une cle DATE valide.
 */
export function monthKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 7) + '-01'
}

/**
 * Determine si la valeur stockee (DATE Postgres, retournee comme "YYYY-MM-DD"
 * ou parfois ISO timestamp) correspond au mois courant. Compare uniquement
 * la partie YYYY-MM pour etre robuste aux variations de format.
 */
export function isSameMonth(stored: string | null | undefined, d: Date = new Date()): boolean {
  if (!stored) return false
  const storedMonth = String(stored).slice(0, 7) // YYYY-MM
  const currentMonth = d.toISOString().slice(0, 7) // YYYY-MM
  return storedMonth === currentMonth
}

/**
 * Incremente le compteur partage de recherches/filtres dans le JSONB.
 * Utilise la cle "_shared" pour le compteur mensuel global.
 * Retourne la nouvelle map.
 */
export function bumpSharedCount(
  current: Record<string, number> | null | undefined
): Record<string, number> {
  const next = { ...(current || {}) }
  next['_shared'] = (next['_shared'] || 0) + 1
  return next
}
