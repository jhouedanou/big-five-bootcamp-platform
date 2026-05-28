'use client'

import { useEffect, useState } from 'react'
import {
  PAWAPAY_PROVIDERS as STATIC_PROVIDERS,
  type PawaPayCountryCode,
  type PawaPayProvider,
} from '@/lib/pawapay-providers'

interface ProvidersPayload {
  providers: PawaPayProvider[]
  source: 'api' | 'fallback'
  updatedAt: string
}

let memoCache: ProvidersPayload | null = null
let inflight: Promise<ProvidersPayload> | null = null

async function fetchProviders(): Promise<ProvidersPayload> {
  if (memoCache) return memoCache
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const res = await fetch('/api/payment/pawapay/providers', { cache: 'force-cache' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as ProvidersPayload
      if (!Array.isArray(data?.providers) || data.providers.length === 0) {
        throw new Error('payload vide')
      }
      memoCache = data
      return data
    } catch {
      const fallback: ProvidersPayload = {
        providers: STATIC_PROVIDERS,
        source: 'fallback',
        updatedAt: new Date().toISOString(),
      }
      memoCache = fallback
      return fallback
    } finally {
      inflight = null
    }
  })()
  return inflight
}

export interface UsePawaPayProvidersResult {
  providers: PawaPayProvider[]
  isLoading: boolean
  source: 'api' | 'fallback' | 'static'
  getProvidersForCountry: (country: PawaPayCountryCode) => PawaPayProvider[]
}

/**
 * Charge la liste des providers PawaPay depuis l'API (source de vérité) avec
 * fallback automatique sur la liste statique. Cache module-level : un seul fetch
 * partagé entre tous les composants.
 */
export function usePawaPayProviders(): UsePawaPayProvidersResult {
  const [state, setState] = useState<{ providers: PawaPayProvider[]; source: 'api' | 'fallback' | 'static' }>(
    () =>
      memoCache
        ? { providers: memoCache.providers, source: memoCache.source }
        : { providers: STATIC_PROVIDERS, source: 'static' },
  )
  const [isLoading, setIsLoading] = useState(!memoCache)

  useEffect(() => {
    if (memoCache) return
    let cancelled = false
    fetchProviders().then((data) => {
      if (cancelled) return
      setState({ providers: data.providers, source: data.source })
      setIsLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return {
    providers: state.providers,
    source: state.source,
    isLoading,
    getProvidersForCountry: (country) => state.providers.filter((p) => p.country === country),
  }
}
