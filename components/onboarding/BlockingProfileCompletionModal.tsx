"use client"

import { useEffect } from "react"
import { OnboardingForm } from "./OnboardingForm"
import { trackEvent } from "@/lib/analytics"

interface BlockingProfileCompletionModalProps {
  open: boolean
  onCompleted: () => void
}

/**
 * Modal bloquante de complétion de profil.
 *
 * Volontairement construite en overlay fixe (et non via le Dialog shadcn qui
 * impose un bouton de fermeture) : AUCUNE fermeture possible tant que le profil
 * n'est pas complété — pas de croix, pas de clic extérieur, pas de touche Échap.
 * Sur mobile : plein écran. Sur desktop : carte centrée.
 */
export function BlockingProfileCompletionModal({
  open,
  onCompleted,
}: BlockingProfileCompletionModalProps) {
  useEffect(() => {
    if (!open) return

    // Tracking : affichage de la popup (critique → GA4 + Supabase).
    trackEvent("profile_completion_popup_displayed", {}, true)

    // Verrou du scroll de fond + interception d'Échap.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") e.preventDefault()
    }
    window.addEventListener("keydown", onKeyDown, true)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown, true)
    }
  }, [open])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-modal-title"
      className="fixed inset-0 z-[100] flex items-stretch justify-center bg-black/80 sm:items-center sm:p-4"
    >
      <div
        className="flex w-full max-w-lg flex-col overflow-y-auto bg-white p-6 shadow-xl sm:max-h-[90vh] sm:rounded-xl"
        id="onboarding-modal-title"
      >
        <OnboardingForm source="popup" onCompleted={onCompleted} />
      </div>
    </div>
  )
}
