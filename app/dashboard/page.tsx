"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar"
import type { DynamicFilterOptions } from "@/components/dashboard/filters-sidebar"
import { ContentCard, ContentItem } from "@/components/dashboard/content-card"
import { ContentGridSkeleton } from "@/components/dashboard/content-card-skeleton"
import { UpgradePopup, useUpgradePopup } from "@/components/upgrade-popup"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Filter, Grid3X3, LayoutList, ChevronLeft, ChevronRight, CalendarDays, TrendingUp, ChevronRight as ArrowRight, Sparkles } from "lucide-react"
import { format, parseISO, startOfWeek, subDays } from "date-fns"
import { fr } from "date-fns/locale"
import { isPaidPlan } from "@/lib/pricing"
import { fixBrokenEncoding } from "@/lib/utils"

const ParticlesBackground = dynamic(() => import("@/components/ui/particles-background").then(m => m.ParticlesBackground), { ssr: false })
const FiltersSidebar = dynamic(() => import("@/components/dashboard/filters-sidebar").then(m => m.FiltersSidebar))

// Compteur mensuel de clics (côté serveur via API)
const MONTHLY_CLICK_LIMIT = 3

// Normalisation des noms de pays pour corriger les imports CSV mal encodés
// Ex: "Cote d'Ivoire" (ASCII) → "Côte d'Ivoire" (UTF-8 canonique)
const COUNTRY_ALIASES: Record<string, string> = {
  "cote d'ivoire":        "Côte d'Ivoire",
  "côte d'ivoire":        "Côte d'Ivoire",
  "senegal":              "Sénégal",
  "sénégal":              "Sénégal",
  "benin":                "Bénin",
  "bénin":                "Bénin",
  "guinee":               "Guinée",
  "guinée":               "Guinée",
  "guinee-bissau":        "Guinée-Bissau",
  "guinée-bissau":        "Guinée-Bissau",
  "mali":                 "Mali",
  "niger":                "Niger",
  "togo":                 "Togo",
  "burkina faso":         "Burkina Faso",
  "cameroun":             "Cameroun",
  "cameroon":             "Cameroun",
}

function normalizeCountry(raw: string | null | undefined): string {
  if (!raw) return ""
  const trimmed = raw.trim()
  // Remplace le caractère de remplacement U+FFFD par la lettre correcte
  // Ex: "C\uFFFDte d'Ivoire" → "Côte d'Ivoire"
  const degarbled = trimmed.replace(/C\uFFFDte d['']Ivoire/i, "Côte d'Ivoire")
  return COUNTRY_ALIASES[degarbled.toLowerCase()] ?? degarbled
}

// Les compteurs de clics sont maintenant gérés côté serveur via /api/track-click

export default function DashboardPage() {
  const [campaigns, setCampaigns] = useState<ContentItem[]>([])
  const [weeklyCampaigns, setWeeklyCampaigns] = useState<ContentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userPlan, setUserPlan] = useState<string>("Free")
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({})
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [currentPage, setCurrentPage] = useState(1)
  const [activeQuickFilter, setActiveQuickFilter] = useState("Tous")
  const [searchQuery, setSearchQuery] = useState("")
  const [monthlyClicks, setMonthlyClicks] = useState(0)
  const [monthlyExplored, setMonthlyExplored] = useState(0)
  const itemsPerPage = 9

  const { open: upgradeOpen, reason: upgradeReason, showUpgrade, closeUpgrade } = useUpgradePopup()

  const isFreeUser = !isPaidPlan(userPlan)
  const supabase = createClient()

  // Charger le compteur de clics depuis le serveur
  useEffect(() => {
    const loadClickCounter = async () => {
      try {
        const res = await fetch('/api/track-click')
        if (res.ok) {
          const data = await res.json()
          setMonthlyClicks(data.clicks || 0)
          setMonthlyExplored(data.explored || 0)
        }
      } catch { /* fallback: compteur à 0 */ }
    }
    loadClickCounter()
  }, [])

  // Extraire les options de filtres dynamiquement depuis les campagnes
  const dynamicFilterOptions = useMemo<DynamicFilterOptions>(() => {
    const countries = new Set<string>()
    const sectors = new Set<string>()
    const formats = new Set<string>()
    const platforms = new Set<string>()
    const tags = new Set<string>()
    const years = new Set<number>()

    campaigns.forEach((campaign) => {
      if (campaign.country) countries.add(normalizeCountry(campaign.country))
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
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          try {
            const { data: profile, error } = await supabase
              .from('users')
              .select('plan, subscription_status, subscription_end_date')
              .eq('id', user.id)
              .single()
            if (!error && profile) {
              const now = new Date()
              if (
                ['premium', 'pro', 'basic', 'agency', 'enterprise'].includes(profile.plan?.toLowerCase() || '')
              ) {
                // Vérification expiration abonnement payant
                if (
                  profile.subscription_end_date &&
                  new Date(profile.subscription_end_date) < now
                ) {
                  setUserPlan('Free')
                  fetch('/api/cron/check-subscriptions').catch(() => {})
                } else {
                  setUserPlan(profile.plan || 'Free')
                }
              } else {
                setUserPlan('Free')
              }
            }
          } catch {
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
          console.warn('Table campaigns non disponible:', error.message)
          setCampaigns(getSampleCampaigns())
          return
        }

        if (!data || data.length === 0) {
          setCampaigns(getSampleCampaigns())
          return
        }

        const formattedCampaigns: ContentItem[] = (data || []).map((campaign: any) => ({
          id: campaign.id,
          title: fixBrokenEncoding(campaign.title),
          summary: fixBrokenEncoding(campaign.summary),
          description: fixBrokenEncoding(campaign.description),
          imageUrl: campaign.thumbnail || '',
          platform: campaign.platforms?.[0] || 'Facebook',
          country: normalizeCountry(campaign.country),
          sector: fixBrokenEncoding(campaign.category) || '',
          format: campaign.format || '',
          tags: campaign.tags || [],
          date: new Date(campaign.created_at).toISOString().split('T')[0],
          isVideo: !!campaign.video_url,
          images: campaign.images || [],
          videoUrl: campaign.video_url || undefined,
          brand: fixBrokenEncoding(campaign.brand) || '',
          agency: fixBrokenEncoding(campaign.agency) || '',
          year: campaign.year || undefined,
          status: campaign.status,
          accessLevel: campaign.access_level || 'free',
          createdAt: campaign.created_at,
          featured: campaign.featured || false,
        }))

        setCampaigns(formattedCampaigns)

        // Filtrer les campagnes de la semaine
        // Priorité 1 : campagnes marquées "featured" par l'admin
        // Priorité 2 : campagnes ajoutées dans les 7 derniers jours
        const lastMonday = startOfWeek(new Date(), { weekStartsOn: 1 })
        const featuredCampaigns = formattedCampaigns.filter(c => c.featured)
        const recentCampaigns = formattedCampaigns.filter(c => {
          const date = new Date(c.createdAt || c.date)
          return date >= lastMonday && !c.featured
        })
        // Featured d'abord, puis les récentes
        const weekly = [...featuredCampaigns, ...recentCampaigns]
        setWeeklyCampaigns(weekly)
      } catch (error: any) {
        console.warn('Erreur chargement campagnes:', error?.message || error)
        setCampaigns(getSampleCampaigns())
      } finally {
        setIsLoading(false)
      }
    }

    loadCampaigns()
  }, [])

  // Données d'exemple
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
      date: new Date().toISOString().split('T')[0],
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
      date: new Date().toISOString().split('T')[0],
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
      country: "Burkina Faso",
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
      country: "Bénin",
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

  // Quick filters
  const quickFilters = useMemo(() => {
    const colors = [
      "bg-blue-600 text-white shadow-blue-600/25",
      "bg-orange-500 text-white shadow-orange-500/25",
      "bg-emerald-500 text-white shadow-emerald-500/25",
      "bg-purple-600 text-white shadow-purple-600/25",
      "bg-pink-500 text-white shadow-pink-500/25",
      "bg-cyan-500 text-white shadow-cyan-500/25",
    ]

    const sectorCounts: Record<string, number> = {}
    campaigns.forEach((campaign) => {
      if (campaign.sector) {
        sectorCounts[campaign.sector] = (sectorCounts[campaign.sector] || 0) + 1
      }
    })

    const topSectors = Object.entries(sectorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([sector], index) => ({
        label: sector,
        type: "sector" as const,
        value: sector,
        color: colors[index % colors.length],
      }))

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

      if (countryFilter.length > 0 && !countryFilter.includes(normalizeCountry(content.country))) return false
      if (sectorFilter.length > 0 && !sectorFilter.includes(content.sector)) return false
      if (formatFilter.length > 0 && !formatFilter.includes(content.format)) return false
      if (platformFilter.length > 0 && !platformFilter.includes(content.platform)) return false
      if (tagsFilter.length > 0 && !content.tags.some(tag => tagsFilter.includes(tag))) return false
      if (yearFilter.length > 0 && content.year && !yearFilter.includes(String(content.year))) return false

      return true
    })
  }, [selectedFilters, campaigns, searchQuery])

  const handleContentClick = useCallback(async (content: ContentItem): Promise<boolean> => {
    // Appeler l'API pour tracker le clic
    try {
      const res = await fetch('/api/track-click', { method: 'POST' })
      const data = await res.json()

      if (!res.ok || !data.allowed) {
        showUpgrade("clicks")
        return false
      }

      if (data.clicks !== null) setMonthlyClicks(data.clicks)
      if (data.explored !== undefined) setMonthlyExplored(data.explored)
    } catch {
      // En cas d'erreur réseau, laisser passer
    }
    return true
  }, [showUpgrade])

  const accessibleContent = filteredContent
  const totalPages = Math.ceil(accessibleContent.length / itemsPerPage)
  const paginatedContent = accessibleContent.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Grouper les campagnes par mois/année
  const groupedContent = useMemo(() => {
    const groups: Record<string, ContentItem[]> = {}

    paginatedContent.forEach((content) => {
      let monthKey: string
      try {
        const date = parseISO(content.date)
        monthKey = format(date, "MMMM yyyy", { locale: fr })
      } catch {
        monthKey = content.year ? `Année ${content.year}` : "Non daté"
      }

      if (!groups[monthKey]) {
        groups[monthKey] = []
      }
      groups[monthKey].push(content)
    })

    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const getYear = (key: string) => {
        const match = key.match(/\d{4}/)
        return match ? parseInt(match[0]) : 0
      }
      const getMonth = (key: string) => {
        const months = ["janvier", "février", "mars", "avril", "mai", "juin",
          "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
        const lowerKey = key.toLowerCase()
        const idx = months.findIndex(m => lowerKey.includes(m))
        return idx >= 0 ? idx : 0
      }

      const yearA = getYear(a)
      const yearB = getYear(b)
      if (yearA !== yearB) return yearB - yearA
      return getMonth(b) - getMonth(a)
    })

    return sortedKeys.map(key => ({
      monthYear: key,
      campaigns: groups[key]
    }))
  }, [paginatedContent])

  const handleFilterChange = (filters: Record<string, string[]>) => {
    setSelectedFilters(filters)
    setActiveQuickFilter("")
    setCurrentPage(1)
  }

  const weekLabel = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "d MMMM yyyy", { locale: fr })

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-white to-[#D0E4F2]/20 relative">
      <ParticlesBackground color="#80368D" particleCount={40} />
      <div className="relative z-10">
        <DashboardNavbar
          searchQuery={searchQuery}
          onSearchChange={(q) => { setSearchQuery(q); setCurrentPage(1) }}
          userPlan={userPlan}
          monthlyClicks={monthlyClicks}
          monthlyClickLimit={MONTHLY_CLICK_LIMIT}
          isFreeUser={isFreeUser}
          monthlyExplored={monthlyExplored}
        />

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

          {/* Section "Les meilleures campagnes de la semaine" */}
          {weeklyCampaigns.length > 0 && (
            <section className="mb-10 rounded-2xl bg-gradient-to-r from-[#F2B33D]/5 to-white border border-[#F2B33D]/20 p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#F2B33D] to-[#f59e0b] shadow-lg shadow-[#F2B33D]/25">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-[family-name:var(--font-heading)] text-lg font-bold text-[#1A1F2B]">
                      Les meilleures campagnes de la semaine
                    </h2>
                    <p className="text-sm text-[#1A1F2B]/60">
                      Sélectionnées pour vous · Semaine du {weekLabel}
                    </p>
                  </div>
                </div>
                <span className="hidden sm:flex items-center gap-1 rounded-full bg-[#F2B33D]/20 px-3 py-1 text-xs font-semibold text-[#b45309]">
                  <Sparkles className="h-3 w-3" />
                  {weeklyCampaigns.filter(c => c.featured).length > 0
                    ? `${weeklyCampaigns.filter(c => c.featured).length} sélection${weeklyCampaigns.filter(c => c.featured).length > 1 ? 's' : ''} éditeur`
                    : `${weeklyCampaigns.length} nouvelles`
                  }
                </span>
              </div>

              {/* Carousel horizontal */}
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {weeklyCampaigns.slice(0, 8).map((campaign) => (
                  <div key={campaign.id} className="flex-shrink-0 w-56">
                    <ContentCard
                      content={campaign}
                      onBeforeNavigate={(c) => handleContentClick(c)}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="animate-fade-in-up">
              <h1 className="font-[family-name:var(--font-heading)] text-4xl font-bold tracking-tight text-[#1A1F2B]">
                Bibliothèque
              </h1>
              <p className="mt-2 text-base font-medium text-[#1A1F2B]/70">
                <span className="text-lg font-bold text-[#80368D]">{filteredContent.length}</span> campagne{filteredContent.length > 1 ? "s" : ""} trouvée{filteredContent.length > 1 ? "s" : ""}
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {/* Quick Filters */}
              <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
                {quickFilters.map((filter) => (
                  <button
                    key={filter.label}
                    type="button"
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
              isFreeUser={isFreeUser}
              onLockedFilterClick={() => showUpgrade("filters")}
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
                    isFreeUser={isFreeUser}
                    onLockedFilterClick={() => { setShowMobileFilters(false); showUpgrade("filters") }}
                  />
                </div>
              </div>
            )}

            {/* Content Grid */}
            <div className="flex-1">
              {isLoading ? (
                <ContentGridSkeleton count={6} />
              ) : paginatedContent.length > 0 ? (
                <>
                  <div className="space-y-10">
                    {groupedContent.map((group) => (
                      <section key={group.monthYear} className="animate-fade-in-up">
                        <div className="mb-6 flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#80368D] to-[#a855f7] shadow-lg shadow-[#80368D]/25">
                            <CalendarDays className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h2 className="font-[family-name:var(--font-heading)] text-xl font-bold capitalize text-[#1A1F2B]">
                              {group.monthYear}
                            </h2>
                            <p className="text-sm font-medium text-[#1A1F2B]/60">
                              {group.campaigns.length} campagne{group.campaigns.length > 1 ? "s" : ""}
                            </p>
                          </div>
                          <div className="ml-4 flex-1 border-b-2 border-dashed border-[#D0E4F2]" />
                        </div>

                        <div className={`grid gap-6 ${viewMode === "grid"
                          ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
                          : "grid-cols-1"
                          }`}>
                          {group.campaigns.map((content) => (
                            <ContentCard
                              key={content.id}
                              content={content}
                              onBeforeNavigate={(c) => handleContentClick(c)}
                              isBlocked={isFreeUser && monthlyClicks >= MONTHLY_CLICK_LIMIT}
                            />
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-10 flex items-center justify-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 w-10 border-2 border-[#D0E4F2] bg-white p-0 hover:bg-[#D0E4F2] hover:border-[#80368D]/30"
                        onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </Button>

                      <div className="flex items-center gap-2">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            type="button"
                            onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                            className={`h-10 w-10 rounded-lg text-sm font-bold transition-all duration-200 ${currentPage === page
                              ? "bg-[#80368D] text-white shadow-lg shadow-[#80368D]/30 scale-110"
                              : "bg-white border-2 border-[#D0E4F2] text-[#1A1F2B]/70 hover:bg-[#D0E4F2] hover:text-[#1A1F2B] hover:border-[#80368D]/30"
                              }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 w-10 border-2 border-[#D0E4F2] bg-white p-0 hover:bg-[#D0E4F2] hover:border-[#80368D]/30"
                        onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                        disabled={currentPage === totalPages}
                      >
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="mb-6 rounded-2xl bg-gradient-to-br from-[#D0E4F2] to-[#D0E4F2]/50 p-6 shadow-inner">
                    <Filter className="h-12 w-12 text-[#80368D]" />
                  </div>
                  <h3 className="text-xl font-bold text-[#1A1F2B]">Aucune campagne trouvée</h3>
                  <p className="mt-2 max-w-md text-base font-medium text-[#1A1F2B]/60">
                    Essayez de modifier vos filtres pour voir plus de résultats.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-6 bg-white border-2 border-[#80368D]/30 text-[#80368D] font-semibold hover:bg-[#80368D]/5 hover:border-[#80368D]"
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

      {/* Upgrade Popup */}
      <UpgradePopup
        open={upgradeOpen}
        onClose={closeUpgrade}
        reason={upgradeReason}
      />
    </div>
  )
}
