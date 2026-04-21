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
    clicks: "Vous avez atteint votre limite de 5 campagnes consultées ce mois-ci.",
    filters: "Les filtres pays, secteur et tags sont réservés aux plans payants.",
    searches: "Vous avez atteint votre limite de recherches par filtre pour ce mois.",
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
          className="absolute right-4 top-4 rounded-full p-1.5 text-[#0F0F0F]/40 hover:bg-[#F5F5F5]/50 hover:text-[#0F0F0F] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F2B33D] to-[#a855f7] shadow-lg shadow-[#F2B33D]/30">
          <Sparkles className="h-8 w-8 text-white" />
        </div>

        {/* Title */}
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-center text-[#0F0F0F] mb-3">
          Débloquez tout le potentiel de Laveiye
        </h2>

        <p className="text-center text-[#0F0F0F]/70 text-sm mb-8">
          {subtitle}
        </p>

        {/* CTAs */}
        <div className="space-y-3">
          <Button
            asChild
            className="w-full h-12 text-base font-bold bg-gradient-to-r from-[#F2B33D] to-[#a855f7] hover:from-[#6b2d76] hover:to-[#9333ea] text-white shadow-lg shadow-[#F2B33D]/25"
          >
            <Link href="/subscribe" onClick={onClose}>
              <Star className="mr-2 h-4 w-4" />
              Choisir une formule
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full h-12 text-base font-semibold border-[#F5F5F5] text-[#0F0F0F]"
          >
            <Link href="/pricing" onClick={onClose}>
              <Zap className="mr-2 h-4 w-4 text-[#F2B33D]" />
              Voir les plans
            </Link>
          </Button>
        </div>

        {/* Plans rapide */}
        <div className="mt-6 grid grid-cols-2 gap-3 pt-6 border-t border-[#F5F5F5]">
          <div className="rounded-xl bg-[#F5F5F5]/30 p-3 text-center">
            <p className="text-xs font-semibold text-[#0F0F0F]/60 mb-1">Basic</p>
            <p className="text-lg font-extrabold text-[#0F0F0F]">4 900</p>
            <p className="text-xs text-[#0F0F0F]/50">FCFA/mois</p>
          </div>
          <div className="rounded-xl bg-[#F2B33D]/10 border border-[#F2B33D]/20 p-3 text-center">
            <p className="text-xs font-semibold text-[#F2B33D] mb-1">Pro ⭐</p>
            <p className="text-lg font-extrabold text-[#F2B33D]">9 900</p>
            <p className="text-xs text-[#F2B33D]/60">FCFA/mois</p>
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
