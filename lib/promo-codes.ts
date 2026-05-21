/**
 * Génération + helpers pour les codes promo du keynote LAVEIYE.
 * Format : LAVEIYE-XXXX (4 caractères alphanumériques sans ambiguïté)
 */

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sans 0/O/1/I/L

/**
 * Offre promo LAVEIYE distribuée lors du keynote :
 *
 *   "3 mois Basic offerts" — bonus cumulable avec n'importe quel plan
 *   souscrit (Discovery / Basic / Pro, mensuel ou annuel). Le code n'agit
 *   PAS sur le prix : il ajoute simplement 90 jours d'accès Basic au
 *   parcours de l'utilisateur. La position de la phase Basic dépend du
 *   plan choisi (cf. `computePromoPhases` ci-dessous).
 *
 *   - Discovery + promo  → 3 mois Basic, puis Discovery
 *   - Basic + promo      → durée Basic + 3 mois Basic (phase continue)
 *   - Pro + promo        → Pro, puis 3 mois Basic
 */
export const KEYNOTE_PROMO_OFFER = {
  /** Plan offert en bonus (toujours Basic). */
  bonusPlan: 'Basic' as const,
  bonusPlanLabel: 'Basic',
  /** Durée du bonus en jours. */
  bonusDurationDays: 90,
  bonusDurationLabel: '3 mois',
  /** Libellé court à afficher (profil, reçu, UI). */
  label: '3 mois Basic offerts',
  prefix: 'LAVEIYE',
  /** Format attendu (regex) : LAVEIYE-XXXX (4 chars dans l'alphabet sans ambiguïté) */
  codeRegex: /^LAVEIYE-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/,
}

/** Rang interne d'un plan, pour comparer où placer la phase bonus Basic. */
function promoPlanRank(plan: string): number {
  const p = plan.toLowerCase()
  if (p === 'pro') return 3
  if (p === 'basic') return 2
  if (p === 'discovery') return 1
  return 0
}

export type PromoPhases =
  /** Discovery (rang < Basic) : 3 mois Basic d'abord, puis plan souscrit. */
  | {
      kind: 'before'
      firstPlan: 'Basic'
      firstDurationDays: number
      secondPlan: 'Discovery' | 'Pro'
      secondDurationDays: number
    }
  /** Basic : phase unique continue (Basic) = durée plan + 90 j bonus. */
  | {
      kind: 'merged'
      firstPlan: 'Basic'
      firstDurationDays: number
    }
  /** Pro (rang > Basic) : plan souscrit d'abord, puis 3 mois Basic. */
  | {
      kind: 'after'
      firstPlan: 'Pro'
      firstDurationDays: number
      secondPlan: 'Basic'
      secondDurationDays: number
    }

/**
 * Calcule l'enchaînement des phases d'abonnement quand le code promo
 * LAVEIYE est appliqué sur un plan acheté de durée `planDurationDays`.
 *
 *   planKey         : 'discovery' | 'basic' | 'pro' (canonique côté API)
 *   planDurationDays: 30 (mensuel) ou 365 (annuel)
 */
export function computePromoPhases(
  planKey: string,
  planDurationDays: number
): PromoPhases {
  const bonus = KEYNOTE_PROMO_OFFER.bonusDurationDays
  const rank = promoPlanRank(planKey)
  if (rank === 2) {
    return { kind: 'merged', firstPlan: 'Basic', firstDurationDays: planDurationDays + bonus }
  }
  if (rank > 2) {
    return {
      kind: 'after',
      firstPlan: 'Pro',
      firstDurationDays: planDurationDays,
      secondPlan: 'Basic',
      secondDurationDays: bonus,
    }
  }
  // rank < 2 (Discovery)
  return {
    kind: 'before',
    firstPlan: 'Basic',
    firstDurationDays: bonus,
    secondPlan: 'Discovery',
    secondDurationDays: planDurationDays,
  }
}

/** Normalise un code promo saisi par l'utilisateur (uppercase + trim). */
export function normalizePromoCode(input: string | null | undefined): string {
  return (input || '').trim().toUpperCase()
}

/** Valide le format syntaxique du code (sans vérifier l'existence en base). */
export function isPromoCodeFormatValid(code: string): boolean {
  return KEYNOTE_PROMO_OFFER.codeRegex.test(code)
}

export function generatePromoCode(prefix = KEYNOTE_PROMO_OFFER.prefix): string {
  let code = ''
  // Utilise crypto.getRandomValues si dispo (Node 20+)
  const bytes = new Uint8Array(4)
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 4; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  for (let i = 0; i < 4; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length]
  }
  return `${prefix}-${code}`
}
