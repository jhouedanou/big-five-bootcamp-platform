"use client"

import React from "react"
import { Lock, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { isPaidPlan } from "@/lib/pricing"

type RequiredPlan = "basic" | "pro"

interface PlanGateProps {
  /** Le plan minimum requis pour accéder à cette fonctionnalité */
  requiredPlan: RequiredPlan
  /** Le plan actuel de l'utilisateur (e.g. "Free", "Basic", "Pro") */
  currentPlan: string
  /** Le contenu à afficher si l'utilisateur a accès */
  children: React.ReactNode
  /** Le message à afficher si l'utilisateur n'a pas accès */
  message?: string
  /** Si true, affiche le contenu en mode flou/overlay au lieu de le cacher */
  blurMode?: boolean
  /** Si true, cache complètement au lieu d'afficher un message */
  hideCompletely?: boolean
  /** Callback personnalisé au lieu du lien vers /subscribe */
  onUpgradeClick?: () => void
}

const PLAN_HIERARCHY: Record<string, number> = {
  free: 0,
  basic: 1,
  pro: 2,
  // Aliases legacy (avant normalisation avril 2026) — tous mappent sur Pro
  premium: 2,
  agency: 2,
  enterprise: 2,
}

function getPlanLevel(plan: string): number {
  const normalized = plan.toLowerCase().trim()
  return PLAN_HIERARCHY[normalized] ?? 0
}

const PLAN_LABELS: Record<RequiredPlan, string> = {
  basic: "Basic",
  pro: "Pro",
}

export function hasAccess(currentPlan: string, requiredPlan: RequiredPlan): boolean {
  return getPlanLevel(currentPlan) >= getPlanLevel(requiredPlan)
}

export function PlanGate({
  requiredPlan,
  currentPlan,
  children,
  message,
  blurMode = false,
  hideCompletely = false,
  onUpgradeClick,
}: PlanGateProps) {
  const userHasAccess = hasAccess(currentPlan, requiredPlan)

  if (userHasAccess) {
    return <>{children}</>
  }

  if (hideCompletely) {
    return null
  }

  const planLabel = PLAN_LABELS[requiredPlan]
  const defaultMessage = `Cette fonctionnalité est réservée au plan ${planLabel} et supérieur.`

  if (blurMode) {
    return (
      <div className="relative">
        <div className="blur-sm pointer-events-none select-none" aria-hidden="true">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px] rounded-lg">
          <div className="text-center p-4 max-w-sm">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#80368D]/10">
              <Lock className="h-5 w-5 text-[#80368D]" />
            </div>
            <p className="text-sm font-medium text-[#1A1F2B] mb-1">
              Fonctionnalité {planLabel}
            </p>
            <p className="text-xs text-[#1A1F2B]/60 mb-3">
              {message || defaultMessage}
            </p>
            {onUpgradeClick ? (
              <Button
                size="sm"
                onClick={onUpgradeClick}
                className="bg-[#80368D] hover:bg-[#80368D]/90 text-white text-xs"
              >
                Passer au plan {planLabel}
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            ) : (
              <Button size="sm" asChild className="bg-[#80368D] hover:bg-[#80368D]/90 text-white text-xs">
                <Link href={`/subscribe?plan=${requiredPlan}`}>
                  Passer au plan {planLabel}
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Mode badge/inline
  return (
    <div className="rounded-lg border border-[#D0E4F2] bg-[#D0E4F2]/10 p-4 text-center">
      <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#80368D]/10">
        <Lock className="h-4 w-4 text-[#80368D]" />
      </div>
      <p className="text-sm font-medium text-[#1A1F2B] mb-1">
        Réservé au plan {planLabel}
      </p>
      <p className="text-xs text-[#1A1F2B]/60 mb-3">
        {message || defaultMessage}
      </p>
      {onUpgradeClick ? (
        <Button
          size="sm"
          variant="outline"
          onClick={onUpgradeClick}
          className="text-[#80368D] border-[#80368D]/30 hover:bg-[#80368D]/5 text-xs"
        >
          Découvrir le plan {planLabel}
          <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      ) : (
        <Button size="sm" variant="outline" asChild className="text-[#80368D] border-[#80368D]/30 hover:bg-[#80368D]/5 text-xs">
          <Link href={`/subscribe?plan=${requiredPlan}`}>
            Découvrir le plan {planLabel}
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      )}
    </div>
  )
}

/** Badge inline pour indiquer qu'une fonctionnalité nécessite un plan spécifique */
export function PlanBadge({ plan }: { plan: RequiredPlan }) {
  const colors: Record<RequiredPlan, string> = {
    basic: "bg-[#1A1F2B]/10 text-[#1A1F2B]",
    pro: "bg-[#80368D]/10 text-[#80368D]",
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${colors[plan]}`}>
      <Lock className="h-2.5 w-2.5" />
      {PLAN_LABELS[plan]}
    </span>
  )
}
