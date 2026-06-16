"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  getMomentTempsForts,
  getTempsFortBySlug,
  isTempsFortActivated,
} from "@/lib/temps-forts"
import type { TempsFort } from "@/types/temps-fort"
import { useTempsFortsOverrides } from "@/components/temps-forts/use-temps-forts-overrides"
import { useTempsForts } from "@/components/temps-forts/use-temps-forts"
import { useAuthContext } from "@/components/auth-provider"
import { useActivePromo } from "./useActivePromo"
import { Countdown } from "./Countdown"
import { trackEvent } from "@/lib/analytics"
import { PROMO_TEXT } from "@/lib/promo"

const DISMISSED_KEY = "laveiye:dashboard-hero-dismissed"
const ROTATE_INTERVAL_MS = 6000

/** Pro actif = ne pas afficher la promo (sauf mode aperçu admin). */
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

type Slide = { kind: "tf"; tf: TempsFort } | { kind: "promo" }

interface Props {
  className?: string
  /** Sans conteneur max-w-7xl : la carte remplit son parent (grille du dashboard). */
  embedded?: boolean
}

/**
 * Bannière carrousel unifiée (espace connecté) : alterne automatiquement entre
 * les Temps forts et l'offre promotionnelle (avec compte à rebours), dans un
 * seul carrousel coulissant. La diapo promo n'apparaît que si une promo est
 * live (ou en mode aperçu admin) et que l'utilisateur n'est pas déjà Pro actif.
 */
export function PromoTempsFortsCarousel({ className, embedded }: Props) {
  const overrides = useTempsFortsOverrides()
  const { tempsForts } = useTempsForts()
  const { userProfile, isAuthenticated } = useAuthContext()
  const { promo, loading: promoLoading, preview } = useActivePromo()

  const [mounted, setMounted] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [promoExpired, setPromoExpired] = useState(false)
  const promoViewedRef = useRef(false)

  // Temps forts à afficher (même logique que la bannière historique).
  const tfSlides = useMemo<TempsFort[]>(() => {
    if (!overrides || !overrides.bannerEnabled) return []
    if (overrides.bannerSlug) {
      const found = getTempsFortBySlug(tempsForts, overrides.bannerSlug)
      return found && isTempsFortActivated(found) ? [found] : []
    }
    const actives = getMomentTempsForts(tempsForts)
    return actives.slice().sort((a, b) => {
      if (!!a.featured === !!b.featured) return 0
      return a.featured ? -1 : 1
    })
  }, [overrides, tempsForts])

  // La diapo promo est-elle éligible ?
  const promoVisible =
    !promoLoading &&
    isAuthenticated &&
    !!promo &&
    promo.campaign.show_in_banner &&
    !promoExpired &&
    (preview || !isActivePro(userProfile))

  // Diapos unifiées : Temps forts puis promo (alternance au défilement).
  const slides = useMemo<Slide[]>(() => {
    const list: Slide[] = tfSlides.map((tf) => ({ kind: "tf", tf }))
    if (promoVisible) list.push({ kind: "promo" })
    return list
  }, [tfSlides, promoVisible])

  const version = overrides?.version ?? 1

  // Reset / dismissal versionné (un seul état pour la bannière entière).
  useEffect(() => {
    if (slides.length === 0) {
      setMounted(false)
      setDismissed(false)
      return
    }
    setMounted(true)
    const stored = sessionStorage.getItem(DISMISSED_KEY)
    setDismissed(stored === `v${version}`)
  }, [slides.length, version])

  // Garder l'index dans les bornes si la liste change.
  useEffect(() => {
    if (index >= slides.length) setIndex(0)
  }, [slides.length, index])

  // Rotation automatique.
  useEffect(() => {
    if (!mounted || dismissed || paused || slides.length <= 1) return
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length)
    }, ROTATE_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [mounted, dismissed, paused, slides.length])

  // Tracking : 1 vue promo quand la diapo promo devient visible.
  const current = slides[index] || slides[0]
  useEffect(() => {
    if (current?.kind === "promo" && !promoViewedRef.current) {
      promoViewedRef.current = true
      trackEvent("promo_banner_viewed", { campaign_id: promo?.campaign.id, carousel: true })
    }
  }, [current, promo])

  if (!mounted || dismissed || slides.length === 0 || !current) return null

  const closeBanner = () => {
    sessionStorage.setItem(DISMISSED_KEY, `v${version}`)
    setDismissed(true)
  }
  const goPrev = () => setIndex((i) => (i - 1 + slides.length) % slides.length)
  const goNext = () => setIndex((i) => (i + 1) % slides.length)
  const hasMultiple = slides.length > 1

  const card = (
    <div
      className="relative h-full overflow-hidden rounded-2xl border border-[#F2B33D]/30 bg-[#F2B33D]/15 shadow-sm"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {current.kind === "tf" ? (
        <TempsFortCard tf={current.tf} index={index} total={slides.length} hasMultiple={hasMultiple} />
      ) : (
        promo && (
          <PromoCard
            endIso={promo.campaign.end_date}
            campaignId={promo.campaign.id}
            onExpire={() => setPromoExpired(true)}
          />
        )
      )}

      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="Diapositive précédente"
            className="absolute left-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-card-foreground shadow-sm transition hover:bg-card sm:flex"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Diapositive suivante"
            className="absolute right-16 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-card-foreground shadow-sm transition hover:bg-card sm:flex"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <div className="absolute bottom-3 left-6 flex items-center gap-1.5 sm:left-8">
            {slides.map((slide, i) => (
              <button
                key={slide.kind === "tf" ? slide.tf.id : "promo"}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Aller à la diapositive ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-6 bg-foreground" : "w-2 bg-foreground/30 hover:bg-foreground/50"
                }`}
              />
            ))}
          </div>
        </>
      )}

      <button
        type="button"
        onClick={closeBanner}
        className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-card text-card-foreground shadow-sm transition hover:bg-muted"
        aria-label="Fermer la bannière"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )

  if (embedded) {
    return <div className={`h-full min-w-0 ${className ?? ""}`}>{card}</div>
  }
  return (
    <section className={className}>
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">{card}</div>
    </section>
  )
}

function TempsFortCard({
  tf,
  index,
  total,
  hasMultiple,
}: {
  tf: TempsFort
  index: number
  total: number
  hasMultiple: boolean
}) {
  return (
    <>
      <div className="absolute inset-y-0 right-0 hidden w-1/2 md:block">
        <Image
          key={tf.id}
          src={tf.heroImageUrl || tf.imageUrl}
          alt=""
          fill
          sizes="50vw"
          className="object-cover transition-opacity duration-500"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#FFF4D6] via-[#FFF4D6]/50 to-transparent dark:from-card dark:via-card/50" />
      </div>

      <div className="relative flex min-h-56 flex-col justify-center gap-5 px-6 py-7 sm:px-8 md:max-w-[62%]">
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-card px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-card-foreground shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-[#F2B33D]" />
          Temps fort
          {hasMultiple && <span className="ml-1 text-muted-foreground">{index + 1} / {total}</span>}
        </div>

        <div>
          <h2 className="font-[family-name:var(--font-heading)] text-3xl font-extrabold leading-tight text-foreground sm:text-4xl">
            {tf.title}
          </h2>
          <p className="mt-2 max-w-2xl text-base font-medium leading-relaxed text-foreground/75">
            {tf.description}
          </p>
        </div>

        <Button asChild className="h-11 w-fit rounded-lg bg-[#0F0F0F] px-5 font-bold text-white hover:bg-[#0F0F0F]/90">
          <Link href={`/temps-forts/${tf.slug}`}>
            {tf.ctaLabel || "Explorer"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </>
  )
}

function PromoCard({
  endIso,
  campaignId,
  onExpire,
}: {
  endIso: string
  campaignId: string
  onExpire: () => void
}) {
  return (
    <div className="relative flex min-h-56 flex-col justify-center gap-4 px-6 py-7 sm:px-8 md:max-w-[70%]">
      <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#0F0F0F] px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm">
        <Sparkles className="h-3.5 w-3.5 text-[#F2B33D]" />
        Offre limitée
      </div>

      <div>
        <h2 className="font-[family-name:var(--font-heading)] text-3xl font-extrabold leading-tight text-foreground sm:text-4xl">
          {PROMO_TEXT.title}
        </h2>
        <p className="mt-2 max-w-2xl text-base font-medium leading-relaxed text-foreground/75">
          {PROMO_TEXT.body}
        </p>
      </div>

      <Countdown
        endIso={endIso}
        prefix={PROMO_TEXT.countdownPrefix}
        onExpire={onExpire}
        className="text-sm font-semibold text-[#0F0F0F]"
      />

      <Button
        asChild
        className="h-11 w-fit rounded-lg bg-[#0F0F0F] px-5 font-bold text-white hover:bg-[#0F0F0F]/90"
      >
        <Link
          href="/checkout?source=promo_banner"
          onClick={() => trackEvent("promo_banner_clicked", { campaign_id: campaignId, carousel: true })}
        >
          {PROMO_TEXT.cta}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  )
}
