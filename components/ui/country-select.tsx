"use client"

import { useMemo, useRef, useState } from "react"
import { Check, ChevronDown, Search } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { ALL_COUNTRIES, filterCountries, type Country } from "@/lib/countries"

interface CountrySelectProps {
  /** Valeur sélectionnée : nom français du pays (ex: "Côte d'Ivoire"). */
  value: string | null
  onChange: (country: Country) => void
  placeholder?: string
  disabled?: boolean
  id?: string
  className?: string
}

/**
 * Sélecteur de pays partagé (LOT A / QA T04) : liste complète ISO 3166 +
 * barre de recherche à saisie manuelle, insensible aux accents et à la casse.
 * Utilisé au checkout ET à l'onboarding.
 */
export function CountrySelect({
  value,
  onChange,
  placeholder = "Sélectionnez votre pays",
  disabled = false,
  id,
  className,
}: CountrySelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => filterCountries(query), [query])
  const selected = useMemo(
    () => ALL_COUNTRIES.find((c) => c.name === value) ?? null,
    [value]
  )

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setQuery("")
          // Focus la recherche dès l'ouverture (après montage du contenu).
          setTimeout(() => inputRef.current?.focus(), 0)
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            !selected && "text-muted-foreground",
            className
          )}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className="truncate">{selected ? selected.name : placeholder}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] min-w-[260px] p-0"
        align="start"
      >
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un pays…"
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
              const isSelected = selected?.code === c.code
              return (
                <li key={c.code} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(c)
                      setOpen(false)
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                      isSelected && "bg-accent/60 font-medium"
                    )}
                  >
                    <span className="truncate">{c.name}</span>
                    {isSelected && <Check className="h-4 w-4 shrink-0" />}
                  </button>
                </li>
              )
            })
          )}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
