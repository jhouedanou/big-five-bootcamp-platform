import { getSupabaseAdmin } from "@/lib/supabase"
import { mapRowToTempsFort } from "@/lib/temps-forts"
import type { TempsFort } from "@/types/temps-fort"

async function fetchPublishedCampaignCountsBySlug(supabase: any): Promise<Map<string, number> | null> {
  const { data, error } = await supabase
    .from("campaigns")
    .select("temps_fort_slugs, status")
    .in("status", ["Publié", "PubliÃ©"])

  if (error) {
    console.error("Error fetching campaign counts by temps fort:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    })
    return null
  }

  const counts = new Map<string, number>()
  for (const row of data || []) {
    for (const slug of row.temps_fort_slugs || []) {
      counts.set(slug, (counts.get(slug) || 0) + 1)
    }
  }
  return counts
}

export async function fetchAllTempsForts(): Promise<TempsFort[]> {
  const supabase = getSupabaseAdmin() as any
  const { data, error } = await supabase
    .from("temps_forts")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("event_date", { ascending: true })

  if (error) {
    console.error("Error fetching temps_forts:", error)
    return []
  }
  const counts = await fetchPublishedCampaignCountsBySlug(supabase)
  return (data || []).map((row: any) => {
    const tempsFort = mapRowToTempsFort(row)
    return counts ? { ...tempsFort, campaignCount: counts.get(tempsFort.slug) || 0 } : tempsFort
  })
}

export async function fetchTempsFortBySlug(slug: string): Promise<TempsFort | null> {
  const supabase = getSupabaseAdmin() as any
  const { data, error } = await supabase
    .from("temps_forts")
    .select("*")
    .eq("slug", slug)
    .maybeSingle()

  if (error || !data) return null
  return mapRowToTempsFort(data)
}

export async function fetchCampaignsByTempsFortSlug(slug: string): Promise<any[]> {
  const supabase = getSupabaseAdmin() as any
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .contains("temps_fort_slugs", [slug])
    .in("status", ["Publié", "PubliÃ©"])
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching campaigns by temps fort:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    })
    return []
  }
  return data || []
}
