'use client'

import { useId } from 'react'
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
  /** Masque de saisie: X = chiffre, espace = séparateur visuel */
  mask?: string
}

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: 'CIV', name: "Côte d'Ivoire", flag: '🇨🇮', dialCode: '225', localLength: 10, mask: 'XX XX XX XX XX' },
  { code: 'SEN', name: 'Sénégal',       flag: '🇸🇳', dialCode: '221', localLength: 9,  mask: 'XX XXX XX XX' },
  { code: 'BEN', name: 'Bénin',         flag: '🇧🇯', dialCode: '229', localLength: 10, mask: 'XX XX XX XX XX' },
  { code: 'CMR', name: 'Cameroun',      flag: '🇨🇲', dialCode: '237', localLength: 9,  mask: 'X XX XX XX XX' },
  { code: 'BFA', name: 'Burkina Faso',  flag: '🇧🇫', dialCode: '226', localLength: 8,  mask: 'XX XX XX XX' },
  { code: 'TGO', name: 'Togo',          flag: '🇹🇬', dialCode: '228', localLength: 8,  mask: 'XX XX XX XX' },
  { code: 'MLI', name: 'Mali',          flag: '🇲🇱', dialCode: '223', localLength: 8,  mask: 'XX XX XX XX' },
  { code: 'FRA', name: 'France',        flag: '🇫🇷', dialCode: '33',  localLength: 9,  mask: 'X XX XX XX XX' },
]

const COUNTRY_BY_CODE: Record<string, PhoneCountry> = Object.fromEntries(
  PHONE_COUNTRIES.map((c) => [c.code, c]),
)

/** Applique le masque sur des chiffres bruts. Ex: "0102030405" + "XX XX XX XX XX" → "01 02 03 04 05" */
function applyMask(digits: string, mask: string): string {
  let di = 0
  let result = ''
  for (let i = 0; i < mask.length && di < digits.length; i++) {
    if (mask[i] === 'X') {
      result += digits[di++]
    } else {
      result += mask[i]
    }
  }
  return result
}

/** Extrait les chiffres bruts d'une valeur masquée. */
function stripMask(masked: string): string {
  return masked.replace(/\D/g, '')
}

/**
 * Détecte un préfixe international dans les chiffres saisis.
 * Retourne `{ country, remaining }` si un préfixe connu est trouvé, sinon `null`.
 *
 * Gère :
 *   - "33612345678"   → FRA, "612345678"
 *   - "0033612345678" → FRA, "612345678" (préfixe "00")
 *   - "225XXXXXXXXX"  → CIV, "XXXXXXXXXX" (si reste correspond à localLength)
 *
 * Trie les dialCodes par longueur décroissante pour éviter de matcher "22" avant "225".
 */
function detectCountryFromDigits(digits: string): { country: string; remaining: string } | null {
  if (digits.length < 4) return null

  // Strip leading "00" (format international alternatif)
  let d = digits
  if (d.startsWith('00')) d = d.slice(2)

  const sorted = [...PHONE_COUNTRIES].sort(
    (a, b) => b.dialCode.length - a.dialCode.length,
  )

  for (const c of sorted) {
    if (!d.startsWith(c.dialCode)) continue
    const remaining = d.slice(c.dialCode.length)
    // Le reste doit ressembler à un numéro local valide :
    //   - longueur attendue (si définie) — accepte aussi des numéros en cours de frappe
    //   - au moins quelques chiffres pour éviter faux positifs
    if (remaining.length === 0) continue
    if (c.localLength != null && remaining.length > c.localLength) continue
    return { country: c.code, remaining }
  }
  return null
}

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
    const digits = stripMask(raw)

    // Auto-détection préfixe international : si l'utilisateur saisit
    // "33XXXXXXXXX" avec +225 sélectionné, on bascule vers +33 et on
    // retire le préfixe automatiquement.
    const detected = detectCountryFromDigits(digits)
    if (detected && detected.country !== country) {
      const detectedCountry = COUNTRY_BY_CODE[detected.country]
      const max = detectedCountry?.localLength ?? 15
      const trimmed = detected.remaining.slice(0, max)
      onChange({
        country: detected.country,
        localDigits: trimmed,
        e164: buildE164(detected.country, trimmed),
      })
      return
    }

    const max = current.localLength ?? 15
    const trimmed = digits.slice(0, max)
    onChange({
      country,
      localDigits: trimmed,
      e164: buildE164(country, trimmed),
    })
  }

  const displayValue = current.mask
    ? applyMask(value.localDigits, current.mask)
    : value.localDigits

  const placeholder = current.mask
    ? current.mask.replace(/X/g, '0')
    : current.localLength
      ? `${current.localLength} chiffres`
      : 'Numéro'

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
        value={displayValue}
        onChange={(e) => handleDigits(e.target.value)}
        placeholder={placeholder}
        className="flex-1 min-w-0 rounded-r-md bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
      />
    </div>
  )
}
