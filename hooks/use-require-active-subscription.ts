"use client"

/**
 * Hook : exige un abonnement actif (Discovery / Basic / Pro).
 *
 * Si l'utilisateur est connecte mais que son `subscription_status` n'est pas
 * "active", il est redirige vers /subscribe?required=1.
 *
 * A monter au sommet des pages a acces restreint (dashboard, favorites,
 * content/[id], temps-forts, decrypte, etc.).
 *
 * Note securite : le redirect est UX. La protection des donnees doit etre
 * faite cote serveur via RLS Supabase ou checks d'API. Ce hook empeche
 * juste l'utilisateur Free non-abonne de voir l'interface du dashboard.
 */

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuthContext } from "@/components/auth-provider"

const SUBSCRIBE_PATH = "/subscribe"

export function useRequireActiveSubscription() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, userProfile, loading } = useAuthContext()

  useEffect(() => {
    // Pas de redirect tant que l'auth/profile n'est pas resolu.
    if (loading) return
    // Pas de redirect si pas connecte (le redirect /login est gere ailleurs).
    if (!user) return
    if (!userProfile) return
    // Pas de redirect si deja sur /subscribe.
    if (pathname?.startsWith(SUBSCRIBE_PATH)) return

    const status = String((userProfile as any).subscription_status || "").toLowerCase()
    if (status !== "active") {
      router.replace(`${SUBSCRIBE_PATH}?required=1`)
    }
  }, [loading, user, userProfile, pathname, router])
}
