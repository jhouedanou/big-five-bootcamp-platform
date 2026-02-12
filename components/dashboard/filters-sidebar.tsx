"use client"

import React from "react"

import { useState } from "react"
import { ChevronDown, ChevronUp, X, Facebook, Instagram, Linkedin, Youtube } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface FilterGroup {
  name: string
  options: string[]
  hasIcons?: boolean
}

// Valeurs par défaut (fallback si pas de données dynamiques)
const defaultFilterGroups: FilterGroup[] = [
  {
    name: "Pays",
    options: ["Cote d'Ivoire", "Senegal", "Nigeria", "Afrique du Sud", "Ghana", "Kenya", "Maroc", "France", "USA"]
  },
  {
    name: "Secteur",
    options: ["Telecoms", "Banque/Finance", "FMCG", "E-commerce", "Tech", "Mode", "Sante", "Energie", "Industrie"]
  },
  {
    name: "Format",
    options: ["Post Social", "Story", "Video Ad", "Display", "Campagne 360", "Carousel", "Print"]
  },
  {
    name: "Plateforme",
    options: ["Facebook", "Instagram", "TikTok", "YouTube", "LinkedIn", "Twitter/X", "Outdoor"],
    hasIcons: true
  },
  {
    name: "Tags",
    options: ["Humour", "Emotion", "Storytelling", "Promo", "Cause sociale", "Viral", "UGC", "Influenceur", "Corporate"]
  },
  {
    name: "Année",
    options: ["2026", "2025", "2024", "2023", "2022"]
  }
]

const platformIcons: Record<string, React.ReactNode> = {
  "Facebook": <Facebook className="h-3 w-3" />,
  "Instagram": <Instagram className="h-3 w-3" />,
  "LinkedIn": <Linkedin className="h-3 w-3" />,
  "YouTube": <Youtube className="h-3 w-3" />,
}

// Interface pour les options dynamiques
export interface DynamicFilterOptions {
  countries?: string[]
  sectors?: string[]
  formats?: string[]
  platforms?: string[]
  tags?: string[]
  years?: number[]
}

interface FiltersSidebarProps {
  selectedFilters: Record<string, string[]>
  onFilterChange: (filters: Record<string, string[]>) => void
  className?: string
  dynamicOptions?: DynamicFilterOptions
}

export function FiltersSidebar({ selectedFilters, onFilterChange, className, dynamicOptions }: FiltersSidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["Pays", "Secteur", "Plateforme", "Tags"])

  // Construire les groupes de filtres dynamiquement
  const filterGroups: FilterGroup[] = [
    {
      name: "Pays",
      options: dynamicOptions?.countries?.length 
        ? [...dynamicOptions.countries].sort() 
        : defaultFilterGroups[0].options
    },
    {
      name: "Secteur",
      options: dynamicOptions?.sectors?.length 
        ? [...dynamicOptions.sectors].sort() 
        : defaultFilterGroups[1].options
    },
    {
      name: "Format",
      options: dynamicOptions?.formats?.length 
        ? [...dynamicOptions.formats].sort() 
        : defaultFilterGroups[2].options
    },
    {
      name: "Plateforme",
      options: dynamicOptions?.platforms?.length 
        ? [...dynamicOptions.platforms].sort() 
        : defaultFilterGroups[3].options,
      hasIcons: true
    },
    {
      name: "Tags",
      options: dynamicOptions?.tags?.length 
        ? [...dynamicOptions.tags].sort() 
        : defaultFilterGroups[4].options
    },
    {
      name: "Année",
      options: dynamicOptions?.years?.length 
        ? dynamicOptions.years.sort((a, b) => b - a).map(String) 
        : defaultFilterGroups[5].options
    }
  ]

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
        <div className="flex items-center justify-between pb-4">
          <h2 className="font-[family-name:var(--font-heading)] text-sm font-semibold uppercase tracking-wider text-[#1A1F2B]">Filtres</h2>
          {totalFilters > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-auto px-2 py-1 text-xs text-[#80368D] hover:text-[#80368D]/80"
            >
              Réinitialiser ({totalFilters})
            </Button>
          )}
        </div>

        <div className="space-y-1">
          {filterGroups.map((group) => (
            <div key={group.name} className="border-b border-[#D0E4F2] pb-2">
              <button
                type="button"
                onClick={() => toggleGroup(group.name)}
                className="flex w-full items-center justify-between py-2.5 text-left text-sm font-medium text-[#1A1F2B] transition-colors hover:text-[#80368D]"
              >
                <span className="flex items-center gap-2">
                  {group.name}
                  {(selectedFilters[group.name]?.length ?? 0) > 0 && (
                    <Badge className="h-5 rounded-full bg-[#80368D] px-1.5 text-xs text-white">
                      {selectedFilters[group.name]?.length}
                    </Badge>
                  )}
                  {/* Indicateur du nombre d'options disponibles */}
                  <span className="text-xs text-[#1A1F2B]/40">
                    ({group.options.length})
                  </span>
                </span>
                {expandedGroups.includes(group.name) ? (
                  <ChevronUp className="h-4 w-4 text-[#1A1F2B]/60" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-[#1A1F2B]/60" />
                )}
              </button>
              
              {expandedGroups.includes(group.name) && (
                <div className="flex flex-col gap-1 pb-2 pt-1 max-h-48 overflow-y-auto">
                  {group.options.length === 0 ? (
                    <p className="text-xs text-[#1A1F2B]/50 italic px-2 py-1">
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
                          className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                            isSelected
                              ? "bg-[#80368D]/10 text-[#80368D]"
                              : "text-[#1A1F2B]/70 hover:bg-[#D0E4F2]/50 hover:text-[#1A1F2B]"
                          }`}
                        >
                          <div className={`flex h-4 w-4 items-center justify-center rounded border ${
                            isSelected 
                              ? "border-[#80368D] bg-[#80368D]" 
                              : "border-[#D0E4F2] bg-white"
                          }`}>
                            {isSelected && (
                              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          {group.hasIcons && platformIcons[option] && (
                            <span className="text-[#1A1F2B]/60">{platformIcons[option]}</span>
                          )}
                          <span className="truncate">{option}</span>
                        </button>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Indicateur de filtres dynamiques */}
        {dynamicOptions && (
          <div className="mt-4 pt-4 border-t border-[#D0E4F2]">
            <p className="text-xs text-[#1A1F2B]/50 text-center">
              Filtres basés sur vos campagnes
            </p>
          </div>
        )}
      </div>
    </aside>
  )
}
