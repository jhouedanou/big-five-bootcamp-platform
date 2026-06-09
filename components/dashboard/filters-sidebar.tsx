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

// Logo X (ex-Twitter) — lucide ne fournit plus la marque X, on utilise le SVG officiel.
function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  )
}

// Logo TikTok — également absent de lucide.
function TikTokLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  )
}

const platformIcons: Record<string, React.ReactNode> = {
  "Facebook": <Facebook className="h-4 w-4" />,
  "Instagram": <Instagram className="h-4 w-4" />,
  "LinkedIn": <Linkedin className="h-4 w-4" />,
  "YouTube": <Youtube className="h-4 w-4" />,
  // Aliases pour le libellé stocké côté campagnes / mappé depuis l'URL.
  "Twitter/X": <XLogo className="h-4 w-4" />,
  "Twitter": <XLogo className="h-4 w-4" />,
  "X": <XLogo className="h-4 w-4" />,
  "TikTok": <TikTokLogo className="h-4 w-4" />,
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
  /**
   * Quota courant des recherches+filtres du mois (compteur partage).
   * counts: map JSONB stocke en DB (cle _shared = total mensuel)
   * limit : quota mensuel maximum (null = illimite)
   */
  searchQuota?: {
    counts: Record<string, number>
    limit: number | null
    tier: 'discovery' | 'basic' | 'pro'
  }
}

// Filtres verrouillés pour le plan Découverte
const LOCKED_FILTER_NAMES = ["Pays", "Secteur", "Tags"]

export function FiltersSidebar({
  selectedFilters,
  onFilterChange,
  className,
  dynamicOptions,
  isFreeUser = false,
  onLockedFilterClick,
  searchQuota,
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
        <div className="flex items-center justify-between pb-5 mb-2 border-b-2 border-[#F2B33D]/20">
          <div className="flex items-center gap-3">
            <h2 className="font-[family-name:var(--font-heading)] text-base font-bold uppercase tracking-wide text-[#0F0F0F]">
              Filtres
            </h2>
            {isFreeUser && (
              <button
                type="button"
                onClick={onLockedFilterClick}
                className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#F2B33D]/10 to-[#a855f7]/10 border border-[#F2B33D]/20 px-3 py-1 text-xs font-semibold text-[#F2B33D] hover:from-[#F2B33D]/20 hover:to-[#a855f7]/20 transition-all"
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
              className="h-auto px-3 py-1.5 text-sm font-semibold text-[#F2B33D] hover:text-white hover:bg-[#F2B33D] rounded-full transition-all"
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
                    ? "border-[#F5F5F5] bg-white/30"
                    : "border-[#F5F5F5] bg-white/50 hover:border-[#F2B33D]/30"
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
                      : "hover:bg-[#F5F5F5]/30"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-base font-semibold text-[#0F0F0F]">{group.name}</span>
                    {isLocked && <Lock className="h-3.5 w-3.5 text-[#0F0F0F]/40" />}
                    {!isLocked && (selectedFilters[group.name]?.length ?? 0) > 0 && (
                      <Badge className="h-6 rounded-full bg-[#F2B33D] px-2.5 text-sm font-semibold text-white shadow-md shadow-[#F2B33D]/25">
                        {selectedFilters[group.name]?.length}
                      </Badge>
                    )}
                    <span className="text-sm font-medium text-[#0F0F0F]/50">
                      ({group.options.length})
                    </span>
                  </span>
                  {isLocked ? (
                    <span className="text-xs font-medium text-[#FFFFFF] bg-[#F2B33D] px-2 py-0.5 rounded-full">
                      Pro
                    </span>
                  ) : expandedGroups.includes(group.name) ? (
                    <ChevronUp className="h-5 w-5 text-[#F2B33D]" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-[#0F0F0F]/50" />
                  )}
                </button>

                {!isLocked && expandedGroups.includes(group.name) && (
                  <div className="flex flex-col gap-1.5 px-3 pb-4 pt-1 max-h-56 overflow-y-auto border-t border-[#F5F5F5]">
                    {group.options.length === 0 ? (
                      <p className="text-sm font-medium text-[#0F0F0F]/50 italic px-2 py-2">
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
                                ? "bg-[#F2B33D] text-white shadow-md shadow-[#F2B33D]/25"
                                : "bg-white text-[#0F0F0F] hover:bg-[#F5F5F5]/50 border border-[#F5F5F5] hover:border-[#F2B33D]/30"
                            }`}
                          >
                            <div className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all ${
                              isSelected
                                ? "border-white bg-white"
                                : "border-[#F5F5F5] bg-white"
                            }`}>
                              {isSelected && (
                                <svg className="h-3.5 w-3.5 text-[#F2B33D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            {group.hasIcons && platformIcons[option] && (
                              <span className={isSelected ? "text-white" : "text-[#0F0F0F]/70"}>{platformIcons[option]}</span>
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
          <div className="mt-5 pt-4 border-t-2 border-[#F5F5F5]">
            <p className="text-sm font-medium text-[#0F0F0F]/50 text-center">
              ✨ Filtres basés sur vos campagnes
            </p>
          </div>
        )}

      </div>
    </aside>
  )
}
