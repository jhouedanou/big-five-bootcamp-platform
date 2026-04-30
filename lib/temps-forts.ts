import type { TempsFort, TempsFortFilterOptions, TempsFortStatus } from "@/types/temps-fort"

export function getTodayISO(date = new Date()): string {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 10)
}

export function isTempsFortActivated(tempsFort: TempsFort, today = getTodayISO()): boolean {
  return tempsFort.isActive && tempsFort.dateActivation <= today
}

export function getTempsFortStatus(tempsFort: TempsFort, today = getTodayISO()): TempsFortStatus {
  if (!isTempsFortActivated(tempsFort, today)) return "upcoming"
  if ((tempsFort.endDate && tempsFort.endDate < today) || (!tempsFort.endDate && tempsFort.eventDate < today)) {
    return "past"
  }
  return "active"
}

export function getMomentTempsForts(list: TempsFort[], today = getTodayISO()): TempsFort[] {
  return list.filter((tempsFort) => getTempsFortStatus(tempsFort, today) === "active")
}

export function getFeaturedTempsFort(list: TempsFort[], today = getTodayISO()): TempsFort | null {
  return getMomentTempsForts(list, today).find((tempsFort) => tempsFort.featured) ?? null
}

export function getPopupTempsFort(list: TempsFort[], today = getTodayISO()): TempsFort | null {
  return getMomentTempsForts(list, today).find((tempsFort) => tempsFort.popupEnabled) ?? getFeaturedTempsFort(list, today)
}

export function getTempsFortBySlug(list: TempsFort[], slug: string): TempsFort | undefined {
  return list.find((tempsFort) => tempsFort.slug === slug)
}

export function getTempsFortFilterOptions(list: TempsFort[]): TempsFortFilterOptions {
  return {
    sectors: uniqueSorted(list.flatMap((tempsFort) => tempsFort.sectors)),
    axes: uniqueSorted(list.flatMap((tempsFort) => tempsFort.axes)),
    countries: uniqueSorted(list.flatMap((tempsFort) => tempsFort.countries)),
    tags: uniqueSorted(list.flatMap((tempsFort) => tempsFort.tags)),
    formats: uniqueSorted(list.flatMap((tempsFort) => tempsFort.formats)),
    platforms: uniqueSorted(list.flatMap((tempsFort) => tempsFort.platforms)),
  }
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "fr"))
}

export function mapRowToTempsFort(row: any): TempsFort {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    shortTitle: row.short_title || undefined,
    description: row.description || "",
    imageUrl: row.image_url || "",
    heroImageUrl: row.hero_image_url || undefined,
    dateActivation: row.date_activation,
    eventDate: row.event_date,
    endDate: row.end_date || undefined,
    isActive: !!row.is_active,
    category: row.category || "",
    campaignCount: row.campaign_count ?? 0,
    tags: row.tags || [],
    sectors: row.sectors || [],
    axes: row.axes || [],
    countries: row.countries || [],
    formats: row.formats || [],
    platforms: row.platforms || [],
    featured: !!row.featured,
    popupEnabled: !!row.popup_enabled,
    ctaLabel: row.cta_label || undefined,
    sortOrder: row.sort_order ?? 0,
  }
}

export function mapTempsFortToRow(tempsFort: Partial<TempsFort> & { sortOrder?: number }): Record<string, any> {
  const row: Record<string, any> = {}
  if (tempsFort.id !== undefined) row.id = tempsFort.id
  if (tempsFort.slug !== undefined) row.slug = tempsFort.slug
  if (tempsFort.title !== undefined) row.title = tempsFort.title
  if (tempsFort.shortTitle !== undefined) row.short_title = tempsFort.shortTitle || null
  if (tempsFort.description !== undefined) row.description = tempsFort.description
  if (tempsFort.imageUrl !== undefined) row.image_url = tempsFort.imageUrl
  if (tempsFort.heroImageUrl !== undefined) row.hero_image_url = tempsFort.heroImageUrl || null
  if (tempsFort.dateActivation !== undefined) row.date_activation = tempsFort.dateActivation
  if (tempsFort.eventDate !== undefined) row.event_date = tempsFort.eventDate
  if (tempsFort.endDate !== undefined) row.end_date = tempsFort.endDate || null
  if (tempsFort.isActive !== undefined) row.is_active = tempsFort.isActive
  if (tempsFort.category !== undefined) row.category = tempsFort.category
  if (tempsFort.campaignCount !== undefined) row.campaign_count = tempsFort.campaignCount
  if (tempsFort.tags !== undefined) row.tags = tempsFort.tags
  if (tempsFort.sectors !== undefined) row.sectors = tempsFort.sectors
  if (tempsFort.axes !== undefined) row.axes = tempsFort.axes
  if (tempsFort.countries !== undefined) row.countries = tempsFort.countries
  if (tempsFort.formats !== undefined) row.formats = tempsFort.formats
  if (tempsFort.platforms !== undefined) row.platforms = tempsFort.platforms
  if (tempsFort.featured !== undefined) row.featured = tempsFort.featured
  if (tempsFort.popupEnabled !== undefined) row.popup_enabled = tempsFort.popupEnabled
  if (tempsFort.ctaLabel !== undefined) row.cta_label = tempsFort.ctaLabel || null
  if (tempsFort.sortOrder !== undefined) row.sort_order = tempsFort.sortOrder
  return row
}
