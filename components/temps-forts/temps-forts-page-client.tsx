"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Calendar, ChevronDown, ChevronRight, Filter, RotateCcw, Sparkles, X } from "lucide-react"
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar"
import { Button } from "@/components/ui/button"
import { getTempsFortFilterOptions, getTempsFortStatus, getTodayISO } from "@/lib/temps-forts"
import type { TempsFort } from "@/types/temps-fort"
import { useTempsForts } from "./use-temps-forts"

type FilterKey = "Secteur" | "Axe créatif" | "Pays" | "Tags" | "Format" | "Plateforme"

const FILTER_MAP: Record<FilterKey, keyof ReturnType<typeof getTempsFortFilterOptions>> = {
  Secteur: "sectors",
  "Axe créatif": "axes",
  Pays: "countries",
  Tags: "tags",
  Format: "formats",
  Plateforme: "platforms",
}

const EVENT_FIELD_MAP: Record<FilterKey, keyof Pick<TempsFort, "sectors" | "axes" | "countries" | "tags" | "formats" | "platforms">> = {
  Secteur: "sectors",
  "Axe créatif": "axes",
  Pays: "countries",
  Tags: "tags",
  Format: "formats",
  Plateforme: "platforms",
}

export function TempsFortsPageClient() {
  const { tempsForts, loading } = useTempsForts()
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [sortMode, setSortMode] = useState<"recent" | "popular">("recent")

  const today = getTodayISO()
  const filterOptions = useMemo(() => getTempsFortFilterOptions(tempsForts), [tempsForts])

  const filteredTempsForts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    const filtered = tempsForts.filter((tempsFort) => {
      if (query) {
        const haystack = [
          tempsFort.title,
          tempsFort.shortTitle,
          tempsFort.description,
          tempsFort.category,
          ...tempsFort.tags,
          ...tempsFort.sectors,
          ...tempsFort.axes,
          ...tempsFort.countries,
          ...tempsFort.formats,
          ...tempsFort.platforms,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()

        if (!haystack.includes(query)) return false
      }

      return (Object.keys(EVENT_FIELD_MAP) as FilterKey[]).every((filterKey) => {
        const values = selectedFilters[filterKey] || []
        if (values.length === 0) return true

        const eventValues = tempsFort[EVENT_FIELD_MAP[filterKey]]
        return eventValues.some((value) => values.includes(value))
      })
    })

    return filtered.sort((a, b) => {
      if (sortMode === "popular") return b.campaignCount - a.campaignCount
      return b.eventDate.localeCompare(a.eventDate)
    })
  }, [searchQuery, selectedFilters, sortMode, tempsForts])

  const momentTempsForts = filteredTempsForts.filter((tempsFort) => getTempsFortStatus(tempsFort, today) === "active")
  const allTempsForts = filteredTempsForts.filter((tempsFort) => !momentTempsForts.some((moment) => moment.id === tempsFort.id))
  const totalFilters = Object.values(selectedFilters).flat().length

  const toggleFilter = (group: FilterKey, value: string) => {
    const current = selectedFilters[group] || []
    setSelectedFilters({
      ...selectedFilters,
      [group]: current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    })
  }

  const clearFilters = () => setSelectedFilters({})

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-white to-[#F5F5F5]/40">
      <DashboardNavbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex gap-8">
          <TempsFortsFilters
            filterOptions={filterOptions}
            selectedFilters={selectedFilters}
            totalFilters={totalFilters}
            onToggleFilter={toggleFilter}
            onClear={clearFilters}
            className="hidden w-64 shrink-0 lg:block"
          />

          {showMobileFilters && (
            <div className="fixed inset-0 z-[70] lg:hidden">
              <button
                type="button"
                className="absolute inset-0 bg-black/50"
                onClick={() => setShowMobileFilters(false)}
                aria-label="Fermer les filtres"
              />
              <div className="absolute bottom-0 left-0 right-0 max-h-[82vh] overflow-y-auto rounded-t-2xl bg-white p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-[family-name:var(--font-heading)] text-lg font-bold">Filtres</h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowMobileFilters(false)}>
                    <X className="mr-2 h-4 w-4" />
                    Fermer
                  </Button>
                </div>
                <TempsFortsFilters
                  filterOptions={filterOptions}
                  selectedFilters={selectedFilters}
                  totalFilters={totalFilters}
                  onToggleFilter={toggleFilter}
                  onClear={clearFilters}
                />
              </div>
            </div>
          )}

          <main className="min-w-0 flex-1">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="font-[family-name:var(--font-heading)] text-4xl font-extrabold tracking-tight text-[#0F0F0F]">
                  Temps forts
                </h1>
                <p className="mt-2 text-base font-medium text-[#0F0F0F]/65">
                  Inspirez-vous des campagnes créées autour des moments clés de l'année.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#F5F5F5] bg-white lg:hidden"
                  onClick={() => setShowMobileFilters(true)}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Filtres
                </Button>

                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as "recent" | "popular")}
                  className="h-10 rounded-xl border border-[#F5F5F5] bg-white px-4 text-sm font-semibold text-[#0F0F0F] shadow-sm outline-none transition focus:border-[#F2B33D]"
                >
                  <option value="recent">Les plus récents</option>
                  <option value="popular">Les plus explorés</option>
                </select>
              </div>
            </div>

            <section className="mb-10">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-[family-name:var(--font-heading)] text-2xl font-extrabold text-[#0F0F0F]">
                    Temps forts du moment
                  </h2>
                  <p className="mt-1 text-sm font-medium text-[#0F0F0F]/55">
                  </p>
                </div>
                <Link href="#tous-les-temps-forts" className="hidden items-center gap-1 text-sm font-bold text-[#0F0F0F]/70 hover:text-[#F2B33D] sm:flex">
                  Voir tous les temps forts
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              {momentTempsForts.length > 0 ? (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {momentTempsForts.map((tempsFort) => (
                    <FeaturedTempsFortCard key={tempsFort.id} tempsFort={tempsFort} today={today} />
                  ))}
                </div>
              ) : (
                <EmptyState onClear={clearFilters} />
              )}
            </section>

            <section id="tous-les-temps-forts">
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="font-[family-name:var(--font-heading)] text-2xl font-extrabold text-[#0F0F0F]">
                  Explorez tous les temps forts
                </h2>
                <span className="rounded-full bg-[#F5F5F5] px-3 py-1 text-sm font-bold text-[#0F0F0F]/65">
                  {filteredTempsForts.length} événement{filteredTempsForts.length > 1 ? "s" : ""}
                </span>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {[...allTempsForts, ...momentTempsForts].map((tempsFort) => (
                  <TempsFortCard key={tempsFort.id} tempsFort={tempsFort} today={today} />
                ))}
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}

function TempsFortsFilters({
  filterOptions,
  selectedFilters,
  totalFilters,
  onToggleFilter,
  onClear,
  className,
}: {
  filterOptions: ReturnType<typeof getTempsFortFilterOptions>
  selectedFilters: Record<string, string[]>
  totalFilters: number
  onToggleFilter: (group: FilterKey, value: string) => void
  onClear: () => void
  className?: string
}) {
  const [expandedGroups, setExpandedGroups] = useState<FilterKey[]>(["Secteur", "Pays", "Tags"])
  const groups = Object.keys(FILTER_MAP) as FilterKey[]

  return (
    <aside className={className}>
      <div className="sticky top-20">
        <div className="mb-3 flex items-center justify-between border-b border-[#F5F5F5] pb-4">
          <h2 className="font-[family-name:var(--font-heading)] text-base font-extrabold uppercase tracking-wide text-[#0F0F0F]">
            Filtres
          </h2>
          {totalFilters > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#F2B33D] hover:text-[#0F0F0F]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Réinitialiser
            </button>
          )}
        </div>

        <div className="space-y-2">
          {groups.map((group) => {
            const options = filterOptions[FILTER_MAP[group]]
            const selected = selectedFilters[group] || []
            const expanded = expandedGroups.includes(group)

            return (
              <div key={group} className="overflow-hidden rounded-xl border border-[#F5F5F5] bg-white">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedGroups((current) =>
                      current.includes(group) ? current.filter((item) => item !== group) : [...current, group],
                    )
                  }
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="flex items-center gap-2 text-sm font-extrabold text-[#0F0F0F]">
                    {group}
                    <span className="text-xs font-bold text-[#0F0F0F]/45">({options.length})</span>
                    {selected.length > 0 && (
                      <span className="rounded-full bg-[#F2B33D] px-2 py-0.5 text-xs text-white">{selected.length}</span>
                    )}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-[#0F0F0F]/55 transition ${expanded ? "rotate-180" : ""}`} />
                </button>

                {expanded && (
                  <div className="max-h-56 space-y-1 overflow-y-auto border-t border-[#F5F5F5] px-3 py-3">
                    {options.map((option) => {
                      const active = selected.includes(option)
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => onToggleFilter(group, option)}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
                            active ? "bg-[#F2B33D] text-white" : "bg-white text-[#0F0F0F] hover:bg-[#F5F5F5]"
                          }`}
                        >
                          <span className={`h-4 w-4 rounded border ${active ? "border-white bg-white" : "border-[#E8E8E8]"}`} />
                          <span className="truncate">{option}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </aside>
  )
}

function FeaturedTempsFortCard({ tempsFort, today }: { tempsFort: TempsFort; today: string }) {
  return (
    <Link href={`/temps-forts/${tempsFort.slug}`} className="group block">
      <article className="relative min-h-[264px] overflow-hidden rounded-xl bg-[#0F0F0F] shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
        <Image
          src={tempsFort.imageUrl}
          alt={tempsFort.shortTitle || tempsFort.title}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/5" />
        <div className="absolute inset-0 flex flex-col justify-between p-5">
          <StatusBadge status={getTempsFortStatus(tempsFort, today)} />

          <div>
            <h3 className="font-[family-name:var(--font-heading)] text-2xl font-extrabold leading-tight text-white">
              {tempsFort.shortTitle || tempsFort.title}
            </h3>
            <p className="mt-1 text-base font-bold text-white/90">
              {tempsFort.campaignCount} campagne{tempsFort.campaignCount > 1 ? "s" : ""}
            </p>
            <div className="mt-3 flex items-center justify-between">
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                {tempsFort.category}
              </span>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F2B33D] text-[#0F0F0F] transition group-hover:translate-x-1">
                <ChevronRight className="h-5 w-5" />
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}

function TempsFortCard({ tempsFort, today }: { tempsFort: TempsFort; today: string }) {
  return (
    <Link href={`/temps-forts/${tempsFort.slug}`} className="group block">
      <article className="overflow-hidden rounded-xl border border-[#F5F5F5] bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
        <div className="relative aspect-[4/3] overflow-hidden bg-[#F5F5F5]">
          <Image
            src={tempsFort.imageUrl}
            alt={tempsFort.shortTitle || tempsFort.title}
            fill
            sizes="(max-width: 768px) 100vw, 25vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
          <div className="absolute left-3 top-3">
            <StatusBadge status={getTempsFortStatus(tempsFort, today)} />
          </div>
        </div>
        <div className="p-5">
          <h3 className="font-[family-name:var(--font-heading)] text-xl font-extrabold text-[#0F0F0F]">
            {tempsFort.shortTitle || tempsFort.title}
          </h3>
          <p className="mt-2 text-sm font-bold text-[#0F0F0F]/60">
            {tempsFort.campaignCount} campagne{tempsFort.campaignCount > 1 ? "s" : ""}
          </p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="rounded-full bg-[#F5F5F5] px-3 py-1 text-xs font-bold text-[#0F0F0F]/75">
              {tempsFort.category}
            </span>
            <span className="inline-flex items-center gap-1 text-sm font-bold text-[#0F0F0F]/60">
              <Calendar className="h-4 w-4" />
              {formatMonthYear(tempsFort.eventDate)}
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}

function StatusBadge({ status }: { status: "active" | "upcoming" | "past" }) {
  const copy = {
    active: "Actif",
    upcoming: "À venir",
    past: "Passé",
  }[status]

  const className = {
    active: "bg-[#F2B33D] text-[#0F0F0F]",
    upcoming: "bg-emerald-500 text-white",
    past: "bg-white/85 text-[#0F0F0F]",
  }[status]

  return (
    <span className={`inline-flex w-fit items-center gap-1 rounded-full px-3 py-1 text-xs font-extrabold shadow-sm ${className}`}>
      <Sparkles className="h-3.5 w-3.5" />
      {copy}
    </span>
  )
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#F2B33D]/40 bg-[#F2B33D]/5 p-8 text-center">
      <h3 className="font-[family-name:var(--font-heading)] text-xl font-extrabold text-[#0F0F0F]">
        Aucun temps fort ne correspond à ces filtres
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm font-medium text-[#0F0F0F]/60">
        Essayez de retirer un filtre pour retrouver des inspirations actives.
      </p>
      <Button className="mt-5 bg-[#F2B33D] font-bold text-[#0F0F0F] hover:bg-[#F2B33D]/90" onClick={onClear}>
        Réinitialiser les filtres
      </Button>
    </div>
  )
}

function formatMonthYear(dateString: string): string {
  return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(`${dateString}T12:00:00`))
}
