"use client"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Search, SlidersHorizontal, X } from "lucide-react"
import { FILTERS } from "@/lib/constants"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useState, useEffect } from "react"
// import { useDebounce } from "@/hooks/use-debounce" // Disabled: implementing simple debounce locally

// Simple debounce impl
function useDebounceValue<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value)
        }, delay)
        return () => {
            clearTimeout(timer)
        }
    }, [value, delay])
    return debouncedValue
}

export function FilterBar() {
    const router = useRouter()
    const searchParams = useSearchParams()
    // Hydration fix: use empty string as initial state, effect will sync
    const [searchTerm, setSearchTerm] = useState("")
    const debouncedSearch = useDebounceValue(searchTerm, 500)

    // Sync state with URL one time on mount
    useEffect(() => {
        const sp = new URLSearchParams(window.location.search)
        if (sp.get("search")) setSearchTerm(sp.get("search")!)
    }, []) // Empty dep array: run once

    const createQueryString = useCallback(
        (name: string, value: string | null) => {
            const params = new URLSearchParams(searchParams.toString())
            if (value) {
                params.set(name, value)
            } else {
                params.delete(name)
            }
            return params.toString()
        },
        [searchParams]
    )

    useEffect(() => {
        const current = searchParams.get("search") || ""
        if (debouncedSearch !== current) {
            if (debouncedSearch) {
                router.push(`/library?${createQueryString("search", debouncedSearch)}`)
            } else if (current) {
                // If cleared
                router.push(`/library?${createQueryString("search", null)}`)
            }
        }
    }, [debouncedSearch, createQueryString, router, searchParams])


    const handleFilterChange = (key: string, value: string) => {
        const current = searchParams.get(key)
        // Toggle
        const newValue = current === value ? null : value
        router.push(`/library?${createQueryString(key, newValue)}`)
    }

    const clearFilters = () => {
        router.push('/library')
        setSearchTerm("")
    }

    // Calculate active filters (excluding search)
    const activeFilters = []
    if (searchParams.get('platform')) activeFilters.push('platform')
    if (searchParams.get('format')) activeFilters.push('format')
    if (searchParams.get('sector')) activeFilters.push('sector')
    if (searchParams.get('objective')) activeFilters.push('objective')

    const hasActiveFilters = activeFilters.length > 0
    const hasSearch = searchTerm.length > 0

    return (
        <div className="flex flex-col gap-4 py-4 border-b bg-background sticky top-0 z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Search Input */}
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher une marque, mot-clé..."
                        className="pl-9 bg-muted/50"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Clear Filters Button */}
                {(hasActiveFilters || hasSearch) && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground md:order-last">
                        <X className="mr-2 h-4 w-4" />
                        Effacer filtres
                    </Button>
                )}

                {/* Filters Row */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar flex-1 justify-start md:justify-end">

                    {/* Platform Filter */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className={searchParams.get('platform') ? "bg-primary/10 text-primary border-primary/20" : ""}>
                                Plateforme
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="max-h-[300px] overflow-y-auto">
                            <DropdownMenuLabel>Plateforme</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {FILTERS.PLATFORMS.map(p => (
                                <DropdownMenuCheckboxItem
                                    key={p}
                                    checked={searchParams.get('platform') === p}
                                    onCheckedChange={() => handleFilterChange('platform', p)}>
                                    {p}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Format Filter */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className={searchParams.get('format') ? "bg-primary/10 text-primary border-primary/20" : ""}>
                                Format
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="max-h-[300px] overflow-y-auto">
                            <DropdownMenuLabel>Format</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {FILTERS.FORMATS.map(f => (
                                <DropdownMenuCheckboxItem
                                    key={f}
                                    checked={searchParams.get('format') === f}
                                    onCheckedChange={() => handleFilterChange('format', f)}>
                                    {f}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Sector Filter */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className={searchParams.get('sector') ? "bg-primary/10 text-primary border-primary/20" : ""}>
                                Secteur
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="max-h-[300px] overflow-y-auto">
                            <DropdownMenuLabel>Secteur</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {FILTERS.SECTORS.map(s => (
                                <DropdownMenuCheckboxItem
                                    key={s}
                                    checked={searchParams.get('sector') === s}
                                    onCheckedChange={() => handleFilterChange('sector', s)}>
                                    {s}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Objective Filter */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className={searchParams.get('objective') ? "bg-primary/10 text-primary border-primary/20" : ""}>
                                Objectif
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="max-h-[300px] overflow-y-auto">
                            <DropdownMenuLabel>Objectif</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {FILTERS.OBJECTIVES.map(o => (
                                <DropdownMenuCheckboxItem
                                    key={o}
                                    checked={searchParams.get('objective') === o}
                                    onCheckedChange={() => handleFilterChange('objective', o)}>
                                    {o}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                </div>
            </div>
        </div>
    )
}
