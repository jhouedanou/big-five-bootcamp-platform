"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Check, ChevronDown, Cookie, Settings2, ShieldCheck, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

const CONSENT_STORAGE_KEY = "laveiye-rgpd-consent-v1"
const CONSENT_COOKIE_NAME = "laveiye_rgpd_consent"
const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

type ConsentPayload = {
  necessary: true
  analytics: boolean
  marketing: boolean
  acceptedAt: string
  version: 1
}

type PreferenceRowProps = {
  title: string
  description: string
  checked: boolean
  disabled?: boolean
  onCheckedChange?: (checked: boolean) => void
}

function PreferenceRow({
  title,
  description,
  checked,
  disabled = false,
  onCheckedChange,
}: PreferenceRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-[#F5F5F5] bg-white px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-bold text-[#0F0F0F]">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-[#0F0F0F]/60">{description}</p>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        aria-label={title}
        className="mt-0.5"
      />
    </div>
  )
}

export function RgpdBottomSheet() {
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [analytics, setAnalytics] = useState(true)
  const [marketing, setMarketing] = useState(false)

  const closeSheet = useCallback(() => {
    setVisible(false)
    window.setTimeout(() => setOpen(false), 260)
  }, [])

  const saveConsent = useCallback(
    ({
      analytics: analyticsConsent,
      marketing: marketingConsent,
    }: Pick<ConsentPayload, "analytics" | "marketing">) => {
      const payload: ConsentPayload = {
        necessary: true,
        analytics: analyticsConsent,
        marketing: marketingConsent,
        acceptedAt: new Date().toISOString(),
        version: 1,
      }

      const cookieValue =
        analyticsConsent && marketingConsent
          ? "all"
          : analyticsConsent || marketingConsent
            ? "custom"
            : "necessary"

      try {
        window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(payload))
        document.cookie = `${CONSENT_COOKIE_NAME}=${cookieValue}; Max-Age=${CONSENT_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`
        window.dispatchEvent(new CustomEvent("laveiye:rgpd-consent", { detail: payload }))
      } catch {
        document.cookie = `${CONSENT_COOKIE_NAME}=${cookieValue}; Max-Age=${CONSENT_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`
      }

      closeSheet()
    },
    [closeSheet],
  )

  useEffect(() => {
    setMounted(true)

    try {
      const savedConsent = window.localStorage.getItem(CONSENT_STORAGE_KEY)
      if (savedConsent) {
        JSON.parse(savedConsent)
        return
      }
    } catch {
      try {
        window.localStorage.removeItem(CONSENT_STORAGE_KEY)
      } catch {
        // Ignore storage failures and show the consent sheet.
      }
    }

    setOpen(true)
    requestAnimationFrame(() => setVisible(true))
  }, [])

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        saveConsent({ analytics: false, marketing: false })
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, saveConsent])

  if (!mounted || !open) return null

  return (
    <div
      className={cn(
        "fixed inset-0 z-[120] flex items-end justify-center bg-[#0F0F0F]/35 px-3 pt-10 backdrop-blur-[2px] transition-opacity duration-300 sm:px-6 sm:pb-5",
        visible ? "opacity-100" : "opacity-0",
      )}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rgpd-bottom-sheet-title"
        aria-describedby="rgpd-bottom-sheet-description"
        className={cn(
          "w-full max-w-3xl overflow-hidden rounded-t-2xl border border-[#F5F5F5] bg-white shadow-2xl transition-transform duration-300 ease-out sm:rounded-2xl",
          visible ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="flex justify-center bg-white pb-1 pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-[#F5F5F5]" />
        </div>

        <div className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#F2B33D]/40 to-transparent" />
          <div className="absolute -right-20 -top-24 h-48 w-48 rounded-full bg-[#F2B33D]/10 blur-3xl" />

          <div className="relative grid gap-5 px-5 pb-6 pt-4 sm:px-7 sm:py-7 lg:grid-cols-[1fr_260px] lg:gap-8">
            <div className="min-w-0">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#F2B33D]/10 px-3 py-1.5 text-xs font-bold uppercase text-[#0F0F0F] ring-1 ring-[#F2B33D]/20">
                <ShieldCheck className="h-4 w-4 text-[#F2B33D]" />
                Confidentialité
              </div>

              <div className="flex items-start gap-4">
                <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F2B33D]/10 sm:flex">
                  <Cookie className="h-6 w-6 text-[#F2B33D]" />
                </div>

                <div>
                  <h2
                    id="rgpd-bottom-sheet-title"
                    className="font-[family-name:var(--font-heading)] text-2xl font-extrabold leading-tight text-[#0F0F0F]"
                  >
                    Vos données
                  </h2>
                  <p
                    id="rgpd-bottom-sheet-description"
                    className="mt-3 max-w-xl text-sm leading-relaxed text-[#0F0F0F]/70"
                  >
                    Nous utilisons les cookies nécessaires au fonctionnement du site. Avec votre accord,
                    nous pouvons aussi mesurer l'audience et personnaliser votre expérience sur Laveiye.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPreferences((current) => !current)}
                className="mt-5 flex w-full items-center gap-3 rounded-lg border border-[#F5F5F5] bg-[#F5F5F5]/40 px-4 py-3 text-left text-sm font-bold text-[#0F0F0F] transition-colors hover:border-[#F2B33D]/40 hover:bg-[#F2B33D]/5"
                aria-expanded={showPreferences}
              >
                <Settings2 className="h-4 w-4 text-[#F2B33D]" />
                Personnaliser mes choix
                <ChevronDown
                  className={cn(
                    "ml-auto h-4 w-4 text-[#0F0F0F]/50 transition-transform",
                    showPreferences && "rotate-180",
                  )}
                />
              </button>

              {showPreferences && (
                <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <PreferenceRow
                    title="Cookies nécessaires"
                    description="Indispensables pour la sécurité, l'authentification et le bon fonctionnement."
                    checked
                    disabled
                  />
                  <PreferenceRow
                    title="Mesure d'audience"
                    description="Nous aide à comprendre les pages utiles et à améliorer la plateforme."
                    checked={analytics}
                    onCheckedChange={setAnalytics}
                  />
                  <PreferenceRow
                    title="Personnalisation"
                    description="Permet d'adapter certains contenus et recommandations à votre usage."
                    checked={marketing}
                    onCheckedChange={setMarketing}
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col justify-between rounded-xl bg-[#F5F5F5]/45 p-4">
              <p className="text-sm leading-relaxed text-[#0F0F0F]/70">
                Vous pouvez modifier vos préférences à tout moment depuis votre navigateur. Pour en
                savoir plus, consultez notre{" "}
                <Link href="/privacy" className="font-bold text-[#F2B33D] underline-offset-4 hover:underline">
                  politique de confidentialité
                </Link>
                .
              </p>

              <div className="mt-5 grid gap-3">
                <Button
                  type="button"
                  className="h-11 rounded-lg bg-[#F2B33D] text-sm font-bold text-white shadow-lg shadow-[#F2B33D]/20 hover:bg-[#F2B33D]/90"
                  onClick={() => saveConsent({ analytics: true, marketing: true })}
                >
                  <Check className="h-4 w-4" />
                  Tout accepter
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-lg border-[#0F0F0F]/15 bg-white text-sm font-bold text-[#0F0F0F] hover:bg-[#F5F5F5]"
                  onClick={() => saveConsent({ analytics, marketing })}
                >
                  <Settings2 className="h-4 w-4" />
                  Enregistrer mes choix
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 rounded-lg text-sm font-bold text-[#0F0F0F]/65 hover:bg-white hover:text-[#0F0F0F]"
                  onClick={() => saveConsent({ analytics: false, marketing: false })}
                >
                  <X className="h-4 w-4" />
                  Continuer sans accepter
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
