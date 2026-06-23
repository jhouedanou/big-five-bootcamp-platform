/**
 * Constantes et helpers de segmentation utilisateurs (admin).
 *
 * 4 notions DISTINCTES (ne pas confondre) :
 *  1. activity_status     — usage réel, CALCULÉ (jamais "free")
 *  2. access_type         — mode d'accès (paid|manual_free|promo|beta|trial|none)
 *  3. subscription_plan   — offre (decouverte|basic|pro|null) — PAS de "free"
 *  4. subscription_status — état paiement (active|trialing|expired|cancelled|payment_failed|none)
 *
 * "Non abonné" = access_type 'none' / plan null. Ce n'est PAS un plan.
 */

export const DEFAULT_PAGE_SIZE = 25
export const MAX_PAGE_SIZE = 100
export const BULK_MAX = 5000

// --- 1. Statut d'activité (calculé) -----------------------------------------
export type ActivityStatus =
  | "never_connected"
  | "active_recent"
  | "active"
  | "inactive"
  | "dormant"

export const ACTIVITY_STATUS_OPTIONS: { value: ActivityStatus; label: string }[] = [
  { value: "never_connected", label: "Jamais connecté" },
  { value: "active_recent", label: "Actif récent" },
  { value: "active", label: "Actif" },
  { value: "inactive", label: "Inactif" },
  { value: "dormant", label: "Dormant" },
]

const ACTIVITY_LABELS = Object.fromEntries(
  ACTIVITY_STATUS_OPTIONS.map((o) => [o.value, o.label])
) as Record<ActivityStatus, string>

export function activityStatusLabel(s: ActivityStatus): string {
  return ACTIVITY_LABELS[s] ?? s
}

/**
 * Calcule le statut d'activité depuis last_activity_at (réf) ou last_login_at.
 * Seuils : ≤7j actif récent, 8–30j actif, 31–59j inactif, ≥60j dormant.
 */
export function getActivityStatus(
  lastLoginAt: string | null,
  lastActivityAt: string | null,
  nowMs: number = Date.now()
): ActivityStatus {
  if (!lastLoginAt) return "never_connected"
  const ref = lastActivityAt || lastLoginAt
  const days = Math.floor((nowMs - new Date(ref).getTime()) / 86_400_000)
  if (days <= 7) return "active_recent"
  if (days <= 30) return "active"
  if (days <= 59) return "inactive"
  return "dormant"
}

// --- 2. Type d'accès ---------------------------------------------------------
export type AccessType = "paid" | "manual_free" | "promo" | "beta" | "trial" | "none"

export const ACCESS_TYPE_OPTIONS: { value: AccessType; label: string }[] = [
  { value: "paid", label: "Accès payant" },
  { value: "manual_free", label: "Accès attribué par l'équipe" },
  { value: "promo", label: "Accès promo" },
  { value: "beta", label: "Bêta testeur" },
  { value: "trial", label: "Essai gratuit" },
  { value: "none", label: "Non abonné" },
]

const ACCESS_LABELS = Object.fromEntries(
  ACCESS_TYPE_OPTIONS.map((o) => [o.value, o.label])
) as Record<string, string>

export function accessTypeLabel(v: string | null): string {
  return v ? ACCESS_LABELS[v] ?? v : "Non abonné"
}

// --- 3. Plan d'abonnement (PAS de "free") -----------------------------------
export const SUBSCRIPTION_PLAN_OPTIONS: { value: string; label: string; db: string }[] = [
  { value: "decouverte", label: "Découverte", db: "Discovery" },
  { value: "basic", label: "Basic", db: "Basic" },
  { value: "pro", label: "Pro", db: "Pro" },
]

/** value de filtre (decouverte/basic/pro) → clé DB (Discovery/Basic/Pro). */
export function planValueToDb(value: string): string | null {
  return SUBSCRIPTION_PLAN_OPTIONS.find((p) => p.value === value)?.db ?? null
}

/** Libellé d'affichage du plan DB. null/inconnu → "Non abonné". */
export function subscriptionPlanLabel(dbValue: string | null): string {
  if (!dbValue) return "Non abonné"
  const key = dbValue.toLowerCase()
  if (key === "discovery" || key === "découverte" || key === "decouverte") return "Découverte"
  if (key === "basic") return "Basic"
  if (key === "pro") return "Pro"
  return "Non abonné"
}

// --- 4. Statut d'abonnement --------------------------------------------------
export const SUBSCRIPTION_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "active", label: "Actif" },
  { value: "trialing", label: "En essai" },
  { value: "expired", label: "Expiré" },
  { value: "cancelled", label: "Annulé" },
  { value: "payment_failed", label: "Paiement échoué" },
  { value: "none", label: "Aucun abonnement" },
]

const SUB_STATUS_LABELS = Object.fromEntries(
  SUBSCRIPTION_STATUS_OPTIONS.map((o) => [o.value, o.label])
) as Record<string, string>

export function subscriptionStatusLabel(v: string | null): string {
  if (!v) return "Aucun abonnement"
  // tolérance legacy ('subscribed' → actif)
  if (v === "subscribed") return "Actif"
  return SUB_STATUS_LABELS[v] ?? v
}

// --- Filtres -----------------------------------------------------------------
export interface UserFilters {
  country?: string | null
  subscription_plan?: string | null // decouverte|basic|pro
  access_type?: string | null
  subscription_status?: string | null
  activity_status?: string | null
  date_from?: string | null
  date_to?: string | null
  search?: string | null
  tag?: string | null
}

export interface TagSummary {
  id: string
  name: string
  slug: string
  color: string
}

export interface AdminUserRow {
  id: string
  name: string | null
  email: string | null
  phone_number: string | null
  country: string | null
  created_at: string
  last_login_at: string | null
  last_activity_at: string | null
  last_activity_ref: string | null
  subscription_plan: string | null
  subscription_status: string | null
  access_type: string | null
  is_beta_tester: boolean | null
  tags: TagSummary[]
}

function sanitizeSearch(value: string): string {
  return value.replace(/[,()%]/g, " ").trim()
}

/**
 * Applique les filtres SQL simples (hors tag et activity_status) à un query
 * builder Supabase sur la vue `admin_users`.
 */
export function applyUserFilters<T>(query: T, filters: UserFilters): T {
  let q = query as any

  if (filters.country) q = q.eq("country", filters.country)
  if (filters.subscription_plan) {
    const db = planValueToDb(filters.subscription_plan)
    if (db) q = q.eq("subscription_plan", db)
  }
  if (filters.access_type) q = q.eq("access_type", filters.access_type)
  if (filters.subscription_status) q = q.eq("subscription_status", filters.subscription_status)
  if (filters.date_from) q = q.gte("created_at", filters.date_from)
  if (filters.date_to) q = q.lte("created_at", filters.date_to)

  if (filters.search) {
    const s = sanitizeSearch(filters.search)
    if (s) {
      q = q.or(`name.ilike.%${s}%,email.ilike.%${s}%,phone_number.ilike.%${s}%`)
    }
  }

  return q as T
}

/**
 * Filtre par statut d'activité (calculé sur last_activity_ref / last_login_at).
 * Appliqué à part car il repose sur des bornes de dates.
 */
export function applyActivityStatusFilter<T>(
  query: T,
  activityStatus: string | null | undefined,
  nowMs: number = Date.now()
): T {
  if (!activityStatus) return query
  let q = query as any
  const iso = (daysAgo: number) => new Date(nowMs - daysAgo * 86_400_000).toISOString()

  switch (activityStatus) {
    case "never_connected":
      q = q.is("last_login_at", null)
      break
    case "active_recent": // ≤ 7j
      q = q.gte("last_activity_ref", iso(7))
      break
    case "active": // 8–30j
      q = q.lt("last_activity_ref", iso(7)).gte("last_activity_ref", iso(30))
      break
    case "inactive": // 31–59j
      q = q.lt("last_activity_ref", iso(30)).gte("last_activity_ref", iso(59))
      break
    case "dormant": // ≥ 60j
      q = q.lt("last_activity_ref", iso(59))
      break
  }
  return q as T
}

export function parseFilters(searchParams: URLSearchParams): UserFilters {
  const v = (k: string) => {
    const x = searchParams.get(k)
    return x && x.trim() ? x.trim() : null
  }
  return {
    country: v("country"),
    subscription_plan: v("subscription_plan") || v("plan"),
    access_type: v("access_type"),
    subscription_status: v("subscription_status"),
    activity_status: v("activity_status"),
    date_from: v("date_from"),
    date_to: v("date_to"),
    search: v("search"),
    tag: v("tag"),
  }
}
