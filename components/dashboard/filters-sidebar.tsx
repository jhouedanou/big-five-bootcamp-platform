"use client"

import React from "react"

import { useState } from "react"
import { ChevronDown, ChevronUp, X, Facebook, Instagram, Linkedin, Youtube, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CountryFlag } from "@/components/ui/country-flag"

interface FilterGroup {
  name: string
  options: string[]
  hasIcons?: boolean
  locked?: boolean
}

const platformIcons: Record<string, React.ReactNode> = {
  "Facebook": <Facebook className="h-4 w-4" />,
  "Instagram": <Instagram className="h-4 w-4" />,
  "LinkedIn": <Linkedin className="h-4 w-4" />,
  "YouTube": <Youtube className="h-4 w-4" />,
}

// Interface pour les options dynamiques
export interface DynamicFilterOptions {
  countries?: string[]
  sectors?: string[]
  formats?: string[]
  platforms?: string[]
  tags?: string[]
  years?: number[]
  axes?: string[]
}

interface FiltersSidebarProps {
  selectedFilters: Record<string, string[]>
  onFilterChange: (filters: Record<string, string[]>) => void
  className?: string
  dynamicOptions?: DynamicFilterOptions
  isFreeUser?: boolean
  onLockedFilterClick?: () => void
}

// Filtres verrouillés pour le plan gratuit
const LOCKED_FILTER_NAMES = ["Pays", "Secteur", "Tags"]

export function FiltersSidebar({
  selectedFilters,
  onFilterChange,
  className,
  dynamicOptions,
  isFreeUser = false,
  onLockedFilterClick,
}: FiltersSidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["Pays", "Secteur", "Plateforme", "Tags"])

  // Construire les groupes de filtres 100% dynamiquement depuis les campagnes
  // Ordre: Secteur, Axe, Pays, Tags, Format, Plateforme, Année
  const filterGroups: FilterGroup[] = [
    {
      name: "Secteur",
      options: dynamicOptions?.sectors?.length
        ? [...dynamicOptions.sectors].sort()
        : [],
      locked: isFreeUser,
    },
    {
      name: "Axe créatif",
      options: dynamicOptions?.axes?.length
        ? [...dynamicOptions.axes].sort()
        : [],
    },
    {
      name: "Pays",
      options: dynamicOptions?.countries?.length
        ? [...dynamicOptions.countries].sort()
        : [],
      locked: isFreeUser,
    },
    {
      name: "Tags",
      options: dynamicOptions?.tags?.length
        ? [...dynamicOptions.tags].sort()
        : [],
      locked: isFreeUser,
    },
    {
      name: "Format",
      options: dynamicOptions?.formats?.length
        ? [...dynamicOptions.formats].sort()
        : [],
    },
    {
      name: "Plateforme",
      options: dynamicOptions?.platforms?.length
        ? [...dynamicOptions.platforms].sort()
        : [],
      hasIcons: true,
    },
    {
      name: "Année",
      options: dynamicOptions?.years?.length
        ? dynamicOptions.years.sort((a, b) => b - a).map(String)
        : [],
    },
  // Filtrer les groupes sans options (ne pas afficher les catégories vides)
  ].filter(group => group.options.length > 0)

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupName)
        ? prev.filter(g => g !== groupName)
        : [...prev, groupName]
    )
  }

  const toggleFilter = (groupName: string, option: string) => {
    const currentFilters = selectedFilters[groupName] || []
    const newFilters = currentFilters.includes(option)
      ? currentFilters.filter(f => f !== option)
      : [...currentFilters, option]

    onFilterChange({
      ...selectedFilters,
      [groupName]: newFilters
    })
  }

  const clearAllFilters = () => {
    onFilterChange({})
  }

  const totalFilters = Object.values(selectedFilters).flat().length

  return (
    <aside className={className}>
      <div className="sticky top-20">
        {/* En-tête des filtres */}
        <div className="flex items-center justify-between pb-5 mb-2 border-b-2 border-[#80368D]/20">
          <div className="flex items-center gap-3">
            <h2 className="font-[family-name:var(--font-heading)] text-base font-bold uppercase tracking-wide text-[#1A1F2B]">
              Filtres
            </h2>
            {isFreeUser && (
              <button
                type="button"
                onClick={onLockedFilterClick}
                className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#80368D]/10 to-[#a855f7]/10 border border-[#80368D]/20 px-3 py-1 text-xs font-semibold text-[#80368D] hover:from-[#80368D]/20 hover:to-[#a855f7]/20 transition-all"
              >
                🔓 Tout débloquer
              </button>
            )}
          </div>
          {totalFilters > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-auto px-3 py-1.5 text-sm font-semibold text-[#80368D] hover:text-white hover:bg-[#80368D] rounded-full transition-all"
            >
              Réinitialiser ({totalFilters})
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {filterGroups.map((group) => {
            const isLocked = group.locked && LOCKED_FILTER_NAMES.includes(group.name)
            return (
              <div
                key={group.name}
                className={`rounded-xl border-2 overflow-hidden transition-all ${
                  isLocked
                    ? "border-[#D0E4F2] bg-white/30 opacity-60"
                    : "border-[#D0E4F2] bg-white/50 hover:border-[#80368D]/30"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (isLocked) {
                      onLockedFilterClick?.()
                    } else {
                      toggleGroup(group.name)
                    }
                  }}
                  className={`flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors ${
                    isLocked
                      ? "cursor-not-allowed"
                      : "hover:bg-[#D0E4F2]/30"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-base font-bold text-[#1A1F2B]">{group.name}</span>
                    {isLocked && <Lock className="h-3.5 w-3.5 text-[#1A1F2B]/40" />}
                    {!isLocked && (selectedFilters[group.name]?.length ?? 0) > 0 && (
                      <Badge className="h-6 rounded-full bg-[#80368D] px-2.5 text-sm font-bold text-white shadow-md shadow-[#80368D]/25">
                        {selectedFilters[group.name]?.length}
                      </Badge>
                    )}
                    <span className="text-sm font-medium text-[#1A1F2B]/50">
                      ({group.options.length})
                    </span>
                  </span>
                  {isLocked ? (
                    <span className="text-xs font-medium text-[#1A1F2B]/40 bg-[#D0E4F2] px-2 py-0.5 rounded-full">
                      Pro
                    </span>
                  ) : expandedGroups.includes(group.name) ? (
                    <ChevronUp className="h-5 w-5 text-[#80368D]" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-[#1A1F2B]/50" />
                  )}
                </button>

                {!isLocked && expandedGroups.includes(group.name) && (
                  <div className="flex flex-col gap-1.5 px-3 pb-4 pt-1 max-h-56 overflow-y-auto border-t border-[#D0E4F2]">
                    {group.options.length === 0 ? (
                      <p className="text-sm font-medium text-[#1A1F2B]/50 italic px-2 py-2">
                        Aucune option disponible
                      </p>
                    ) : (
                      group.options.map((option) => {
                        const isSelected = selectedFilters[group.name]?.includes(option)
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => toggleFilter(group.name, option)}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all ${
                              isSelected
                                ? "bg-[#80368D] text-white shadow-md shadow-[#80368D]/25"
                                : "bg-white text-[#1A1F2B] hover:bg-[#D0E4F2]/50 border border-[#D0E4F2] hover:border-[#80368D]/30"
                            }`}
                          >
                            <div className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all ${
                              isSelected
                                ? "border-white bg-white"
                                : "border-[#D0E4F2] bg-white"
                            }`}>
                              {isSelected && (
                                <svg className="h-3.5 w-3.5 text-[#80368D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            {group.hasIcons && platformIcons[option] && (
                              <span className={isSelected ? "text-white" : "text-[#1A1F2B]/70"}>{platformIcons[option]}</span>
                            )}
                            {group.name === "Pays" && (
                              <CountryFlag country={option} className="h-4 w-5" />
                            )}
                            <span className="text-sm font-semibold truncate">{option}</span>
                          </button>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Indicateur de filtres dynamiques */}
        {dynamicOptions && (
          <div className="mt-5 pt-4 border-t-2 border-[#D0E4F2]">
            <p className="text-sm font-medium text-[#1A1F2B]/50 text-center">
              ✨ Filtres basés sur vos campagnes
            </p>
          </div>
        )}

      </div>
    </aside>
  )
}
