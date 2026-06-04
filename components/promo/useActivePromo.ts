"use client"

import { useEffect, useState } from "react"
import type { ActivePromo } from "@/lib/promo"

interface State {
  promo: ActivePromo | null
  loading: boolean
}

/**
 * Charge la promo active (GET /api/promotions/active).
 * promo = null si aucune campagne live.
 */
export function useActivePromo(): State {
  const [state, setState] = useState<State>({ promo: null, loading: true })

  useEffect(() => {
    let alive = true
    fetch("/api/promotions/active", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return
        setState({
          promo: d?.active ? { campaign: d.campaign, offers: d.offers ?? [] } : null,
          loading: false,
        })
      })
      .catch(() => {
        if (alive) setState({ promo: null, loading: false })
      })
    return () => {
      alive = false
    }
  }, [])

  return state
}
