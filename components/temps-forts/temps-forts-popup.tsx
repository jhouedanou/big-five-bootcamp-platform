"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getPopupTempsFort, getTempsFortBySlug, isTempsFortActivated } from "@/lib/temps-forts"
import type { TempsFort } from "@/types/temps-fort"
import { useTempsFortsOverrides } from "./use-temps-forts-overrides"
import { useTempsForts } from "./use-temps-forts"

const STORAGE_PREFIX = "laveiye:temps-forts-popup-next:"
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

interface TempsFortsPopupProps {
  tempsFort?: TempsFort | null
  snoozeDays?: number
}

export function TempsFortsPopup({ tempsFort, snoozeDays = 7 }: TempsFortsPopupProps) {
  const overrides = useTempsFortsOverrides()
  const { tempsForts } = useTempsForts()
  const [open, setOpen] = useState(false)
  const [longSnooze, setLongSnooze] = useState(false)

  const activeTempsFort = useMemo<TempsFort | null>(() => {
    if (tempsFort) return tempsFort
    if (!overrides) return null
    if (!overrides.popupEnabled) return null
    if (overrides.popupSlug) {
      const found = getTempsFortBySlug(tempsForts, overrides.popupSlug)
      if (found && isTempsFortActivated(found)) return found
      return null
    }
    return getPopupTempsFort(tempsForts)
  }, [tempsFort, overrides, tempsForts])

  const version = overrides?.version ?? 1

  useEffect(() => {
    if (!activeTempsFort) return

    const key = `${STORAGE_PREFIX}${activeTempsFort.id}:v${version}`
    const nextAllowedAt = Number(localStorage.getItem(key) || "0")

    if (!nextAllowedAt || Date.now() >= nextAllowedAt) {
      const timer = window.setTimeout(() => setOpen(true), 900)
      return () => window.clearTimeout(timer)
    }
  }, [activeTempsFort, version])

  if (!activeTempsFort || !open) return null

  const closePopup = () => {
    const duration = longSnooze ? snoozeDays * 24 * 60 * 60 * 1000 : THREE_DAYS_MS
    const key = `${STORAGE_PREFIX}${activeTempsFort.id}:v${version}`
    localStorage.setItem(key, String(Date.now() + duration))
    setOpen(false)
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0F0F0F]/55 px-4 py-6 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-5 shadow-2xl">
        <button
          type="button"
          onClick={closePopup}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#0F0F0F] shadow-sm transition hover:bg-[#F5F5F5]"
          aria-label="Fermer le pop-up temps fort"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-[#F5F5F5]">
          <Image
            src={activeTempsFort.imageUrl}
            alt={activeTempsFort.shortTitle || activeTempsFort.title}
            fill
            sizes="448px"
            className="object-cover"
            priority
          />
        </div>

        <div className="pt-5 text-center">
          <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full bg-[#F2B33D] px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-[#0F0F0F]">
            <Sparkles className="h-3.5 w-3.5" />
            Temps fort
          </div>
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-extrabold leading-tight text-[#0F0F0F]">
            Préparez vos campagnes {activeTempsFort.shortTitle || activeTempsFort.title}
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm font-medium leading-relaxed text-[#0F0F0F]/70">
            Inspirez-vous des meilleures activations marketing et créez des campagnes prêtes pour le bon moment.
          </p>

          <Button asChild className="mt-5 h-11 w-full rounded-lg bg-[#0F0F0F] font-bold text-white hover:bg-[#0F0F0F]/90">
            <Link href={`/temps-forts/${activeTempsFort.slug}`} onClick={closePopup}>
              Explorer maintenant
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>

          <label className="mt-4 inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-[#0F0F0F]/60">
            <input
              type="checkbox"
              checked={longSnooze}
              onChange={(event) => setLongSnooze(event.target.checked)}
              className="h-4 w-4 rounded border-[#E5E5E5] accent-[#F2B33D]"
            />
            Ne plus afficher pendant {snoozeDays} jours
          </label>
        </div>
      </div>
    </div>
  )
}
