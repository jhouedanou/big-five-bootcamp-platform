"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { checkAdmin } from "@/lib/admin-auth"
import { isGoogleDriveHostedUrl } from "@/lib/utils"
import { validateMediaUrl, inChunks } from "@/lib/media-validate-server"

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY required for admin operations")
  }
  return createClient(url, key)
}

const BULK_LIST_COLUMNS =
  "id, title, slug, brand, status, format, category, thumbnail, video_url, platforms, tags, created_at"

export interface BulkCampaign {
  id: string
  title: string | null
  slug: string | null
  brand: string | null
  status: string | null
  format: string | null
  category: string | null
  thumbnail: string | null
  video_url: string | null
  platforms: string[] | null
  tags: string[] | null
  created_at: string | null
}

/** Champs éditables en masse — liste blanche stricte (sécurité). */
export type BulkEditableField = "thumbnail" | "video_url" | "status" | "brand" | "format" | "tags"

const ALLOWED_FIELDS: BulkEditableField[] = [
  "thumbnail",
  "video_url",
  "status",
  "brand",
  "format",
  "tags",
]

const ALLOWED_STATUSES = ["Brouillon", "En attente", "Publié"]

export interface BulkUpdateRow {
  id: string
  changes: Partial<Record<BulkEditableField, string | string[] | null>>
}

export interface BulkUpdateRowResult {
  id: string
  ok: boolean
  error?: string
}

export interface SecureDriveItem {
  id: string
  slug: string | null
  title: string | null
  status: "secured" | "restricted" | "error"
  oldUrl: string
  newUrl?: string
  reason?: string
}

export interface SecureDriveSummary {
  success: boolean
  error?: string
  totalDrive?: number
  secured?: number
  restricted?: number
  errors?: number
  items?: SecureDriveItem[]
}

/**
 * Re-héberge en masse toutes les thumbnails Google Drive sur Supabase.
 * Pour chaque image Drive : sonde l'accès, et si publique télécharge + ré-upload
 * vers le bucket Supabase, puis met à jour `campaigns.thumbnail`. Les images
 * restreintes sont listées (à corriger côté partage Drive). Idempotent : une
 * image déjà re-hébergée n'est plus un lien Drive, donc ignorée au prochain run.
 */
export async function bulkSecureDriveImages(): Promise<SecureDriveSummary> {
  try {
    const admin = await checkAdmin()
    if (!admin) return { success: false, error: "Accès refusé : admin requis" }

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from("campaigns")
      .select("id, slug, title, thumbnail")
      .limit(2000)
    if (error) throw error

    const targets = (data as unknown as Array<{ id: string; slug: string | null; title: string | null; thumbnail: string | null }>)
      .filter((c) => c.thumbnail && isGoogleDriveHostedUrl(c.thumbnail))

    if (targets.length === 0) {
      return { success: true, totalDrive: 0, secured: 0, restricted: 0, errors: 0, items: [] }
    }

    const items = await inChunks(targets, 5, async (c): Promise<SecureDriveItem> => {
      const oldUrl = c.thumbnail as string
      try {
        const r = await validateMediaUrl(oldUrl)
        if (r.ok && r.rehostedUrl) {
          const { error: upErr } = await supabase
            .from("campaigns")
            .update({ thumbnail: r.rehostedUrl })
            .eq("id", c.id)
          if (upErr) {
            return { id: c.id, slug: c.slug, title: c.title, status: "error", oldUrl, reason: upErr.message }
          }
          return { id: c.id, slug: c.slug, title: c.title, status: "secured", oldUrl, newUrl: r.rehostedUrl }
        }
        // Vidéo Drive publique (pas d'image à re-héberger) → considérée OK mais non modifiée.
        if (r.ok && !r.rehostedUrl) {
          return { id: c.id, slug: c.slug, title: c.title, status: "secured", oldUrl }
        }
        return { id: c.id, slug: c.slug, title: c.title, status: "restricted", oldUrl, reason: r.reason || "Accès restreint" }
      } catch (e: any) {
        return { id: c.id, slug: c.slug, title: c.title, status: "error", oldUrl, reason: e?.message || "Erreur" }
      }
    })

    const secured = items.filter((i) => i.status === "secured").length
    const restricted = items.filter((i) => i.status === "restricted").length
    const errors = items.filter((i) => i.status === "error").length

    revalidatePath("/admin/bulk-editor")
    revalidatePath("/admin/campaigns")
    revalidatePath("/library")
    revalidatePath("/dashboard")
    return { success: true, totalDrive: targets.length, secured, restricted, errors, items }
  } catch (error: any) {
    console.error("bulkSecureDriveImages error:", error)
    return { success: false, error: error?.message || "Échec du re-hébergement" }
  }
}

export async function getBulkEditorCampaigns(): Promise<{
  success: boolean
  data?: BulkCampaign[]
  error?: string
}> {
  try {
    const admin = await checkAdmin()
    if (!admin) return { success: false, error: "Accès refusé : admin requis" }

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from("campaigns")
      .select(BULK_LIST_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(1000)

    if (error) throw error
    return { success: true, data: (data as unknown as BulkCampaign[]) || [] }
  } catch (error: any) {
    console.error("getBulkEditorCampaigns error:", error)
    return { success: false, error: error?.message || "Échec du chargement" }
  }
}

/**
 * Met à jour plusieurs campagnes en une fois. Chaque ligne ne touche que les
 * champs explicitement modifiés (liste blanche). Retourne un statut par ligne
 * pour alimenter le feedback et l'export CSV des erreurs.
 */
export async function bulkUpdateCampaigns(
  rows: BulkUpdateRow[],
): Promise<{ success: boolean; results?: BulkUpdateRowResult[]; error?: string }> {
  try {
    const admin = await checkAdmin()
    if (!admin) return { success: false, error: "Accès refusé : admin requis" }

    if (!Array.isArray(rows) || rows.length === 0) {
      return { success: false, error: "Aucune modification fournie" }
    }
    if (rows.length > 1000) {
      return { success: false, error: "Maximum 1000 campagnes par lot" }
    }

    const supabase = getSupabaseAdmin()
    const results: BulkUpdateRowResult[] = []

    const CHUNK = 50
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK)
      const settled = await Promise.all(
        chunk.map(async (row): Promise<BulkUpdateRowResult> => {
          if (!row.id) return { id: row.id || "?", ok: false, error: "id manquant" }

          // Construire le patch à partir de la seule liste blanche.
          const patch: Record<string, unknown> = {}
          for (const field of ALLOWED_FIELDS) {
            if (!(field in row.changes)) continue
            let value = row.changes[field]

            if (field === "status") {
              if (typeof value !== "string" || !ALLOWED_STATUSES.includes(value)) {
                return { id: row.id, ok: false, error: `statut invalide: ${String(value)}` }
              }
            }
            if (field === "tags" && value != null && !Array.isArray(value)) {
              // Tolérer une chaîne "a, b, c" → tableau.
              value = String(value)
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            }
            if ((field === "video_url" || field === "thumbnail" || field === "brand") && value === "") {
              value = null
            }
            patch[field] = value
          }

          if (Object.keys(patch).length === 0) {
            return { id: row.id, ok: true }
          }

          const { error } = await supabase.from("campaigns").update(patch).eq("id", row.id)
          if (error) return { id: row.id, ok: false, error: error.message }
          return { id: row.id, ok: true }
        }),
      )
      results.push(...settled)
    }

    revalidatePath("/admin/creatives")
    revalidatePath("/admin/campaigns")
    revalidatePath("/library")
    revalidatePath("/dashboard")
    return { success: true, results }
  } catch (error: any) {
    console.error("bulkUpdateCampaigns error:", error)
    return { success: false, error: error?.message || "Échec de la mise à jour" }
  }
}
