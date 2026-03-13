"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  Check,
  Sparkles,
  Loader2,
  PartyPopper,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSupabaseAuth } from "@/hooks/use-supabase-auth"
import { LegalModal } from "@/components/legal-modal"
import { ChariowWidget } from "@/components/chariow-widget"
import { PLAN_BASIC, PLAN_PRO } from "@/lib/pricing"

function SubscribePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planParam = (searchParams.get("plan") || "pro").toLowerCase() as "basic" | "pro"
  const { user, userProfile, loading } = useSupabaseAuth()

  const [selectedPlan, setSelectedPlan] = useState<"basic" | "pro">(
    planParam === "basic" ? "basic" : "pro"
  )
  const [subscriptionActivated, setSubscriptionActivated] = useState(false)
  const [newEndDate, setNewEndDate] = useState<string | null>(null)
  const [isRenewal, setIsRenewal] = useState(false)

  const planConfig = selectedPlan === "basic" ? PLAN_BASIC : PLAN_PRO
  const priceLabel = planConfig.price.toLocaleString("fr-FR")

  const [activating, setActivating] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?redirect=/subscribe?plan=" + selectedPlan)
    }
  }, [user, loading, router, selectedPlan])

  // Activation automatique après paiement via widget
  const handlePaymentSuccess = useCallback(async (data: { purchaseId?: string; returnUrl?: string }) => {
    if (!user?.email) return
    setActivating(true)
    try {
      const res = await fetch("/api/payment/activate-widget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          purchaseId: data.purchaseId,
          plan: selectedPlan,
        }),
      })
      const result = await res.json()
      if (result.success) {
        setSubscriptionActivated(true)
        setNewEndDate(result.subscription?.endDate || null)
        setIsRenewal(result.subscription?.isRenewal || false)
      }
    } catch (err) {
      console.error("Erreur activation:", err)
    } finally {
      setActivating(false)
    }
  }, [user?.email, selectedPlan])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#80368D]" />
      </div>
    )
  }

  // ===============================
  // SUCCÈS — Abonnement activé !
  // ===============================
  if (subscriptionActivated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#D0E4F2]/30 to-white px-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#10B981]/20">
            <PartyPopper className="h-12 w-12 text-[#10B981]" />
          </div>

          <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-[#1A1F2B]">
            {isRenewal ? "Renouvellement confirmé !" : "Abonnement activé !"}
          </h1>

          <p className="mt-3 text-[#1A1F2B]/70">
            {isRenewal
              ? "Ton abonnement a été prolongé avec succès."
              : `Bienvenue dans la famille ${planConfig.name} ! Tu as maintenant accès à toute la bibliothèque créative.`}
          </p>

          {newEndDate && (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#10B981]/10 px-5 py-2.5 text-sm font-semibold text-[#10B981]">
              <span>📅</span>
              <span>
                Valable jusqu&apos;au{" "}
                {new Date(newEndDate).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          )}

          <div className="mt-8 space-y-3">
            <Button
              asChild
              className="h-12 w-full bg-[#80368D] text-base font-semibold shadow-lg shadow-[#80368D]/25 hover:bg-[#80368D]/90"
            >
              <Link href="/dashboard">
                🎨 Accéder à la bibliothèque
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ===============================
  // PAGE PRINCIPALE
  // ===============================
  const isAlreadyPremium =
    userProfile?.plan === "Premium" ||
    userProfile?.plan === "Pro" ||
    userProfile?.plan === "Basic"

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-[#D0E4F2] bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-[#1A1F2B]/70 hover:text-[#1A1F2B]"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#80368D]">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-[family-name:var(--font-heading)] font-bold text-[#1A1F2B]">
              Big Five
            </span>
          </Link>
          <div className="w-16" />
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8">
        {isAlreadyPremium ? (
          /* ====== RENOUVELLEMENT ====== */
          <div className="mx-auto max-w-lg">
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#80368D]/15">
                <Sparkles className="h-12 w-12 text-[#80368D]" />
              </div>

              <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[#1A1F2B]">
                Abonnement actif !
              </h1>

              <p className="mt-3 text-[#1A1F2B]/70">
                Ton abonnement est actif. Tu as accès à l&apos;ensemble de la bibliothèque créative Big Five.
              </p>

              {(userProfile as any)?.subscription_end_date && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#80368D]/10 px-4 py-2 text-sm font-medium text-[#80368D]">
                  <span>📅</span>
                  <span>
                    Expire le{" "}
                    {new Date((userProfile as any).subscription_end_date).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-8 rounded-xl border-2 border-[#80368D]/20 bg-[#80368D]/5 p-6">
              <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-[#1A1F2B]">
                🔄 Renouveler maintenant
              </h2>
              <p className="mt-2 text-sm text-[#1A1F2B]/70">
                Renouvelle ton abonnement dès maintenant.
                <strong> 30 jours seront ajoutés</strong> à ta date d&apos;expiration actuelle.
              </p>

              {user?.email && (
                <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                  <p className="text-xs text-blue-700">
                    Utilise le même email (<strong>{user.email}</strong>) lors du paiement pour que
                    ton abonnement soit activé automatiquement.
                  </p>
                </div>
              )}

              <div className="mt-5">
                {activating ? (
                  <div className="flex items-center justify-center gap-2 py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-[#80368D]" />
                    <span className="text-sm text-[#1A1F2B]/70">Activation en cours...</span>
                  </div>
                ) : (
                  <ChariowWidget onPaymentSuccess={handlePaymentSuccess} />
                )}
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-[#10B981]/5 p-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#10B981]" />
                  <p className="text-xs text-[#1A1F2B]/60">
                    Paiement sécurisé via Chariow. Ton abonnement sera activé automatiquement après le paiement.
                  </p>
                </div>
              </div>

              <p className="mt-3 text-center text-xs text-[#1A1F2B]/50">
                En procédant au paiement, tu acceptes les{" "}
                <LegalModal
                  defaultTab="cgv"
                  trigger={
                    <button type="button" className="text-[#80368D] hover:underline">
                      CGV et la politique de confidentialité
                    </button>
                  }
                />
              </p>
            </div>

            <Button asChild variant="outline" className="mt-4 h-12 w-full">
              <Link href="/dashboard">Accéder à la bibliothèque</Link>
            </Button>
          </div>
        ) : (
          /* ====== NOUVEAU — Choisir un plan ====== */
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Informations */}
            <div>
              <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-foreground">
                Choisissez votre plan
              </h1>
              <p className="mt-2 text-muted-foreground">
                Accède à toute la bibliothèque créative Big Five et booste tes campagnes publicitaires.
              </p>

              {/* Sélecteur de plan */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedPlan("pro")}
                  className={`rounded-xl border-2 p-4 text-left transition-all ${
                    selectedPlan === "pro"
                      ? "border-[#80368D] bg-[#80368D]/5"
                      : "border-[#D0E4F2] hover:border-[#80368D]/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[#80368D]">Pro</span>
                    <span className="text-[10px] font-bold bg-[#F2B33D] text-[#1A1F2B] px-2 py-0.5 rounded-full">
                      ⭐ Populaire
                    </span>
                  </div>
                  <p className="text-xl font-extrabold text-[#1A1F2B]">
                    {PLAN_PRO.price.toLocaleString("fr-FR")} FCFA
                  </p>
                  <p className="text-xs text-[#1A1F2B]/60">par mois · Recherches illimitées</p>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPlan("basic")}
                  className={`rounded-xl border-2 p-4 text-left transition-all ${
                    selectedPlan === "basic"
                      ? "border-[#80368D] bg-[#80368D]/5"
                      : "border-[#D0E4F2] hover:border-[#80368D]/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[#1A1F2B]">Basic</span>
                  </div>
                  <p className="text-xl font-extrabold text-[#1A1F2B]">
                    {PLAN_BASIC.price.toLocaleString("fr-FR")} FCFA
                  </p>
                  <p className="text-xs text-[#1A1F2B]/60">par mois · 10 recherches/jour</p>
                </button>
              </div>

              <div className="mt-8 space-y-4">
                <h2 className="text-lg font-semibold">Ce qui est inclus :</h2>
                {[
                  "Accès illimité à toutes les campagnes",
                  "Filtres avancés par secteur, pays, format",
                  "Téléchargement des ressources créatives",
                  "Favoris & collections personnalisées",
                  "Nouvelles campagnes ajoutées chaque semaine",
                  ...(selectedPlan === "pro" ? ["Recherches illimitées par filtre"] : ["10 recherches par filtre/jour"]),
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#10B981]/20">
                      <Check className="h-3 w-3 text-[#10B981]" />
                    </div>
                    <span className="text-sm text-foreground">{feature}</span>
                  </div>
                ))}
              </div>

              {user?.email && (
                <div className="mt-6 flex items-start gap-2 rounded-lg bg-blue-50 p-4">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                  <div className="text-sm text-blue-700">
                    <p className="font-semibold">Important</p>
                    <p className="mt-1">
                      Utilise le même email (<strong>{user.email}</strong>) lors du paiement
                      pour que ton abonnement soit activé automatiquement.
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-6">
                {activating ? (
                  <div className="flex items-center justify-center gap-2 py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-[#80368D]" />
                    <span className="text-sm text-[#1A1F2B]/70">Activation en cours...</span>
                  </div>
                ) : (
                  <ChariowWidget onPaymentSuccess={handlePaymentSuccess} />
                )}
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-[#10B981]/5 p-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#10B981]" />
                  <p className="text-xs text-[#1A1F2B]/60">
                    Paiement sécurisé via Chariow. Ton abonnement sera activé automatiquement après le paiement.
                  </p>
                </div>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                En procédant au paiement, tu acceptes les{" "}
                <LegalModal
                  defaultTab="cgv"
                  trigger={
                    <button type="button" className="text-primary hover:underline">
                      CGV et la politique de confidentialité
                    </button>
                  }
                />
              </p>
            </div>

            {/* Récapitulatif */}
            <div>
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-card-foreground">
                  Récapitulatif
                </h2>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Abonnement mensuel Big Five — {planConfig.name}
                    </span>
                    <span className="font-medium text-foreground">{priceLabel} FCFA</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Durée</span>
                    <span className="text-foreground">1 mois</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Taxes</span>
                    <span className="text-foreground">Incluses</span>
                  </div>
                </div>

                <div className="mt-4 border-t border-border pt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">Total</span>
                    <span className="font-[family-name:var(--font-heading)] text-2xl font-bold text-primary">
                      {priceLabel} FCFA
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">Valable 1 mois</p>
                </div>

                {/* Comment ça marche */}
                <div className="mt-6 border-t border-border pt-4">
                  <p className="mb-3 text-sm font-semibold text-foreground">Comment ça marche ?</p>
                  <ol className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex gap-2">
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#80368D]/10 text-xs font-bold text-[#80368D]">1</span>
                      Clique sur le bouton pour payer
                    </li>
                    <li className="flex gap-2">
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#80368D]/10 text-xs font-bold text-[#80368D]">2</span>
                      Confirme le paiement via Mobile Money ou carte
                    </li>
                    <li className="flex gap-2">
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#80368D]/10 text-xs font-bold text-[#80368D]">3</span>
                      Ton abonnement est activé automatiquement 🎉
                    </li>
                  </ol>
                </div>

                {/* Méthodes de paiement */}
                <div className="mt-6 border-t border-border pt-4">
                  <p className="mb-3 text-xs text-muted-foreground">Méthodes de paiement acceptées :</p>
                  <div className="flex flex-wrap gap-2">
                    {["Orange Money", "Wave", "MTN Money", "Moov Money", "Carte Bancaire"].map((method) => (
                      <span
                        key={method}
                        className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"
                      >
                        {method}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SubscribePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#80368D]" />
      </div>
    }>
      <SubscribePageInner />
    </Suspense>
  )
}
