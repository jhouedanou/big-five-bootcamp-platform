"use client"

/**
 * Hook : exige un abonnement payant ACTIF pour acceder a la plateforme.
 *
 * Le plan "Free" a ete deprecie. Tout utilisateur sans souscription active
 * (Decouverte / Basic / Pro) est redirige vers /subscribe?required=1.
 *
 * Cas :
 *   - subscription_status === 'active' ET plan ∈ {Discovery,Basic,Pro} : acces normal.
 *   - Tout autre etat ('none', 'expired', 'cancelled', 'past_due', 'trialing'…)
 *     OU plan absent / 'Free' legacy : redirect bloquant vers /subscribe.
 *
 * Note securite : le redirect est UX. La protection des donnees doit etre
 * faite cote serveur (RLS Supabase + checks d'API).
 */

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuthContext } from "@/components/auth-provider"
import { isLockedAccount } from "@/lib/pricing"

const SUBSCRIBE_PATH = "/subscribe"

export function useRequireActiveSubscription() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, userProfile, loading } = useAuthContext()

  useEffect(() => {
    if (loading) return
    if (!user) return
    if (!userProfile) return
    if (pathname?.startsWith(SUBSCRIBE_PATH)) return

    const plan = (userProfile as any).plan as string | null | undefined
    const status = (userProfile as any).subscription_status as string | null | undefined
    if (isLockedAccount(plan, status)) {
      router.replace(`${SUBSCRIBE_PATH}?required=1`)
    }
  }, [loading, user, userProfile, pathname, router])
}
