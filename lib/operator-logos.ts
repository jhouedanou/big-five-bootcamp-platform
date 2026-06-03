/**
 * Logos des opérateurs Mobile Money utilisés par PawaPay.
 *
 * Les fichiers sont stockés dans `/public/operators/` (téléchargés une fois
 * via `scripts/download-operator-logos.mjs`), pour éviter tout hotlinking
 * fragile et garantir la disponibilité offline / en CDN Vercel.
 *
 * Clé = code court de l'opérateur (préfixe avant le pays dans PAWAPAY).
 */

export type OperatorBrand = "MTN" | "ORANGE" | "MOOV" | "WAVE" | "FREE"

export const OPERATOR_LOGOS: Record<OperatorBrand, { src: string; alt: string; bg: string }> = {
  MTN:    { src: "/operators/mtn.svg",    alt: "MTN Mobile Money", bg: "#FFCC00" },
  ORANGE: { src: "/operators/orange.svg", alt: "Orange Money",     bg: "#FF7900" },
  MOOV:   { src: "/operators/moov.svg",   alt: "Moov Money",       bg: "#0066B3" },
  WAVE:   { src: "/operators/wave.svg",   alt: "Wave",             bg: "#1DC8F1" },
  FREE:   { src: "/operators/free.svg",   alt: "Free Money",       bg: "#CD0F69" },
}

/**
 * Détermine la marque d'un provider PawaPay (ex. "MTN_MOMO_CIV" → "MTN").
 */
export function getOperatorBrand(providerCode: string): OperatorBrand | null {
  const upper = providerCode.toUpperCase()
  if (upper.startsWith("MTN")) return "MTN"
  if (upper.startsWith("ORANGE")) return "ORANGE"
  if (upper.startsWith("MOOV")) return "MOOV"
  if (upper.startsWith("WAVE")) return "WAVE"
  if (upper.startsWith("FREE")) return "FREE"
  return null
}

/**
 * Renvoie le logo associé à un provider PawaPay, ou null.
 */
export function getOperatorLogo(providerCode: string) {
  const brand = getOperatorBrand(providerCode)
  return brand ? OPERATOR_LOGOS[brand] : null
}
