"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Check, Lock, Sparkles, Loader2, Calendar, Star, Zap, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSupabaseAuth } from "@/hooks/use-supabase-auth"
import { LegalModal } from "@/components/legal-modal"
import { getOperatorLogo } from "@/lib/operator-logos"

type PlanChoice = "basic" | "pro"

/** Configuration par pays : indicatif, longueur locale attendue, masque d'affichage. */
type CountryCode = 'CIV' | 'SEN' | 'BFA' | 'BEN'

const COUNTRIES: Record<CountryCode, {
  name: string
  flag: string
  dialCode: string // sans le +
  localLength: number // nombre de chiffres après l'indicatif
  // groupes pour le masque d'affichage (ex. [2,2,2,2,2] → "XX XX XX XX XX")
  mask: number[]
  placeholder: string
}> = {
  CIV: { name: "Côte d’Ivoire", flag: "🇨🇮", dialCode: "225", localLength: 10, mask: [2, 2, 2, 2, 2], placeholder: "07 07 12 34 56" },
  SEN: { name: "Sénégal",      flag: "🇸🇳", dialCode: "221", localLength: 9,  mask: [2, 3, 2, 2],    placeholder: "77 123 45 67" },
  BFA: { name: "Burkina Faso",  flag: "🇧🇫", dialCode: "226", localLength: 8,  mask: [2, 2, 2, 2],    placeholder: "70 12 34 56" },
  BEN: { name: "Bénin",         flag: "🇧🇯", dialCode: "229", localLength: 10, mask: [2, 2, 2, 2, 2], placeholder: "01 90 12 34 56" },
}

/** Providers PawaPay supportés pour l'abonnement. */
const PAWAPAY_PROVIDERS: { value: string; label: string; country: CountryCode }[] = [
  { value: 'MTN_MOMO_CIV', label: 'MTN Mobile Money — Côte d’Ivoire',  country: 'CIV' },
  { value: 'ORANGE_CIV',   label: 'Orange Money — Côte d’Ivoire',       country: 'CIV' },
  { value: 'MOOV_CIV',     label: 'Moov Money — Côte d’Ivoire',         country: 'CIV' },
  { value: 'WAVE_CIV',     label: 'Wave — Côte d’Ivoire',               country: 'CIV' },
  { value: 'WAVE_SEN',     label: 'Wave — Sénégal',                     country: 'SEN' },
  { value: 'ORANGE_SEN',   label: 'Orange Money — Sénégal',              country: 'SEN' },
  { value: 'FREE_SEN',     label: 'Free Money — Sénégal',                country: 'SEN' },
  { value: 'ORANGE_BFA',   label: 'Orange Money — Burkina Faso',         country: 'BFA' },
  { value: 'MOOV_BFA',     label: 'Moov Money — Burkina Faso',           country: 'BFA' },
  { value: 'MTN_MOMO_BEN', label: 'MTN Mobile Money — Bénin',           country: 'BEN' },
  { value: 'MOOV_BEN',     label: 'Moov Money — Bénin',                 country: 'BEN' },
]

/** Formate des chiffres bruts selon un masque (groupes séparés par espaces). */
function formatPhoneMask(digits: string, mask: number[]): string {
  const clean = digits.replace(/\D/g, '')
  const parts: string[] = []
  let cursor = 0
  for (const groupSize of mask) {
    if (cursor >= clean.length) break
    parts.push(clean.slice(cursor, cursor + groupSize))
    cursor += groupSize
  }
  return parts.join(' ')
}

const PLANS = {
  basic: {
    name: "Basic",
    price: 4900,
    priceFormatted: "4 900",
    annualPrice: "49 000",
    dailyCost: "~163",
    description: "Pour les indépendants",
    color: "#0F0F0F",
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
    color: "#F2B33D",
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
  const [isAnnual, setIsAnnual] = useState(
    searchParams.get("billing") === "annual"
  )
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [country, setCountry] = useState<CountryCode>("CIV")
  const [provider, setProvider] = useState<string>("ORANGE_CIV")

  const countryConfig = COUNTRIES[country]
  const providersForCountry = PAWAPAY_PROVIDERS.filter(p => p.country === country)
  const maxLocalDigits = countryConfig.localLength
  const cleanLocal = phoneNumber.replace(/\D/g, '')
  const isPhoneValid = cleanLocal.length === maxLocalDigits

  /** Quand on change de pays, reset l'opérateur et le numéro. */
  const handleCountryChange = (next: CountryCode) => {
    setCountry(next)
    const firstProvider = PAWAPAY_PROVIDERS.find(p => p.country === next)
    if (firstProvider) setProvider(firstProvider.value)
    setPhoneNumber("")
  }

  const handlePhoneChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, maxLocalDigits)
    setPhoneNumber(formatPhoneMask(digits, countryConfig.mask))
  }

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

    const localDigits = phoneNumber.replace(/\D/g, '')
    if (localDigits.length !== countryConfig.localLength) {
      alert(`Le numéro doit comporter ${countryConfig.localLength} chiffres pour ${countryConfig.name}.`)
      return
    }
    if (!provider) {
      alert("Veuillez choisir votre opérateur Mobile Money.")
      return
    }
    // Format international (sans “+”) : indicatif pays + numéro local
    const cleanedPhone = `${countryConfig.dialCode}${localDigits}`

    setIsProcessing(true)

    try {
      const response = await fetch("/api/payment/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: user.email,
          userName: userProfile?.name || user.user_metadata?.name,
          plan: selectedPlan,
          billing: isAnnual ? 'annual' : 'monthly',
          phoneNumber: cleanedPhone,
          provider,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        const failure = data.failureReason
          ? `${data.failureReason.failureCode}: ${data.failureReason.failureMessage}`
          : null
        const message = [data.error, failure, data.details].filter(Boolean).join(" — ")
        throw new Error(message || "Erreur lors de la création du paiement")
      }

      sessionStorage.setItem("payment_ref", data.ref_command)

      // Flow Wave : redirection vers authorizationUrl
      if (data.authorizationUrl || data.redirect_url) {
        window.location.href = data.authorizationUrl || data.redirect_url
        return
      }

      // Flow PIN : redirection vers la page d'attente qui polle le statut
      window.location.href = `/payment/pending?ref_command=${encodeURIComponent(data.ref_command)}`
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
      <header className="border-b border-[#F5F5F5] bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-[#0F0F0F]/70 hover:text-[#0F0F0F]"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" className="w-30" alt="" />
          </Link>
          <div className="w-16" />
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-center font-[family-name:var(--font-heading)] text-2xl font-bold text-[#0F0F0F]">
          {isActive
            ? "Prolonger ou changer de formule"
            : "Choisissez votre formule"}
        </h1>
        <p className="mt-2 text-center text-[#0F0F0F]/60">
          {isActive
            ? `${isAnnual ? '365' : '30'} jours supplémentaires seront ajoutés à votre abonnement`
            : "Débloquez l'accès complet à Laveiye"}
        </p>

        {/* Abonnement actif - info renouvellement */}
        {isActive && (
          <div className="mt-6 rounded-xl border-2 border-[#10B981] bg-[#10B981]/5 p-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-[#10B981] mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-[#0F0F0F]">
                  Abonnement actif — {userProfile?.plan || "Pro"}
                </p>
                <p className="mt-1 text-sm text-[#0F0F0F]/70">
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
                <p className="mt-1 text-sm text-[#0F0F0F]/70">
                  En renouvelant maintenant,{" "}
                  <span className="font-semibold">
                    {isAnnual ? '365 jours' : '30 jours'} seront ajoutés
                  </span>{" "}
                  à la fin de ton abonnement actuel.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Toggle mensuel / annuel */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <span className={`text-sm font-medium transition-colors ${!isAnnual ? 'text-[#0F0F0F]' : 'text-[#0F0F0F]/50'}`}>Mensuel</span>
          {/* eslint-disable-next-line jsx-a11y/role-supports-aria-props */}
          <button
            type="button"
            onClick={() => setIsAnnual(!isAnnual)}
            className={`relative inline-flex h-7 w-[52px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B33D] focus-visible:ring-offset-2 ${
              isAnnual ? 'bg-[#F2B33D]' : 'bg-[#F5F5F5]'
            }`}
            role="switch"
            aria-checked={isAnnual ? "true" : "false"}
            aria-label="Basculer entre facturation mensuelle et annuelle"
          >
            <span
              className={`pointer-events-none inline-block h-[22px] w-[22px] transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                isAnnual ? 'translate-x-[26px]' : 'translate-x-[2px]'
              } mt-[1px]`}
            />
          </button>
          <span className={`text-sm font-medium transition-colors ${isAnnual ? 'text-[#0F0F0F]' : 'text-[#0F0F0F]/50'}`}>
            Annuel
            <span className="ml-1 inline-block rounded-full bg-[#10B981]/10 px-2 py-0.5 text-[10px] font-bold text-[#10B981]">2 mois offerts</span>
          </span>
        </div>

        {/* Plan Selection Cards */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          {/* Basic Card */}
          <button
            type="button"
            onClick={() => setSelectedPlan("basic")}
            className={`rounded-xl border-2 p-5 text-left transition-all ${
              selectedPlan === "basic"
                ? "border-[#0F0F0F] bg-[#0F0F0F]/5 shadow-lg"
                : "border-[#F5F5F5] bg-white hover:border-[#0F0F0F]/30"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg text-[#0F0F0F]">Basic</h3>
              {selectedPlan === "basic" && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0F0F0F]">
                  <Check className="h-3.5 w-3.5 text-white" />
                </div>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-[#0F0F0F]">
                {isAnnual ? '49 000' : '4 900'}
              </span>
              <span className="text-sm text-[#0F0F0F]/60">{isAnnual ? 'XOF/an' : 'XOF/mois'}</span>
            </div>
            {isAnnual ? (
              <p className="mt-1 text-xs text-[#10B981] font-medium">soit ~4 083 XOF/mois</p>
            ) : (
              <p className="mt-1 text-xs text-[#0F0F0F]/50">soit 49 000 XOF/an</p>
            )}
            <ul className="mt-4 space-y-2">
              <li className="flex items-center gap-2 text-xs text-[#0F0F0F]/70">
                <Check className="h-3.5 w-3.5 text-[#10B981] shrink-0" />
                Accès illimité
              </li>
              <li className="flex items-center gap-2 text-xs text-[#0F0F0F]/70">
                <Check className="h-3.5 w-3.5 text-[#10B981] shrink-0" />
                Filtres avancés
              </li>
              <li className="flex items-center gap-2 text-xs text-[#0F0F0F]/70">
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
                ? "border-[#F2B33D] bg-[#F2B33D]/5 shadow-lg shadow-[#F2B33D]/10"
                : "border-[#F5F5F5] bg-white hover:border-[#F2B33D]/30"
            }`}
          >
            <div className="absolute -top-3 right-3 bg-[#F2B33D] text-[#0F0F0F] px-2.5 py-0.5 rounded-full text-[10px] font-bold">
              Recommandé
            </div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg text-[#F2B33D]">Pro</h3>
              {selectedPlan === "pro" && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F2B33D]">
                  <Check className="h-3.5 w-3.5 text-white" />
                </div>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-[#0F0F0F]">
                {isAnnual ? '99 000' : '9 900'}
              </span>
              <span className="text-sm text-[#0F0F0F]/60">{isAnnual ? 'XOF/an' : 'XOF/mois'}</span>
            </div>
            {isAnnual ? (
              <p className="mt-1 text-xs text-[#10B981] font-medium">soit ~8 250 XOF/mois</p>
            ) : (
              <p className="mt-1 text-xs text-[#0F0F0F]/50">soit 99 000 XOF/an</p>
            )}
            <ul className="mt-4 space-y-2">
              <li className="flex items-center gap-2 text-xs text-[#0F0F0F]/70">
                <Check className="h-3.5 w-3.5 text-[#10B981] shrink-0" />
                Tout du Basic
              </li>
              <li className="flex items-center gap-2 text-xs text-[#0F0F0F]/70">
                <Check className="h-3.5 w-3.5 text-[#10B981] shrink-0" />
                Recherches illimitées
              </li>
              <li className="flex items-center gap-2 text-xs text-[#0F0F0F]/70">
                <Check className="h-3.5 w-3.5 text-[#10B981] shrink-0" />
                Suivi de marques
              </li>
            </ul>
          </button>
        </div>

        {/* Features of selected plan */}
        <div className="mt-6 rounded-xl border border-[#F5F5F5] bg-[#F5F5F5]/10 p-5">
          <h3 className="text-sm font-semibold text-[#0F0F0F] mb-3">
            Ce qui est inclus dans le plan {plan.name} :
          </h3>
          <ul className="space-y-2.5">
            {plan.features.map((feature, i) => (
              <li key={i} className="flex items-center gap-2.5">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#10B981]/20 shrink-0">
                  <Check className="h-3 w-3 text-[#10B981]" />
                </div>
                <span className="text-sm text-[#0F0F0F]">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Mobile Money — details de paiement PawaPay */}
        <div className="mt-6 rounded-xl border border-[#F5F5F5] bg-white p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[#0F0F0F]">
            Paiement Mobile Money
          </h3>

          <div className="space-y-2">
            <Label htmlFor="pawapay-country">Pays</Label>
            <Select value={country} onValueChange={(v) => handleCountryChange(v as CountryCode)}>
              <SelectTrigger id="pawapay-country">
                <SelectValue placeholder="Choisissez votre pays" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(COUNTRIES) as CountryCode[]).map((code) => (
                  <SelectItem key={code} value={code}>
                    <span className="mr-2">{COUNTRIES[code].flag}</span>
                    {COUNTRIES[code].name}
                    <span className="ml-2 text-xs text-[#0F0F0F]/50">+{COUNTRIES[code].dialCode}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pawapay-provider">Opérateur</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger id="pawapay-provider">
                <SelectValue placeholder="Choisissez votre opérateur" />
              </SelectTrigger>
              <SelectContent>
                {providersForCountry.map((p) => {
                  const logo = getOperatorLogo(p.value)
                  return (
                    <SelectItem key={p.value} value={p.value}>
                      <span className="flex items-center gap-2">
                        {logo && (
                          <img
                            src={logo.src}
                            alt={logo.alt}
                            className="h-5 w-5 rounded-sm object-contain bg-white"
                          />
                        )}
                        {p.label}
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pawapay-phone">Numéro de téléphone</Label>
            <div className="relative flex items-stretch overflow-hidden rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0">
              <span className="flex select-none items-center gap-1.5 border-r border-input bg-[#F5F5F5]/60 px-3 text-sm text-[#0F0F0F]/70">
                <span>{countryConfig.flag}</span>
                <span className="font-medium">+{countryConfig.dialCode}</span>
              </span>
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="pawapay-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder={countryConfig.placeholder}
                  value={phoneNumber}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className="border-0 pl-9 focus-visible:ring-0 focus-visible:ring-offset-0"
                  disabled={isProcessing}
                  aria-invalid={phoneNumber.length > 0 && !isPhoneValid}
                />
              </div>
            </div>
            <p className="text-xs text-[#0F0F0F]/50">
              Saisissez votre numéro local ({countryConfig.localLength} chiffres). L’indicatif <strong>+{countryConfig.dialCode}</strong> est ajouté automatiquement.
              Vous recevrez une notification sur votre téléphone pour confirmer avec votre code PIN.
            </p>
          </div>
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
          <label htmlFor="terms" className="text-sm text-[#0F0F0F]/60">
            {"J'accepte les"}{" "}
            <LegalModal
              defaultTab="cgv"
              trigger={
                <button
                  type="button"
                  className="text-[#F2B33D] hover:underline"
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
          className="mt-6 h-12 w-full shadow-lg shadow-[#F2B33D]/25 bg-[#F2B33D] hover:bg-[#F2B33D]/90 text-white font-bold text-base"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Redirection en cours...
            </>
          ) : (
            <>
              <Lock className="mr-2 h-4 w-4" />
              {isActive ? "Renouveler" : "Payer"} — {isAnnual ? (selectedPlan === 'basic' ? '49 000' : '99 000') : plan.priceFormatted} XOF
            </>
          )}
        </Button>

        {/* Recap */}
        <div className="mt-6 rounded-xl border border-[#F5F5F5] bg-white p-4">
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[#0F0F0F]/60">
                {isActive ? "Renouvellement" : "Abonnement"} Laveiye —{" "}
                {plan.name} ({isAnnual ? 'Annuel' : 'Mensuel'})
              </span>
              <span className="font-medium text-[#0F0F0F]">
                {isAnnual ? (selectedPlan === 'basic' ? '49 000' : '99 000') : plan.priceFormatted} XOF
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#0F0F0F]/60">Durée ajoutée</span>
              <span className="text-[#0F0F0F]">+{isAnnual ? '365' : '30'} jours ({isAnnual ? '1 an' : '1 mois'})</span>
            </div>
            {isActive && (
              <div className="flex items-center justify-between">
                <span className="text-[#0F0F0F]/60">
                  Nouvelle date d{"'"}expiration
                </span>
                <span className="text-[#0F0F0F] font-medium">
                  {new Date(
                    subscriptionEndDate!.getTime() +
                      (isAnnual ? 365 : 30) * 24 * 60 * 60 * 1000
                  ).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
            {isAnnual && (
              <div className="flex items-center justify-between text-[#10B981]">
                <span>Économie par rapport au mensuel</span>
                <span className="font-medium">
                  {selectedPlan === 'basic' ? '9 800' : '19 800'} XOF
                </span>
              </div>
            )}
            <div className="border-t border-[#F5F5F5] pt-2 flex items-center justify-between">
              <span className="font-semibold text-[#0F0F0F]">Total</span>
              <span className="font-bold text-[#F2B33D]">
                {isAnnual ? (selectedPlan === 'basic' ? '49 000' : '99 000') : plan.priceFormatted} XOF
              </span>
            </div>
          </div>
        </div>

        {/* Compare link */}
        <p className="mt-4 text-center text-sm text-[#0F0F0F]/50">
          <Link
            href="/pricing"
            className="text-[#F2B33D] hover:underline"
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
