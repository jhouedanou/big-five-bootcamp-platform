"use client"

import { useState } from "react"
import { CI, SN, BJ, BF, ML, TG, CM, NE } from "country-flag-icons/react/3x2"
import type { ComponentType, SVGAttributes } from "react"
import { AlertCircle } from "lucide-react"
import { CountrySelect } from "@/components/ui/country-select"
import type { Country } from "@/lib/countries"

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

/** Garde uniquement les chiffres et tronque à la longueur du pays. */
export function sanitizePhone(raw: string, code: string): string {
  const meta = getCountryMeta(code)
  return raw.replace(/\D/g, "").slice(0, meta.digits)
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

/** Message affiché quand le pays choisi n'a pas de moyen de paiement configuré. */
export function UnsupportedCountryNotice({ countryName }: { countryName: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        Aucun moyen de paiement n&apos;est encore disponible pour{" "}
        <strong>{countryName}</strong>. Le paiement mobile money est
        actuellement proposé en : Côte d&apos;Ivoire, Sénégal, Bénin, Burkina
        Faso, Mali, Togo, Cameroun et Niger. Contactez-nous à{" "}
        <a href="mailto:support@laveiye.com" className="underline">
          support@laveiye.com
        </a>{" "}
        pour une alternative.
      </p>
    </div>
  )
}

interface Props {
  /** Code interne 3 lettres du pays de paiement ("" si pays non supporté). */
  country: string
  onCountryChange: (code: string) => void
  /** Chiffres bruts du numéro national (sans indicatif). */
  phone: string
  onPhoneChange: (digits: string) => void
}

export function CountryPhoneField({ country, onCountryChange, phone, onPhoneChange }: Props) {
  const supportedMeta = BY_CODE[country] ?? null
  // Nom affiché dans le sélecteur monde : initialisé depuis le code supporté,
  // puis piloté par la sélection utilisateur (peut être un pays non supporté).
  const [selectedName, setSelectedName] = useState<string | null>(
    supportedMeta?.name ?? null
  )

  const complete = supportedMeta ? phone.length === supportedMeta.digits : false

  const handleSelect = (c: Country) => {
    setSelectedName(c.name)
    const meta = getSupportedMetaByIso2(c.code)
    onCountryChange(meta ? meta.code : "")
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
      ) : selectedName ? (
        <UnsupportedCountryNotice countryName={selectedName} />
      ) : null}
    </div>
  )
}
