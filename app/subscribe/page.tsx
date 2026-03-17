"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Check, Lock, Sparkles, Loader2, Calendar, Star, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSupabaseAuth } from "@/hooks/use-supabase-auth"
import { LegalModal } from "@/components/legal-modal"

type PlanChoice = "basic" | "pro"

const PLANS = {
  basic: {
    name: "Basic",
    price: 4900,
    priceFormatted: "4 900",
    annualPrice: "49 000",
    dailyCost: "~163",
    description: "Pour les indépendants",
    color: "#1A1F2B",
    features: [
      "Accès illimité à toute la bibliothèque",
      "Filtres avancés (Secteur, Pays, Format...)",
      "Collections personnalisées",
      "Téléchargement des vidéos",
      "Compteur d'usage mensuel",
    ],
  },
  pro: {
    name: "Pro",
    price: 9900,
    priceFormatted: "9 900",
    annualPrice: "99 000",
    dailyCost: "~330",
    description: "Pour les créatifs exigeants",
    color: "#80368D",
    features: [
      "Tout du plan Basic",
      "Recherches illimitées",
      "Suivi de marques",
      "Support prioritaire",
    ],
  },
} as const

export default function SubscribePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, userProfile, loading } = useSupabaseAuth()
  const [selectedPlan, setSelectedPlan] = useState<PlanChoice>(
    (searchParams.get("plan") as PlanChoice) || "pro"
  )
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?redirect=/subscribe")
    }
  }, [user, loading, router])

  const subscriptionEndDate = userProfile?.subscription_end_date
    ? new Date(userProfile.subscription_end_date)
    : null
  const isActive =
    userProfile?.subscription_status === "active" &&
    subscriptionEndDate &&
    subscriptionEndDate > new Date()
  const daysRemaining = isActive
    ? Math.ceil(
        (subscriptionEndDate!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : 0

  const currentPlan = PLANS[selectedPlan]

  const handlePayment = async () => {
    if (!user?.email) {
      alert("Vous devez être connecté pour effectuer un paiement")
      return
    }

    setIsProcessing(true)

    try {
      const response = await fetch("/api/payment/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: user.email,
          userName: userProfile?.name || user.user_metadata?.name,
          plan: selectedPlan,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la création du paiement")
      }

      if (data.redirect_url) {
        sessionStorage.setItem("payment_ref", data.ref_command)
        window.location.href = data.redirect_url
      } else {
        throw new Error("URL de redirection manquante")
      }
    } catch (error) {
      console.error("Erreur de paiement:", error)
      alert(
        error instanceof Error ? error.message : "Erreur lors du paiement"
      )
      setIsProcessing(false)
    }
  }

  const plan = currentPlan

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

      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-center font-[family-name:var(--font-heading)] text-2xl font-bold text-[#1A1F2B]">
          {isActive
            ? "Prolonger ou changer de formule"
            : "Choisissez votre formule"}
        </h1>
        <p className="mt-2 text-center text-[#1A1F2B]/60">
          {isActive
            ? "30 jours supplémentaires seront ajoutés à votre abonnement"
            : "Débloquez l'accès complet à Big Five"}
        </p>

        {/* Abonnement actif - info renouvellement */}
        {isActive && (
          <div className="mt-6 rounded-xl border-2 border-[#10B981] bg-[#10B981]/5 p-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-[#10B981] mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-[#1A1F2B]">
                  Abonnement actif — {userProfile?.plan || "Pro"}
                </p>
                <p className="mt-1 text-sm text-[#1A1F2B]/70">
                  Il te reste{" "}
                  <span className="font-bold text-[#10B981]">
                    {daysRemaining} jour{daysRemaining > 1 ? "s" : ""}
                  </span>{" "}
                  (expire le{" "}
                  {subscriptionEndDate!.toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  )
                </p>
                <p className="mt-1 text-sm text-[#1A1F2B]/70">
                  En renouvelant maintenant,{" "}
                  <span className="font-semibold">
                    30 jours seront ajoutés
                  </span>{" "}
                  à la fin de ton abonnement actuel.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Plan Selection Cards */}
        <div className="mt-8 grid grid-cols-2 gap-4">
          {/* Basic Card */}
          <button
            type="button"
            onClick={() => setSelectedPlan("basic")}
            className={`rounded-xl border-2 p-5 text-left transition-all ${
              selectedPlan === "basic"
                ? "border-[#1A1F2B] bg-[#1A1F2B]/5 shadow-lg"
                : "border-[#D0E4F2] bg-white hover:border-[#1A1F2B]/30"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg text-[#1A1F2B]">Basic</h3>
              {selectedPlan === "basic" && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1A1F2B]">
                  <Check className="h-3.5 w-3.5 text-white" />
                </div>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-[#1A1F2B]">
                4 900
              </span>
              <span className="text-sm text-[#1A1F2B]/60">XOF/mois</span>
            </div>
            <p className="mt-1 text-xs text-[#1A1F2B]/50">
              soit 49 000 XOF/an
            </p>
            <ul className="mt-4 space-y-2">
              <li className="flex items-center gap-2 text-xs text-[#1A1F2B]/70">
                <Check className="h-3.5 w-3.5 text-[#10B981] shrink-0" />
                Accès illimité
              </li>
              <li className="flex items-center gap-2 text-xs text-[#1A1F2B]/70">
                <Check className="h-3.5 w-3.5 text-[#10B981] shrink-0" />
                Filtres avancés
              </li>
              <li className="flex items-center gap-2 text-xs text-[#1A1F2B]/70">
                <Check className="h-3.5 w-3.5 text-[#10B981] shrink-0" />
                Collections & téléchargement
              </li>
            </ul>
          </button>

          {/* Pro Card */}
          <button
            type="button"
            onClick={() => setSelectedPlan("pro")}
            className={`rounded-xl border-2 p-5 text-left transition-all relative ${
              selectedPlan === "pro"
                ? "border-[#80368D] bg-[#80368D]/5 shadow-lg shadow-[#80368D]/10"
                : "border-[#D0E4F2] bg-white hover:border-[#80368D]/30"
            }`}
          >
            <div className="absolute -top-3 right-3 bg-[#F2B33D] text-[#1A1F2B] px-2.5 py-0.5 rounded-full text-[10px] font-bold">
              Recommandé
            </div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg text-[#80368D]">Pro</h3>
              {selectedPlan === "pro" && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#80368D]">
                  <Check className="h-3.5 w-3.5 text-white" />
                </div>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-[#1A1F2B]">
                9 900
              </span>
              <span className="text-sm text-[#1A1F2B]/60">XOF/mois</span>
            </div>
            <p className="mt-1 text-xs text-[#1A1F2B]/50">
              soit 99 000 XOF/an
            </p>
            <ul className="mt-4 space-y-2">
              <li className="flex items-center gap-2 text-xs text-[#1A1F2B]/70">
                <Check className="h-3.5 w-3.5 text-[#10B981] shrink-0" />
                Tout du Basic
              </li>
              <li className="flex items-center gap-2 text-xs text-[#1A1F2B]/70">
                <Check className="h-3.5 w-3.5 text-[#10B981] shrink-0" />
                Recherches illimitées
              </li>
              <li className="flex items-center gap-2 text-xs text-[#1A1F2B]/70">
                <Check className="h-3.5 w-3.5 text-[#10B981] shrink-0" />
                Suivi de marques
              </li>
            </ul>
          </button>
        </div>

        {/* Features of selected plan */}
        <div className="mt-6 rounded-xl border border-[#D0E4F2] bg-[#D0E4F2]/10 p-5">
          <h3 className="text-sm font-semibold text-[#1A1F2B] mb-3">
            Ce qui est inclus dans le plan {plan.name} :
          </h3>
          <ul className="space-y-2.5">
            {plan.features.map((feature, i) => (
              <li key={i} className="flex items-center gap-2.5">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#10B981]/20 shrink-0">
                  <Check className="h-3 w-3 text-[#10B981]" />
                </div>
                <span className="text-sm text-[#1A1F2B]">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Payment info */}
        <div className="mt-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
          <p>
            Vous serez redirigé vers la page de paiement sécurisée Moneroo où
            vous pourrez choisir votre moyen de paiement (Mobile Money, Carte
            bancaire, etc.)
          </p>
        </div>

        {/* Terms */}
        <div className="mt-6 flex items-start gap-2">
          <input
            type="checkbox"
            id="terms"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border"
          />
          <label htmlFor="terms" className="text-sm text-[#1A1F2B]/60">
            {"J'accepte les"}{" "}
            <LegalModal
              defaultTab="cgv"
              trigger={
                <button
                  type="button"
                  className="text-[#80368D] hover:underline"
                >
                  CGV et la politique de confidentialité
                </button>
              }
            />
          </label>
        </div>

        {/* CTA */}
        <Button
          onClick={handlePayment}
          disabled={!acceptTerms || isProcessing}
          className="mt-6 h-12 w-full shadow-lg shadow-[#80368D]/25 bg-[#80368D] hover:bg-[#80368D]/90 text-white font-bold text-base"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Redirection en cours...
            </>
          ) : (
            <>
              <Lock className="mr-2 h-4 w-4" />
              {isActive ? "Renouveler" : "Payer"} — {plan.priceFormatted} XOF
            </>
          )}
        </Button>

        {/* Recap */}
        <div className="mt-6 rounded-xl border border-[#D0E4F2] bg-white p-4">
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[#1A1F2B]/60">
                {isActive ? "Renouvellement" : "Abonnement"} Big Five —{" "}
                {plan.name}
              </span>
              <span className="font-medium text-[#1A1F2B]">
                {plan.priceFormatted} XOF
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#1A1F2B]/60">Durée ajoutée</span>
              <span className="text-[#1A1F2B]">+30 jours</span>
            </div>
            {isActive && (
              <div className="flex items-center justify-between">
                <span className="text-[#1A1F2B]/60">
                  Nouvelle date d{"'"}expiration
                </span>
                <span className="text-[#1A1F2B] font-medium">
                  {new Date(
                    subscriptionEndDate!.getTime() +
                      30 * 24 * 60 * 60 * 1000
                  ).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
            <div className="border-t border-[#D0E4F2] pt-2 flex items-center justify-between">
              <span className="font-semibold text-[#1A1F2B]">Total</span>
              <span className="font-bold text-[#80368D]">
                {plan.priceFormatted} XOF
              </span>
            </div>
          </div>
        </div>

        {/* Compare link */}
        <p className="mt-4 text-center text-sm text-[#1A1F2B]/50">
          <Link
            href="/pricing"
            className="text-[#80368D] hover:underline"
          >
            Comparer toutes les formules
          </Link>
        </p>

        {/* Back to dashboard */}
        {isActive && (
          <Button asChild variant="outline" className="mt-4 h-11 w-full">
            <Link href="/dashboard">Retour à la bibliothèque</Link>
          </Button>
        )}
      </div>
    </div>
  )
}
