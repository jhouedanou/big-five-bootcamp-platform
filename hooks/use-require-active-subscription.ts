"use client"

/**
 * Hook : exige qu'un plan ait deja ete choisi (souscrit ou non).
 *
 * Cas :
 *   - subscription_status === 'active' : acces normal, aucun redirect.
 *   - subscription_status === 'expired' | 'cancelled' | 'past_due' :
 *     acces limite (tier 'free' via resolveTier), pas de redirect.
 *     Un bottom-sheet de rappel est affiche via <SubscriptionExpiredBottomSheet>.
 *   - subscription_status === 'none' | null | undefined :
 *     jamais souscrit. Redirect bloquant vers /subscribe?required=1.
 *
 * Ce comportement permet aux utilisateurs dont l'abonnement a expire de
 * continuer a naviguer (avec quotas Decouverte) pendant qu'ils renouvellent,
 * tout en forcant le choix de plan a la premiere inscription.
 *
 * Note securite : le redirect est UX. La protection des donnees doit etre
 * faite cote serveur (RLS Supabase + checks d'API).
 */

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuthContext } from "@/components/auth-provider"

const SUBSCRIBE_PATH = "/subscribe"

/** Status qui declenchent le redirect bloquant. */
const NEVER_SUBSCRIBED_STATUSES = new Set(["", "none"])

export function useRequireActiveSubscription() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, userProfile, loading } = useAuthContext()

  useEffect(() => {
    if (loading) return
    if (!user) return
    if (!userProfile) return
    if (pathname?.startsWith(SUBSCRIBE_PATH)) return

    const status = String((userProfile as any).subscription_status || "").toLowerCase()
    if (NEVER_SUBSCRIBED_STATUSES.has(status)) {
      router.replace(`${SUBSCRIBE_PATH}?required=1`)
    }
    // 'expired' / 'cancelled' / 'past_due' : pas de redirect, bottom-sheet affiche ailleurs.
  }, [loading, user, userProfile, pathname, router])
}
