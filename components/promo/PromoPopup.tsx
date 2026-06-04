"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useAuthContext } from "@/components/auth-provider"
import { useActivePromo } from "./useActivePromo"
import { Countdown } from "./Countdown"
import { trackEvent } from "@/lib/analytics"
import { PROMO_TEXT } from "@/lib/promo"

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

function todayKey(): string {
  const d = new Date()
  return `promo_popup_last_seen_${d.getFullYear()}_${String(d.getMonth() + 1).padStart(2, "0")}_${String(
    d.getDate()
  ).padStart(2, "0")}`
}

/**
 * Popup promo central, affiché 1×/jour après connexion.
 * Fréquence : localStorage (instantané) + table user_popup_views (robuste).
 */
export function PromoPopup() {
  const router = useRouter()
  const { userProfile, isAuthenticated, loading } = useAuthContext()
  const { promo } = useActivePromo()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (loading || !isAuthenticated || !promo) return
    if (!promo.campaign.show_in_popup) return
    if (isActivePro(userProfile)) return

    // Garde localStorage immédiate (évite le flash à chaque navigation).
    if (typeof window !== "undefined" && localStorage.getItem(todayKey())) return

    let cancelled = false
    const run = async () => {
      try {
        const res = await fetch("/api/user/popup-view?type=promo_popup", { cache: "no-store" })
        const data = await res.json().catch(() => ({ seenToday: false }))
        if (cancelled || data?.seenToday) return

        setOpen(true)
        trackEvent("promo_popup_viewed", { campaign_id: promo.campaign.id })
        try {
          localStorage.setItem(todayKey(), "1")
        } catch {
          /* noop */
        }
        // Marque côté serveur (source de vérité).
        fetch("/api/user/popup-view", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ popup_type: "promo_popup" }),
          keepalive: true,
        }).catch(() => {})
      } catch {
        /* noop */
      }
    }
    // Léger délai après connexion pour ne pas heurter le rendu initial.
    const t = setTimeout(run, 800)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAuthenticated, promo])

  function close() {
    trackEvent("promo_popup_closed", { campaign_id: promo?.campaign.id })
    setOpen(false)
  }

  function goCheckout() {
    trackEvent("promo_popup_clicked", { campaign_id: promo?.campaign.id })
    setOpen(false)
    router.push("/checkout?source=promo_popup")
  }

  if (!promo) return null

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 inline-flex size-10 items-center justify-center rounded-xl bg-[#F2B33D] text-black">
            <Sparkles className="size-5" />
          </div>
          <DialogTitle>{PROMO_TEXT.title}</DialogTitle>
          <DialogDescription>{PROMO_TEXT.body}</DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-neutral-100 px-3 py-2 text-center text-sm">
          <Countdown
            endIso={promo.campaign.end_date}
            prefix={PROMO_TEXT.countdownPrefix}
            onExpire={() => setOpen(false)}
            className="text-neutral-800"
          />
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" onClick={close} className="text-neutral-500">
            {PROMO_TEXT.later}
          </Button>
          <Button
            onClick={goCheckout}
            className="bg-neutral-900 font-semibold text-white hover:bg-neutral-800"
          >
            {PROMO_TEXT.cta}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
