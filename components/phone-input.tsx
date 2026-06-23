'use client'

import { useId, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import {
  ALL_COUNTRIES,
  COUNTRY_DIAL_CODES,
  normalizeCountrySearch,
} from '@/lib/countries'

/**
 * Indicatif proposé à l'inscription.
 *
 * `code` est une clé interne : ISO Alpha-3 pour les pays « primaires »
 * (CIV, SEN…) — sert au stockage en base et au pré-remplissage côté paiement
 * (cf. `lib/pawapay-providers.ts`) — sinon le code ISO Alpha-2 du pays.
 * `localLength` = nombre attendu de chiffres après l'indicatif. Sert à la
 * validation côté client. `null` = pas de validation de longueur.
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

/**
 * Pays « primaires » : indicatifs prioritaires avec validation de longueur et
 * masque de saisie. Codes internes 3 lettres alignés avec le paiement.
 * Affichés en tête de liste.
 */
const PRIMARY_COUNTRIES: PhoneCountry[] = [
  { code: 'CIV', name: "Côte d'Ivoire", flag: '🇨🇮', dialCode: '225', localLength: 10, mask: 'XX XX XX XX XX', },
  { code: 'SEN', name: 'Sénégal',       flag: '🇸🇳', dialCode: '221', localLength: 9,  mask: 'XX XXX XX XX' },
  { code: 'BEN', name: 'Bénin',         flag: '🇧🇯', dialCode: '229', localLength: 10, mask: 'XX XX XX XX XX' },
  { code: 'CMR', name: 'Cameroun',      flag: '🇨🇲', dialCode: '237', localLength: 9,  mask: 'X XX XX XX XX' },
  { code: 'BFA', name: 'Burkina Faso',  flag: '🇧🇫', dialCode: '226', localLength: 8,  mask: 'XX XX XX XX' },
  { code: 'TGO', name: 'Togo',          flag: '🇹🇬', dialCode: '228', localLength: 8,  mask: 'XX XX XX XX' },
  { code: 'MLI', name: 'Mali',          flag: '🇲🇱', dialCode: '223', localLength: 8,  mask: 'XX XX XX XX' },
  { code: 'FRA', name: 'France',        flag: '🇫🇷', dialCode: '33',  localLength: 9,  mask: 'X XX XX XX XX' },
]

/** ISO Alpha-2 des pays primaires — exclus de la liste « reste du monde ». */
const PRIMARY_ISO2 = new Set(['CI', 'SN', 'BJ', 'CM', 'BF', 'TG', 'ML', 'FR'])

/** Convertit un code ISO Alpha-2 en emoji drapeau (regional indicators). */
function isoToFlag(iso2: string): string {
  return iso2
    .toUpperCase()
    .replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)))
}

/** Tous les autres pays du monde, sans validation de longueur ni masque. */
const REST_COUNTRIES: PhoneCountry[] = ALL_COUNTRIES.filter(
  (c) => !PRIMARY_ISO2.has(c.code) && COUNTRY_DIAL_CODES[c.code],
)
  .map((c) => ({
    code: c.code,
    name: c.name,
    flag: isoToFlag(c.code),
    dialCode: COUNTRY_DIAL_CODES[c.code],
    localLength: null,
  }))
  .sort((a, b) => a.name.localeCompare(b.name, 'fr'))

/** Indicatifs : pays primaires en tête, puis le reste du monde (A→Z). */
export const PHONE_COUNTRIES: PhoneCountry[] = [
  ...PRIMARY_COUNTRIES,
  ...REST_COUNTRIES,
]

/** Filtre par nom (insensible accents/casse) ou par indicatif saisi. */
function filterPhoneCountries(query: string): PhoneCountry[] {
  const q = normalizeCountrySearch(query)
  if (!q) return PHONE_COUNTRIES
  const digits = q.replace(/\D/g, '')
  return PHONE_COUNTRIES.filter(
    (c) =>
      normalizeCountrySearch(c.name).includes(q) ||
      (digits.length > 0 && c.dialCode.includes(digits)),
  )
}

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

  // Détection limitée aux pays primaires (longueur locale connue) : éviter les
  // faux positifs sur ~190 indicatifs où un numéro local commencerait par un
  // préfixe d'un autre pays.
  const sorted = PHONE_COUNTRIES.filter((c) => c.localLength != null).sort(
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

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const results = useMemo(() => filterPhoneCountries(query), [query])

  const handleCountry = (next: string) => {
    onChange({
      country: next,
      localDigits: '',
      e164: buildE164(next, ''),
    })
    setOpen(false)
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
      <Popover
        open={open}
        onOpenChange={(next) => {
          if (disabled) return
          setOpen(next)
          if (next) {
            setQuery('')
            setTimeout(() => searchRef.current?.focus(), 0)
          }
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label="Indicatif pays"
            className="flex w-[130px] h-full items-center justify-between gap-1.5 rounded-r-none border-0 border-r px-3 bg-transparent text-sm outline-none disabled:opacity-50"
          >
            <span className="flex items-center gap-1.5 truncate">
              <span className="text-base leading-none">{current.flag}</span>
              <span>+{current.dialCode}</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un pays ou un indicatif…"
              className="h-7 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              aria-label="Rechercher un pays"
            />
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto p-1">
            {results.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                Aucun pays trouvé pour «&nbsp;{query}&nbsp;»
              </li>
            ) : (
              results.map((c) => {
                const isSelected = c.code === country
                return (
                  <li key={c.code} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onClick={() => handleCountry(c.code)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground',
                        isSelected && 'bg-accent/60 font-medium',
                      )}
                    >
                      <span className="text-base leading-none">{c.flag}</span>
                      <span className="w-12 shrink-0 font-medium">+{c.dialCode}</span>
                      <span className="flex-1 truncate text-muted-foreground">{c.name}</span>
                      {isSelected && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </PopoverContent>
      </Popover>
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
