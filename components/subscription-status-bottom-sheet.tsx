"use client"

/**
 * Bottom sheet persistante affichee selon le statut d'abonnement.
 *
 * 3 etats :
 *   - 'expired'   : abonnement termine. Banniere rouge. Fermable (localStorage).
 *   - 'cancelled' : annule par l'utilisateur. Banniere ambre. Fermable.
 *   - 'expiring'  : abonnement actif mais expire dans <= 7 jours. Fermable.
 *
 * Reapparait apres 24h meme si fermee, pour rappel.
 *
 * Pas affichee si :
 *   - utilisateur deconnecte ;
 *   - status === 'active' ET > 7 jours restants ;
 *   - deja ferme dans les dernieres 24h ;
 *   - status === 'none' (l'utilisateur est sur /subscribe).
 */

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { X, Clock, AlertTriangle, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuthContext } from "@/components/auth-provider"

const DISMISS_PREFIX = "sub-bottom-sheet-dismissed:"
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000 // 24h

type SheetState =
  | { kind: "expired"; endDate: Date | null }
  | { kind: "cancelled"; endDate: Date | null }
  | { kind: "expiring"; endDate: Date; daysLeft: number }
  | null

function computeState(profile: any): SheetState {
  if (!profile) return null
  const status = String(profile.subscription_status || "").toLowerCase()
  const endRaw = profile.subscription_end_date
  const endDate = endRaw ? new Date(endRaw) : null
  const now = new Date()

  if (status === "expired") {
    return { kind: "expired", endDate }
  }
  if (status === "cancelled") {
    return { kind: "cancelled", endDate }
  }
  if (status === "active" && endDate) {
    const ms = endDate.getTime() - now.getTime()
    if (ms <= 0) return { kind: "expired", endDate }
    const daysLeft = Math.ceil(ms / (1000 * 60 * 60 * 24))
    if (daysLeft <= 7) {
      return { kind: "expiring", endDate, daysLeft }
    }
  }
  return null
}

function getCurrentPlanForRenew(plan: string | null | undefined): "basic" | "pro" | "discovery" {
  const p = String(plan || "").toLowerCase()
  if (p === "pro") return "pro"
  if (p === "basic") return "basic"
  return "discovery"
}

export function SubscriptionStatusBottomSheet() {
  const { user, userProfile, loading } = useAuthContext()
  const pathname = usePathname()
  const [dismissed, setDismissed] = useState(true) // start hidden, decide after mount

  // Decide visibility after profile load + check dismiss timestamp.
  useEffect(() => {
    if (loading) return
    if (!user || !userProfile) {
      setDismissed(true)
      return
    }
    // Hide on auth/subscribe pages — those screens carry their own messaging.
    if (
      pathname?.startsWith("/subscribe") ||
      pathname?.startsWith("/login") ||
      pathname?.startsWith("/register") ||
      pathname?.startsWith("/payment")
    ) {
      setDismissed(true)
      return
    }
    const state = computeState(userProfile)
    if (!state) {
      setDismissed(true)
      return
    }
    if (typeof window === "undefined") return
    const raw = window.localStorage.getItem(`${DISMISS_PREFIX}${user.id}:${state.kind}`)
    const ts = raw ? Number(raw) : 0
    const fresh = ts && Date.now() - ts < DISMISS_TTL_MS
    setDismissed(!!fresh)
  }, [loading, user, userProfile, pathname])

  if (loading || !user || !userProfile || dismissed) return null

  const state = computeState(userProfile)
  if (!state) return null

  const planForRenew = getCurrentPlanForRenew((userProfile as any).plan)

  const handleDismiss = () => {
    if (typeof window !== "undefined" && user?.id) {
      window.localStorage.setItem(
        `${DISMISS_PREFIX}${user.id}:${state.kind}`,
        String(Date.now())
      )
    }
    setDismissed(true)
  }

  const endLabel = state.endDate
    ? state.endDate.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null

  let palette = ""
  let icon = <Clock className="h-5 w-5" />
  let title = ""
  let message = ""
  let cta = "Renouveler"
  let ctaHref = `/subscribe?plan=${planForRenew}`

  if (state.kind === "expired") {
    palette = "from-red-50 to-white border-red-300"
    icon = <AlertTriangle className="h-5 w-5 text-red-600" />
    title = "Votre abonnement a expiré"
    message = endLabel
      ? `Fin le ${endLabel}. Accès limité aux fonctionnalités Découverte.`
      : "Accès limité aux fonctionnalités Découverte."
    cta = "Reprendre mon abonnement"
  } else if (state.kind === "cancelled") {
    palette = "from-amber-50 to-white border-amber-300"
    icon = <AlertTriangle className="h-5 w-5 text-amber-700" />
    title = "Abonnement annulé"
    message = endLabel
      ? `Annulé. L'accès se termine le ${endLabel}.`
      : "Votre abonnement est annulé."
    cta = "Réactiver"
  } else {
    palette = "from-[#FFFBEC] to-white border-[#F2B33D]/40"
    icon = <Sparkles className="h-5 w-5 text-[#a17320]" />
    title = `Votre abonnement expire dans ${state.daysLeft} jour${state.daysLeft > 1 ? "s" : ""}`
    message = endLabel ? `Fin le ${endLabel}.` : ""
    cta = "Renouveler"
  }

  return (
    <div
      role="dialog"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[80] px-3 pb-3 sm:px-6 sm:pb-6"
    >
      <div
        className={`mx-auto max-w-3xl rounded-2xl border-2 bg-gradient-to-r ${palette} p-4 shadow-2xl backdrop-blur-sm`}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">{icon}</div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[#0F0F0F]">{title}</p>
            {message && (
              <p className="mt-0.5 text-sm text-[#0F0F0F]/70">{message}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              asChild
              size="sm"
              className="h-9 px-3 bg-[#F2B33D] hover:bg-[#d99a2a] text-white text-xs font-bold"
            >
              <Link href={ctaHref}>{cta}</Link>
            </Button>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-full p-1.5 text-[#0F0F0F]/40 hover:bg-[#F5F5F5] hover:text-[#0F0F0F] transition-colors"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
