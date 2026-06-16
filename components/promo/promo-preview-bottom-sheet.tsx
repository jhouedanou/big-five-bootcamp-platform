"use client"

/**
 * Bottom sheet de rappel « Mode aperçu promo ».
 *
 * Affichée UNIQUEMENT lorsque le mode aperçu promo est actif pour un compte
 * admin (flag site_settings `promo_preview_mode` + rôle admin, vérifiés côté
 * serveur via /api/promotions/preview-status). Rappelle à l'admin que la
 * mécanique promo est affichée en aperçu, jamais visible des utilisateurs.
 *
 * Charte : or #F2B33D, encre #0F0F0F, fond dégradé crème (cohérent avec les
 * autres bottom sheets du site).
 */

import { useEffect, useState } from "react"
import Link from "next/link"
import { Eye, X } from "lucide-react"
import { useAuthContext } from "@/components/auth-provider"

const DISMISS_KEY = "promo-preview-sheet-dismissed"

export function PromoPreviewBottomSheet() {
  const { isAuthenticated, loading } = useAuthContext()
  const [enabled, setEnabled] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // État de masquage (par session) lu après montage.
  useEffect(() => {
    if (typeof window !== "undefined") {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1")
    }
  }, [])

  // Statut aperçu : interroge le serveur dès qu'un utilisateur est connecté.
  // Le serveur (checkAdmin : rôle DB OU app_metadata OU email admin) tranche
  // via `enabled` — un non-admin reçoit toujours false.
  useEffect(() => {
    if (loading || !isAuthenticated) return
    let alive = true
    fetch("/api/promotions/preview-status", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (alive) setEnabled(!!d?.enabled)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [loading, isAuthenticated])

  if (loading || !isAuthenticated || !enabled || dismissed) return null

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1")
    } catch {
      /* noop */
    }
    setDismissed(true)
  }

  return (
    <div
      role="status"
      aria-live="polite"
      // Décalage vertical : on remonte la sheet au-dessus des autres bottom
      // sheets (abonnement / email, ancrées en bas) pour éviter le chevauchement.
      className="fixed inset-x-0 bottom-0 z-[80] px-3 pb-28 sm:px-6 sm:pb-32"
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border-2 border-[#F2B33D] bg-gradient-to-r from-[#FFFBEC] to-white p-4 shadow-2xl backdrop-blur-sm">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#F2B33D] text-[#0F0F0F]">
          <Eye className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-[#0F0F0F]">Mode aperçu promo</p>
          <p className="mt-0.5 text-sm text-[#0F0F0F]/70">
            Bannière, popup, badges, compte à rebours et offres promo sont affichés
            pour test. Visible uniquement par les admins.
          </p>
        </div>
        <Link
          href="/admin/settings"
          className="hidden shrink-0 rounded-lg border border-[#F2B33D]/50 px-3 py-1.5 text-xs font-semibold text-[#a17320] transition-colors hover:bg-[#FFF4D6] sm:inline-block"
        >
          Désactiver
        </Link>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded-full p-1.5 text-[#0F0F0F]/40 transition-colors hover:bg-[#F5F5F5] hover:text-[#0F0F0F]"
          aria-label="Masquer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
