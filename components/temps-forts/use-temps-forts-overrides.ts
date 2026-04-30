"use client"

import { useEffect, useState } from "react"
import type { TempsFortsOverrides } from "@/app/api/temps-forts/settings/route"

const DEFAULT: TempsFortsOverrides = {
  bannerSlug: null,
  popupSlug: null,
  bannerEnabled: true,
  popupEnabled: true,
  version: 1,
}

let cache: TempsFortsOverrides | null = null
let inflight: Promise<TempsFortsOverrides> | null = null

async function fetchOverrides(): Promise<TempsFortsOverrides> {
  if (cache) return cache
  if (inflight) return inflight
  inflight = fetch("/api/temps-forts/settings", { credentials: "include" })
    .then((res) => (res.ok ? res.json() : { overrides: DEFAULT }))
    .then((json) => {
      cache = (json?.overrides as TempsFortsOverrides) || DEFAULT
      return cache
    })
    .catch(() => DEFAULT)
    .finally(() => {
      inflight = null
    })
  return inflight
}

export function useTempsFortsOverrides(): TempsFortsOverrides | null {
  const [overrides, setOverrides] = useState<TempsFortsOverrides | null>(cache)

  useEffect(() => {
    let cancelled = false
    fetchOverrides().then((value) => {
      if (!cancelled) setOverrides(value)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return overrides
}

export function invalidateTempsFortsOverridesCache() {
  cache = null
}
