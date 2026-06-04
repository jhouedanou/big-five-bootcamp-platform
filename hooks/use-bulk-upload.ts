"use client"

import { useCallback, useState } from "react"

/** Limite stricte par fichier dans le bulk editor (≠ /api/upload qui est à 10MB). */
export const BULK_MAX_FILE_BYTES = 2 * 1024 * 1024 // 2 MB
export const BULK_MAX_FILE_LABEL = "2 Mo"
export const RESIZE_HINT =
  "Image trop lourde (> 2 Mo). Compressez-la d'abord avec un outil comme iLoveIMG (iloveimg.com) ou iLovePDF, puis réessayez."

const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]

export type UploadStatus = "pending" | "uploading" | "done" | "error" | "unmatched" | "oversize"

export interface BulkUploadItem {
  id: string // clé locale (filename + index)
  file: File
  fileName: string
  status: UploadStatus
  progress: number // 0..100
  matchedCampaignId: string | null
  matchedSlug: string | null
  url: string | null // URL publique après upload
  error: string | null
}

export interface SlugTarget {
  id: string
  slug: string | null
}

/** Normalise un nom (fichier ou slug) pour le rapprochement. */
function normalizeForMatch(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // accents combinants
    .replace(/\.[a-z0-9]+$/i, "") // extension
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** Rapproche un nom de fichier d'un slug de campagne. Retourne l'id ou null. */
function matchFileToCampaign(fileName: string, targets: SlugTarget[]): SlugTarget | null {
  const key = normalizeForMatch(fileName)
  if (!key) return null
  // 1) match exact slug
  const exact = targets.find((t) => t.slug && normalizeForMatch(t.slug) === key)
  if (exact) return exact
  // 2) le nom de fichier commence par le slug (orange-senegal-v2.jpg → orange-senegal)
  const prefix = targets.find((t) => t.slug && key.startsWith(normalizeForMatch(t.slug)))
  if (prefix) return prefix
  return null
}

function uploadWithProgress(
  file: File,
  onProgress: (pct: number) => void,
): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", "/api/upload")
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300 && res.url) resolve({ url: res.url })
        else reject(new Error(res?.error || `Upload échoué (${xhr.status})`))
      } catch {
        reject(new Error("Réponse upload invalide"))
      }
    }
    xhr.onerror = () => reject(new Error("Erreur réseau pendant l'upload"))
    const fd = new FormData()
    fd.append("file", file)
    xhr.send(fd)
  })
}

export function useBulkUpload(targets: SlugTarget[]) {
  const [items, setItems] = useState<BulkUploadItem[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const patch = useCallback((id: string, p: Partial<BulkUploadItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...p } : it)))
  }, [])

  /** Ajoute des fichiers : validation 2MB + type, auto-matching slug. */
  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const incoming = Array.from(files)
      const mapped: BulkUploadItem[] = incoming.map((file, i) => {
        const id = `${file.name}-${Date.now()}-${i}`
        const base: BulkUploadItem = {
          id,
          file,
          fileName: file.name,
          status: "pending",
          progress: 0,
          matchedCampaignId: null,
          matchedSlug: null,
          url: null,
          error: null,
        }
        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
          return { ...base, status: "error", error: `Type non supporté: ${file.type || "inconnu"}` }
        }
        if (file.size > BULK_MAX_FILE_BYTES) {
          return { ...base, status: "oversize", error: RESIZE_HINT }
        }
        const match = matchFileToCampaign(file.name, targets)
        if (!match) return { ...base, status: "unmatched", error: "Aucune campagne correspondante" }
        return { ...base, matchedCampaignId: match.id, matchedSlug: match.slug }
      })
      setItems((prev) => [...prev, ...mapped])
    },
    [targets],
  )

  /** Réassigne manuellement un fichier non-matché à une campagne. */
  const assignManual = useCallback(
    (itemId: string, campaignId: string, slug: string | null) => {
      patch(itemId, { matchedCampaignId: campaignId, matchedSlug: slug, status: "pending", error: null })
    },
    [patch],
  )

  const removeItem = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((it) => it.id !== itemId))
  }, [])

  const clear = useCallback(() => setItems([]), [])

  /** Upload tous les fichiers prêts (matchés, sous la limite). */
  const uploadAll = useCallback(async (): Promise<BulkUploadItem[]> => {
    setIsUploading(true)
    const ready = items.filter((it) => it.matchedCampaignId && (it.status === "pending" || it.status === "error"))
    try {
      for (const it of ready) {
        patch(it.id, { status: "uploading", progress: 0, error: null })
        try {
          const { url } = await uploadWithProgress(it.file, (pct) => patch(it.id, { progress: pct }))
          patch(it.id, { status: "done", progress: 100, url })
        } catch (e: any) {
          patch(it.id, { status: "error", error: e?.message || "Échec" })
        }
      }
    } finally {
      setIsUploading(false)
    }
    // Retourne l'état final (lecture via callback pour éviter la stale closure).
    return await new Promise((resolve) => setItems((cur) => (resolve(cur), cur)))
  }, [items, patch])

  return { items, isUploading, addFiles, assignManual, removeItem, clear, uploadAll }
}
