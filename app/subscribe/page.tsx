"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Smartphone, CreditCard, Check, Lock, Sparkles, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSupabaseAuth } from "@/hooks/use-supabase-auth"
import { LegalModal } from "@/components/legal-modal"

type PaymentMethod = "mobile" | "card"
type MobileOperator = "orange" | "orange_ci" | "mtn" | "moov" | "moov_ci" | "wave" | null
type Country = "CI" | "SN" | "BJ"

// Configuration des pays
const countries = [
  { code: "CI" as Country, name: "Côte d'Ivoire", flag: "🇨🇮", dialCode: "+225" },
  { code: "SN" as Country, name: "Sénégal", flag: "🇸🇳", dialCode: "+221" },
  { code: "BJ" as Country, name: "Bénin", flag: "🇧🇯", dialCode: "+229" },
]

// Configuration des opérateurs par pays avec préfixes
const operatorsByCountry = {
  CI: [
    { 
      id: "orange_ci", 
      name: "Orange Money", 
      color: "bg-orange-500",
      prefixes: ["07", "08", "09"],
      paytechName: "Orange Money CI"
    },
    { 
      id: "mtn", 
      name: "MTN Mobile Money", 
      color: "bg-yellow-400",
      prefixes: ["05", "06"],
      paytechName: "Mtn Money CI"
    },
    { 
      id: "moov_ci", 
      name: "Moov Money", 
      color: "bg-blue-600",
      prefixes: ["01"],
      paytechName: "Moov Money CI"
    },
    { 
      id: "wave", 
      name: "Wave", 
      color: "bg-cyan-500",
      prefixes: [],
      paytechName: "Wave CI"
    },
  ],
  SN: [
    { 
      id: "orange", 
      name: "Orange Money", 
      color: "bg-orange-500",
      prefixes: ["77", "78", "76"],
      paytechName: "Orange Money"
    },
    { 
      id: "wave", 
      name: "Wave", 
      color: "bg-cyan-500",
      prefixes: ["70"],
      paytechName: "Wave"
    },
    { 
      id: "moov", 
      name: "Free Money", 
      color: "bg-red-500",
      prefixes: ["75", "76"],
      paytechName: "Free Money"
    },
  ],
  BJ: [
    { 
      id: "mtn", 
      name: "MTN Mobile Money", 
      color: "bg-yellow-400",
      prefixes: ["96", "97", "90", "91"],
      paytechName: "Mtn Money BJ"
    },
    { 
      id: "moov", 
      name: "Moov Money", 
      color: "bg-blue-600",
      prefixes: ["99", "98"],
      paytechName: "Moov Money BJ"
    },
  ],
}

export default function SubscribePage() {
  const router = useRouter()
  const { user, loading } = useSupabaseAuth()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mobile")
  const [country, setCountry] = useState<Country>("CI")
  const [selectedOperator, setSelectedOperator] = useState<MobileOperator>(null)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Redirection si non connecté
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/subscribe')
    }
  }, [user, loading, router])

  // Détecter automatiquement l'opérateur en fonction du numéro
  const detectOperator = (number: string, countryCode: Country) => {
    // Nettoyer le numéro (enlever espaces, tirets, etc.)
    const cleanNumber = number.replace(/\s|-|\./g, "")
    
    // Extraire les 2 premiers chiffres
    const prefix = cleanNumber.substring(0, 2)
    
    // Chercher l'opérateur correspondant
    const operators = operatorsByCountry[countryCode]
    const detectedOperator = operators.find(op => 
      op.prefixes.some(p => prefix.startsWith(p))
    )
    
    if (detectedOperator) {
      setSelectedOperator(detectedOperator.id as MobileOperator)
    }
  }

  // Formater le numéro de téléphone avec masque
  const formatPhoneNumber = (value: string, countryCode: Country) => {
    // Enlever tout sauf les chiffres
    const numbers = value.replace(/\D/g, "")
    
    // Appliquer le masque selon le pays
    let formatted = ""
    if (countryCode === "CI") {
      // Format CI: XX XX XX XX XX (10 chiffres)
      if (numbers.length <= 2) formatted = numbers
      else if (numbers.length <= 4) formatted = `${numbers.slice(0, 2)} ${numbers.slice(2)}`
      else if (numbers.length <= 6) formatted = `${numbers.slice(0, 2)} ${numbers.slice(2, 4)} ${numbers.slice(4)}`
      else if (numbers.length <= 8) formatted = `${numbers.slice(0, 2)} ${numbers.slice(2, 4)} ${numbers.slice(4, 6)} ${numbers.slice(6)}`
      else formatted = `${numbers.slice(0, 2)} ${numbers.slice(2, 4)} ${numbers.slice(4, 6)} ${numbers.slice(6, 8)} ${numbers.slice(8, 10)}`
    } else if (countryCode === "SN") {
      // Format SN: XX XXX XX XX (9 chiffres)
      if (numbers.length <= 2) formatted = numbers
      else if (numbers.length <= 5) formatted = `${numbers.slice(0, 2)} ${numbers.slice(2)}`
      else if (numbers.length <= 7) formatted = `${numbers.slice(0, 2)} ${numbers.slice(2, 5)} ${numbers.slice(5)}`
      else formatted = `${numbers.slice(0, 2)} ${numbers.slice(2, 5)} ${numbers.slice(5, 7)} ${numbers.slice(7, 9)}`
    } else if (countryCode === "BJ") {
      // Format BJ: XX XX XX XX (8 chiffres)
      if (numbers.length <= 2) formatted = numbers
      else if (numbers.length <= 4) formatted = `${numbers.slice(0, 2)} ${numbers.slice(2)}`
      else if (numbers.length <= 6) formatted = `${numbers.slice(0, 2)} ${numbers.slice(2, 4)} ${numbers.slice(4)}`
      else formatted = `${numbers.slice(0, 2)} ${numbers.slice(2, 4)} ${numbers.slice(4, 6)} ${numbers.slice(6, 8)}`
    }
    
    return formatted
  }

  // Gérer le changement de numéro
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const formatted = formatPhoneNumber(value, country)
    setPhoneNumber(formatted)
    
    // Détecter l'opérateur après 2 chiffres
    const numbers = value.replace(/\D/g, "")
    if (numbers.length >= 2) {
      detectOperator(numbers, country)
    }
  }

  // Réinitialiser le numéro quand on change de pays
  useEffect(() => {
    setPhoneNumber("")
    setSelectedOperator(null)
  }, [country])

  const handlePayment = async () => {
    if (!user?.email) {
      alert("Vous devez être connecté pour effectuer un paiement")
      return
    }

    setIsProcessing(true)

    try {
      // Trouver le nom PayTech de l'opérateur sélectionné
      const operators = operatorsByCountry[country]
      const operator = operators.find(op => op.id === selectedOperator)
      const paytechName = operator?.paytechName || "Orange Money"

      const targetPayment = paymentMethod === "mobile" 
        ? paytechName
        : "Carte Bancaire"

      // Construire le numéro complet avec indicatif
      const selectedCountry = countries.find(c => c.code === country)
      const fullPhoneNumber = paymentMethod === "mobile" 
        ? `${selectedCountry?.dialCode}${phoneNumber.replace(/\s/g, "")}`
        : undefined

      // Appel à l'API de paiement
      const response = await fetch('/api/payment/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: user.email,
          paymentMethod: targetPayment,
          phoneNumber: fullPhoneNumber,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création du paiement')
      }

      // Redirection vers PayTech
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
        {/* Steps indicator */}
        <div className="mb-8 flex items-center justify-center gap-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                step >= s 
                  ? "bg-[#80368D] text-white" 
                  : "bg-[#D0E4F2] text-[#1A1F2B]/60"
              }`}>
                {step > s ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 3 && <ChevronRight className="h-4 w-4 text-[#1A1F2B]/40" />}
            </div>
          ))}
        </div>

        {/* Step 1: Payment Method Selection */}
        {step === 1 && (
          <div className="mx-auto max-w-md">
            <h1 className="text-center font-[family-name:var(--font-heading)] text-2xl font-bold text-[#1A1F2B]">
              Choisis ton moyen de paiement
            </h1>
            
            <div className="mt-8 space-y-4">
              <button
                type="button"
                onClick={() => setPaymentMethod("mobile")}
                className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                  paymentMethod === "mobile" 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/20">
                  <Smartphone className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Mobile Money</p>
                  <p className="text-sm text-muted-foreground">Orange, MTN, Moov, Wave</p>
                </div>
                <div className={`ml-auto h-5 w-5 rounded-full border-2 ${
                  paymentMethod === "mobile" ? "border-primary bg-primary" : "border-border"
                }`}>
                  {paymentMethod === "mobile" && <Check className="h-4 w-4 text-primary-foreground" />}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("card")}
                className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                  paymentMethod === "card" 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#0A1F44]/10">
                  <CreditCard className="h-6 w-6 text-[#0A1F44]" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Carte bancaire</p>
                  <p className="text-sm text-muted-foreground">Visa, Mastercard</p>
                </div>
                <div className={`ml-auto h-5 w-5 rounded-full border-2 ${
                  paymentMethod === "card" ? "border-primary bg-primary" : "border-border"
                }`}>
                  {paymentMethod === "card" && <Check className="h-4 w-4 text-primary-foreground" />}
                </div>
              </button>
            </div>

            <Button 
              onClick={() => setStep(2)} 
              className="mt-8 h-12 w-full shadow-lg shadow-primary/25"
            >
              Continuer
            </Button>
          </div>
        )}

        {/* Step 2: Payment Details */}
        {step === 2 && (
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Payment Form */}
            <div>
              <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-foreground">
                Confirme ton paiement
              </h1>

              {paymentMethod === "mobile" ? (
                <div className="mt-6 space-y-6">
                  {/* Sélection du pays */}
                  <div>
                    <Label className="text-sm font-medium">Pays</Label>
                    <Select value={country} onValueChange={(v) => setCountry(v as Country)}>
                      <SelectTrigger className="mt-1.5 h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            <span className="flex items-center gap-2">
                              <span>{c.flag}</span>
                              <span>{c.name}</span>
                              <span className="text-[#1A1F2B]/50">({c.dialCode})</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Numéro de téléphone avec indicatif */}
                  <div>
                    <Label htmlFor="phone">Numéro de téléphone</Label>
                    <div className="mt-1.5 flex gap-2">
                      <div className="flex h-11 w-20 items-center justify-center rounded-md border border-border bg-[#D0E4F2]/20 px-3 text-sm font-medium">
                        {countries.find(c => c.code === country)?.dialCode}
                      </div>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder={
                          country === "CI" ? "XX XX XX XX XX" :
                          country === "SN" ? "XX XXX XX XX" :
                          "XX XX XX XX"
                        }
                        value={phoneNumber}
                        onChange={handlePhoneChange}
                        className="h-11 flex-1"
                        maxLength={
                          country === "CI" ? 14 : // 10 chiffres + 4 espaces
                          country === "SN" ? 12 : // 9 chiffres + 3 espaces
                          11 // 8 chiffres + 3 espaces
                        }
                      />
                    </div>
                    <p className="mt-1 text-xs text-[#1A1F2B]/50">
                      {country === "CI" ? "Format: 10 chiffres" :
                       country === "SN" ? "Format: 9 chiffres" :
                       "Format: 8 chiffres"}
                    </p>
                  </div>

                  {/* Opérateur détecté automatiquement */}
                  {selectedOperator && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">
                          Opérateur détecté automatiquement
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedOperator(null)}
                          className="h-auto p-0 text-xs text-[#80368D] hover:text-[#80368D]/80 hover:bg-transparent"
                        >
                          Changer d'opérateur
                        </Button>
                      </div>
                      <div className="mt-2 flex items-center gap-3 rounded-lg border-2 border-[#F2B33D] bg-[#F2B33D]/5 p-3">
                        <div className={`h-10 w-10 rounded-full ${
                          operatorsByCountry[country].find(op => op.id === selectedOperator)?.color
                        }`} />
                        <div className="flex-1">
                          <p className="font-medium text-[#1A1F2B]">
                            {operatorsByCountry[country].find(op => op.id === selectedOperator)?.name}
                          </p>
                          <p className="text-xs text-[#1A1F2B]/60">
                            Détecté à partir de votre numéro
                          </p>
                        </div>
                        <Check className="h-5 w-5 text-[#10B981]" />
                      </div>
                    </div>
                  )}

                  {/* Liste des opérateurs - Afficher toujours si numéro saisi et pas d'opérateur sélectionné */}
                  {!selectedOperator && phoneNumber.length >= 2 && (
                    <div>
                      <Label className="text-sm font-medium">
                        Sélectionner votre opérateur mobile
                      </Label>
                      <p className="mt-1 mb-3 text-xs text-[#1A1F2B]/60">
                        Choisissez l'opérateur que vous utilisez pour le paiement
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {operatorsByCountry[country].map((op) => (
                          <button
                            key={op.id}
                            type="button"
                            onClick={() => setSelectedOperator(op.id as MobileOperator)}
                            className={`flex items-center gap-3 rounded-lg border-2 p-3 transition-all hover:border-[#80368D] hover:bg-[#80368D]/5 ${
                              selectedOperator === op.id 
                                ? "border-[#80368D] bg-[#80368D]/5" 
                                : "border-border"
                            }`}
                          >
                            <div className={`h-8 w-8 rounded-full flex-shrink-0 ${op.color}`} />
                            <span className="text-sm font-medium text-left">{op.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  <div>
                    <Label htmlFor="cardNumber">Numero de carte</Label>
                    <Input id="cardNumber" placeholder="1234 5678 9012 3456" className="mt-1.5 h-11" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expiry">Expiration</Label>
                      <Input id="expiry" placeholder="MM/AA" className="mt-1.5 h-11" />
                    </div>
                    <div>
                      <Label htmlFor="cvv">CVV</Label>
                      <Input id="cvv" placeholder="123" className="mt-1.5 h-11" />
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 flex items-start gap-2">
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

              <Button 
                onClick={handlePayment}
                disabled={!acceptTerms || isProcessing}
                className="mt-6 h-12 w-full shadow-lg shadow-primary/25"
              >
                {isProcessing ? (
                  "Traitement en cours..."
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Valider le paiement
                  </>
                )}
              </Button>
            </div>

            {/* Order Summary */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-card-foreground">Recapitulatif</h2>
              
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Abonnement mensuel Big Five</span>
                  <span className="font-medium text-foreground">4 500 XOF</span>
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
                  <span className="font-[family-name:var(--font-heading)] text-2xl font-bold text-primary">4 500 XOF</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Valable 1 mois</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#10B981]/20">
              <Check className="h-12 w-12 text-[#10B981]" />
            </div>
            
            <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-foreground">
              Paiement reussi !
            </h1>
            
            <p className="mt-3 text-muted-foreground">
              Ton abonnement est maintenant actif. Profite bien de toutes les fonctionnalites de Big Five !
            </p>

            <Button asChild className="mt-8 h-12 w-full shadow-lg shadow-primary/25">
              <Link href="/dashboard">
                Retour a la bibliotheque
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
