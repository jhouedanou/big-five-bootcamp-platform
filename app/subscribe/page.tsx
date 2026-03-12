"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Check,
  Sparkles,
  Loader2,
  PartyPopper,
  ArrowRight,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSupabaseAuth } from "@/hooks/use-supabase-auth"
import { useProductPrice } from "@/hooks/use-product-price"
import { LegalModal } from "@/components/legal-modal"
import { LicenseActivation } from "@/components/license-activation"

export default function SubscribePage() {
  const router = useRouter()
  const { user, userProfile, loading } = useSupabaseAuth()
  const { label: priceLabel, currency: priceCurrency } = useProductPrice()

  // État de l'activation
  const [subscriptionActivated, setSubscriptionActivated] = useState(false)
  const [newEndDate, setNewEndDate] = useState<string | null>(null)
  const [isRenewal, setIsRenewal] = useState(false)

  // Redirection si non connecté
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?redirect=/subscribe")
    }
  }, [user, loading, router])

  // Callback quand la licence est validée
  const handleActivated = (data: { endDate: string; isRenewal: boolean }) => {
    setSubscriptionActivated(true)
    setNewEndDate(data.endDate)
    setIsRenewal(data.isRenewal)
  }

  // Loading
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
              : "Bienvenue dans la famille Premium ! Tu as maintenant accès à toute la bibliothèque créative."}
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
  const isAlreadyPremium = userProfile?.plan === "Premium"

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
                Tu es Premium !
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

            {/* Section renouvellement */}
            <div className="mt-8 rounded-xl border-2 border-[#80368D]/20 bg-[#80368D]/5 p-6">
              <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-[#1A1F2B]">
                🔄 Renouveler maintenant
              </h2>
              <p className="mt-2 text-sm text-[#1A1F2B]/70">
                Renouvelle ton abonnement dès maintenant.
                <strong> 30 jours seront ajoutés</strong> à ta date d&apos;expiration actuelle.
              </p>

              {(userProfile as any)?.subscription_end_date && (
                <div className="mt-3 rounded-lg bg-white p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[#1A1F2B]/60">Date actuelle de fin</span>
                    <span className="font-medium">
                      {new Date((userProfile as any).subscription_end_date).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[#1A1F2B]/60">Nouvelle date de fin</span>
                    <span className="font-semibold text-[#10B981]">
                      {new Date(
                        new Date((userProfile as any).subscription_end_date).getTime() + 30 * 24 * 60 * 60 * 1000
                      ).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              )}

              {/* Notice email */}
              {user?.email && (
                <div className="mt-4 flex items-start gap-2 rounded-lg bg-blue-50 p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                  <p className="text-xs text-blue-700">
                    Utilise le même email (<strong>{user.email}</strong>) lors du paiement pour que
                    ton abonnement soit activé automatiquement.
                  </p>
                </div>
              )}

              {/* Composant d'activation par licence — flux en 2 étapes */}
              <div className="mt-5">
                {user?.email && (
                  <LicenseActivation
                    userEmail={user.email}
                    onActivated={handleActivated}
                  />
                )}
              </div>

              {/* CGV */}
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
          /* ====== NOUVEAU — Passer à Premium ====== */
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Informations */}
            <div>
              <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-foreground">
                Passe à Premium
              </h1>
              <p className="mt-2 text-muted-foreground">
                Accède à toute la bibliothèque créative Big Five et booste tes campagnes publicitaires.
              </p>

              <div className="mt-8 space-y-4">
                <h2 className="text-lg font-semibold">Ce qui est inclus :</h2>
                {[
                  "Accès illimité à toutes les campagnes",
                  "Filtres avancés par secteur, pays, format",
                  "Téléchargement des ressources créatives",
                  "Nouvelles campagnes ajoutées chaque semaine",
                  "Analyses et insights exclusifs",
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#10B981]/20">
                      <Check className="h-3 w-3 text-[#10B981]" />
                    </div>
                    <span className="text-sm text-foreground">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Notice email */}
              {user?.email && (
                <div className="mt-6 flex items-start gap-2 rounded-lg bg-blue-50 p-4">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                  <div className="text-sm text-blue-700">
                    <p className="font-semibold">Important</p>
                    <p className="mt-1">
                      Utilise le même email (<strong>{user.email}</strong>) lors du paiement
                      Chariow pour que ton abonnement soit activé automatiquement.
                    </p>
                  </div>
                </div>
              )}

              {/* Composant d'activation par licence — flux en 2 étapes */}
              <div className="mt-6">
                {user?.email && (
                  <LicenseActivation
                    userEmail={user.email}
                    onActivated={handleActivated}
                    paymentDescription="Procède au paiement, puis entre la clé de licence que tu recevras par email ou SMS."
                  />
                )}
              </div>

              {/* CGV */}
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
                    <span className="text-muted-foreground">Abonnement mensuel Big Five</span>
                    <span className="font-medium text-foreground">{priceLabel} {priceCurrency}</span>
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
                      {priceLabel} {priceCurrency}
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
                      Reçois ta clé de licence par email/SMS
                    </li>
                    <li className="flex gap-2">
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#80368D]/10 text-xs font-bold text-[#80368D]">3</span>
                      Entre ta clé ici pour activer l&apos;abonnement
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
