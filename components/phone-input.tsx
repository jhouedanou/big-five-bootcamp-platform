'use client'

import { useId, useMemo, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/**
 * Liste des indicatifs proposés à l'inscription. Étendre ici si besoin.
 *
 * `code` est une clé interne (ISO Alpha-3 quand possible) — sert au stockage
 * en base et au pré-remplissage côté paiement (cf. `lib/pawapay-providers.ts`).
 * `localLength` = nombre attendu de chiffres après l'indicatif. Sert à la
 * validation côté client. Mettre `null` pour ne pas valider la longueur.
 */
export interface PhoneCountry {
  code: string
  name: string
  flag: string
  dialCode: string
  localLength: number | null
}

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: 'CIV', name: "Côte d’Ivoire", flag: '🇨🇮', dialCode: '225', localLength: 10 },
  { code: 'SEN', name: 'Sénégal',       flag: '🇸🇳', dialCode: '221', localLength: 9 },
  { code: 'BEN', name: 'Bénin',         flag: '🇧🇯', dialCode: '229', localLength: 10 },
  { code: 'CMR', name: 'Cameroun',      flag: '🇨🇲', dialCode: '237', localLength: 9 },
  { code: 'BFA', name: 'Burkina Faso',  flag: '🇧🇫', dialCode: '226', localLength: 8 },
  { code: 'TGO', name: 'Togo',          flag: '🇹🇬', dialCode: '228', localLength: 8 },
  { code: 'MLI', name: 'Mali',          flag: '🇲🇱', dialCode: '223', localLength: 8 },
  { code: 'FRA', name: 'France',        flag: '🇫🇷', dialCode: '33',  localLength: 9 },
]

const COUNTRY_BY_CODE: Record<string, PhoneCountry> = Object.fromEntries(
  PHONE_COUNTRIES.map((c) => [c.code, c]),
)

export interface PhoneInputValue {
  /** Code pays interne (ex: "CIV"). */
  country: string
  /** Chiffres locaux uniquement, sans indicatif. */
  localDigits: string
  /** Représentation E.164 (avec `+`). Vide si pas de chiffres. */
  e164: string
}

export function buildE164(country: string, localDigits: string): string {
  const c = COUNTRY_BY_CODE[country]
  const digits = localDigits.replace(/\D/g, '')
  if (!c || !digits) return ''
  return `+${c.dialCode}${digits}`
}

export function isValidPhone(value: PhoneInputValue): boolean {
  const country = COUNTRY_BY_CODE[value.country]
  if (!country) return false
  const digits = value.localDigits.replace(/\D/g, '')
  if (country.localLength == null) return digits.length >= 6
  return digits.length === country.localLength
}

interface Props {
  value: PhoneInputValue
  onChange: (value: PhoneInputValue) => void
  id?: string
  required?: boolean
  disabled?: boolean
  /** Code pays par défaut si `value.country` est vide. Défaut: "CIV". */
  defaultCountry?: string
  className?: string
}

/**
 * Champ téléphone composé : sélecteur d'indicatif (gauche) + saisie locale (droite).
 *
 * Stocke l'état parent via la prop `value` (E.164 + pays + chiffres locaux).
 * Indicatif par défaut : +225 (Côte d'Ivoire), modifiable via `defaultCountry`.
 */
export function PhoneInput({
  value,
  onChange,
  id,
  required,
  disabled,
  defaultCountry = 'CIV',
  className,
}: Props) {
  const reactId = useId()
  const inputId = id ?? `phone-input-${reactId}`
  const country = value.country || defaultCountry
  const current = COUNTRY_BY_CODE[country] ?? COUNTRY_BY_CODE[defaultCountry]

  const handleCountry = (next: string) => {
    onChange({
      country: next,
      localDigits: '',
      e164: buildE164(next, ''),
    })
  }

  const handleDigits = (raw: string) => {
    const digits = raw.replace(/\D/g, '')
    const max = current.localLength ?? 15
    const trimmed = digits.slice(0, max)
    onChange({
      country,
      localDigits: trimmed,
      e164: buildE164(country, trimmed),
    })
  }

  return (
    <div className={`flex h-11 w-full rounded-md border border-input bg-white focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ${className ?? ''}`}>
      <Select value={country} onValueChange={handleCountry} disabled={disabled}>
        <SelectTrigger
          className="w-[130px] h-full rounded-r-none border-0 border-r bg-transparent focus:ring-0 focus:ring-offset-0"
          aria-label="Indicatif pays"
        >
          <SelectValue>
            <span className="flex items-center gap-1.5">
              <span className="text-base leading-none">{current.flag}</span>
              <span className="text-sm">+{current.dialCode}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {PHONE_COUNTRIES.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              <span className="mr-2">{c.flag}</span>
              <span className="font-medium">+{c.dialCode}</span>
              <span className="ml-2 text-xs text-muted-foreground">{c.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <input
        id={inputId}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        required={required}
        disabled={disabled}
        value={value.localDigits}
        onChange={(e) => handleDigits(e.target.value)}
        placeholder={current.localLength ? `${current.localLength} chiffres` : 'Numéro'}
        className="flex-1 min-w-0 rounded-r-md bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
      />
    </div>
  )
}
