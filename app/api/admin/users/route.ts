import { NextRequest, NextResponse } from "next/server"
import { checkAdmin } from "@/lib/admin-auth"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { safeErrorMessage } from "@/lib/api-errors"
import {
  applyUserFilters,
  applyActivityStatusFilter,
  parseFilters,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  type AdminUserRow,
  type TagSummary,
} from "@/lib/admin-segmentation"

export const dynamic = "force-dynamic"

/**
 * Résout un identifiant de tag (UUID) à partir d'un id ou d'un slug.
 */
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

/**
 * GET /api/admin/users
 * Liste paginée + filtrable des utilisateurs (admin only, pagination serveur).
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await checkAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const filters = parseFilters(searchParams)

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1)
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE)
    )

    const supabase = getSupabaseAdmin()

    // Filtre par tag → restreindre l'ensemble des user_ids.
    let tagUserIds: string[] | null = null
    if (filters.tag) {
      const tagId = await resolveTagId(supabase, filters.tag)
      if (!tagId) {
        return NextResponse.json({ users: [], total: 0, page, limit, totalPages: 0 })
      }
      const { data: links } = await supabase
        .from("user_tags")
        .select("user_id")
        .eq("tag_id", tagId)
      tagUserIds = (links ?? []).map((l) => l.user_id)
      if (tagUserIds.length === 0) {
        return NextResponse.json({ users: [], total: 0, page, limit, totalPages: 0 })
      }
    }

    let query = supabase.from("admin_users").select("*", { count: "exact" })
    query = applyUserFilters(query, filters)
    query = applyActivityStatusFilter(query, filters.activity_status)
    if (tagUserIds) query = query.in("id", tagUserIds)

    const from = (page - 1) * limit
    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, from + limit - 1)

    if (error) {
      return NextResponse.json(
        { error: "Erreur de chargement", details: safeErrorMessage(error) },
        { status: 500 }
      )
    }

    const rows = (data ?? []) as Omit<AdminUserRow, "tags">[]

    // Charger les tags des utilisateurs de la page.
    const userIds = rows.map((r) => r.id)
    const tagsByUser = new Map<string, TagSummary[]>()
    if (userIds.length > 0) {
      const { data: tagLinks } = await supabase
        .from("user_tags")
        .select("user_id, tags ( id, name, slug, color )")
        .in("user_id", userIds)

      for (const link of tagLinks ?? []) {
        const t = (link as any).tags as TagSummary | null
        if (!t) continue
        const list = tagsByUser.get((link as any).user_id) ?? []
        list.push(t)
        tagsByUser.set((link as any).user_id, list)
      }
    }

    const users: AdminUserRow[] = rows.map((r) => ({
      ...r,
      tags: tagsByUser.get(r.id) ?? [],
    }))

    const total = count ?? 0
    return NextResponse.json({
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur serveur", details: safeErrorMessage(err) },
      { status: 500 }
    )
  }
}
