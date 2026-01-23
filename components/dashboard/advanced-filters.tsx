"use client"

import React, { useState, useEffect, useRef } from "react"
import { Search, ChevronDown, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface FilterOption {
  value: string
  label: string
  count?: number
}

interface FilterConfig {
  id: string
  label: string
  placeholder: string
  type: "search" | "select"
  options?: FilterOption[]
  icon?: React.ReactNode
}

interface AdvancedFiltersProps {
  filters: FilterConfig[]
  selectedFilters: Record<string, string[]>
  onFilterChange: (filters: Record<string, string[]>) => void
  totalResults: number
  onSearch: () => void
}

export function AdvancedFilters({
  filters,
  selectedFilters,
  onFilterChange,
  totalResults,
  onSearch
}: AdvancedFiltersProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({})
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Fermer le dropdown en cliquant à l'extérieur
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (openDropdown) {
        const ref = dropdownRefs.current[openDropdown]
        if (ref && !ref.contains(event.target as Node)) {
          setOpenDropdown(null)
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [openDropdown])

  const handleSelectOption = (filterId: string, value: string) => {
    const current = selectedFilters[filterId] || []
    const newValues = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value]
    
    onFilterChange({
      ...selectedFilters,
      [filterId]: newValues
    })
  }

  const handleSearchInput = (filterId: string, value: string) => {
    setSearchTerms(prev => ({ ...prev, [filterId]: value }))
    if (value) {
      onFilterChange({
        ...selectedFilters,
        [filterId]: [value]
      })
    } else {
      const newFilters = { ...selectedFilters }
      delete newFilters[filterId]
      onFilterChange(newFilters)
    }
  }

  const clearFilter = (filterId: string, value?: string) => {
    if (value) {
      const current = selectedFilters[filterId] || []
      onFilterChange({
        ...selectedFilters,
        [filterId]: current.filter(v => v !== value)
      })
    } else {
      const newFilters = { ...selectedFilters }
      delete newFilters[filterId]
      onFilterChange(newFilters)
      setSearchTerms(prev => ({ ...prev, [filterId]: "" }))
    }
  }

  const clearAllFilters = () => {
    onFilterChange({})
    setSearchTerms({})
  }

  const totalActiveFilters = Object.values(selectedFilters).flat().length

  return (
    <div className="w-full space-y-6">
      {/* En-tête avec compteur */}
      <div className="text-center">
        <h2 className="font-[family-name:var(--font-montserrat)] text-2xl font-bold text-foreground">
          + de <span className="text-primary">{totalResults.toLocaleString()}</span> campagnes
        </h2>
      </div>

      {/* Grille de filtres - Style Adforum */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {filters.map((filter) => (
          <div 
            key={filter.id}
            ref={el => { dropdownRefs.current[filter.id] = el }}
            className="relative"
          >
            {filter.type === "search" ? (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={filter.placeholder}
                  value={searchTerms[filter.id] || selectedFilters[filter.id]?.[0] || ""}
                  onChange={(e) => handleSearchInput(filter.id, e.target.value)}
                  className="pl-10 h-11 bg-background border-border rounded-lg text-sm hover:border-primary/50 focus:border-primary transition-colors"
                />
                {(searchTerms[filter.id] || selectedFilters[filter.id]?.length) && (
                  <button
                    onClick={() => clearFilter(filter.id)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={`Effacer le filtre ${filter.label}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => setOpenDropdown(openDropdown === filter.id ? null : filter.id)}
                className={`w-full flex items-center justify-between h-11 px-4 bg-background border rounded-lg text-sm transition-all ${
                  openDropdown === filter.id || selectedFilters[filter.id]?.length
                    ? "border-primary text-foreground"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                <span className="truncate">
                  {selectedFilters[filter.id]?.length 
                    ? `${filter.label} (${selectedFilters[filter.id].length})`
                    : filter.placeholder
                  }
                </span>
                <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${openDropdown === filter.id ? "rotate-180" : ""}`} />
              </button>
            )}

            {/* Dropdown des options */}
            {filter.type === "select" && openDropdown === filter.id && filter.options && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {filter.options.map((option) => {
                  const isSelected = selectedFilters[filter.id]?.includes(option.value)
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleSelectOption(filter.id, option.value)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors ${
                        isSelected 
                          ? "bg-primary/10 text-primary" 
                          : "hover:bg-muted text-foreground"
                      }`}
                    >
                      <span>{option.label}</span>
                      {option.count !== undefined && (
                        <span className="text-xs text-muted-foreground">({option.count})</span>
                      )}
                      {isSelected && (
                        <div className="ml-2 h-4 w-4 rounded bg-primary flex items-center justify-center">
                          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ))}

        {/* Bouton Trouver */}
        <Button 
          onClick={onSearch}
          className="h-11 bg-[#00BCD4] hover:bg-[#00ACC1] text-white font-semibold px-8"
        >
          Trouver
        </Button>
      </div>

      {/* Ligne 2 de filtres supplémentaires */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {filters.slice(5, 9).map((filter) => (
          <div 
            key={filter.id}
            ref={el => { dropdownRefs.current[filter.id] = el }}
            className="relative"
          >
            {filter.type === "search" ? (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={filter.placeholder}
                  value={searchTerms[filter.id] || selectedFilters[filter.id]?.[0] || ""}
                  onChange={(e) => handleSearchInput(filter.id, e.target.value)}
                  className="pl-10 h-11 bg-background border-border rounded-lg text-sm hover:border-primary/50 focus:border-primary transition-colors"
                />
              </div>
            ) : (
              <button
                onClick={() => setOpenDropdown(openDropdown === filter.id ? null : filter.id)}
                className={`w-full flex items-center justify-between h-11 px-4 bg-background border rounded-lg text-sm transition-all ${
                  openDropdown === filter.id || selectedFilters[filter.id]?.length
                    ? "border-primary text-foreground"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                <span className="truncate">
                  {selectedFilters[filter.id]?.length 
                    ? `${filter.label} (${selectedFilters[filter.id].length})`
                    : filter.placeholder
                  }
                </span>
                <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${openDropdown === filter.id ? "rotate-180" : ""}`} />
              </button>
            )}

            {filter.type === "select" && openDropdown === filter.id && filter.options && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {filter.options.map((option) => {
                  const isSelected = selectedFilters[filter.id]?.includes(option.value)
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleSelectOption(filter.id, option.value)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors ${
                        isSelected 
                          ? "bg-primary/10 text-primary" 
                          : "hover:bg-muted text-foreground"
                      }`}
                    >
                      <span>{option.label}</span>
                      {isSelected && (
                        <div className="ml-2 h-4 w-4 rounded bg-primary flex items-center justify-center">
                          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Filtres actifs */}
      {totalActiveFilters > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <span className="text-sm text-muted-foreground">Filtres actifs:</span>
          {Object.entries(selectedFilters).map(([filterId, values]) =>
            values.map(value => (
              <Badge
                key={`${filterId}-${value}`}
                variant="secondary"
                className="flex items-center gap-1 bg-primary/10 text-primary hover:bg-primary/20"
              >
                {value}
                <button
                  onClick={() => clearFilter(filterId, value)}
                  className="ml-1 hover:text-primary/80"
                  aria-label={`Supprimer le filtre ${value}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))
          )}
          <button
            onClick={clearAllFilters}
            className="text-sm text-primary hover:text-primary/80 underline"
          >
            Tout effacer
          </button>
        </div>
      )}

      {/* Liens supplémentaires */}
      <div className="flex justify-center gap-8 pt-4">
        <a href="#" className="text-[#00BCD4] hover:underline text-sm font-medium flex items-center gap-1">
          → Abonnez-vous !
        </a>
        <a href="#" className="text-[#00BCD4] hover:underline text-sm font-medium flex items-center gap-1">
          → Soumettre une pub
        </a>
      </div>
    </div>
  )
}
