"use client"

import { useCallback, useState } from "react"
import {
  auditCampaignMedia,
  bulkSecureDriveImages,
  getMediaCounts,
  type MediaCounts,
  type SecureDriveItem,
} from "@/app/actions/bulk-editor"

/**
 * Pilote l'audit et la sécurisation des visuels depuis l'Éditeur en masse.
 *
 * Le découpage en lots n'est pas un confort : auditer les 833 campagnes prend
 * environ 90 secondes de requêtes réseau, et la sécurisation télécharge chaque
 * fichier (1,2 Mo en médiane). Une requête unique expirerait. On envoie donc des
 * lots successifs, ce qui donne en prime un avancement visible plutôt qu'une
 * attente muette.
 *
 * La sécurisation utilise des lots plus petits que l'audit : elle transfère les
 * octets, là où l'audit ne lit que l'en-tête des fichiers.
 */

const AUDIT_BATCH = 60
const SECURE_BATCH = 20

export interface MediaJobProgress {
  done: number
  total: number
  label: string
}

export interface MediaJobResult {
  kind: "audit" | "secure"
  selected: number
  secured: number
  failed: number
  items: SecureDriveItem[]
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

export function useMediaSecuring() {
  const [running, setRunning] = useState<null | "audit" | "secure">(null)
  const [progress, setProgress] = useState<MediaJobProgress | null>(null)
  const [result, setResult] = useState<MediaJobResult | null>(null)
  const [counts, setCounts] = useState<MediaCounts | null>(null)

  const refreshCounts = useCallback(async () => {
    const r = await getMediaCounts()
    if (r.success && r.counts) setCounts(r.counts)
    return r.counts ?? null
  }, [])

  const audit = useCallback(
    async (ids: string[]): Promise<{ ok: boolean; error?: string }> => {
      if (ids.length === 0) return { ok: false, error: "Aucune campagne à auditer" }
      setRunning("audit")
      setResult(null)
      setProgress({ done: 0, total: ids.length, label: "Contrôle des visuels…" })

      try {
        let done = 0
        for (const batch of chunk(ids, AUDIT_BATCH)) {
          const r = await auditCampaignMedia(batch)
          if (!r.success) return { ok: false, error: r.error }
          done += batch.length
          setProgress({ done, total: ids.length, label: "Contrôle des visuels…" })
        }
        await refreshCounts()
        setResult({ kind: "audit", selected: ids.length, secured: 0, failed: 0, items: [] })
        return { ok: true }
      } catch (e: any) {
        return { ok: false, error: e?.message || "Échec de l'audit" }
      } finally {
        setRunning(null)
        setProgress(null)
      }
    },
    [refreshCounts],
  )

  const secure = useCallback(
    async (ids: string[]): Promise<{ ok: boolean; error?: string }> => {
      if (ids.length === 0) return { ok: false, error: "Aucune campagne sélectionnée" }
      setRunning("secure")
      setResult(null)
      setProgress({ done: 0, total: ids.length, label: "Sécurisation des médias…" })

      try {
        let done = 0
        const items: SecureDriveItem[] = []

        for (const batch of chunk(ids, SECURE_BATCH)) {
          const r = await bulkSecureDriveImages(batch)
          if (!r.success) return { ok: false, error: r.error }
          items.push(...(r.items ?? []))
          done += batch.length
          setProgress({ done, total: ids.length, label: "Sécurisation des médias…" })
        }

        const secured = items.filter((i) => i.status === "secured").length
        await refreshCounts()
        setResult({
          kind: "secure",
          selected: ids.length,
          secured,
          failed: items.length - secured,
          items,
        })
        return { ok: true }
      } catch (e: any) {
        return { ok: false, error: e?.message || "Échec de la sécurisation" }
      } finally {
        setRunning(null)
        setProgress(null)
      }
    },
    [refreshCounts],
  )

  return {
    running,
    progress,
    result,
    counts,
    refreshCounts,
    audit,
    secure,
    clearResult: () => setResult(null),
  }
}

/** Exceptions d'un traitement, au format CSV — le réupload manuel part de là. */
export function mediaExceptionsCsv(items: SecureDriveItem[]): string {
  const rows = [
    ["slug", "titre", "url_origine", "motif"],
    ...items
      .filter((i) => i.status !== "secured")
      .map((i) => [i.slug ?? "", i.title ?? "", i.oldUrl, i.reason ?? ""]),
  ]
  return rows
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n")
}
