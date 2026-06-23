"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Sparkles, ArrowRight } from "lucide-react"
import { useAuthContext } from "@/components/auth-provider"
import { useActivePromo } from "./useActivePromo"
import { Countdown } from "./Countdown"
import { trackEvent } from "@/lib/analytics"
import { PROMO_TEXT } from "@/lib/promo"

/** Pro actif = ne pas afficher la promo (sauf décision métier contraire). */
function isActivePro(profile: any): boolean {
  if (!profile) return false
  const end = profile.subscription_end_date ? new Date(profile.subscription_end_date) : null
  return (
    profile.plan === "Pro" &&
    profile.subscription_status === "active" &&
    !!end &&
    end.getTime() > Date.now()
  )
}

/**
 * Bannière promo (espace connecté). Affichée uniquement si une promo est live
 * et que l'utilisateur n'est pas déjà Pro actif.
 */
export function PromoBanner() {
  const { userProfile, isAuthenticated } = useAuthContext()
  const { promo, loading, preview } = useActivePromo()
  const [expired, setExpired] = useState(false)
  const viewedRef = useRef(false)

  const visible =
    !loading &&
    isAuthenticated &&
    !!promo &&
    promo.campaign.show_in_banner &&
    !expired &&
    // En aperçu admin, on montre la bannière même à un compte Pro actif.
    (preview || !isActivePro(userProfile))

  useEffect(() => {
    if (visible && !viewedRef.current) {
      viewedRef.current = true
      trackEvent("promo_banner_viewed", { campaign_id: promo?.campaign.id })
    }
  }, [visible, promo])

  if (!visible || !promo) return null

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-[#F2B33D]/40 bg-neutral-900 text-white">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-[#F2B33D] p-1.5 text-black">
            <Sparkles className="size-4" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold sm:text-base">{PROMO_TEXT.title}</p>
            <p className="text-xs text-white/70 sm:text-sm">{PROMO_TEXT.body}</p>
            <Countdown
              endIso={promo.campaign.end_date}
              prefix={PROMO_TEXT.countdownPrefix}
              onExpire={() => setExpired(true)}
              className="text-xs text-[#F2B33D]"
            />
          </div>
        </div>
        <Link
          href="/checkout?source=promo_banner"
          onClick={() => trackEvent("promo_banner_clicked", { campaign_id: promo.campaign.id })}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#F2B33D] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[#d99a2a]"
        >
          {PROMO_TEXT.cta}
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  )
}
