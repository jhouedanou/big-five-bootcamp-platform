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

const filterGroups: FilterGroup[] = [
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
    name: "Date",
    options: ["7 derniers jours", "30 derniers jours", "3 derniers mois", "6 derniers mois", "1 an", "Tout"]
  }
]

const platformIcons: Record<string, React.ReactNode> = {
  "Facebook": <Facebook className="h-3 w-3" />,
  "Instagram": <Instagram className="h-3 w-3" />,
  "LinkedIn": <Linkedin className="h-3 w-3" />,
  "YouTube": <Youtube className="h-3 w-3" />,
}

interface FiltersSidebarProps {
  selectedFilters: Record<string, string[]>
  onFilterChange: (filters: Record<string, string[]>) => void
  className?: string
}

export function FiltersSidebar({ selectedFilters, onFilterChange, className }: FiltersSidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["Pays", "Secteur", "Plateforme"])

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
              Reinitialiser ({totalFilters})
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
                </span>
                {expandedGroups.includes(group.name) ? (
                  <ChevronUp className="h-4 w-4 text-[#1A1F2B]/60" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-[#1A1F2B]/60" />
                )}
              </button>
              
              {expandedGroups.includes(group.name) && (
                <div className="flex flex-col gap-1 pb-2 pt-1">
                  {group.options.map((option) => {
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
                        {option}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
