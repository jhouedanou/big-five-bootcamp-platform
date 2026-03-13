"use client"

import { useState } from "react"
import Link from "next/link"
import { X, Sparkles, Zap, Star } from "lucide-react"
import { Button } from "@/components/ui/button"

interface UpgradePopupProps {
  open: boolean
  onClose: () => void
  reason?: "clicks" | "filters" | "searches" | "content"
}

export function UpgradePopup({ open, onClose, reason }: UpgradePopupProps) {
  if (!open) return null

  const messages: Record<string, string> = {
    clicks: "Vous avez atteint votre limite de 5 campagnes consultées aujourd'hui.",
    filters: "Les filtres pays, secteur et tags sont réservés aux plans payants.",
    searches: "Vous avez atteint votre limite de recherches par filtre pour aujourd'hui.",
    content: "Cliquez sur une campagne pour voir son détail complet.",
  }

  const subtitle = reason ? messages[reason] : "Passez à un plan payant pour débloquer toutes les fonctionnalités."

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-8 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-[#1A1F2B]/40 hover:bg-[#D0E4F2]/50 hover:text-[#1A1F2B] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#80368D] to-[#a855f7] shadow-lg shadow-[#80368D]/30">
          <Sparkles className="h-8 w-8 text-white" />
        </div>

        {/* Title */}
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-center text-[#1A1F2B] mb-3">
          Débloquez tout le potentiel de Big Five
        </h2>

        <p className="text-center text-[#1A1F2B]/70 text-sm mb-8">
          {subtitle}
        </p>

        {/* CTAs */}
        <div className="space-y-3">
          <Button
            asChild
            className="w-full h-12 text-base font-bold bg-gradient-to-r from-[#80368D] to-[#a855f7] hover:from-[#6b2d76] hover:to-[#9333ea] text-white shadow-lg shadow-[#80368D]/25"
          >
            <Link href="/register" onClick={onClose}>
              <Star className="mr-2 h-4 w-4" />
              Essai gratuit 14 jours (Pro)
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full h-12 text-base font-semibold border-[#D0E4F2] text-[#1A1F2B]"
          >
            <Link href="/pricing" onClick={onClose}>
              <Zap className="mr-2 h-4 w-4 text-[#80368D]" />
              Voir les plans
            </Link>
          </Button>
        </div>

        {/* Plans rapide */}
        <div className="mt-6 grid grid-cols-2 gap-3 pt-6 border-t border-[#D0E4F2]">
          <div className="rounded-xl bg-[#D0E4F2]/30 p-3 text-center">
            <p className="text-xs font-semibold text-[#1A1F2B]/60 mb-1">Basic</p>
            <p className="text-lg font-extrabold text-[#1A1F2B]">4 900</p>
            <p className="text-xs text-[#1A1F2B]/50">FCFA/mois</p>
          </div>
          <div className="rounded-xl bg-[#80368D]/10 border border-[#80368D]/20 p-3 text-center">
            <p className="text-xs font-semibold text-[#80368D] mb-1">Pro ⭐</p>
            <p className="text-lg font-extrabold text-[#80368D]">9 900</p>
            <p className="text-xs text-[#80368D]/60">FCFA/mois</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Hook to manage upgrade popup state
export function useUpgradePopup() {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<UpgradePopupProps["reason"]>()

  const showUpgrade = (r?: UpgradePopupProps["reason"]) => {
    setReason(r)
    setOpen(true)
  }

  return { open, reason, showUpgrade, closeUpgrade: () => setOpen(false) }
}
