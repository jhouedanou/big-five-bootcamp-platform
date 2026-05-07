/**
 * Génération + helpers pour les codes promo du keynote LAVEIYE.
 * Format : LAVEIYE-XXXX (4 caractères alphanumériques sans ambiguïté)
 */

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sans 0/O/1/I/L

/**
 * Configuration de l'offre promo distribuée lors du keynote LAVEIYE :
 * 3 mois d'accès au plan Basic pour 10 000 FCFA TTC
 * (au lieu de 4 900 × 3 = 14 700 FCFA).
 */
export const KEYNOTE_PROMO_OFFER = {
  plan: 'basic' as const,
  planLabel: 'Basic',
  price: 10000,
  originalPrice: 14700,
  durationDays: 90,
  durationLabel: '3 mois',
  billing: 'promo3m' as const,
  prefix: 'LAVEIYE',
  /** Format attendu (regex) : LAVEIYE-XXXX (4 chars dans l'alphabet sans ambiguïté) */
  codeRegex: /^LAVEIYE-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/,
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
