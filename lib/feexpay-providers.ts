/**
 * Liste centralisée des opérateurs Mobile Money supportés via FeexPay.
 *
 * On conserve un code interne stable par opérateur (ex. "ORANGE_CIV") pour
 * l'UI, la détection par préfixe et le stockage. `toReseau()` traduit ce code
 * vers la chaîne attendue par l'API FeexPay (ex. "ORANGE CI").
 *
 * Source : SDK officiel FeexPay (@feexpay/react-sdk) — mapping `reseau`.
 *
 * Pays/opérateurs effectivement activés sur notre compte marchand FeexPay.
 * Si vous activez un nouvel opérateur dans le dashboard FeexPay, ajoutez-le
 * ici ET dans FEEXPAY_RESEAU.
 */

export type FeexPayCountryCode =
  | 'CIV' // Côte d'Ivoire
  | 'SEN' // Sénégal
  | 'BFA' // Burkina Faso
  | 'BEN' // Bénin
  | 'TGO' // Togo
  | 'COG' // Congo Brazzaville

export interface FeexPayCountryConfig {
  name: string
  flag: string
  dialCode: string      // sans le +
  localLength: number   // nombre de chiffres après l'indicatif
  mask: number[]        // groupes pour le masque d'affichage
  placeholder: string
  currency: 'XOF' | 'XAF'
}

export const FEEXPAY_COUNTRIES: Record<FeexPayCountryCode, FeexPayCountryConfig> = {
  CIV: { name: "Côte d’Ivoire", flag: "🇨🇮", dialCode: "225", localLength: 10, mask: [2, 2, 2, 2, 2], placeholder: "07 07 12 34 56", currency: 'XOF' },
  SEN: { name: "Sénégal",       flag: "🇸🇳", dialCode: "221", localLength: 9,  mask: [2, 3, 2, 2],    placeholder: "77 123 45 67",    currency: 'XOF' },
  BFA: { name: "Burkina Faso",  flag: "🇧🇫", dialCode: "226", localLength: 8,  mask: [2, 2, 2, 2],    placeholder: "70 12 34 56",     currency: 'XOF' },
  BEN: { name: "Bénin",         flag: "🇧🇯", dialCode: "229", localLength: 10, mask: [2, 2, 2, 2, 2], placeholder: "01 90 12 34 56",  currency: 'XOF' },
  TGO: { name: "Togo",          flag: "🇹🇬", dialCode: "228", localLength: 8,  mask: [2, 2, 2, 2],    placeholder: "90 12 34 56",     currency: 'XOF' },
  COG: { name: "Congo",         flag: "🇨🇬", dialCode: "242", localLength: 9,  mask: [3, 3, 3],       placeholder: "06 123 45 67",    currency: 'XAF' },
}

export interface FeexPayProvider {
  /** Code interne stable (ex. "ORANGE_CIV"). */
  value: string
  /** Libellé affiché dans l'UI. */
  label: string
  /** Code pays interne. */
  country: FeexPayCountryCode
  /** Devise utilisée par ce provider. */
  currency: 'XOF' | 'XAF'
}

/**
 * Map code interne → chaîne `reseau` attendue par l'API FeexPay.
 * Source : @feexpay/react-sdk (objet de mapping réseau).
 */
export const FEEXPAY_RESEAU: Record<string, string> = {
  // Côte d'Ivoire
  MTN_MOMO_CIV: 'MTN CI',
  MOOV_CIV: 'MOOV CI',
  ORANGE_CIV: 'ORANGE CI',
  WAVE_CIV: 'WAVE CI',
  // Sénégal
  ORANGE_SEN: 'ORANGE SN',
  FREE_SEN: 'FREE SN',
  // Burkina Faso
  MOOV_BFA: 'MOOV BF',
  ORANGE_BFA: 'ORANGE BF',
  // Bénin
  MTN_MOMO_BEN: 'MTN',
  MOOV_BEN: 'MOOV',
  CELTIIS_BEN: 'CELTIIS BJ',
  CORIS_BEN: 'CORIS',
  // Togo
  TOGOCOM_TGO: 'TOGOCOM TG',
  MOOV_TGO: 'MOOV TG',
  // Congo Brazzaville
  MTN_COG: 'MTN CG',
}

/** Traduit un code interne vers la chaîne `reseau` FeexPay. */
export function toReseau(value: string): string {
  return FEEXPAY_RESEAU[value] || value
}

/** Liste effective des providers FeexPay activés. */
export const FEEXPAY_PROVIDERS: FeexPayProvider[] = [
  // Côte d'Ivoire (XOF) — Wave supporté par FeexPay.
  { value: 'MTN_MOMO_CIV', label: 'MTN Mobile Money — Côte d’Ivoire', country: 'CIV', currency: 'XOF' },
  { value: 'ORANGE_CIV',   label: 'Orange Money — Côte d’Ivoire',     country: 'CIV', currency: 'XOF' },
  { value: 'MOOV_CIV',     label: 'Moov Money — Côte d’Ivoire',       country: 'CIV', currency: 'XOF' },
  { value: 'WAVE_CIV',     label: 'Wave — Côte d’Ivoire',             country: 'CIV', currency: 'XOF' },

  // Sénégal (XOF)
  { value: 'ORANGE_SEN',   label: 'Orange Money — Sénégal',           country: 'SEN', currency: 'XOF' },
  { value: 'FREE_SEN',     label: 'Free Money — Sénégal',             country: 'SEN', currency: 'XOF' },

  // Burkina Faso (XOF)
  { value: 'ORANGE_BFA',   label: 'Orange Money — Burkina Faso',      country: 'BFA', currency: 'XOF' },
  { value: 'MOOV_BFA',     label: 'Moov Money — Burkina Faso',        country: 'BFA', currency: 'XOF' },

  // Bénin (XOF)
  { value: 'MTN_MOMO_BEN', label: 'MTN Mobile Money — Bénin',         country: 'BEN', currency: 'XOF' },
  { value: 'MOOV_BEN',     label: 'Moov Money — Bénin',               country: 'BEN', currency: 'XOF' },
  { value: 'CELTIIS_BEN',  label: 'Celtiis — Bénin',                  country: 'BEN', currency: 'XOF' },

  // Togo (XOF)
  { value: 'TOGOCOM_TGO',  label: 'TogoCom — Togo',                   country: 'TGO', currency: 'XOF' },
  { value: 'MOOV_TGO',     label: 'Moov Money — Togo',                country: 'TGO', currency: 'XOF' },

  // Congo Brazzaville (XAF)
  { value: 'MTN_COG',      label: 'MTN Mobile Money — Congo',         country: 'COG', currency: 'XAF' },
]

/** Retourne les providers disponibles pour un pays donné. */
export function getProvidersForCountry(country: FeexPayCountryCode): FeexPayProvider[] {
  return FEEXPAY_PROVIDERS.filter((p) => p.country === country)
}

/**
 * Map préfixes locaux → code provider interne.
 *
 * Aide de pré-sélection (la portabilité des numéros la rend non fiable à 100 %).
 * Wave (CI) partage les préfixes des autres opérateurs → sélection manuelle.
 */
const PHONE_PREFIX_MAP: Record<FeexPayCountryCode, Array<[string, string]>> = {
  CIV: [
    ['01', 'MOOV_CIV'],
    ['05', 'MTN_MOMO_CIV'],
    ['07', 'ORANGE_CIV'],
  ],
  SEN: [
    ['77', 'ORANGE_SEN'], ['78', 'ORANGE_SEN'],
    ['76', 'FREE_SEN'],
  ],
  BFA: [
    ['01', 'MOOV_BFA'], ['02', 'MOOV_BFA'], ['03', 'MOOV_BFA'],
    ['50', 'MOOV_BFA'], ['51', 'MOOV_BFA'], ['52', 'MOOV_BFA'],
    ['60', 'MOOV_BFA'], ['61', 'MOOV_BFA'], ['62', 'MOOV_BFA'], ['63', 'MOOV_BFA'],
    ['70', 'MOOV_BFA'], ['71', 'MOOV_BFA'], ['72', 'MOOV_BFA'], ['73', 'MOOV_BFA'],
    ['05', 'ORANGE_BFA'], ['06', 'ORANGE_BFA'], ['07', 'ORANGE_BFA'],
    ['54', 'ORANGE_BFA'], ['55', 'ORANGE_BFA'], ['56', 'ORANGE_BFA'], ['57', 'ORANGE_BFA'],
    ['64', 'ORANGE_BFA'], ['65', 'ORANGE_BFA'], ['66', 'ORANGE_BFA'], ['67', 'ORANGE_BFA'],
    ['74', 'ORANGE_BFA'], ['75', 'ORANGE_BFA'], ['76', 'ORANGE_BFA'], ['77', 'ORANGE_BFA'],
  ],
  BEN: [
    ['42', 'MTN_MOMO_BEN'], ['46', 'MTN_MOMO_BEN'],
    ['50', 'MTN_MOMO_BEN'], ['51', 'MTN_MOMO_BEN'], ['52', 'MTN_MOMO_BEN'], ['53', 'MTN_MOMO_BEN'], ['54', 'MTN_MOMO_BEN'],
    ['56', 'MTN_MOMO_BEN'], ['57', 'MTN_MOMO_BEN'], ['59', 'MTN_MOMO_BEN'],
    ['61', 'MTN_MOMO_BEN'], ['62', 'MTN_MOMO_BEN'],
    ['66', 'MTN_MOMO_BEN'], ['67', 'MTN_MOMO_BEN'], ['69', 'MTN_MOMO_BEN'],
    ['90', 'MTN_MOMO_BEN'], ['91', 'MTN_MOMO_BEN'], ['96', 'MTN_MOMO_BEN'], ['97', 'MTN_MOMO_BEN'],
    ['45', 'MOOV_BEN'], ['55', 'MOOV_BEN'], ['58', 'MOOV_BEN'],
    ['60', 'MOOV_BEN'], ['63', 'MOOV_BEN'], ['64', 'MOOV_BEN'], ['65', 'MOOV_BEN'], ['68', 'MOOV_BEN'],
    ['94', 'MOOV_BEN'], ['95', 'MOOV_BEN'], ['98', 'MOOV_BEN'], ['99', 'MOOV_BEN'],
  ],
  TGO: [
    ['797', 'MOOV_TGO'], ['798', 'MOOV_TGO'], ['799', 'MOOV_TGO'],
    ['96', 'MOOV_TGO'], ['97', 'MOOV_TGO'], ['98', 'MOOV_TGO'], ['99', 'MOOV_TGO'],
    ['90', 'TOGOCOM_TGO'], ['91', 'TOGOCOM_TGO'], ['92', 'TOGOCOM_TGO'], ['93', 'TOGOCOM_TGO'],
  ],
  COG: [
    ['06', 'MTN_COG'], ['05', 'MTN_COG'],
  ],
}

function normalizeDigitsForPrefixLookup(
  digits: string,
  country: FeexPayCountryCode
): string {
  // Depuis le 30/11/2024, le Bénin ajoute "01" devant les anciens numéros.
  return country === 'BEN' && digits.startsWith('01') ? digits.slice(2) : digits
}

/**
 * Détecte le provider interne depuis les premiers chiffres du numéro local.
 *
 * @param localDigits  Numéro local (sans indicatif pays), chiffres uniquement.
 * @param country      Code pays interne.
 * @returns            Code provider (ex. "MTN_MOMO_CIV") ou null si inconnu.
 */
export function detectProviderFromPhone(
  localDigits: string,
  country: FeexPayCountryCode
): string | null {
  const digits = localDigits.replace(/\D/g, '')
  if (digits.length < 2) return null

  const lookupDigits = normalizeDigitsForPrefixLookup(digits, country)
  const entries = PHONE_PREFIX_MAP[country] ?? []

  const match = entries
    .slice()
    .sort(([a], [b]) => b.length - a.length)
    .find(([prefix]) => lookupDigits.startsWith(prefix))

  return match?.[1] ?? null
}
