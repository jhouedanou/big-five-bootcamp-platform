/**
 * Helpers d'upsell progressif basés sur les seuils d'utilisation des quotas.
 *
 * Objectif : prévenir l'utilisateur AVANT le blocage à 100 % pour transformer
 * la frustration en opportunité de conversion.
 *
 *  0 → 69 %  : safe       (badge neutre, pas de friction)
 * 70 → 89 %  : warn       (badge orange, message doux)
 * 90 → 99 %  : critical   (badge rouge clignotant, CTA proéminent)
 * 100 % +    : blocked    (popup / page bloquée, CTA principal)
 */

import { QUOTAS, UNLIMITED, type PlanTier } from "./quotas"

export type UpsellLevel = "safe" | "warn" | "critical" | "blocked"

export const WARN_THRESHOLD = 0.7
export const CRITICAL_THRESHOLD = 0.9

export interface QuotaUpsellState {
  level: UpsellLevel
  remaining: number
  used: number
  limit: number
  /** Plan d'upsell recommandé (cible). */
  ctaPlan: "basic" | "pro" | null
  /** Texte court adapté au niveau (badge / tooltip). */
  shortMessage: string
  /** Phrase complète d'incitation (popup / bottom sheet). */
  fullMessage: string
  /** Libellé du CTA principal. */
  ctaText: string
  /** Cible du CTA. */
  ctaHref: string
}

const PLAN_LABELS: Record<"basic" | "pro", string> = {
  basic: "Basic",
  pro: "Pro",
}

/**
 * Détermine le palier d'upsell pour un compteur donné.
 *
 * @param used Nombre d'unités consommées.
 * @param limit Limite mensuelle du tier courant. UNLIMITED = pas de calcul.
 * @param tier Tier actuel de l'utilisateur (free/basic/pro).
 * @param kind Type de quota — sert à formuler le message.
 */
export function getQuotaUpsell(
  used: number,
  limit: number,
  tier: PlanTier,
  kind: "clicks" | "searches" | "analyses"
): QuotaUpsellState | null {
  // Pas de quota à dépasser → pas d'upsell.
  if (limit === UNLIMITED || limit <= 0 || tier === "pro") return null

  const safeUsed = Math.max(0, used)
  const remaining = Math.max(0, limit - safeUsed)
  const ratio = safeUsed / limit

  const level: UpsellLevel =
    safeUsed >= limit ? "blocked"
    : ratio >= CRITICAL_THRESHOLD ? "critical"
    : ratio >= WARN_THRESHOLD ? "warn"
    : "safe"

  if (level === "safe") return null

  // Cible d'upsell : Free → Basic, Basic → Pro.
  const ctaPlan: "basic" | "pro" = tier === "free" ? "basic" : "pro"
  const ctaLabel = PLAN_LABELS[ctaPlan]

  const noun =
    kind === "clicks" ? "consultation"
    : kind === "searches" ? "recherche"
    : "analyse"
  const nounPlural = noun + (remaining > 1 ? "s" : "")

  // Détails de l'offre supérieure pour cadrer l'upsell.
  const upsellHint =
    kind === "searches"
      ? tier === "free"
        ? "Basic vous donne 30 recherches/mois, Pro l'illimité."
        : "Pro vous donne des recherches et filtres illimités."
      : kind === "clicks"
        ? tier === "free"
          ? "Basic et Pro débloquent les consultations illimitées."
          : "Pro débloque encore plus de fonctionnalités avancées."
        : tier === "free"
          ? "Basic et Pro débloquent l'analyse stratégique complète."
          : "Pro vous donne accès aux sessions expert et aux analyses approfondies."

  let shortMessage: string
  let fullMessage: string

  if (level === "blocked") {
    shortMessage = `Limite atteinte (${safeUsed}/${limit})`
    fullMessage = `Vous avez atteint votre limite de ${limit} ${noun}${limit > 1 ? "s" : ""} ce mois. ${upsellHint}`
  } else if (level === "critical") {
    shortMessage = remaining === 1
      ? `Plus que 1 ${noun} !`
      : `Plus que ${remaining} ${nounPlural} !`
    fullMessage = `Il vous reste ${remaining} ${nounPlural} ce mois. ${upsellHint}`
  } else {
    // warn
    shortMessage = `${remaining} ${nounPlural} restante${remaining > 1 ? "s" : ""}`
    fullMessage = `Il vous reste ${remaining} ${nounPlural} ce mois. ${upsellHint}`
  }

  return {
    level,
    remaining,
    used: safeUsed,
    limit,
    ctaPlan,
    shortMessage,
    fullMessage,
    ctaText: `Passer en ${ctaLabel}`,
    ctaHref: `/subscribe?plan=${ctaPlan}`,
  }
}

/** Classe Tailwind du badge selon le niveau d'upsell. */
export function quotaBadgeClass(level: UpsellLevel | null | undefined): string {
  switch (level) {
    case "blocked":
      return "bg-red-100 text-red-700 ring-1 ring-red-200"
    case "critical":
      return "bg-red-50 text-red-600 ring-1 ring-red-200 animate-pulse"
    case "warn":
      return "bg-orange-50 text-orange-700 ring-1 ring-orange-200"
    default:
      return "bg-[#F5F5F5] text-[#0F0F0F]"
  }
}

/**
 * Couleur de remplissage (Tailwind bg-*) pour la barre de progression
 * d'un badge quota — synchronisée avec quotaBadgeClass.
 */
export function quotaProgressFillClass(level: UpsellLevel | null | undefined): string {
  switch (level) {
    case "blocked":
      return "bg-red-500"
    case "critical":
      return "bg-red-400"
    case "warn":
      return "bg-orange-400"
    default:
      return "bg-[#10B981]" // vert "safe" — peu d'usage
  }
}

/** Niveau d'upsell calculé à partir d'un used/limit brut (utile hors getQuotaUpsell). */
export function levelFromUsage(used: number, limit: number): UpsellLevel {
  if (limit === UNLIMITED || limit <= 0) return "safe"
  if (used >= limit) return "blocked"
  const r = used / limit
  if (r >= CRITICAL_THRESHOLD) return "critical"
  if (r >= WARN_THRESHOLD) return "warn"
  return "safe"
}

/** Récupère la limite mensuelle d'un quota pour un tier. */
export function getMonthlyLimit(
  tier: PlanTier,
  kind: "clicks" | "searches"
): number {
  const q = QUOTAS[tier]
  return kind === "clicks" ? q.monthlyClickLimit : q.monthlySearchLimit
}
