"use client"

import { CI, SN, BJ, BF, ML, TG, CM, NE } from "country-flag-icons/react/3x2"
import type { ComponentType, SVGAttributes } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/**
 * Métadonnées par pays (codes internes 3 lettres alignés avec COUNTRY_ISO
 * côté serveur). `groups` = découpage du numéro national pour l'affichage,
 * `digits` = nombre total de chiffres attendus.
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

export function getCountryMeta(code: string): CountryMeta {
  return BY_CODE[code] || COUNTRIES[0]
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

interface Props {
  country: string
  onCountryChange: (code: string) => void
  /** Chiffres bruts du numéro national (sans indicatif). */
  phone: string
  onPhoneChange: (digits: string) => void
}

export function CountryPhoneField({ country, onCountryChange, phone, onPhoneChange }: Props) {
  const meta = getCountryMeta(country)
  const complete = phone.length === meta.digits

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-[#0F0F0F]/70">Votre pays</label>
        <Select value={country} onValueChange={(v) => { onCountryChange(v); onPhoneChange("") }}>
          <SelectTrigger className="h-10 w-full bg-white">
            <SelectValue>
              <span className="flex items-center gap-2">
                <meta.Flag className="h-3.5 w-5 rounded-[2px]" />
                <span className="text-sm">{meta.name}</span>
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                <span className="flex items-center gap-2">
                  <c.Flag className="h-3.5 w-5 rounded-[2px]" />
                  <span>{c.name}</span>
                  <span className="text-xs text-[#0F0F0F]/40">{c.dial}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label htmlFor="phone" className="mb-1 block text-xs font-medium text-[#0F0F0F]/70">
          Téléphone (mobile money)
        </label>
        <div className="flex h-10 items-center rounded-lg border border-border bg-white px-3 focus-within:ring-2 focus-within:ring-[#F2B33D]/30">
          <span className="mr-2 flex items-center gap-1.5 border-r border-border pr-2 text-sm text-[#0F0F0F]/60">
            <meta.Flag className="h-3.5 w-5 rounded-[2px]" />
            {meta.dial}
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
            {meta.digits} chiffres attendus ({phone.length}/{meta.digits}).
          </p>
        )}
      </div>
    </div>
  )
}
