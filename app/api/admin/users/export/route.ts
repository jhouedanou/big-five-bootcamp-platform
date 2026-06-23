/**
 * GET /api/admin/users/export
 * Export CSV de l'audience (admin only). Accepte les mêmes filtres que
 * GET /api/admin/users (country, plan, accès, statut, activité, dates,
 * recherche, tag) et exporte TOUTES les lignes correspondantes, pas
 * seulement la page courante.
 */

import { NextRequest, NextResponse } from "next/server"
import { checkAdmin } from "@/lib/admin-auth"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { safeErrorMessage } from "@/lib/api-errors"
import {
  applyUserFilters,
  applyActivityStatusFilter,
  parseFilters,
  accessTypeLabel,
  subscriptionPlanLabel,
  subscriptionStatusLabel,
  activityStatusLabel,
  getActivityStatus,
  type AdminUserRow,
  type TagSummary,
} from "@/lib/admin-segmentation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Plafond de sécurité pour éviter un export démesuré. */
const EXPORT_MAX_ROWS = 20_000
/** Taille de page Supabase (limite serveur par requête). */
const BATCH = 1000

function csvEscape(v: unknown): string {
  if (v == null) return ""
  const s = String(v)
  if (/[",\n;]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}

export async function GET(request: NextRequest) {
  try {
    const admin = await checkAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const filters = parseFilters(searchParams)
    const supabase = getSupabaseAdmin()

    // Filtre par tag → restreindre l'ensemble des user_ids (même logique que
    // GET /api/admin/users).
    let tagUserIds: string[] | null = null
    if (filters.tag) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(filters.tag)
      const { data: tagRow } = await supabase
        .from("tags")
        .select("id")
        .eq(isUuid ? "id" : "slug", filters.tag)
        .maybeSingle()
      if (!tagRow?.id) tagUserIds = []
      else {
        const { data: links } = await supabase
          .from("user_tags")
          .select("user_id")
          .eq("tag_id", tagRow.id)
        tagUserIds = (links ?? []).map((l) => l.user_id)
      }
    }

    // Récupération paginée de toutes les lignes correspondantes.
    const rows: Omit<AdminUserRow, "tags">[] = []
    if (!(tagUserIds && tagUserIds.length === 0)) {
      for (let from = 0; from < EXPORT_MAX_ROWS; from += BATCH) {
        let query = supabase.from("admin_users").select("*")
        query = applyUserFilters(query, filters)
        query = applyActivityStatusFilter(query, filters.activity_status)
        if (tagUserIds) query = query.in("id", tagUserIds)

        const { data, error } = await query
          .order("created_at", { ascending: false })
          .range(from, from + BATCH - 1)
        if (error) {
          return NextResponse.json(
            { error: "Erreur de chargement", details: safeErrorMessage(error) },
            { status: 500 }
          )
        }
        const batch = (data ?? []) as Omit<AdminUserRow, "tags">[]
        rows.push(...batch)
        if (batch.length < BATCH) break
      }
    }

    // Tags par utilisateur (chunks pour éviter des .in() trop longs).
    const tagsByUser = new Map<string, string[]>()
    const ids = rows.map((r) => r.id)
    for (let i = 0; i < ids.length; i += 500) {
      const chunk = ids.slice(i, i + 500)
      const { data: tagLinks } = await supabase
        .from("user_tags")
        .select("user_id, tags ( id, name, slug, color )")
        .in("user_id", chunk)
      for (const link of tagLinks ?? []) {
        const t = (link as any).tags as TagSummary | null
        if (!t) continue
        const list = tagsByUser.get((link as any).user_id) ?? []
        list.push(t.name)
        tagsByUser.set((link as any).user_id, list)
      }
    }

    const headers = [
      "nom",
      "email",
      "telephone",
      "pays",
      "inscription",
      "derniere_connexion",
      "derniere_activite",
      "statut_activite",
      "plan_abonnement",
      "type_acces",
      "statut_abonnement",
      "tags",
    ]
    const lines = [headers.join(",")]
    for (const r of rows) {
      lines.push(
        [
          r.name,
          r.email,
          r.phone_number,
          r.country,
          r.created_at,
          r.last_login_at,
          r.last_activity_at,
          activityStatusLabel(getActivityStatus(r.last_login_at, r.last_activity_at)),
          subscriptionPlanLabel(r.subscription_plan),
          accessTypeLabel(r.access_type),
          subscriptionStatusLabel(r.subscription_status),
          (tagsByUser.get(r.id) ?? []).join(" | "),
        ]
          .map(csvEscape)
          .join(",")
      )
    }

    // BOM UTF-8 pour qu'Excel affiche correctement les accents.
    const csv = "\uFEFF" + lines.join("\n")
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audience-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur serveur", details: safeErrorMessage(err) },
      { status: 500 }
    )
  }
}
