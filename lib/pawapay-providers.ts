/**
 * Liste centralisée des opérateurs Mobile Money supportés via PawaPay.
 *
 * ⚠️ Wave **n'est pas pris en charge** par PawaPay. Pour Wave, utilisez
 * la passerelle PayTech (cf. `lib/paytech.ts`).
 *
 * Source : configuration officielle PawaPay (https://docs.pawapay.io)
 * + matrice opérateurs / pays / devises fournie par la direction produit.
 *
 * Pour chaque pays nous listons les opérateurs effectivement activés sur
 * notre compte marchand PawaPay. Si vous activez un nouveau MMO dans le
 * Dashboard PawaPay (Configuration → Active correspondents), ajoutez-le ici.
 */

export type PawaPayCountryCode =
  | 'CIV' // Côte d'Ivoire
  | 'SEN' // Sénégal
  | 'BFA' // Burkina Faso
  | 'BEN' // Bénin
  | 'MLI' // Mali
  | 'TGO' // Togo
  | 'CMR' // Cameroun
  | 'NER' // Niger

export interface PawaPayCountryConfig {
  name: string
  flag: string
  dialCode: string      // sans le +
  localLength: number   // nombre de chiffres après l'indicatif
  mask: number[]        // groupes pour le masque d'affichage
  placeholder: string
  currency: 'XOF' | 'XAF'
}

export const PAWAPAY_COUNTRIES: Record<PawaPayCountryCode, PawaPayCountryConfig> = {
  CIV: { name: "Côte d’Ivoire", flag: "🇨🇮", dialCode: "225", localLength: 10, mask: [2, 2, 2, 2, 2], placeholder: "07 07 12 34 56", currency: 'XOF' },
  SEN: { name: "Sénégal",       flag: "🇸🇳", dialCode: "221", localLength: 9,  mask: [2, 3, 2, 2],    placeholder: "77 123 45 67",    currency: 'XOF' },
  BFA: { name: "Burkina Faso",  flag: "🇧🇫", dialCode: "226", localLength: 8,  mask: [2, 2, 2, 2],    placeholder: "70 12 34 56",     currency: 'XOF' },
  BEN: { name: "Bénin",         flag: "🇧🇯", dialCode: "229", localLength: 10, mask: [2, 2, 2, 2, 2], placeholder: "01 90 12 34 56",  currency: 'XOF' },
  MLI: { name: "Mali",          flag: "🇲🇱", dialCode: "223", localLength: 8,  mask: [2, 2, 2, 2],    placeholder: "70 12 34 56",     currency: 'XOF' },
  TGO: { name: "Togo",          flag: "🇹🇬", dialCode: "228", localLength: 8,  mask: [2, 2, 2, 2],    placeholder: "90 12 34 56",     currency: 'XOF' },
  CMR: { name: "Cameroun",      flag: "🇨🇲", dialCode: "237", localLength: 9,  mask: [3, 3, 3],       placeholder: "6 70 12 34 56",   currency: 'XAF' },
  NER: { name: "Niger",         flag: "🇳🇪", dialCode: "227", localLength: 8,  mask: [2, 2, 2, 2],    placeholder: "90 12 34 56",     currency: 'XOF' },
}

export interface PawaPayProvider {
  /** Code provider PawaPay (ex. "ORANGE_CIV"). */
  value: string
  /** Libellé affiché dans l'UI. */
  label: string
  /** Code pays ISO interne. */
  country: PawaPayCountryCode
  /** Devise utilisée par ce provider. */
  currency: 'XOF' | 'XAF'
}

/**
 * Liste effective des providers PawaPay activés.
 *
 * Wave est **volontairement exclu** : PawaPay ne supporte pas Wave Money
 * (CI/Sénégal). Pour proposer Wave, utiliser PayTech (Sénégal) ou rediriger
 * vers le portail Wave Business.
 */
export const PAWAPAY_PROVIDERS: PawaPayProvider[] = [
  // Côte d'Ivoire (XOF)
  { value: 'MTN_MOMO_CIV', label: 'MTN Mobile Money — Côte d’Ivoire', country: 'CIV', currency: 'XOF' },
  { value: 'ORANGE_CIV',   label: 'Orange Money — Côte d’Ivoire',     country: 'CIV', currency: 'XOF' },
  { value: 'MOOV_CIV',     label: 'Moov Money — Côte d’Ivoire',       country: 'CIV', currency: 'XOF' },

  // Sénégal (XOF) — pas de Wave (non supporté par PawaPay)
  { value: 'ORANGE_SEN',   label: 'Orange Money — Sénégal',           country: 'SEN', currency: 'XOF' },
  { value: 'FREE_SEN',     label: 'Free Money — Sénégal',             country: 'SEN', currency: 'XOF' },

  // Burkina Faso (XOF)
  { value: 'MTN_MOMO_BFA', label: 'MTN Mobile Money — Burkina Faso',  country: 'BFA', currency: 'XOF' },
  { value: 'ORANGE_BFA',   label: 'Orange Money — Burkina Faso',      country: 'BFA', currency: 'XOF' },
  { value: 'MOOV_BFA',     label: 'Moov Money — Burkina Faso',        country: 'BFA', currency: 'XOF' },

  // Bénin (XOF)
  { value: 'MTN_MOMO_BEN', label: 'MTN Mobile Money — Bénin',         country: 'BEN', currency: 'XOF' },
  { value: 'MOOV_BEN',     label: 'Moov Money — Bénin',               country: 'BEN', currency: 'XOF' },

  // Mali (XOF)
  { value: 'ORANGE_MLI',   label: 'Orange Money — Mali',              country: 'MLI', currency: 'XOF' },
  { value: 'MOOV_MLI',     label: 'Moov Money — Mali',                country: 'MLI', currency: 'XOF' },

  // Togo (XOF)
  { value: 'MOOV_TGO',     label: 'Moov Money — Togo',                country: 'TGO', currency: 'XOF' },

  // Cameroun (XAF)
  { value: 'MTN_MOMO_CMR', label: 'MTN Mobile Money — Cameroun',      country: 'CMR', currency: 'XAF' },
  { value: 'ORANGE_CMR',   label: 'Orange Money — Cameroun',          country: 'CMR', currency: 'XAF' },

  // Niger (XOF)
  { value: 'MOOV_NER',     label: 'Moov Money — Niger',               country: 'NER', currency: 'XOF' },
]

/** Retourne les providers disponibles pour un pays donné. */
export function getProvidersForCountry(country: PawaPayCountryCode): PawaPayProvider[] {
  return PAWAPAY_PROVIDERS.filter((p) => p.country === country)
}
