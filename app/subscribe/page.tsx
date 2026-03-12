"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, Lock, Sparkles, Loader2, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useSupabaseAuth } from "@/hooks/use-supabase-auth"
import { useProductPrice } from "@/hooks/use-product-price"
import { LegalModal } from "@/components/legal-modal"

export default function SubscribePage() {
  const router = useRouter()
  const { user, userProfile, loading } = useSupabaseAuth()
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [phoneCountryCode, setPhoneCountryCode] = useState('CI')
  const { label: priceLabel, currency: priceCurrency } = useProductPrice()

  // Redirection si non connecté
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/subscribe')
    }
  }, [user, loading, router])

  const handlePayment = async () => {
    if (!user?.email) {
      alert("Vous devez être connecté pour effectuer un paiement")
      return
    }

    setIsProcessing(true)

    try {
      // Appel à l'API de paiement — Chariow gère la sélection de méthode
      if (!phoneNumber || phoneNumber.replace(/\D/g, '').length < 8) {
        alert('Veuillez entrer un numéro de téléphone valide')
        setIsProcessing(false)
        return
      }

      const response = await fetch('/api/payment/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: user.email,
          phoneNumber: phoneNumber.replace(/\D/g, ''),
          phoneCountryCode,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création du paiement')
      }

      // Stocker la référence et le sale_id pour la page de succès
      if (data.ref_command) {
        sessionStorage.setItem('payment_ref', data.ref_command)
      }
      if (data.sale_id) {
        sessionStorage.setItem('payment_sale_id', data.sale_id)
      }

      // Redirection vers la page de checkout Chariow
      if (data.redirect_url || data.redirectUrl) {
        window.location.href = data.redirect_url || data.redirectUrl
      } else {
        throw new Error('URL de redirection manquante')
      }
    } catch (error) {
      console.error('Erreur de paiement:', error)
      alert(error instanceof Error ? error.message : 'Erreur lors du paiement')
      setIsProcessing(false)
    }
  }

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

      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Already Premium — proposer le renouvellement anticipé */}
        {userProfile?.plan === 'Premium' ? (
          <div className="mx-auto max-w-lg">
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#80368D]/15">
                <Sparkles className="h-12 w-12 text-[#80368D]" />
              </div>

              <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[#1A1F2B]">
                Tu es Premium !
              </h1>

              <p className="mt-3 text-[#1A1F2B]/70">
                Ton abonnement est actif. Tu as accès à l'ensemble de la bibliothèque créative Big Five.
              </p>

              {(userProfile as any)?.subscription_end_date && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#80368D]/10 px-4 py-2 text-sm font-medium text-[#80368D]">
                  <span>📅</span>
                  <span>
                    Expire le{' '}
                    {new Date((userProfile as any).subscription_end_date).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Renouvellement anticipé */}
            <div className="mt-8 rounded-xl border-2 border-[#80368D]/20 bg-[#80368D]/5 p-6">
              <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-[#1A1F2B]">
                🔄 Renouveler maintenant
              </h2>
              <p className="mt-2 text-sm text-[#1A1F2B]/70">
                Renouvelle ton abonnement dès maintenant pour ne pas perdre l'accès.
                <strong> 30 jours seront ajoutés</strong> à ta date d'expiration actuelle — tu ne perds aucun jour !
              </p>

              {(userProfile as any)?.subscription_end_date && (
                <div className="mt-3 rounded-lg bg-white p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[#1A1F2B]/60">Date actuelle de fin</span>
                    <span className="font-medium">
                      {new Date((userProfile as any).subscription_end_date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[#1A1F2B]/60">Nouvelle date de fin</span>
                    <span className="font-semibold text-[#10B981]">
                      {new Date(
                        new Date((userProfile as any).subscription_end_date).getTime() + 30 * 24 * 60 * 60 * 1000
                      ).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              )}

              {/* Numéro de téléphone pour le paiement */}
              <div className="mt-4">
                <Label htmlFor="phone-renew" className="text-sm font-medium text-[#1A1F2B]">
                  Numéro de téléphone (Mobile Money)
                </Label>
                <div className="mt-1.5 flex gap-2">
                  <select
                    value={phoneCountryCode}
                    onChange={(e) => setPhoneCountryCode(e.target.value)}
                    className="h-10 rounded-md border border-border bg-background px-2 text-sm"
                  >
                    <option value="CI">CI +225</option>
                    <option value="SN">SN +221</option>
                    <option value="BJ">BJ +229</option>
                    <option value="BF">BF +226</option>
                    <option value="ML">ML +223</option>
                    <option value="TG">TG +228</option>
                    <option value="NE">NE +227</option>
                    <option value="GN">GN +224</option>
                    <option value="CM">CM +237</option>
                    <option value="GA">GA +241</option>
                    <option value="CG">CG +242</option>
                    <option value="CD">CD +243</option>
                  </select>
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="phone-renew"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="07 00 00 00 00"
                      className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-2">
                <input
                  type="checkbox"
                  id="terms-renew"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-border"
                  aria-label="Accepter les CGV et la politique de confidentialité"
                />
                <Label htmlFor="terms-renew" className="text-sm text-muted-foreground">
                  {"J'accepte les"}{" "}
                  <LegalModal
                    defaultTab="cgv"
                    trigger={
                      <button type="button" className="text-primary hover:underline">
                        CGV et la politique de confidentialité
                      </button>
                    }
                  />
                </Label>
              </div>

              <Button
                onClick={handlePayment}
                disabled={!acceptTerms || !phoneNumber || isProcessing}
                className="mt-4 h-12 w-full shadow-lg shadow-primary/25"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirection vers le paiement...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Renouveler — {priceLabel} {priceCurrency} / mois
                  </>
                )}
              </Button>
            </div>

            <Button asChild variant="outline" className="mt-4 h-12 w-full">
              <Link href="/dashboard">
                Accéder à la bibliothèque
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Informations sur l'abonnement */}
            <div>
              <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-foreground">
                Passe à Premium
              </h1>
              <p className="mt-2 text-muted-foreground">
                Accède à toute la bibliothèque créative Big Five et booste tes campagnes publicitaires.
              </p>

              <div className="mt-8 space-y-4">
                <h2 className="font-semibold text-lg">Ce qui est inclus :</h2>
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

              {/* Numéro de téléphone pour le paiement */}
              <div className="mt-8">
                <Label htmlFor="phone-subscribe" className="text-sm font-medium">
                  Numéro de téléphone (Mobile Money)
                </Label>
                <div className="mt-1.5 flex gap-2">
                  <select
                    value={phoneCountryCode}
                    onChange={(e) => setPhoneCountryCode(e.target.value)}
                    className="h-10 rounded-md border border-border bg-background px-2 text-sm"
                  >
                    <option value="CI">CI +225</option>
                    <option value="SN">SN +221</option>
                    <option value="BJ">BJ +229</option>
                    <option value="BF">BF +226</option>
                    <option value="ML">ML +223</option>
                    <option value="TG">TG +228</option>
                    <option value="NE">NE +227</option>
                    <option value="GN">GN +224</option>
                    <option value="CM">CM +237</option>
                    <option value="GA">GA +241</option>
                    <option value="CG">CG +242</option>
                    <option value="CD">CD +243</option>
                  </select>
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="phone-subscribe"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="07 00 00 00 00"
                      className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Numéro utilisé pour le paiement Mobile Money
                </p>
              </div>

              {/* Conditions */}
              <div className="mt-4 flex items-start gap-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-border"
                  aria-label="Accepter les CGV et la politique de confidentialité"
                />
                <Label htmlFor="terms" className="text-sm text-muted-foreground">
                  {"J'accepte les"}{" "}
                  <LegalModal
                    defaultTab="cgv"
                    trigger={
                      <button type="button" className="text-primary hover:underline">
                        CGV et la politique de confidentialité
                      </button>
                    }
                  />
                </Label>
              </div>

              {/* Bouton de paiement */}
              <Button 
                onClick={handlePayment}
                disabled={!acceptTerms || !phoneNumber || isProcessing}
                className="mt-6 h-12 w-full shadow-lg shadow-primary/25"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirection vers le paiement...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    S'abonner — {priceLabel} {priceCurrency} / mois
                  </>
                )}
              </Button>

              {/* Info sécurité */}
              <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
                <div className="flex items-start gap-2">
                  <span className="text-lg">🔒</span>
                  <div>
                    <p className="font-semibold mb-1">Paiement 100% sécurisé</p>
                    <p className="text-xs text-blue-700">
                      Vous serez redirigé vers une page de paiement sécurisée. 
                      Nous ne stockons pas vos données bancaires.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-card-foreground">Récapitulatif</h2>
              
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
                  <span className="font-[family-name:var(--font-heading)] text-2xl font-bold text-primary">{priceLabel} {priceCurrency}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Valable 1 mois</p>
              </div>

              {/* Méthodes de paiement acceptées */}
              <div className="mt-6 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-3">Méthodes de paiement acceptées :</p>
                <div className="flex flex-wrap gap-2">
                  {["Orange Money", "Wave", "MTN Money", "Moov Money", "Carte Bancaire"].map((method) => (
                    <span key={method} className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                      {method}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
