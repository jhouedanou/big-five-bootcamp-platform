"use client"

import { useEffect, useState } from "react"
import type { TempsFort } from "@/types/temps-fort"

let cache: TempsFort[] | null = null
let inflight: Promise<TempsFort[]> | null = null
const listeners = new Set<(list: TempsFort[]) => void>()

export async function fetchTempsForts(force = false): Promise<TempsFort[]> {
  if (!force && cache) return cache
  if (!force && inflight) return inflight
  inflight = fetch("/api/temps-forts", { credentials: "include" })
    .then((res) => (res.ok ? res.json() : { tempsForts: [] }))
    .then((json) => {
      cache = (json?.tempsForts as TempsFort[]) || []
      listeners.forEach((cb) => cb(cache!))
      return cache
    })
    .catch(() => {
      cache = cache || []
      return cache
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

export function invalidateTempsFortsCache() {
  cache = null
}

export function useTempsForts(): { tempsForts: TempsFort[]; loading: boolean; refresh: () => Promise<void> } {
  const [tempsForts, setTempsForts] = useState<TempsFort[]>(cache ?? [])
  const [loading, setLoading] = useState(!cache)

  useEffect(() => {
    let cancelled = false
    const handler = (list: TempsFort[]) => {
      if (!cancelled) setTempsForts(list)
    }
    listeners.add(handler)
    fetchTempsForts().then((list) => {
      if (!cancelled) {
        setTempsForts(list)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
      listeners.delete(handler)
    }
  }, [])

  const refresh = async () => {
    invalidateTempsFortsCache()
    await fetchTempsForts(true)
  }

  return { tempsForts, loading, refresh }
}
