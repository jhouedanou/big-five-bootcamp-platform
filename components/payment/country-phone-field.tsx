"use client"

import { useState } from "react"
import { CI, SN, BJ, BF, ML, TG, CM, NE } from "country-flag-icons/react/3x2"
import type { ComponentType, SVGAttributes } from "react"
import { AlertCircle } from "lucide-react"
import { CountrySelect } from "@/components/ui/country-select"
import { ALL_COUNTRIES, COUNTRY_DIAL_CODES, type Country } from "@/lib/countries"

/**
 * Métadonnées par pays SUPPORTÉ pour le paiement mobile money (mapping
 * Moneroo). Codes internes 3 lettres alignés avec COUNTRY_ISO côté serveur.
 * `groups` = découpage du numéro national pour l'affichage,
 * `digits` = nombre total de chiffres attendus.
 *
 * LOT A : le sélecteur affiche désormais TOUS les pays du monde (ISO 3166,
 * recherche incluse) ; cette liste ne définit plus que les pays avec un moyen
 * de paiement configuré. Un pays hors liste affiche un message clair au lieu
 * d'un checkout cassé.
 */
export type CountryMeta = {
  code: string // code interne 3 lettres (CIV, SEN, …)
  iso2: string // ISO alpha-2 (CI, SN, …)
  name: string
  dial: string // indicatif international
  digits: number // chiffres du numéro national
  groups: number[] // découpage affichage (somme = digits)
  Flag: ComponentType<SVGAttributes<SVGElement>>
}

export const COUNTRIES: CountryMeta[] = [
  { code: "CIV", iso2: "CI", name: "Côte d'Ivoire", dial: "+225", digits: 10, groups: [2, 2, 2, 2, 2], Flag: CI },
  { code: "SEN", iso2: "SN", name: "Sénégal", dial: "+221", digits: 9, groups: [2, 3, 2, 2], Flag: SN },
  { code: "BEN", iso2: "BJ", name: "Bénin", dial: "+229", digits: 10, groups: [2, 2, 2, 2, 2], Flag: BJ },
  { code: "BFA", iso2: "BF", name: "Burkina Faso", dial: "+226", digits: 8, groups: [2, 2, 2, 2], Flag: BF },
  { code: "MLI", iso2: "ML", name: "Mali", dial: "+223", digits: 8, groups: [2, 2, 2, 2], Flag: ML },
  { code: "TGO", iso2: "TG", name: "Togo", dial: "+228", digits: 8, groups: [2, 2, 2, 2], Flag: TG },
  { code: "CMR", iso2: "CM", name: "Cameroun", dial: "+237", digits: 9, groups: [3, 2, 2, 2], Flag: CM },
  { code: "NER", iso2: "NE", name: "Niger", dial: "+227", digits: 8, groups: [2, 2, 2, 2], Flag: NE },
]

const BY_CODE: Record<string, CountryMeta> = Object.fromEntries(
  COUNTRIES.map((c) => [c.code, c])
)

const SUPPORTED_BY_ISO2: Record<string, CountryMeta> = Object.fromEntries(
  COUNTRIES.map((c) => [c.iso2, c])
)

export function getCountryMeta(code: string): CountryMeta {
  return BY_CODE[code] || COUNTRIES[0]
}

/** Meta paiement d'un pays ISO alpha-2, ou null si non supporté. */
export function getSupportedMetaByIso2(iso2: string): CountryMeta | null {
  return SUPPORTED_BY_ISO2[iso2] ?? null
}

/** Longueur libre (E.164) pour les pays sans mapping mobile money dédié. */
const GENERIC_MIN_DIGITS = 6
const GENERIC_MAX_DIGITS = 15

/** Le code est-il un pays "générique" (ISO alpha-2, hors mapping mobile money) ? */
function isGenericCountry(code: string): boolean {
  return /^[A-Z]{2}$/.test(code) && !BY_CODE[code]
}

/** Garde uniquement les chiffres et tronque à la longueur du pays. */
export function sanitizePhone(raw: string, code: string): string {
  const digits = raw.replace(/\D/g, "")
  if (isGenericCountry(code)) return digits.slice(0, GENERIC_MAX_DIGITS)
  const meta = getCountryMeta(code)
  return digits.slice(0, meta.digits)
}

/**
 * Valide le numéro national selon le pays : longueur exacte pour les pays
 * mobile money, longueur libre 6–15 chiffres (E.164) pour les autres.
 */
export function phoneDigitsValid(code: string, digits: string): boolean {
  const clean = digits.replace(/\D/g, "")
  if (BY_CODE[code]) return clean.length === BY_CODE[code].digits
  if (isGenericCountry(code)) {
    return clean.length >= GENERIC_MIN_DIGITS && clean.length <= GENERIC_MAX_DIGITS
  }
  return false
}

/** Message d'erreur de validation téléphone adapté au pays. */
export function phoneErrorMessage(code: string): string {
  const meta = BY_CODE[code]
  if (meta) return `Numéro invalide : ${meta.digits} chiffres attendus.`
  return `Numéro invalide : ${GENERIC_MIN_DIGITS} à ${GENERIC_MAX_DIGITS} chiffres attendus.`
}

/** Formate un numéro de chiffres bruts selon le découpage du pays. */
function formatPhone(digits: string, code: string): string {
  const meta = getCountryMeta(code)
  const out: string[] = []
  let i = 0
  for (const g of meta.groups) {
    if (i >= digits.length) break
    out.push(digits.slice(i, i + g))
    i += g
  }
  return out.join(" ")
}

/** Placeholder type pour le pays (ex. "07 07 07 07 07"). */
function placeholderFor(code: string): string {
  const meta = getCountryMeta(code)
  return meta.groups.map((g) => "0".repeat(g)).join(" ")
}

interface Props {
  /**
   * Code du pays de paiement : code interne 3 lettres (CIV, SEN, …) pour les
   * pays mobile money, ISO alpha-2 pour le reste du monde, "" si non choisi.
   */
  country: string
  onCountryChange: (code: string) => void
  /** Chiffres bruts du numéro national (sans indicatif). */
  phone: string
  onPhoneChange: (digits: string) => void
}

export function CountryPhoneField({ country, onCountryChange, phone, onPhoneChange }: Props) {
  const supportedMeta = BY_CODE[country] ?? null
  const genericCountry = !supportedMeta && /^[A-Z]{2}$/.test(country)
    ? ALL_COUNTRIES.find((c) => c.code === country) ?? null
    : null
  // Nom affiché dans le sélecteur monde : initialisé depuis le code reçu,
  // puis piloté par la sélection utilisateur.
  const [selectedName, setSelectedName] = useState<string | null>(
    supportedMeta?.name ?? genericCountry?.name ?? null
  )

  const complete = phoneDigitsValid(country, phone)
  const genericDial = genericCountry ? COUNTRY_DIAL_CODES[genericCountry.code] : undefined

  const handleSelect = (c: Country) => {
    setSelectedName(c.name)
    const meta = getSupportedMetaByIso2(c.code)
    // Pays mobile money → code interne 3 lettres ; sinon ISO alpha-2.
    // Tous les pays peuvent payer (Moneroo gère carte bancaire & co).
    onCountryChange(meta ? meta.code : c.code)
    onPhoneChange("")
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-[#0F0F0F]/70">Votre pays</label>
        <CountrySelect value={selectedName} onChange={handleSelect} />
      </div>

      {supportedMeta ? (
        <div>
          <label htmlFor="phone" className="mb-1 block text-xs font-medium text-[#0F0F0F]/70">
            Téléphone (mobile money)
          </label>
          <div className="flex h-10 items-center rounded-lg border border-border bg-white px-3 focus-within:ring-2 focus-within:ring-[#F2B33D]/30">
            <span className="mr-2 flex items-center gap-1.5 border-r border-border pr-2 text-sm text-[#0F0F0F]/60">
              <supportedMeta.Flag className="h-3.5 w-5 rounded-[2px]" />
              {supportedMeta.dial}
            </span>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={formatPhone(phone, country)}
              onChange={(e) => onPhoneChange(sanitizePhone(e.target.value, country))}
              placeholder={placeholderFor(country)}
              className="h-full w-full bg-transparent text-sm text-[#0F0F0F] outline-none"
            />
          </div>
          {phone.length > 0 && !complete && (
            <p className="mt-1 text-[11px] text-[#E11D48]">
              {supportedMeta.digits} chiffres attendus ({phone.length}/{supportedMeta.digits}).
            </p>
          )}
        </div>
      ) : genericCountry ? (
        <div>
          <label htmlFor="phone" className="mb-1 block text-xs font-medium text-[#0F0F0F]/70">
            Téléphone
          </label>
          <div className="flex h-10 items-center rounded-lg border border-border bg-white px-3 focus-within:ring-2 focus-within:ring-[#F2B33D]/30">
            {genericDial && (
              <span className="mr-2 border-r border-border pr-2 text-sm text-[#0F0F0F]/60">
                +{genericDial}
              </span>
            )}
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={phone}
              onChange={(e) => onPhoneChange(sanitizePhone(e.target.value, country))}
              placeholder="Numéro sans indicatif"
              className="h-full w-full bg-transparent text-sm text-[#0F0F0F] outline-none"
            />
          </div>
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-border bg-[#F5F5F5] p-2.5 text-[11px] text-[#0F0F0F]/70">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>
              Le paiement mobile money n&apos;est pas disponible pour{" "}
              <strong>{genericCountry.name}</strong> — vous pourrez régler par
              carte bancaire sur la page de paiement.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
