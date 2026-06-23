import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkAdmin } from "@/lib/admin-auth"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { safeErrorMessage } from "@/lib/api-errors"
import {
  applyUserFilters,
  applyActivityStatusFilter,
  BULK_MAX,
  type UserFilters,
} from "@/lib/admin-segmentation"

export const dynamic = "force-dynamic"

const filtersSchema = z.object({
  country: z.string().nullable().optional(),
  subscription_plan: z.string().nullable().optional(),
  access_type: z.string().nullable().optional(),
  subscription_status: z.string().nullable().optional(),
  activity_status: z.string().nullable().optional(),
  date_from: z.string().nullable().optional(),
  date_to: z.string().nullable().optional(),
  search: z.string().nullable().optional(),
  tag: z.string().nullable().optional(),
})

const schema = z
  .object({
    tag_id: z.string().uuid(),
    mode: z.enum(["ids", "filter"]),
    user_ids: z.array(z.string().uuid()).max(BULK_MAX).optional(),
    filters: filtersSchema.optional(),
  })
  .refine((d) => (d.mode === "ids" ? !!d.user_ids?.length : !!d.filters), {
    message: "Paramètres incomplets pour le mode choisi",
  })

async function resolveTagId(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  tag: string
): Promise<string | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tag)
  const { data } = await supabase
    .from("tags")
    .select("id")
    .eq(isUuid ? "id" : "slug", tag)
    .maybeSingle()
  return data?.id ?? null
}

/** Récupère tous les user_ids correspondant aux filtres (plafonné à BULK_MAX). */
async function collectFilteredUserIds(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  filters: UserFilters
): Promise<string[]> {
  let tagUserIds: string[] | null = null
  if (filters.tag) {
    const tagId = await resolveTagId(supabase, filters.tag)
    if (!tagId) return []
    const { data } = await supabase.from("user_tags").select("user_id").eq("tag_id", tagId)
    tagUserIds = (data ?? []).map((l) => l.user_id)
    if (tagUserIds.length === 0) return []
  }

  let query = supabase.from("admin_users").select("id")
  query = applyUserFilters(query, filters)
  query = applyActivityStatusFilter(query, filters.activity_status)
  if (tagUserIds) query = query.in("id", tagUserIds)

  const { data } = await query.range(0, BULK_MAX - 1)
  return (data ?? []).map((r: any) => r.id)
}

/**
 * POST /api/admin/users/bulk-tags
 * Applique un tag à plusieurs utilisateurs : sélection explicite (`ids`) ou
 * tous les résultats d'un filtre (`filter`). Admin only.
 */
export async function POST(request: NextRequest) {
  const admin = await checkAdmin()
  if (!admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 })

  const json = await request.json().catch(() => null)
  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  let userIds: string[]
  if (parsed.data.mode === "ids") {
    userIds = parsed.data.user_ids ?? []
  } else {
    userIds = await collectFilteredUserIds(supabase, parsed.data.filters as UserFilters)
  }

  if (userIds.length === 0) {
    return NextResponse.json({ success: true, applied: 0 })
  }

  const rows = userIds.map((user_id) => ({
    user_id,
    tag_id: parsed.data.tag_id,
    assigned_by: admin.id,
  }))

  const { error } = await supabase
    .from("user_tags")
    .upsert(rows, { onConflict: "user_id,tag_id", ignoreDuplicates: true })

  if (error) {
    return NextResponse.json(
      { error: "Application impossible", details: safeErrorMessage(error) },
      { status: 500 }
    )
  }

  await supabase.from("analytics_events").insert({
    user_id: admin.id,
    event_name: "admin_bulk_tag_applied",
    source: "admin",
    metadata: {
      tag_id: parsed.data.tag_id,
      mode: parsed.data.mode,
      count: userIds.length,
    },
  })

  return NextResponse.json({ success: true, applied: userIds.length })
}
