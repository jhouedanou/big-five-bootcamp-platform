/**
 * Bannières éditoriales du dashboard (table `dashboard_banners`).
 * Types + helpers partagés entre les routes API, l'admin et le carrousel.
 */

export interface DashboardBanner {
  id: string
  title: string
  body: string | null
  ctaLabel: string
  imageUrl: string | null
  linkUrl: string
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmContent: string | null
  startsAt: string | null
  endsAt: string | null
  isActive: boolean
  sortOrder: number
  createdAt?: string
  updatedAt?: string
}

/** Ligne DB → objet applicatif. */
export function mapBannerRow(row: any): DashboardBanner {
  return {
    id: row.id,
    title: row.title,
    body: row.body ?? null,
    ctaLabel: row.cta_label || 'En savoir plus',
    imageUrl: row.image_url ?? null,
    linkUrl: row.link_url,
    utmSource: row.utm_source ?? null,
    utmMedium: row.utm_medium ?? null,
    utmCampaign: row.utm_campaign ?? null,
    utmContent: row.utm_content ?? null,
    startsAt: row.starts_at ?? null,
    endsAt: row.ends_at ?? null,
    isActive: !!row.is_active,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** Objet applicatif (partiel) → colonnes DB. */
export function mapBannerToDb(input: Partial<DashboardBanner>): Record<string, unknown> {
  const record: Record<string, unknown> = {}
  if (input.title !== undefined) record.title = input.title
  if (input.body !== undefined) record.body = input.body || null
  if (input.ctaLabel !== undefined) record.cta_label = input.ctaLabel
  if (input.imageUrl !== undefined) record.image_url = input.imageUrl || null
  if (input.linkUrl !== undefined) record.link_url = input.linkUrl
  if (input.utmSource !== undefined) record.utm_source = input.utmSource || null
  if (input.utmMedium !== undefined) record.utm_medium = input.utmMedium || null
  if (input.utmCampaign !== undefined) record.utm_campaign = input.utmCampaign || null
  if (input.utmContent !== undefined) record.utm_content = input.utmContent || null
  if (input.startsAt !== undefined) record.starts_at = input.startsAt || null
  if (input.endsAt !== undefined) record.ends_at = input.endsAt || null
  if (input.isActive !== undefined) record.is_active = input.isActive
  if (input.sortOrder !== undefined) record.sort_order = input.sortOrder
  return record
}

/**
 * Construit l'URL de destination en y injectant les paramètres UTM stockés.
 *
 * Les UTM déjà présents dans `linkUrl` ne sont pas écrasés : si un admin colle
 * un lien déjà tracké, son intention prime sur les champs du formulaire.
 * Un lien relatif (`/etudes/finance`) est résolu contre l'origine courante.
 */
export function buildBannerUrl(banner: DashboardBanner, origin?: string): string {
  const base =
    origin || (typeof window !== 'undefined' ? window.location.origin : 'https://laveiye.com')

  let url: URL
  try {
    url = new URL(banner.linkUrl, base)
  } catch {
    return banner.linkUrl
  }

  const utm: Array<[string, string | null]> = [
    ['utm_source', banner.utmSource],
    ['utm_medium', banner.utmMedium],
    ['utm_campaign', banner.utmCampaign],
    ['utm_content', banner.utmContent],
  ]
  for (const [key, value] of utm) {
    if (value && !url.searchParams.has(key)) url.searchParams.set(key, value)
  }

  return url.toString()
}

/** Une bannière est-elle diffusable maintenant ? Miroir de la policy RLS. */
export function isBannerLive(banner: DashboardBanner, now = new Date()): boolean {
  if (!banner.isActive) return false
  if (banner.startsAt && new Date(banner.startsAt) > now) return false
  if (banner.endsAt && new Date(banner.endsAt) < now) return false
  return true
}

/** Le lien ouvre-t-il un autre site ? Détermine target/rel. */
export function isExternalLink(linkUrl: string): boolean {
  return /^https?:\/\//i.test(linkUrl)
}
