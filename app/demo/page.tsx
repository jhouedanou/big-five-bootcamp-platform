"use client"

import { useState, useMemo } from "react"
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar"
import { ContentCard } from "@/components/dashboard/content-card"
import { AdvancedFilters } from "@/components/dashboard/advanced-filters"
import { sampleContent } from "@/lib/sample-content"
import { Button } from "@/components/ui/button"
import { Grid3X3, LayoutList, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react"
import { ParticlesBackground } from "@/components/ui/particles-background"

// Configuration des filtres style Adforum
const filterConfigs = [
  {
    id: "brand",
    label: "Marque",
    placeholder: "Marque",
    type: "search" as const,
  },
  {
    id: "media",
    label: "Média",
    placeholder: "Média",
    type: "select" as const,
    options: [
      { value: "TV", label: "TV" },
      { value: "Digital", label: "Digital" },
      { value: "Print", label: "Print" },
      { value: "Radio", label: "Radio" },
      { value: "OOH", label: "Affichage (OOH)" },
      { value: "Social", label: "Réseaux sociaux" },
    ]
  },
  {
    id: "country",
    label: "Pays",
    placeholder: "Pays",
    type: "select" as const,
    options: [
      { value: "Bénin", label: "Bénin" },
      { value: "Côte d'Ivoire", label: "Côte d'Ivoire" },
      { value: "Sénégal", label: "Sénégal" },
      { value: "Burkina Faso", label: "Burkina Faso" },
      { value: "Togo", label: "Togo" },
      { value: "Guinée", label: "Guinée" },
    ]
  },
  {
    id: "sector",
    label: "Secteur d'activité",
    placeholder: "Secteur d'activité",
    type: "select" as const,
    options: [
      { value: "Telecoms", label: "Télécommunications" },
      { value: "Banque/Finance", label: "Banque / Finance" },
      { value: "FMCG", label: "FMCG / Grande conso" },
      { value: "E-commerce", label: "E-commerce" },
      { value: "Tech", label: "Technologie" },
      { value: "Energie", label: "Énergie" },
      { value: "Industrie", label: "Industrie" },
      { value: "Mode", label: "Mode / Beauté" },
      { value: "Sante", label: "Santé" },
    ]
  },
  // Ligne 2 de filtres
  {
    id: "agency",
    label: "Nom de l'agence",
    placeholder: "Nom de l'agence",
    type: "search" as const,
  },
  {
    id: "award",
    label: "Awards",
    placeholder: "Awards",
    type: "select" as const,
    options: [
      { value: "Cannes Lions", label: "Cannes Lions" },
      { value: "Clio Awards", label: "Clio Awards" },
      { value: "D&AD", label: "D&AD" },
      { value: "One Show", label: "One Show" },
      { value: "Epica", label: "Epica Awards" },
      { value: "APAP", label: "APAP Awards" },
    ]
  },
  {
    id: "productionCompany",
    label: "Sociétés de production",
    placeholder: "Sociétés de production",
    type: "search" as const,
  },
  {
    id: "contributors",
    label: "Contributions: personnes",
    placeholder: "Contributions: personnes",
    type: "search" as const,
  },
  // Ligne 3
  {
    id: "advertiser",
    label: "Annonceur",
    placeholder: "Annonceur",
    type: "search" as const,
  },
  {
    id: "title",
    label: "Titre de la création",
    placeholder: "Titre de la création",
    type: "search" as const,
  },
  {
    id: "year",
    label: "An",
    placeholder: "An",
    type: "select" as const,
    options: [
      { value: "2024", label: "2024" },
      { value: "2023", label: "2023" },
      { value: "2022", label: "2022" },
      { value: "2021", label: "2021" },
      { value: "2020", label: "2020" },
    ]
  },
  {
    id: "keywords",
    label: "Mot-clé",
    placeholder: "Mot-clé",
    type: "search" as const,
  },
]

export default function DemoPage() {
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({})
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [currentPage, setCurrentPage] = useState(1)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(true)
  const itemsPerPage = 12

  const filteredContent = useMemo(() => {
    return sampleContent.filter((content) => {
      // Exclure les campagnes premium de la page démo (visible uniquement pour les abonnés)
      if (content.accessLevel === "premium") return false
      
      // Filtres de recherche texte
      const brandFilter = selectedFilters["brand"]?.[0]?.toLowerCase()
      const agencyFilter = selectedFilters["agency"]?.[0]?.toLowerCase()
      const titleFilter = selectedFilters["title"]?.[0]?.toLowerCase()
      const keywordsFilter = selectedFilters["keywords"]?.[0]?.toLowerCase()

      if (brandFilter && !content.brand?.toLowerCase().includes(brandFilter)) return false
      if (agencyFilter && !content.agency?.toLowerCase().includes(agencyFilter)) return false
      if (titleFilter && !content.title.toLowerCase().includes(titleFilter)) return false
      if (keywordsFilter && !content.tags.some(tag => tag.toLowerCase().includes(keywordsFilter))) return false

      // Filtres de sélection
      const countryFilter = selectedFilters["country"] || []
      const sectorFilter = selectedFilters["sector"] || []
      const yearFilter = selectedFilters["year"] || []

      if (countryFilter.length > 0 && !countryFilter.includes(content.country)) return false
      if (sectorFilter.length > 0 && !sectorFilter.includes(content.sector)) return false
      if (yearFilter.length > 0 && !yearFilter.includes(String(content.year))) return false

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
    setCurrentPage(1)
  }

  const handleSearch = () => {
    setCurrentPage(1)
    // Les filtres sont déjà appliqués via useMemo
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-white to-[#D0E4F2]/20 relative">
      <ParticlesBackground color="#80368D" particleCount={30} />
      <div className="relative z-10">
        <DashboardNavbar />

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Section de filtres avancés style Adforum */}
          <div className="mb-8 bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-[#D0E4F2] shadow-sm">
            <AdvancedFilters
              filters={filterConfigs}
              selectedFilters={selectedFilters}
              onFilterChange={handleFilterChange}
              totalResults={240000}
              onSearch={handleSearch}
            />
          </div>

          {/* Contrôles de vue */}
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="animate-fade-in-up">
              <h2 className="font-[family-name:var(--font-montserrat)] text-2xl font-bold text-[#1A1F2B]">
                Résultats
              </h2>
              <p className="mt-1 text-sm text-[#1A1F2B]/70">
                <span className="font-semibold text-[#80368D]">{filteredContent.length}</span> campagne{filteredContent.length > 1 ? "s" : ""} trouvée{filteredContent.length > 1 ? "s" : ""}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="bg-transparent"
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                {showAdvancedFilters ? "Masquer" : "Afficher"} les filtres
              </Button>

              <div className="flex items-center gap-1 rounded-lg border border-[#D0E4F2] p-1 bg-white">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`rounded p-1.5 transition-colors ${viewMode === "grid" ? "bg-[#D0E4F2] text-[#1A1F2B]" : "text-[#1A1F2B]/60 hover:text-[#1A1F2B]"}`}
                  aria-label="Vue grille"
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`rounded p-1.5 transition-colors ${viewMode === "list" ? "bg-[#D0E4F2] text-[#1A1F2B]" : "text-[#1A1F2B]/60 hover:text-[#1A1F2B]"}`}
                  aria-label="Vue liste"
                >
                  <LayoutList className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Grille de contenu */}
          <div className={
            viewMode === "grid"
              ? "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "flex flex-col gap-4"
          }>
            {paginatedContent.map((content, index) => (
              <div
                key={content.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <ContentCard content={content} />
              </div>
            ))}
          </div>

          {/* Message si aucun résultat */}
          {paginatedContent.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 h-16 w-16 rounded-full bg-[#D0E4F2] flex items-center justify-center">
                <SlidersHorizontal className="h-8 w-8 text-[#1A1F2B]/60" />
              </div>
              <h3 className="font-[family-name:var(--font-montserrat)] text-xl font-semibold text-[#1A1F2B]">
                Aucune campagne trouvée
              </h3>
              <p className="mt-2 text-muted-foreground max-w-md">
                Essayez de modifier vos filtres ou d'effectuer une recherche différente.
              </p>
              <Button
                variant="outline"
                className="mt-6"
                onClick={() => setSelectedFilters({})}
              >
                Réinitialiser les filtres
              </Button>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="bg-transparent"
              >
                <ChevronLeft className="h-4 w-4" />
                Précédent
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }

                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`h-9 w-9 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? "bg-primary text-primary-foreground"
                          : "bg-background border border-border text-foreground hover:bg-muted"
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="bg-transparent"
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
