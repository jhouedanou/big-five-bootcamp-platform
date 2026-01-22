"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Smartphone, CreditCard, Check, Lock, Sparkles, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

type PaymentMethod = "mobile" | "card"
type MobileOperator = "orange" | "mtn" | "moov" | "wave"

export default function SubscribePage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mobile")
  const [selectedOperator, setSelectedOperator] = useState<MobileOperator>("orange")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const mobileOperators = [
    { id: "orange", name: "Orange Money", color: "bg-orange-500" },
    { id: "mtn", name: "MTN Mobile Money", color: "bg-yellow-400" },
    { id: "moov", name: "Moov Money", color: "bg-blue-600" },
    { id: "wave", name: "Wave", color: "bg-cyan-500" },
  ]

  const handlePayment = async () => {
    setIsProcessing(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setStep(3)
    setIsProcessing(false)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0A1F44]">
              <Sparkles className="h-4 w-4 text-accent" />
            </div>
            <span className="font-[family-name:var(--font-heading)] font-bold text-foreground">Big Five</span>
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
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
              }`}>
                {step > s ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 3 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Step 1: Payment Method Selection */}
        {step === 1 && (
          <div className="mx-auto max-w-md">
            <h1 className="text-center font-[family-name:var(--font-heading)] text-2xl font-bold text-foreground">
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
                  <div>
                    <Label className="text-sm font-medium">Operateur</Label>
                    <RadioGroup 
                      value={selectedOperator} 
                      onValueChange={(v) => setSelectedOperator(v as MobileOperator)}
                      className="mt-2 grid grid-cols-2 gap-3"
                    >
                      {mobileOperators.map((op) => (
                        <Label
                          key={op.id}
                          htmlFor={op.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-all ${
                            selectedOperator === op.id 
                              ? "border-primary bg-primary/5" 
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <RadioGroupItem value={op.id} id={op.id} className="sr-only" />
                          <div className={`h-8 w-8 rounded-full ${op.color}`} />
                          <span className="text-sm font-medium">{op.name}</span>
                        </Label>
                      ))}
                    </RadioGroup>
                  </div>

                  <div>
                    <Label htmlFor="phone">Numero de telephone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+225 XX XX XX XX XX"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="mt-1.5 h-11"
                    />
                  </div>
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
                />
                <Label htmlFor="terms" className="text-sm text-muted-foreground">
                  {"J'accepte les"}{" "}
                  <Link href="/terms" className="text-primary hover:underline">conditions generales</Link>
                  {" de vente"}
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
                  <span className="font-medium text-foreground">4 500 FCFA</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Taxes</span>
                  <span className="text-foreground">Incluses</span>
                </div>
              </div>
              
              <div className="mt-4 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="font-[family-name:var(--font-heading)] text-2xl font-bold text-primary">4 500 FCFA</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">/mois, renouvellement automatique</p>
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
