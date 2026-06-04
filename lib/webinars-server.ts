import "server-only"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import type { Webinar, WebinarWithMeta } from "@/lib/webinars"

const WEBINAR_COLUMNS =
  "id, title, slug, short_description, full_description, date, start_time, end_time, timezone, meeting_link, speaker_name, status, registration_enabled, public_preview_enabled, max_participants, created_at, updated_at"

/** Nombre d'inscrits (status 'registered') par webinaire. */
async function countsByWebinar(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  webinarIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  if (webinarIds.length === 0) return counts
  const { data } = await supabase
    .from("webinar_registrations")
    .select("webinar_id")
    .in("webinar_id", webinarIds)
    .eq("registration_status", "registered")
  for (const r of data ?? []) {
    counts.set(r.webinar_id, (counts.get(r.webinar_id) ?? 0) + 1)
  }
  return counts
}

/** Webinaires de l'utilisateur (ids inscrits). */
async function registeredIds(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string | null,
  webinarIds: string[]
): Promise<Set<string>> {
  const set = new Set<string>()
  if (!userId || webinarIds.length === 0) return set
  const { data } = await supabase
    .from("webinar_registrations")
    .select("webinar_id")
    .eq("user_id", userId)
    .eq("registration_status", "registered")
    .in("webinar_id", webinarIds)
  for (const r of data ?? []) set.add(r.webinar_id)
  return set
}

function attach(
  webinars: Webinar[],
  counts: Map<string, number>,
  registered: Set<string>
): WebinarWithMeta[] {
  return webinars.map((w) => ({
    ...w,
    registrations_count: counts.get(w.id) ?? 0,
    is_registered: registered.has(w.id),
  }))
}

/** Liste des webinaires publiés (programme), triés par date croissante. */
export async function getPublishedWebinars(userId: string | null): Promise<WebinarWithMeta[]> {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from("webinars")
    .select(WEBINAR_COLUMNS)
    .eq("status", "published")
    .order("date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: true })

  const webinars = (data ?? []) as Webinar[]
  const ids = webinars.map((w) => w.id)
  const [counts, regs] = await Promise.all([
    countsByWebinar(supabase, ids),
    registeredIds(supabase, userId, ids),
  ])
  return attach(webinars, counts, regs)
}

/** Prochaine session publiée à venir (date/heure >= maintenant). */
export async function getNextWebinar(userId: string | null): Promise<WebinarWithMeta | null> {
  const supabase = getSupabaseAdmin()
  const todayIso = new Date().toISOString().slice(0, 10)
  const { data } = await supabase
    .from("webinars")
    .select(WEBINAR_COLUMNS)
    .eq("status", "published")
    .gte("date", todayIso)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: true })
    .limit(5)

  const webinars = (data ?? []) as Webinar[]
  if (webinars.length === 0) return null
  const ids = webinars.map((w) => w.id)
  const [counts, regs] = await Promise.all([
    countsByWebinar(supabase, ids),
    registeredIds(supabase, userId, ids),
  ])
  return attach(webinars, counts, regs)[0] ?? null
}

/** Webinaire par id (toutes colonnes, admin/lecture interne). */
export async function getWebinarById(id: string): Promise<Webinar | null> {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase.from("webinars").select(WEBINAR_COLUMNS).eq("id", id).maybeSingle()
  return (data as Webinar) ?? null
}

/** Webinaire par slug (pour preview publique). */
export async function getWebinarBySlug(slug: string): Promise<Webinar | null> {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase.from("webinars").select(WEBINAR_COLUMNS).eq("slug", slug).maybeSingle()
  return (data as Webinar) ?? null
}

export async function getRegistrationCount(webinarId: string): Promise<number> {
  const supabase = getSupabaseAdmin()
  const { count } = await supabase
    .from("webinar_registrations")
    .select("*", { count: "exact", head: true })
    .eq("webinar_id", webinarId)
    .eq("registration_status", "registered")
  return count ?? 0
}

export { WEBINAR_COLUMNS }
