"use client"

import { useCallback, useEffect, useState } from "react"
import type { ProfileStatus } from "@/lib/onboarding"

interface State {
  status: ProfileStatus | null
  loading: boolean
  error: string | null
}

/**
 * Récupère l'état de complétion du profil (GET /api/me/profile-status).
 * Gère loading / error / success et expose un `refresh()`.
 */
export function useProfileCompletionStatus(enabled = true) {
  const [state, setState] = useState<State>({
    status: null,
    loading: enabled,
    error: null,
  })

  const fetchStatus = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const res = await fetch("/api/me/profile-status", { cache: "no-store" })
      if (res.status === 401) {
        // Non authentifié → pas d'onboarding à imposer ici.
        setState({ status: null, loading: false, error: null })
        return
      }
      if (!res.ok) throw new Error("Erreur de chargement du statut")
      const data = (await res.json()) as ProfileStatus
      setState({ status: data, loading: false, error: null })
    } catch (err) {
      setState({
        status: null,
        loading: false,
        error: err instanceof Error ? err.message : "Erreur inconnue",
      })
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    void fetchStatus()
  }, [enabled, fetchStatus])

  return {
    status: state.status,
    loading: state.loading,
    error: state.error,
    isComplete: state.status?.profile_completed ?? false,
    refresh: fetchStatus,
  }
}
