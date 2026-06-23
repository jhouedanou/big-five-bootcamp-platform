"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import {
  MAX_SECTORS,
  type Sector,
  type SelectedSector,
} from "@/lib/onboarding"

interface SectorSelectorProps {
  sectors: Sector[]
  selected: SelectedSector[]
  onChange: (next: SelectedSector[]) => void
  /** id du secteur "Autre" (slug=autre) si présent, pour afficher le champ texte */
  otherSectorId: string | null
  /** notifié à chaque sélection d'un nouveau secteur (tracking) */
  onSectorSelected?: (sector: Sector) => void
}

export function SectorSelector({
  sectors,
  selected,
  onChange,
  otherSectorId,
  onSectorSelected,
}: SectorSelectorProps) {
  const [query, setQuery] = useState("")

  const selectedIds = useMemo(
    () => new Set(selected.map((s) => s.sector_id)),
    [selected]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sectors
    return sectors.filter((s) => s.name.toLowerCase().includes(q))
  }, [sectors, query])

  const otherValue =
    selected.find((s) => s.sector_id === otherSectorId)?.sector_other_value ?? ""

  function toggle(sector: Sector) {
    if (selectedIds.has(sector.id)) {
      onChange(selected.filter((s) => s.sector_id !== sector.id))
      return
    }
    if (selected.length >= MAX_SECTORS) {
      // Bloquer la 4e sélection.
      toast.error(`Vous pouvez sélectionner jusqu'à ${MAX_SECTORS} secteurs maximum.`)
      return
    }
    onChange([...selected, { sector_id: sector.id, sector_other_value: null }])
    onSectorSelected?.(sector)
  }

  function setOtherValue(value: string) {
    if (!otherSectorId) return
    onChange(
      selected.map((s) =>
        s.sector_id === otherSectorId ? { ...s, sector_other_value: value } : s
      )
    )
  }

  const showOtherField = otherSectorId ? selectedIds.has(otherSectorId) : false

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-neutral-900">
          Secteurs d'activité <span className="text-[#F2B33D]">*</span>
        </label>
        <span
          className={cn(
            "text-xs font-medium tabular-nums",
            selected.length > 0 ? "text-neutral-900" : "text-neutral-400"
          )}
          aria-live="polite"
        >
          {selected.length} / {MAX_SECTORS} secteurs sélectionnés
        </span>
      </div>

      {/* Recherche */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un secteur…"
          className="pl-9"
          aria-label="Rechercher un secteur"
        />
      </div>

      {/* Chips */}
      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-400">
          Aucun secteur ne correspond à « {query} ».
        </p>
      ) : (
        <div className="max-h-64 overflow-y-auto rounded-lg border border-neutral-200 p-3">
          <div className="flex flex-wrap gap-2">
            {filtered.map((sector) => {
              const isSelected = selectedIds.has(sector.id)
              const disabled = !isSelected && selected.length >= MAX_SECTORS
              return (
                <button
                  key={sector.id}
                  type="button"
                  onClick={() => toggle(sector)}
                  aria-pressed={isSelected}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition-colors",
                    isSelected
                      ? "border-[#F2B33D] bg-[#F2B33D] font-medium text-neutral-900"
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-900",
                    disabled && "cursor-not-allowed opacity-40 hover:border-neutral-200"
                  )}
                >
                  {sector.name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Champ "Autre" secteur */}
      {showOtherField && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-neutral-900">
            Précisez votre secteur
          </label>
          <Input
            value={otherValue ?? ""}
            onChange={(e) => setOtherValue(e.target.value)}
            placeholder="Votre secteur d'activité"
            maxLength={120}
          />
        </div>
      )}
    </div>
  )
}
