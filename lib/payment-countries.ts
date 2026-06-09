/**
 * Pays supportés pour le paiement (checkout).
 *
 * Source de vérité = CHARIOW. Le checkout passe par Chariow (qui relaie Moneroo) :
 * les pays réellement traités end-to-end sont ceux mappés dans `COUNTRY_ISO`
 * (lib/chariow.ts) — c'est aussi l'ensemble validé par /api/checkout/create-payment.
 *
 * On dérive la liste depuis `COUNTRY_ISO` (codes ISO-2) et on mappe en nom FR via
 * `i18n-iso-countries` (locale `fr`). Pour étendre la couverture, ajouter le pays
 * dans `COUNTRY_ISO` : la liste du combobox suit automatiquement.
 */
import countries from "i18n-iso-countries"
import frLocale from "i18n-iso-countries/langs/fr.json"
import { COUNTRY_ISO } from "@/lib/chariow"

countries.registerLocale(frLocale)

export interface PaymentCountry {
  /** Code ISO 3166-1 alpha-2 (ex. "CI"). */
  code: string
  /** Nom français (ex. "Côte d'Ivoire"). */
  name: string
}

/** Codes ISO-2 supportés par Chariow (dérivés de COUNTRY_ISO). */
export const SUPPORTED_ISO2 = new Set(Object.values(COUNTRY_ISO))

/** Nom FR d'un code ISO-2 (repli sur le code si inconnu). */
export function frCountryName(code: string): string {
  return countries.getName(code.toUpperCase(), "fr") || code.toUpperCase()
}

/**
 * Déduplique + valide des codes ISO-2, mappe en {code, name FR}, trié par nom.
 */
export function toPaymentCountries(codes: string[]): PaymentCountry[] {
  const seen = new Set<string>()
  const out: PaymentCountry[] = []
  for (const raw of codes) {
    const code = String(raw || "").toUpperCase().trim()
    if (!/^[A-Z]{2}$/.test(code) || seen.has(code)) continue
    seen.add(code)
    out.push({ code, name: frCountryName(code) })
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, "fr"))
}

/** Liste des pays supportés par Chariow, prête pour le combobox. */
export function chariowPaymentCountries(): PaymentCountry[] {
  return toPaymentCountries(Object.values(COUNTRY_ISO))
}

/** True si le code ISO-2 est un pays supporté au checkout. */
export function isSupportedIso2(code: string): boolean {
  return SUPPORTED_ISO2.has(String(code || "").toUpperCase().trim())
}
