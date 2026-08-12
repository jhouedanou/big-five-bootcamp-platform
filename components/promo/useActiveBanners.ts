"use client"

import { useEffect, useState } from "react"
import type { DashboardBanner } from "@/lib/dashboard-banners"

/**
 * Bannières éditoriales diffusables, pour le carrousel du dashboard.
 * Ne lève jamais : une bannière absente ne doit pas casser le dashboard.
 */
export function useActiveBanners() {
  const [banners, setBanners] = useState<DashboardBanner[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const res = await fetch("/api/banners/active", { cache: "no-store" })
        if (!res.ok) throw new Error("fetch failed")
        const data = await res.json()
        if (!cancelled) setBanners(data.banners || [])
      } catch {
        if (!cancelled) setBanners([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return { banners, loading }
}
