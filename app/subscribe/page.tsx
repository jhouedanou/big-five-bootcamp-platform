"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, Lock, Sparkles, Loader2, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSupabaseAuth } from "@/hooks/use-supabase-auth"
import { LegalModal } from "@/components/legal-modal"

export default function SubscribePage() {
  const router = useRouter()
  const { user, userProfile, loading } = useSupabaseAuth()
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/subscribe')
    }
  }, [user, loading, router])

  // Verifier si l'abonnement est actif
  const subscriptionEndDate = userProfile?.subscription_end_date
    ? new Date(userProfile.subscription_end_date)
    : null
  const isActive = userProfile?.subscription_status === 'active'
    && subscriptionEndDate
    && subscriptionEndDate > new Date()
  const daysRemaining = isActive
    ? Math.ceil((subscriptionEndDate!.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0

  const handlePayment = async () => {
    if (!user?.email) {
      alert("Vous devez etre connecte pour effectuer un paiement")
      return
    }

    setIsProcessing(true)

    try {
      const response = await fetch('/api/payment/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: user.email,
          userName: userProfile?.name || user.user_metadata?.name,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la creation du paiement')
      }

      if (data.redirect_url) {
        sessionStorage.setItem('payment_ref', data.ref_command)
        window.location.href = data.redirect_url
      } else {
        throw new Error('URL de redirection manquante')
      }
    } catch (error) {
      console.error('Erreur de paiement:', error)
      alert(error instanceof Error ? error.message : 'Erreur lors du paiement')
      setIsProcessing(false)
    }
  }

  const benefits = [
    "Acces illimite a toute la bibliotheque",
    "Nouveaux contenus ajoutes quotidiennement",
    "Filtres et recherche avances",
    "Telechargement des videos",
    "Support prioritaire",
    "Annulation possible a tout moment",
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-[#D0E4F2] bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-[#1A1F2B]/70 hover:text-[#1A1F2B]">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#80368D]">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-[family-name:var(--font-heading)] font-bold text-[#1A1F2B]">Big Five</span>
          </Link>
          <div className="w-16" />
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="mx-auto max-w-md">
          <h1 className="text-center font-[family-name:var(--font-heading)] text-2xl font-bold text-[#1A1F2B]">
            {isActive ? 'Prolonger ton abonnement' : 'Passer au Premium'}
          </h1>
          <p className="mt-2 text-center text-[#1A1F2B]/60">
            {isActive
              ? 'Ajoute 30 jours supplementaires a ton abonnement'
              : 'Debloquez l\'acces complet a Big Five'}
          </p>

          {/* Abonnement actif - info renouvellement */}
          {isActive && (
            <div className="mt-6 rounded-xl border-2 border-[#10B981] bg-[#10B981]/5 p-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-[#10B981] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[#1A1F2B]">
                    Abonnement actif
                  </p>
                  <p className="mt-1 text-sm text-[#1A1F2B]/70">
                    Il te reste <span className="font-bold text-[#10B981]">{daysRemaining} jour{daysRemaining > 1 ? 's' : ''}</span> (expire le{' '}
                    {subscriptionEndDate!.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })})
                  </p>
                  <p className="mt-1 text-sm text-[#1A1F2B]/70">
                    En renouvelant maintenant, <span className="font-semibold">30 jours seront ajoutes</span> a la fin de ton abonnement actuel.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Pricing Card */}
          <div className="mt-6 rounded-xl bg-[#80368D] p-6">
            <div className="flex items-baseline gap-1">
              <span className="font-[family-name:var(--font-heading)] text-4xl font-bold text-white">25 000</span>
              <span className="text-lg text-white/70">XOF/mois</span>
            </div>
            <p className="mt-1 text-sm text-white/60">Soit ~833 XOF/jour pour booster ta crea</p>
          </div>

          {/* Benefits */}
          {!isActive && (
            <ul className="mt-6 space-y-3">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#10B981]/20">
                    <Check className="h-3 w-3 text-[#10B981]" />
                  </div>
                  <span className="text-sm text-[#1A1F2B]">{benefit}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Payment info */}
          <div className="mt-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
            <p>
              Vous serez redirige vers la page de paiement securisee Moneroo ou vous pourrez choisir votre moyen de paiement (Mobile Money, Carte bancaire, etc.)
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
                  <button type="button" className="text-primary hover:underline">
                    CGV et la politique de confidentialite
                  </button>
                }
              />
            </label>
          </div>

          {/* CTA */}
          <Button
            onClick={handlePayment}
            disabled={!acceptTerms || isProcessing}
            className="mt-6 h-12 w-full shadow-lg shadow-primary/25 bg-[#80368D] hover:bg-[#80368D]/90 text-white"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirection en cours...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                {isActive ? 'Renouveler - 25 000 XOF' : 'Payer 25 000 XOF'}
              </>
            )}
          </Button>

          {/* Recap */}
          <div className="mt-6 rounded-xl border border-border bg-card p-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {isActive ? 'Renouvellement Big Five' : 'Abonnement mensuel Big Five'}
                </span>
                <span className="font-medium text-foreground">25 000 XOF</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Duree ajoutee</span>
                <span className="text-foreground">+30 jours</span>
              </div>
              {isActive && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Nouvelle date d'expiration</span>
                  <span className="text-foreground font-medium">
                    {new Date(subscriptionEndDate!.getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              )}
              <div className="border-t pt-2 flex items-center justify-between">
                <span className="font-semibold text-foreground">Total</span>
                <span className="font-bold text-primary">25 000 XOF</span>
              </div>
            </div>
          </div>

          {/* Back to dashboard */}
          {isActive && (
            <Button asChild variant="outline" className="mt-4 h-11 w-full">
              <Link href="/dashboard">
                Retour a la bibliotheque
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
