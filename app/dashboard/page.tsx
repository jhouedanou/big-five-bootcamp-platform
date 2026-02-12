"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar"
import { FiltersSidebar, DynamicFilterOptions } from "@/components/dashboard/filters-sidebar"
import { ContentCard, ContentItem } from "@/components/dashboard/content-card"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Filter, Grid3X3, LayoutList, ChevronLeft, ChevronRight, Loader2, Lock } from "lucide-react"
import { ParticlesBackground } from "@/components/ui/particles-background"

const FREE_CAMPAIGN_LIMIT = 4

export default function DashboardPage() {
  const [campaigns, setCampaigns] = useState<ContentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userPlan, setUserPlan] = useState<string>("Free")
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({})
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [currentPage, setCurrentPage] = useState(1)
  const [activeQuickFilter, setActiveQuickFilter] = useState("Tous")
  const [searchQuery, setSearchQuery] = useState("")
  const itemsPerPage = 9

  const isPremium = userPlan.toLowerCase() === "premium"
  
  const supabase = createClient()

  // Extraire les options de filtres dynamiquement depuis les campagnes
  const dynamicFilterOptions = useMemo<DynamicFilterOptions>(() => {
    const countries = new Set<string>()
    const sectors = new Set<string>()
    const formats = new Set<string>()
    const platforms = new Set<string>()
    const tags = new Set<string>()
    const years = new Set<number>()

    campaigns.forEach((campaign) => {
      if (campaign.country) countries.add(campaign.country)
      if (campaign.sector) sectors.add(campaign.sector)
      if (campaign.format) formats.add(campaign.format)
      if (campaign.platform) platforms.add(campaign.platform)
      if (campaign.year) years.add(campaign.year)
      if (campaign.tags && Array.isArray(campaign.tags)) {
        campaign.tags.forEach((tag) => {
          if (tag) tags.add(tag)
        })
      }
    })

    return {
      countries: Array.from(countries),
      sectors: Array.from(sectors),
      formats: Array.from(formats),
      platforms: Array.from(platforms),
      tags: Array.from(tags),
      years: Array.from(years),
    }
  }, [campaigns])

  // Charger le plan utilisateur
  useEffect(() => {
    const loadUserPlan = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          try {
            const { data: profile, error } = await supabase
              .from('users')
              .select('plan')
              .eq('id', session.user.id)
              .single()
            if (!error && profile?.plan) setUserPlan(profile.plan)
          } catch {
            // Table users n'existe pas encore, utiliser le plan par défaut
            console.warn('Table users non disponible, utilisation du plan par défaut')
          }
        }
      } catch (error) {
        console.error('Error loading user plan:', error)
      }
    }
    loadUserPlan()
  }, [])

  // Charger les campagnes publiees depuis Supabase
  useEffect(() => {
    const loadCampaigns = async () => {
      try {
        const { data, error } = await supabase
          .from('campaigns')
          .select('*')
          .eq('status', 'Publié')
          .order('created_at', { ascending: false })

        if (error) {
          // Table campaigns n'existe pas encore
          console.warn('Table campaigns non disponible:', error.message)
          // Utiliser des données d'exemple
          setCampaigns(getSampleCampaigns())
          return
        }

        if (!data || data.length === 0) {
          // Pas de campagnes, utiliser des données d'exemple
          setCampaigns(getSampleCampaigns())
          return
        }

        const formattedCampaigns: ContentItem[] = (data || []).map((campaign: any) => ({
          id: campaign.id,
          title: campaign.title,
          description: campaign.description || '',
          imageUrl: campaign.thumbnail || '',
          platform: campaign.platforms?.[0] || 'Facebook',
          country: campaign.country || '',
          sector: campaign.category || '',
          format: campaign.format || '',
          tags: campaign.tags || [],
          date: new Date(campaign.created_at).toISOString().split('T')[0],
          isVideo: !!campaign.video_url,
          images: campaign.images || [],
          videoUrl: campaign.video_url || undefined,
          brand: campaign.brand || '',
          agency: campaign.agency || '',
          year: campaign.year || undefined,
          status: campaign.status,
          accessLevel: campaign.access_level || 'free',
        }))

        setCampaigns(formattedCampaigns)
      } catch (error: any) {
        console.warn('Erreur chargement campagnes, utilisation des données exemple:', error?.message || error)
        setCampaigns(getSampleCampaigns())
      } finally {
        setIsLoading(false)
      }
    }

    loadCampaigns()
  }, [])

  // Données d'exemple quand la base n'est pas configurée
  const getSampleCampaigns = (): ContentItem[] => [
    {
      id: "sample-1",
      title: "Campagne MTN Mobile Money",
      description: "Campagne digitale pour le lancement de MTN MoMo en Côte d'Ivoire",
      imageUrl: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800",
      platform: "Facebook",
      country: "Côte d'Ivoire",
      sector: "Telecoms",
      format: "Vidéo",
      tags: ["Mobile Money", "Fintech", "Digital"],
      date: "2024-01-15",
      isVideo: true,
      brand: "MTN",
      agency: "Big Five",
      year: 2024,
      status: "Publié",
    },
    {
      id: "sample-2",
      title: "Lancement Coca-Cola Zero Sugar",
      description: "Campagne 360° pour le nouveau Coca-Cola Zero Sugar",
      imageUrl: "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=800",
      platform: "Instagram",
      country: "Sénégal",
      sector: "FMCG",
      format: "Image",
      tags: ["Boisson", "Lancement produit"],
      date: "2024-02-20",
      isVideo: false,
      brand: "Coca-Cola",
      agency: "Big Five",
      year: 2024,
      status: "Publié",
    },
    {
      id: "sample-3",
      title: "Orange Bank Africa",
      description: "Campagne de sensibilisation aux services bancaires mobiles",
      imageUrl: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800",
      platform: "YouTube",
      country: "Cameroun",
      sector: "Banque/Finance",
      format: "Vidéo",
      tags: ["Banque mobile", "Digital", "Fintech"],
      date: "2024-03-10",
      isVideo: true,
      brand: "Orange",
      agency: "Big Five",
      year: 2024,
      status: "Publié",
    },
    {
      id: "sample-4",
      title: "Nestlé Maggi Cube",
      description: "Campagne TV et digital pour Maggi en Afrique de l'Ouest",
      imageUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800",
      platform: "TikTok",
      country: "Nigeria",
      sector: "FMCG",
      format: "Vidéo",
      tags: ["Alimentaire", "FMCG", "Cuisine"],
      date: "2024-01-25",
      isVideo: true,
      brand: "Nestlé",
      agency: "Big Five",
      year: 2024,
      status: "Publié",
    },
  ]

  // Générer les quick filters dynamiquement à partir des secteurs les plus utilisés
  const quickFilters = useMemo(() => {
    // Couleurs disponibles pour les filtres rapides
    const colors = [
      "bg-blue-600 text-white shadow-blue-600/25",
      "bg-orange-500 text-white shadow-orange-500/25",
      "bg-emerald-500 text-white shadow-emerald-500/25",
      "bg-purple-600 text-white shadow-purple-600/25",
      "bg-pink-500 text-white shadow-pink-500/25",
      "bg-cyan-500 text-white shadow-cyan-500/25",
    ]

    // Compter les occurrences de chaque secteur
    const sectorCounts: Record<string, number> = {}
    campaigns.forEach((campaign) => {
      if (campaign.sector) {
        sectorCounts[campaign.sector] = (sectorCounts[campaign.sector] || 0) + 1
      }
    })

    // Trier les secteurs par fréquence et prendre les 5 premiers
    const topSectors = Object.entries(sectorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([sector], index) => ({
        label: sector,
        type: "sector" as const,
        value: sector,
        color: colors[index % colors.length],
      }))

    // Toujours commencer par "Tous"
    return [
      { label: "Tous", type: "all" as const, value: "all", color: "bg-primary text-primary-foreground shadow-primary/25" },
      ...topSectors,
    ]
  }, [campaigns])

  const handleQuickFilter = (filter: { label: string; type: string; value: string; color: string }) => {
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
    return campaigns.filter((content) => {
      // Filtre de recherche textuelle
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchesSearch = 
          content.title.toLowerCase().includes(query) ||
          content.description?.toLowerCase().includes(query) ||
          content.brand?.toLowerCase().includes(query) ||
          content.agency?.toLowerCase().includes(query) ||
          content.sector?.toLowerCase().includes(query) ||
          content.platform?.toLowerCase().includes(query) ||
          content.country?.toLowerCase().includes(query) ||
          content.tags?.some(tag => tag.toLowerCase().includes(query))
        if (!matchesSearch) return false
      }

      const countryFilter = selectedFilters["Pays"] || []
      const sectorFilter = selectedFilters["Secteur"] || []
      const formatFilter = selectedFilters["Format"] || []
      const platformFilter = selectedFilters["Plateforme"] || []
      const tagsFilter = selectedFilters["Tags"] || []
      const yearFilter = selectedFilters["Année"] || []

      if (countryFilter.length > 0 && !countryFilter.includes(content.country)) return false
      if (sectorFilter.length > 0 && !sectorFilter.includes(content.sector)) return false
      if (formatFilter.length > 0 && !formatFilter.includes(content.format)) return false
      if (platformFilter.length > 0 && !platformFilter.includes(content.platform)) return false
      if (tagsFilter.length > 0 && !content.tags.some(tag => tagsFilter.includes(tag))) return false
      if (yearFilter.length > 0 && content.year && !yearFilter.includes(String(content.year))) return false

      return true
    })
  }, [selectedFilters, campaigns, searchQuery])

  // Filtrer les campagnes premium pour les utilisateurs Free
  const visibleContent = isPremium
    ? filteredContent
    : filteredContent.filter((c) => c.accessLevel !== 'premium')
  const accessibleContent = isPremium
    ? visibleContent
    : visibleContent.slice(0, FREE_CAMPAIGN_LIMIT)
  const showPaywall = !isPremium && visibleContent.length > FREE_CAMPAIGN_LIMIT

  const totalPages = Math.ceil(accessibleContent.length / itemsPerPage)
  const paginatedContent = accessibleContent.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleFilterChange = (filters: Record<string, string[]>) => {
    setSelectedFilters(filters)
    setActiveQuickFilter("") // Reset quick filter active state when manual filters are used
    setCurrentPage(1)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-white to-[#D0E4F2]/20 relative">
      <ParticlesBackground color="#80368D" particleCount={40} />
      <div className="relative z-10">
        <DashboardNavbar searchQuery={searchQuery} onSearchChange={(q) => { setSearchQuery(q); setCurrentPage(1); }} />

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="animate-fade-in-up">
              <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-[#1A1F2B]">
                Bibliothèque
              </h1>
              <p className="mt-2 text-sm text-[#1A1F2B]/70">
                <span className="font-semibold text-[#80368D]">{filteredContent.length}</span> campagne{filteredContent.length > 1 ? "s" : ""} trouvée{filteredContent.length > 1 ? "s" : ""}
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
                      : "bg-white border border-[#D0E4F2] text-[#1A1F2B]/70 hover:bg-[#D0E4F2]/50 hover:text-[#1A1F2B] hover:border-[#80368D]/50"
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
                  className="lg:hidden bg-white border-[#D0E4F2] text-[#1A1F2B]"
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Filtres
                </Button>

                <div className="hidden items-center gap-1 rounded-lg border border-[#D0E4F2] bg-white p-1 sm:flex">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`rounded p-1.5 ${viewMode === "grid" ? "bg-[#D0E4F2] text-[#1A1F2B]" : "text-[#1A1F2B]/60 hover:text-[#1A1F2B]"}`}
                    aria-label="Grid view"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`rounded p-1.5 ${viewMode === "list" ? "bg-[#D0E4F2] text-[#1A1F2B]" : "text-[#1A1F2B]/60 hover:text-[#1A1F2B]"}`}
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
              dynamicOptions={dynamicFilterOptions}
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
                    dynamicOptions={dynamicFilterOptions}
                  />
                </div>
              </div>
            )}

            {/* Content Grid */}
            <div className="flex-1">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-[#80368D]" />
                  <p className="mt-4 text-sm text-muted-foreground">Chargement des campagnes...</p>
                </div>
              ) : paginatedContent.length > 0 ? (
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
                  <h3 className="text-lg font-semibold text-foreground">Aucune campagne trouvee</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Essayez de modifier vos filtres pour voir plus de resultats.
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

              {/* Paywall pour utilisateurs Free */}
              {showPaywall && (
                <div className="relative mt-8">
                  <div className="absolute inset-x-0 -top-24 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none z-10" />
                  <div className="text-center py-12 bg-white rounded-xl border border-[#D0E4F2] shadow-sm">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#80368D]/10">
                      <Lock className="h-6 w-6 text-[#80368D]" />
                    </div>
                    <h3 className="font-[family-name:var(--font-heading)] text-xl font-bold text-[#1A1F2B]">
                      Debloquez toute la bibliotheque
                    </h3>
                    <p className="mt-2 text-sm text-[#1A1F2B]/70">
                      {filteredContent.length - FREE_CAMPAIGN_LIMIT} campagnes supplementaires disponibles avec l'abonnement Premium
                    </p>
                    <Link href="/subscribe">
                      <Button className="mt-6 bg-[#80368D] hover:bg-[#80368D]/90 text-white shadow-lg shadow-[#80368D]/25">
                        Passer Premium
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
