export interface TempsFort {
  id: string
  slug: string
  title: string
  shortTitle?: string
  description: string
  imageUrl: string
  heroImageUrl?: string
  dateActivation: string
  eventDate: string
  endDate?: string
  isActive: boolean
  category: string
  campaignCount: number
  tags: string[]
  sectors: string[]
  axes: string[]
  countries: string[]
  formats: string[]
  platforms: string[]
  featured?: boolean
  popupEnabled?: boolean
  ctaLabel?: string
  sortOrder?: number
}

export type TempsFortStatus = "active" | "upcoming" | "past"

export interface TempsFortFilterOptions {
  sectors: string[]
  axes: string[]
  countries: string[]
  tags: string[]
  formats: string[]
  platforms: string[]
}
