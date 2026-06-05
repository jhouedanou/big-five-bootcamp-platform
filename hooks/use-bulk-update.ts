"use client"

import { useCallback, useMemo, useState } from "react"
import {
  bulkUpdateCampaigns,
  type BulkUpdateRow,
  type BulkUpdateRowResult,
  type BulkEditableField,
} from "@/app/actions/bulk-editor"

export type StagedValue = string | string[] | null

/** Modifications en attente, indexées par id de campagne. */
export type StagedChanges = Record<string, Partial<Record<BulkEditableField, StagedValue>>>

export function useBulkUpdate() {
  const [staged, setStaged] = useState<StagedChanges>({})
  const [results, setResults] = useState<BulkUpdateRowResult[] | null>(null)
  const [isApplying, setIsApplying] = useState(false)

  const stageChange = useCallback(
    (id: string, field: BulkEditableField, value: StagedValue) => {
      setStaged((prev) => ({
        ...prev,
        [id]: { ...prev[id], [field]: value },
      }))
    },
    [],
  )

  /** Applique la même valeur d'un champ à plusieurs campagnes (édition en masse). */
  const stageBulk = useCallback(
    (ids: string[], field: BulkEditableField, value: StagedValue) => {
      setStaged((prev) => {
        const next = { ...prev }
        for (const id of ids) next[id] = { ...next[id], [field]: value }
        return next
      })
    },
    [],
  )

  const discardChange = useCallback((id: string, field: BulkEditableField) => {
    setStaged((prev) => {
      const row = { ...prev[id] }
      delete row[field]
      const next = { ...prev }
      if (Object.keys(row).length === 0) delete next[id]
      else next[id] = row
      return next
    })
  }, [])

  const reset = useCallback(() => {
    setStaged({})
    setResults(null)
  }, [])

  const changedIds = useMemo(() => Object.keys(staged), [staged])
  const changeCount = useMemo(
    () => Object.values(staged).reduce((acc, row) => acc + Object.keys(row).length, 0),
    [staged],
  )

  /** Construit le diff prêt à l'envoi. */
  const buildRows = useCallback((): BulkUpdateRow[] => {
    return Object.entries(staged).map(([id, changes]) => ({ id, changes }))
  }, [staged])

  const apply = useCallback(async (): Promise<BulkUpdateRowResult[]> => {
    const rows = buildRows()
    if (rows.length === 0) return []
    setIsApplying(true)
    setResults(null)
    try {
      const res = await bulkUpdateCampaigns(rows)
      if (!res.success) {
        const errAll: BulkUpdateRowResult[] = rows.map((r) => ({
          id: r.id,
          ok: false,
          error: res.error || "Échec",
        }))
        setResults(errAll)
        return errAll
      }
      const out = res.results || []
      setResults(out)
      return out
    } finally {
      setIsApplying(false)
    }
  }, [buildRows])

  return {
    staged,
    stageChange,
    stageBulk,
    discardChange,
    reset,
    changedIds,
    changeCount,
    buildRows,
    apply,
    results,
    isApplying,
  }
}
