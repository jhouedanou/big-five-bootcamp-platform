"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { checkAdmin } from "@/lib/admin-auth"
import {
  probeImageUrl,
  secureImageUrl,
  inChunks,
} from "@/lib/media-validate-server"
import { classifyMediaHosting, type MediaState } from "@/lib/media-validation"

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) {
    throw new Error("SUPABASE_SECRET_KEY required for admin operations")
  }
  return createClient(url, key)
}

const BULK_LIST_COLUMNS =
  "id, title, slug, brand, status, format, category, thumbnail, video_url, platforms, tags, created_at, media_status, media_checked_at, media_reason"

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
  media_status: MediaState | null
  media_checked_at: string | null
  media_reason: string | null
}

/** Origine du stockage LAVEIYE : ce qui sépare « sécurisé » d'« externe ». */
function storageOrigin(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL manquante")
  return url
}

/**
 * Un traitement en masse ne peut pas balayer 833 campagnes dans une seule
 * requête : chaque visuel impose un aller-retour réseau, et la fonction
 * serverless expirerait bien avant la fin. L'interface découpe donc en lots et
 * affiche l'avancement ; cette borne empêche de contourner le découpage.
 */
const MAX_BATCH = 150

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

export interface MediaCounts {
  secured: number
  external: number
  broken: number
  empty: number
  unchecked: number
  total: number
}

export interface MediaAuditSummary {
  success: boolean
  error?: string
  checked?: number
  counts?: MediaCounts
}

/** Compteurs par état, lus depuis la colonne persistée (aucun accès réseau). */
export async function getMediaCounts(): Promise<{
  success: boolean
  counts?: MediaCounts
  error?: string
}> {
  try {
    const admin = await checkAdmin()
    if (!admin) return { success: false, error: "Accès refusé : admin requis" }

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase.from("campaigns").select("media_status").limit(5000)
    if (error) throw error

    const rows = (data as unknown as Array<{ media_status: MediaState | null }>) || []
    const counts: MediaCounts = {
      secured: 0,
      external: 0,
      broken: 0,
      empty: 0,
      unchecked: 0,
      total: rows.length,
    }
    for (const r of rows) {
      if (r.media_status === null) counts.unchecked++
      else counts[r.media_status]++
    }
    return { success: true, counts }
  } catch (error: any) {
    console.error("getMediaCounts error:", error)
    return { success: false, error: error?.message || "Échec du comptage" }
  }
}

/** Ids à auditer ou à sécuriser, dans l'ordre, pour que l'interface découpe. */
export async function getCampaignIdsForMediaWork(
  scope: "all" | "external" | "unchecked",
): Promise<{ success: boolean; ids?: string[]; error?: string }> {
  try {
    const admin = await checkAdmin()
    if (!admin) return { success: false, error: "Accès refusé : admin requis" }

    const supabase = getSupabaseAdmin()
    let query = supabase.from("campaigns").select("id").limit(5000)
    if (scope === "external") query = query.eq("media_status", "external")
    if (scope === "unchecked") query = query.is("media_status", null)

    const { data, error } = await query
    if (error) throw error
    return { success: true, ids: (data as unknown as Array<{ id: string }>).map((r) => r.id) }
  } catch (error: any) {
    console.error("getCampaignIdsForMediaWork error:", error)
    return { success: false, error: error?.message || "Échec du chargement" }
  }
}

/**
 * Audite l'état des visuels d'un lot de campagnes et l'enregistre en base.
 *
 * Strictement en lecture seule côté médias : la sonde ne télécharge que
 * l'en-tête du fichier et ne téléverse rien. C'est ce qui permet de la passer
 * sur toute la bibliothèque, et de la rejouer chaque nuit, sans risque.
 *
 * Un visuel qui répond `HTTP 200` mais dont les octets ne sont pas ceux d'une
 * image est classé « inaccessible » : c'est le cas d'un fichier Drive supprimé,
 * pour lequel Google sert sa page de connexion sans jamais renvoyer d'erreur.
 */
export async function auditCampaignMedia(ids?: string[]): Promise<MediaAuditSummary> {
  try {
    const admin = await checkAdmin()
    if (!admin) return { success: false, error: "Accès refusé : admin requis" }
    if (ids && ids.length > MAX_BATCH) {
      return { success: false, error: `Maximum ${MAX_BATCH} campagnes par lot` }
    }

    const supabase = getSupabaseAdmin()
    let query = supabase.from("campaigns").select("id, thumbnail").limit(MAX_BATCH)
    if (ids?.length) query = query.in("id", ids)

    const { data, error } = await query
    if (error) throw error

    const rows =
      (data as unknown as Array<{ id: string; thumbnail: string | null }>) || []
    const origin = storageOrigin()
    const checkedAt = new Date().toISOString()

    await inChunks(rows, 6, async (c) => {
      const hosting = classifyMediaHosting(c.thumbnail, origin)

      let state: MediaState = hosting
      let reason: string | null = null

      if (hosting !== "empty") {
        const probe = await probeImageUrl(c.thumbnail as string)
        if (!probe.ok) {
          state = "broken"
          reason = probe.reason
        }
      }

      await supabase
        .from("campaigns")
        .update({
          media_status: state,
          media_checked_at: checkedAt,
          media_reason: reason,
        })
        .eq("id", c.id)
    })

    revalidatePath("/admin/bulk-editor")
    const { counts } = await getMediaCounts()
    return { success: true, checked: rows.length, counts }
  } catch (error: any) {
    console.error("auditCampaignMedia error:", error)
    return { success: false, error: error?.message || "Échec de l'audit" }
  }
}

/**
 * Rapatrie dans le stockage LAVEIYE les visuels encore servis par une source
 * externe, et remplace l'URL de la campagne par l'URL stable.
 *
 * Sans `ids`, porte sur toutes les campagnes marquées « externe » dans la
 * limite d'un lot. L'URL d'origine est conservée dans `media_source_url` : la
 * migration reste traçable et réversible.
 *
 * Idempotent : une campagne déjà sécurisée n'est plus « externe », donc elle
 * n'est plus reprise au passage suivant.
 */
export async function bulkSecureDriveImages(ids?: string[]): Promise<SecureDriveSummary> {
  try {
    const admin = await checkAdmin()
    if (!admin) return { success: false, error: "Accès refusé : admin requis" }
    if (ids && ids.length > MAX_BATCH) {
      return { success: false, error: `Maximum ${MAX_BATCH} campagnes par lot` }
    }

    const supabase = getSupabaseAdmin()
    let query = supabase
      .from("campaigns")
      .select("id, slug, title, thumbnail")
      .limit(MAX_BATCH)
    if (ids?.length) query = query.in("id", ids)
    else query = query.eq("media_status", "external")

    const { data, error } = await query
    if (error) throw error

    const origin = storageOrigin()
    const targets = (
      data as unknown as Array<{
        id: string
        slug: string | null
        title: string | null
        thumbnail: string | null
      }>
    ).filter((c) => classifyMediaHosting(c.thumbnail, origin) === "external")

    if (targets.length === 0) {
      return { success: true, totalDrive: 0, secured: 0, restricted: 0, errors: 0, items: [] }
    }

    const checkedAt = new Date().toISOString()

    const items = await inChunks(targets, 5, async (c): Promise<SecureDriveItem> => {
      const oldUrl = c.thumbnail as string
      const base = { id: c.id, slug: c.slug, title: c.title, oldUrl }
      try {
        const r = await secureImageUrl(oldUrl)

        if (!r.ok || !r.url) {
          await supabase
            .from("campaigns")
            .update({
              media_status: "broken",
              media_checked_at: checkedAt,
              media_reason: r.reason || "Récupération impossible",
            })
            .eq("id", c.id)
          return { ...base, status: "restricted", reason: r.reason || "Récupération impossible" }
        }

        const { error: upErr } = await supabase
          .from("campaigns")
          .update({
            thumbnail: r.url,
            media_source_url: oldUrl,
            media_status: "secured",
            media_checked_at: checkedAt,
            media_reason: null,
          })
          .eq("id", c.id)

        if (upErr) return { ...base, status: "error", reason: upErr.message }
        return { ...base, status: "secured", newUrl: r.url }
      } catch (e: any) {
        return { ...base, status: "error", reason: e?.message || "Erreur" }
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

          // Un visuel remplacé à la main change d'état : sans cela, la pastille
          // et les compteurs resteraient sur le verdict de l'audit précédent.
          if ("thumbnail" in patch) {
            const next = classifyMediaHosting(patch.thumbnail as string | null, storageOrigin())
            patch.media_status = next
            patch.media_checked_at = new Date().toISOString()
            patch.media_reason = null
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
