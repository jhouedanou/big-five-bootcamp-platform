"use client"

import { useRouter } from "next/navigation"
import { useProfileCompletionStatus } from "@/hooks/useProfileCompletionStatus"
import { BlockingProfileCompletionModal } from "./BlockingProfileCompletionModal"

interface RequireCompletedProfileProps {
  children: React.ReactNode
  /** désactive le garde (ex: utilisateur non authentifié) */
  enabled?: boolean
}

/**
 * Garde côté client : affiche une modal bloquante par-dessus le contenu tant
 * que le profil de l'utilisateur n'est pas complété.
 *
 * Le middleware serveur reste la protection principale (redirection vers
 * /onboarding) ; ce composant couvre les navigations SPA déjà chargées.
 */
export function RequireCompletedProfile({
  children,
  enabled = true,
}: RequireCompletedProfileProps) {
  const router = useRouter()
  const { status, loading, isComplete, refresh } = useProfileCompletionStatus(enabled)

  // Bloquer uniquement quand on a une réponse (status non null) et profil incomplet.
  const mustComplete = enabled && !loading && status !== null && !isComplete

  return (
    <>
      {children}
      <BlockingProfileCompletionModal
        open={mustComplete}
        onCompleted={() => {
          void refresh()
          router.refresh()
        }}
      />
    </>
  )
}
