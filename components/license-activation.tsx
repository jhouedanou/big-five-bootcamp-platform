"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  Key,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChariowWidget } from "@/components/chariow-widget"

type Step = "payment" | "license" | "success"

interface LicenseActivationProps {
  /** Email de l'utilisateur connecté */
  userEmail: string
  /** Callback quand l'abonnement est activé */
  onActivated?: (data: { endDate: string; isRenewal: boolean }) => void
  /** Le CTA width pour le widget */
  ctaWidth?: "xs" | "sm" | "md" | "lg" | "full"
  /** Texte personnalisé pour l'étape paiement */
  paymentDescription?: string
  /** Mode compact (paywall) vs étendu (subscribe) */
  compact?: boolean
}

/**
 * Composant en 2 étapes :
 * 1. Payer via le widget Chariow
 * 2. Entrer la clé de licence reçue pour activer l'abonnement
 *
 * Peut aussi être utilisé directement à l'étape 2 si l'utilisateur
 * a déjà payé et possède une clé.
 */
export function LicenseActivation({
  userEmail,
  onActivated,
  ctaWidth = "full",
  paymentDescription,
  compact = false,
}: LicenseActivationProps) {
  const [step, setStep] = useState<Step>("payment")
  const [licenseKey, setLicenseKey] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [endDate, setEndDate] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus sur l'input quand on passe à l'étape licence
  useEffect(() => {
    if (step === "license" && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [step])

  // Formater la saisie de licence (auto-tirets) : XXXX-XXXX-XXXX-XXXX
  const formatLicenseKey = (value: string) => {
    const clean = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase()
    const parts = clean.match(/.{1,4}/g)
    return parts ? parts.join("-") : ""
  }

  const handleLicenseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatLicenseKey(e.target.value)
    if (formatted.length <= 19) {
      // XXXX-XXXX-XXXX-XXXX = 19 chars
      setLicenseKey(formatted)
      setError(null)
    }
  }

  // Quand le widget signale un paiement
  const handlePaymentSuccess = useCallback(() => {
    console.log("🎯 Payment detected via widget, switching to license step")
    setStep("license")
  }, [])

  // Vérifier la licence
  const handleVerifyLicense = async () => {
    if (!licenseKey.trim() || licenseKey.replace(/-/g, "").length < 12) {
      setError("Entre une clé de licence complète (ex: E6PM-Q0N6-RC8N-VRGB)")
      return
    }

    setVerifying(true)
    setError(null)

    try {
      const res = await fetch("/api/license/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          licenseKey: licenseKey.trim(),
          email: userEmail,
        }),
      })
      const data = await res.json()

      if (data.success) {
        setEndDate(data.subscription_end_date)
        setStep("success")
        onActivated?.({
          endDate: data.subscription_end_date,
          isRenewal: false,
        })
      } else {
        setError(data.error || "Licence invalide ou déjà utilisée")
      }
    } catch {
      setError("Erreur de connexion. Réessaie dans quelques instants.")
    } finally {
      setVerifying(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleVerifyLicense()
    }
  }

  // ========= ÉTAPE SUCCÈS =========
  if (step === "success") {
    return (
      <div className="rounded-xl border-2 border-[#10B981]/30 bg-[#10B981]/5 p-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#10B981]/20">
          <CheckCircle2 className="h-8 w-8 text-[#10B981]" />
        </div>
        <h3 className="text-lg font-bold text-[#1A1F2B]">Abonnement activé !</h3>
        <p className="mt-2 text-sm text-[#1A1F2B]/70">
          Ton accès Premium est maintenant actif.
        </p>
        {endDate && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#10B981]/10 px-4 py-2 text-sm font-semibold text-[#10B981]">
            📅 Valable jusqu&apos;au{" "}
            {new Date(endDate).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
        )}
      </div>
    )
  }

  // ========= ÉTAPE LICENCE (formulaire) =========
  if (step === "license") {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border-2 border-[#80368D]/20 bg-[#80368D]/5 p-6">
          {/* Indicateur d'étape */}
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#10B981] text-sm font-bold text-white">
              ✓
            </div>
            <div className="h-0.5 flex-1 bg-[#80368D]/20" />
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#80368D] text-sm font-bold text-white">
              2
            </div>
          </div>

          <div className="mb-1 flex items-center gap-2">
            <Key className="h-5 w-5 text-[#80368D]" />
            <h3 className="font-semibold text-[#1A1F2B]">
              Entre ta clé de licence
            </h3>
          </div>

          <p className="mb-4 text-sm text-[#1A1F2B]/70">
            Après le paiement, Chariow t&apos;a envoyé une <strong>clé de licence</strong> par 
            email ou SMS. Copie-la ci-dessous pour activer ton abonnement.
          </p>

          {/* Input licence */}
          <div className="space-y-3">
            <input
              ref={inputRef}
              type="text"
              value={licenseKey}
              onChange={handleLicenseChange}
              onKeyDown={handleKeyDown}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              className="h-14 w-full rounded-lg border-2 border-[#80368D]/30 bg-white px-4 text-center font-mono text-lg tracking-wider placeholder:text-[#80368D]/30 focus:border-[#80368D] focus:outline-none focus:ring-2 focus:ring-[#80368D]/20"
              autoComplete="off"
              spellCheck={false}
            />

            <Button
              onClick={handleVerifyLicense}
              disabled={!licenseKey.trim() || verifying}
              className="h-12 w-full bg-[#80368D] text-base font-semibold shadow-lg shadow-[#80368D]/25 hover:bg-[#80368D]/90 disabled:opacity-50"
            >
              {verifying ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Vérification en cours...
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-5 w-5" />
                  Activer mon abonnement
                </>
              )}
            </Button>

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>

          {/* Aide */}
          <div className="mt-4 rounded-lg bg-white/80 p-3">
            <p className="text-xs text-[#1A1F2B]/50">
              💡 La clé ressemble à : <span className="font-mono font-medium">E6PM-Q0N6-RC8N-VRGB</span>
              <br />
              Vérifie tes emails et SMS si tu ne la trouves pas.
            </p>
          </div>
        </div>

        {/* Bouton retour au paiement */}
        <button
          type="button"
          onClick={() => setStep("payment")}
          className="flex w-full items-center justify-center gap-2 text-sm text-[#1A1F2B]/50 hover:text-[#1A1F2B]"
        >
          ← Revenir au paiement
        </button>
      </div>
    )
  }

  // ========= ÉTAPE PAIEMENT (widget) =========
  return (
    <div className="space-y-4">
      {/* Indicateur d'étape */}
      <div className="flex items-center gap-3 px-1">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#80368D] text-sm font-bold text-white">
          1
        </div>
        <div className="h-0.5 flex-1 bg-[#D0E4F2]" />
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#D0E4F2] text-sm font-bold text-[#1A1F2B]/40">
          2
        </div>
      </div>

      {!compact && paymentDescription && (
        <p className="text-sm text-[#1A1F2B]/70">{paymentDescription}</p>
      )}

      {/* Widget Chariow */}
      <div>
        <ChariowWidget ctaWidth={ctaWidth} onPaymentSuccess={handlePaymentSuccess} />
      </div>

      {/* Info sécurité */}
      {!compact && (
        <div className="flex items-start gap-2 rounded-lg bg-[#10B981]/5 p-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#10B981]" />
          <p className="text-xs text-[#1A1F2B]/60">
            Paiement sécurisé via Chariow. Après le paiement, tu recevras une clé de licence à entrer ci-dessous.
          </p>
        </div>
      )}

      {/* Lien direct vers le formulaire de licence */}
      <button
        type="button"
        onClick={() => setStep("license")}
        className="flex w-full items-center justify-center gap-2 text-sm text-[#1A1F2B]/60 hover:text-[#80368D] transition-colors"
      >
        <Key className="h-4 w-4" />
        J&apos;ai déjà une clé de licence
        <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  )
}
