'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Smartphone, Monitor, LogOut, RefreshCw, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase'
import { parseUserAgent } from '@/lib/user-agent'

interface SessionItem {
  id: string
  created_at: string
  refreshed_at: string | null
  user_agent: string | null
  ip: string | null
}

interface SessionsPayload {
  sessions: SessionItem[]
  currentSessionId: string | null
  maxSessions: number
  overLimit: boolean
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function DevicesSection() {
  const [payload, setPayload] = useState<SessionsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/sessions', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      setPayload(data)
    } catch (e: any) {
      setError(e?.message || 'Erreur chargement sessions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const sortedSessions = useMemo(() => {
    if (!payload) return []
    // Met la session courante en premier pour faciliter le repérage.
    return [...payload.sessions].sort((a, b) => {
      if (a.id === payload.currentSessionId) return -1
      if (b.id === payload.currentSessionId) return 1
      const aTs = new Date(a.refreshed_at || a.created_at).getTime()
      const bTs = new Date(b.refreshed_at || b.created_at).getTime()
      return bTs - aTs
    })
  }, [payload])

  const handleRevoke = async (sessionId: string) => {
    if (revokingId) return
    const isCurrent = sessionId === payload?.currentSessionId
    if (isCurrent) {
      // Pour la session courante, on passe par signOut pour bien nettoyer
      // les cookies côté navigateur.
      setSigningOut(true)
      try {
        const supabase = createClient()
        await supabase.auth.signOut()
      } finally {
        window.location.href = '/login'
      }
      return
    }

    setRevokingId(sessionId)
    try {
      const res = await fetch(`/api/auth/sessions?id=${encodeURIComponent(sessionId)}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error('Impossible de déconnecter cet appareil', {
          description: data?.error || 'Réessaie dans quelques secondes.',
        })
        return
      }
      toast.success('Appareil déconnecté')
      await load()
    } catch (err: any) {
      toast.error('Erreur réseau', { description: err?.message })
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-card-foreground flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#F2B33D]" />
            Mes appareils
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Gère les navigateurs et appareils connectés à ton compte.
            {payload && (
              <>
                {' '}Limite : <strong>{payload.maxSessions}</strong> appareils.
              </>
            )}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {error && (
        <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {loading && !payload && (
        <div className="mt-4 py-8 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
        </div>
      )}

      {payload && (
        <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
          {sortedSessions.map((s) => {
            const ua = parseUserAgent(s.user_agent)
            const Icon = ua.isMobile ? Smartphone : Monitor
            const isCurrent = s.id === payload.currentSessionId
            return (
              <li key={s.id} className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F5F5F5]">
                  <Icon className="h-5 w-5 text-[#0F0F0F]/70" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {ua.browser} · {ua.os}
                    </p>
                    {isCurrent && (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        Cet appareil
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {s.ip ? `IP ${s.ip} · ` : ''}
                    Dernière activité {formatDate(s.refreshed_at || s.created_at)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRevoke(s.id)}
                  disabled={revokingId !== null || signingOut}
                >
                  {(revokingId === s.id || (signingOut && isCurrent)) ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      …
                    </>
                  ) : (
                    <>
                      <LogOut className="mr-2 h-3.5 w-3.5" />
                      {isCurrent ? 'Me déconnecter' : 'Déconnecter'}
                    </>
                  )}
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
