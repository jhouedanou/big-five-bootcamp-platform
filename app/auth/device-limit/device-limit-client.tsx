'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ShieldAlert, LogOut, Smartphone, Monitor } from 'lucide-react'
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

interface Props {
  initialSessions: SessionItem[]
  currentSessionId: string | null
  maxSessions: number
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

export function DeviceLimitClient({ initialSessions, currentSessionId, maxSessions }: Props) {
  const router = useRouter()
  const [sessions, setSessions] = useState(initialSessions)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  const otherSessions = useMemo(
    () => sessions.filter((s) => s.id !== currentSessionId),
    [sessions, currentSessionId],
  )

  const handleRevoke = async (sessionId: string) => {
    if (revokingId) return
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

      const next = sessions.filter((s) => s.id !== sessionId)
      setSessions(next)
      toast.success('Appareil déconnecté')

      // Une fois sous la limite, on poursuit la connexion.
      if (next.length <= maxSessions) {
        router.replace('/dashboard')
        router.refresh()
      }
    } catch (err: any) {
      toast.error('Erreur réseau', { description: err?.message })
    } finally {
      setRevokingId(null)
    }
  }

  const handleCancel = async () => {
    // L'utilisateur préfère annuler : on déconnecte CE navigateur (qui vient
    // de créer la session de trop) et on renvoie vers /login.
    setSigningOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } finally {
      window.location.href = '/login'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F5F5F5] via-white to-white p-4">
      <div className="w-full max-w-2xl rounded-2xl border-2 bg-white p-8 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <ShieldAlert className="h-6 w-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[#0F0F0F]">
              Limite d'appareils atteinte
            </h1>
            <p className="mt-2 text-sm text-[#0F0F0F]/70">
              Ton compte est limité à <strong>{maxSessions} appareils connectés</strong> en même temps.
              Pour continuer sur ce navigateur, déconnecte un appareil existant.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[#0F0F0F]/60">
            Appareils actuellement connectés
          </h2>

          {otherSessions.length === 0 && (
            <div className="rounded-lg border border-dashed border-[#F5F5F5] p-4 text-sm text-[#0F0F0F]/60">
              Aucun autre appareil détecté. Recharge la page.
            </div>
          )}

          <ul className="divide-y divide-[#F5F5F5] rounded-lg border border-[#F5F5F5]">
            {otherSessions.map((s) => {
              const ua = parseUserAgent(s.user_agent)
              const Icon = ua.isMobile ? Smartphone : Monitor
              return (
                <li key={s.id} className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F5F5F5]">
                    <Icon className="h-5 w-5 text-[#0F0F0F]/70" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#0F0F0F]">
                      {ua.browser} · {ua.os}
                    </p>
                    <p className="text-xs text-[#0F0F0F]/60">
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
                    {revokingId === s.id ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        Déconnexion…
                      </>
                    ) : (
                      <>
                        <LogOut className="mr-2 h-3.5 w-3.5" />
                        Déconnecter
                      </>
                    )}
                  </Button>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="mt-8 flex items-center justify-between gap-3 border-t pt-4">
          <p className="text-xs text-[#0F0F0F]/60">
            Cet appareil restera connecté une fois la place libérée.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={signingOut || revokingId !== null}
          >
            {signingOut ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Déconnexion…
              </>
            ) : (
              <>Annuler et me déconnecter</>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
