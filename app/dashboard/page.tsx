"use client"

import { useState, useMemo } from "react"
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar"
import { FiltersSidebar } from "@/components/dashboard/filters-sidebar"
import { ContentCard } from "@/components/dashboard/content-card"
import { sampleContent } from "@/lib/sample-content"
import { Button } from "@/components/ui/button"
import { Filter, Grid3X3, LayoutList, ChevronLeft, ChevronRight } from "lucide-react"
import { ParticlesBackground } from "@/components/ui/particles-background"

export default function DashboardPage() {
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({})
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [currentPage, setCurrentPage] = useState(1)
  const [activeQuickFilter, setActiveQuickFilter] = useState("Tous")
  const itemsPerPage = 9

  const quickFilters = [
    { label: "Tous", type: "all", value: "all", color: "bg-primary text-primary-foreground shadow-primary/25" },
    { label: "Télécoms", type: "sector", value: "Telecoms", color: "bg-blue-600 text-white shadow-blue-600/25" },
    { label: "FMCG", type: "sector", value: "FMCG", color: "bg-orange-500 text-white shadow-orange-500/25" },
    { label: "Fintech", type: "tag", value: "Fintech", color: "bg-emerald-500 text-white shadow-emerald-500/25" },
    { label: "Banque", type: "sector", value: "Banque/Finance", color: "bg-purple-600 text-white shadow-purple-600/25" },
  ]

  const handleQuickFilter = (filter: typeof quickFilters[0]) => {
    setActiveQuickFilter(filter.label)
    setCurrentPage(1)

    if (filter.type === "all") {
      setSelectedFilters({})
    } else if (filter.type === "sector") {
      setSelectedFilters({ "Secteur": [filter.value] })
    } else if (filter.type === "tag") {
      setSelectedFilters({ "Tags": [filter.value] })
    }
  }

  const filteredContent = useMemo(() => {
    return sampleContent.filter((content) => {
      const countryFilter = selectedFilters["Pays"] || []
      const sectorFilter = selectedFilters["Secteur"] || []
      const formatFilter = selectedFilters["Format"] || []
      const platformFilter = selectedFilters["Plateforme"] || []
      const tagsFilter = selectedFilters["Tags"] || []

      if (countryFilter.length > 0 && !countryFilter.includes(content.country)) return false
      if (sectorFilter.length > 0 && !sectorFilter.includes(content.sector)) return false
      if (formatFilter.length > 0 && !formatFilter.includes(content.format)) return false
      if (platformFilter.length > 0 && !platformFilter.includes(content.platform)) return false
      if (tagsFilter.length > 0 && !content.tags.some(tag => tagsFilter.includes(tag))) return false

      return true
    })
  }, [selectedFilters])

  const totalPages = Math.ceil(filteredContent.length / itemsPerPage)
  const paginatedContent = filteredContent.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleFilterChange = (filters: Record<string, string[]>) => {
    setSelectedFilters(filters)
    setActiveQuickFilter("") // Reset quick filter active state when manual filters are used
    setCurrentPage(1)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 relative">
      <ParticlesBackground color="#FF6B35" particleCount={40} />
      <div className="relative z-10">
        <DashboardNavbar />

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="animate-fade-in-up">
              <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-foreground">
                Bibliothèque
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-semibold text-primary">{filteredContent.length}</span> campagne{filteredContent.length > 1 ? "s" : ""} trouvée{filteredContent.length > 1 ? "s" : ""}
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {/* Quick Filters */}
              <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
                {quickFilters.map((filter) => (
                  <button
                    key={filter.label}
                    onClick={() => handleQuickFilter(filter)}
                    className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold transition-all duration-300 ${activeQuickFilter === filter.label
                      ? `${filter.color} shadow-lg scale-105`
                      : "bg-white border border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:border-primary/50"
                      }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="lg:hidden bg-transparent"
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Filtres
                </Button>

                <div className="hidden items-center gap-1 rounded-lg border border-border p-1 sm:flex">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`rounded p-1.5 ${viewMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    aria-label="Grid view"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`rounded p-1.5 ${viewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    aria-label="List view"
                  >
                    <LayoutList className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-8">
            {/* Desktop Filters */}
            <FiltersSidebar
              selectedFilters={selectedFilters}
              onFilterChange={handleFilterChange}
              className="hidden w-64 shrink-0 lg:block"
            />

            {/* Mobile Filters */}
            {showMobileFilters && (
              <div className="fixed inset-0 z-50 lg:hidden">
                <div className="absolute inset-0 bg-black/50" onClick={() => setShowMobileFilters(false)} />
                <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-background p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Filtres</h2>
                    <Button variant="ghost" size="sm" onClick={() => setShowMobileFilters(false)}>
                      Fermer
                    </Button>
                  </div>
                  <FiltersSidebar
                    selectedFilters={selectedFilters}
                    onFilterChange={handleFilterChange}
                  />
                </div>
              </div>
            )}

            {/* Content Grid */}
            <div className="flex-1">
              {paginatedContent.length > 0 ? (
                <>
                  <div className={`grid gap-6 ${viewMode === "grid"
                    ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
                    : "grid-cols-1"
                    }`}>
                    {paginatedContent.map((content) => (
                      <ContentCard key={content.id} content={content} />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-8 flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            type="button"
                            onClick={() => setCurrentPage(page)}
                            className={`h-8 w-8 rounded text-sm font-medium ${currentPage === page
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 rounded-full bg-muted p-4">
                    <Filter className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Aucune campagne trouvée</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Essayez de modifier vos filtres pour voir plus de résultats.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4 bg-transparent"
                    onClick={() => setSelectedFilters({})}
                  >
                    Effacer les filtres
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
