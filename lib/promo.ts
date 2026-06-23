/**
 * Types + helpers partagés de la mécanique promotionnelle Laveiye.
 */

export interface PromoCampaign {
  id: string
  title: string
  start_date: string
  end_date: string
  is_active: boolean
  show_in_banner: boolean
  show_in_popup: boolean
}

export interface PromoOffer {
  id: string
  campaign_id: string
  name: string
  plan_type: "basic" | "pro" | string
  price: number
  currency: string
  duration_months: number
  is_active: boolean
  sort_order: number
}

export interface ActivePromo {
  campaign: PromoCampaign
  offers: PromoOffer[]
}

/** Source de tracking propagée jusqu'au checkout. */
export type PromoSource = "promo_banner" | "promo_popup"

export interface Countdown {
  days: number
  hours: number
  minutes: number
  expired: boolean
}

/** Décompose un délai (ms) en jours / heures / minutes. */
export function computeCountdown(endIso: string, nowMs: number): Countdown {
  const end = new Date(endIso).getTime()
  const diff = end - nowMs
  if (isNaN(end) || diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, expired: true }
  }
  const days = Math.floor(diff / 86_400_000)
  const hours = Math.floor((diff % 86_400_000) / 3_600_000)
  const minutes = Math.floor((diff % 3_600_000) / 60_000)
  return { days, hours, minutes, expired: false }
}

/** "XXj XXh XXmin" */
export function formatCountdown(c: Countdown): string {
  const p = (n: number) => String(n).padStart(2, "0")
  return `${p(c.days)}j ${p(c.hours)}h ${p(c.minutes)}min`
}

/** La campagne est-elle réellement en cours à l'instant `nowMs` ? */
export function promoIsLive(campaign: PromoCampaign | null | undefined, nowMs: number): boolean {
  if (!campaign || !campaign.is_active) return false
  const start = new Date(campaign.start_date).getTime()
  const end = new Date(campaign.end_date).getTime()
  return nowMs >= start && nowMs <= end
}

export const PROMO_TEXT = {
  title: "Offre spéciale Laveiye",
  body: "Prolongez votre accès à tarif réduit : 3 mois Basic ou 2 mois Pro à 10 000 FCFA.",
  countdownPrefix: "Fin de l'offre dans :",
  cta: "Voir les offres",
  later: "Plus tard",
} as const
