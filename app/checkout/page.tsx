"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  getSessionById, 
  getBootcampBySlug, 
  formatDateRange, 
  formatPrice,
  Session,
  Bootcamp
} from "@/lib/bootcamps-data"
import { 
  Check, 
  ChevronRight, 
  Calendar, 
  MapPin, 
  User,
  CreditCard,
  Building,
  Lock
} from "lucide-react"

function CheckoutContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session")
  
  const [session, setSession] = useState<Session | null>(null)
  const [bootcamp, setBootcamp] = useState<Bootcamp | null>(null)
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    civility: "mr",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    position: "",
    howDidYouHear: "",
    acceptTerms: false,
    newsletter: false
  })

  useEffect(() => {
    if (sessionId) {
      const foundSession = getSessionById(sessionId)
      if (foundSession) {
        setSession(foundSession)
        const foundBootcamp = getBootcampBySlug(foundSession.bootcampSlug)
        setBootcamp(foundBootcamp || null)
      }
    }
  }, [sessionId])

  if (!session || !bootcamp) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[#1A1F2B] mb-4">Session introuvable</h1>
            <p className="text-[#1A1F2B]/60 mb-6">La session demandée n&apos;existe pas ou n&apos;est plus disponible.</p>
            <Button asChild>
              <Link href="/bootcamps">Voir les bootcamps</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (step === 1) {
      setStep(2)
    } else {
      // Handle payment - redirect to confirmation
      window.location.href = `/confirmation?session=${sessionId}`
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-gradient-to-b from-white to-[#D0E4F2]/20">
        {/* Progress */}
        <section className="bg-white border-b border-[#D0E4F2] py-6">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center gap-4">
              {[
                { num: 1, label: "Informations" },
                { num: 2, label: "Paiement" },
                { num: 3, label: "Confirmation" }
              ].map((s, index) => (
                <div key={s.num} className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      step >= s.num 
                        ? "bg-gradient-to-r from-[#80368D] to-[#29358B] text-white" 
                        : "bg-[#D0E4F2] text-[#1A1F2B]/50"
                    }`}>
                      {step > s.num ? <Check className="h-4 w-4" /> : s.num}
                    </div>
                    <span className={`text-sm font-medium ${
                      step >= s.num ? "text-[#1A1F2B]" : "text-[#1A1F2B]/50"
                    }`}>
                      {s.label}
                    </span>
                  </div>
                  {index < 2 && (
                    <div className={`w-12 h-0.5 ${step > s.num ? "bg-[#80368D]" : "bg-[#D0E4F2]"}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="py-12">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Form */}
              <div className="lg:col-span-2">
                <form onSubmit={handleSubmit}>
                  {step === 1 && (
                    <Card className="border-[#D0E4F2]">
                      <CardContent className="p-6">
                        <h2 className="font-[family-name:var(--font-heading)] text-xl font-bold text-[#1A1F2B] mb-6">
                          Vos informations
                        </h2>

                        {/* Civility */}
                        <div className="mb-6">
                          <Label className="text-[#1A1F2B] mb-3 block">Civilité *</Label>
                          <div className="flex gap-4">
                            {["mr", "mme"].map((c) => (
                              <label key={c} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="civility"
                                  value={c}
                                  checked={formData.civility === c}
                                  onChange={(e) => setFormData({ ...formData, civility: e.target.value })}
                                  className="h-4 w-4 text-[#80368D] border-[#D0E4F2] focus:ring-[#80368D]"
                                />
                                <span className="text-[#1A1F2B]">{c === "mr" ? "Monsieur" : "Madame"}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Name fields */}
                        <div className="grid gap-4 sm:grid-cols-2 mb-4">
                          <div>
                            <Label htmlFor="firstName" className="text-[#1A1F2B]">Prénom *</Label>
                            <Input
                              id="firstName"
                              required
                              value={formData.firstName}
                              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                              className="mt-1 border-[#D0E4F2] focus:border-[#80368D] focus:ring-[#80368D]"
                            />
                          </div>
                          <div>
                            <Label htmlFor="lastName" className="text-[#1A1F2B]">Nom *</Label>
                            <Input
                              id="lastName"
                              required
                              value={formData.lastName}
                              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                              className="mt-1 border-[#D0E4F2] focus:border-[#80368D] focus:ring-[#80368D]"
                            />
                          </div>
                        </div>

                        {/* Contact fields */}
                        <div className="grid gap-4 sm:grid-cols-2 mb-4">
                          <div>
                            <Label htmlFor="email" className="text-[#1A1F2B]">Email *</Label>
                            <Input
                              id="email"
                              type="email"
                              required
                              value={formData.email}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                              className="mt-1 border-[#D0E4F2] focus:border-[#80368D] focus:ring-[#80368D]"
                            />
                          </div>
                          <div>
                            <Label htmlFor="phone" className="text-[#1A1F2B]">Téléphone *</Label>
                            <Input
                              id="phone"
                              type="tel"
                              required
                              placeholder="+225 XX XX XX XX XX"
                              value={formData.phone}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                              className="mt-1 border-[#D0E4F2] focus:border-[#80368D] focus:ring-[#80368D]"
                            />
                          </div>
                        </div>

                        {/* Company fields */}
                        <div className="grid gap-4 sm:grid-cols-2 mb-4">
                          <div>
                            <Label htmlFor="company" className="text-[#1A1F2B]">Entreprise</Label>
                            <Input
                              id="company"
                              value={formData.company}
                              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                              className="mt-1 border-[#D0E4F2] focus:border-[#80368D] focus:ring-[#80368D]"
                            />
                          </div>
                          <div>
                            <Label htmlFor="position" className="text-[#1A1F2B]">Fonction</Label>
                            <Input
                              id="position"
                              value={formData.position}
                              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                              className="mt-1 border-[#D0E4F2] focus:border-[#80368D] focus:ring-[#80368D]"
                            />
                          </div>
                        </div>

                        {/* How did you hear */}
                        <div className="mb-6">
                          <Label htmlFor="howDidYouHear" className="text-[#1A1F2B]">
                            Comment avez-vous connu Big Five ?
                          </Label>
                          <select
                            id="howDidYouHear"
                            value={formData.howDidYouHear}
                            onChange={(e) => setFormData({ ...formData, howDidYouHear: e.target.value })}
                            className="mt-1 w-full rounded-md border border-[#D0E4F2] px-3 py-2 text-[#1A1F2B] focus:border-[#80368D] focus:ring-[#80368D]"
                          >
                            <option value="">Sélectionner...</option>
                            <option value="google">Google</option>
                            <option value="linkedin">LinkedIn</option>
                            <option value="facebook">Facebook</option>
                            <option value="instagram">Instagram</option>
                            <option value="recommendation">Recommandation</option>
                            <option value="other">Autre</option>
                          </select>
                        </div>

                        <Button 
                          type="submit"
                          className="w-full h-12 bg-gradient-to-r from-[#80368D] to-[#29358B]"
                        >
                          Continuer vers le paiement
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {step === 2 && (
                    <Card className="border-[#D0E4F2]">
                      <CardContent className="p-6">
                        <h2 className="font-[family-name:var(--font-heading)] text-xl font-bold text-[#1A1F2B] mb-6">
                          Paiement
                        </h2>

                        {/* Payment options */}
                        <div className="space-y-4 mb-6">
                          <label className="flex items-start gap-4 p-4 rounded-lg border-2 border-[#80368D] bg-[#80368D]/5 cursor-pointer">
                            <input type="radio" name="payment" defaultChecked className="mt-1" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-[#80368D]" />
                                <span className="font-semibold text-[#1A1F2B]">Paiement en ligne</span>
                              </div>
                              <p className="text-sm text-[#1A1F2B]/60 mt-1">
                                Carte bancaire, Mobile Money (Orange Money, MTN, Moov)
                              </p>
                            </div>
                          </label>

                          <label className="flex items-start gap-4 p-4 rounded-lg border border-[#D0E4F2] hover:border-[#80368D]/30 cursor-pointer">
                            <input type="radio" name="payment" className="mt-1" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Building className="h-5 w-5 text-[#29358B]" />
                                <span className="font-semibold text-[#1A1F2B]">Virement bancaire</span>
                              </div>
                              <p className="text-sm text-[#1A1F2B]/60 mt-1">
                                Pour les entreprises. Nous vous enverrons un devis.
                              </p>
                            </div>
                          </label>
                        </div>

                        {/* Terms */}
                        <div className="space-y-4 mb-6 pt-6 border-t border-[#D0E4F2]">
                          <div className="flex items-start gap-3">
                            <Checkbox 
                              id="terms"
                              checked={formData.acceptTerms}
                              onCheckedChange={(checked) => setFormData({ ...formData, acceptTerms: checked as boolean })}
                              className="mt-1"
                            />
                            <Label htmlFor="terms" className="text-sm text-[#1A1F2B]/70 cursor-pointer">
                              J&apos;accepte les{" "}
                              <Link href="/terms" className="text-[#80368D] hover:underline">
                                conditions générales de vente
                              </Link>{" "}
                              et la{" "}
                              <Link href="/privacy" className="text-[#80368D] hover:underline">
                                politique de confidentialité
                              </Link>{" "}
                              *
                            </Label>
                          </div>
                          <div className="flex items-start gap-3">
                            <Checkbox 
                              id="newsletter"
                              checked={formData.newsletter}
                              onCheckedChange={(checked) => setFormData({ ...formData, newsletter: checked as boolean })}
                              className="mt-1"
                            />
                            <Label htmlFor="newsletter" className="text-sm text-[#1A1F2B]/70 cursor-pointer">
                              Je souhaite recevoir les actualités et offres de Big Five
                            </Label>
                          </div>
                        </div>

                        <div className="flex gap-4">
                          <Button 
                            type="button"
                            variant="outline"
                            onClick={() => setStep(1)}
                            className="flex-1"
                          >
                            Retour
                          </Button>
                          <Button 
                            type="submit"
                            disabled={!formData.acceptTerms}
                            className="flex-1 bg-gradient-to-r from-[#80368D] to-[#29358B] disabled:opacity-50"
                          >
                            <Lock className="mr-2 h-4 w-4" />
                            Payer {formatPrice(bootcamp.price)}
                          </Button>
                        </div>

                        <p className="text-xs text-center text-[#1A1F2B]/50 mt-4 flex items-center justify-center gap-1">
                          <Lock className="h-3 w-3" />
                          Paiement sécurisé par Stripe
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </form>
              </div>

              {/* Order summary */}
              <div className="lg:col-span-1">
                <Card className="border-[#D0E4F2] sticky top-24">
                  <CardContent className="p-6">
                    <h3 className="font-[family-name:var(--font-heading)] text-lg font-bold text-[#1A1F2B] mb-4">
                      Récapitulatif
                    </h3>

                    {/* Bootcamp info */}
                    <div className="mb-4 pb-4 border-b border-[#D0E4F2]">
                      <p className="font-semibold text-[#1A1F2B]">{bootcamp.title}</p>
                      <p className="text-sm text-[#1A1F2B]/60">{bootcamp.duration}</p>
                    </div>

                    {/* Session info */}
                    <div className="space-y-3 mb-4 pb-4 border-b border-[#D0E4F2]">
                      <div className="flex items-center gap-2 text-sm text-[#1A1F2B]/70">
                        <Calendar className="h-4 w-4 text-[#80368D]" />
                        <span>{formatDateRange(session.startDate, session.endDate)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[#1A1F2B]/70">
                        <MapPin className="h-4 w-4 text-[#80368D]" />
                        <span>{session.city} - {session.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[#1A1F2B]/70">
                        <User className="h-4 w-4 text-[#80368D]" />
                        <span>{session.trainer.name}</span>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#1A1F2B]/60">Prix du bootcamp</span>
                        <span className="text-[#1A1F2B]">{formatPrice(bootcamp.price)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg pt-2 border-t border-[#D0E4F2]">
                        <span className="text-[#1A1F2B]">Total</span>
                        <span className="text-[#80368D]">{formatPrice(bootcamp.price)}</span>
                      </div>
                    </div>

                    {/* Included */}
                    <div className="mt-6 pt-4 border-t border-[#D0E4F2]">
                      <p className="text-xs font-semibold text-[#1A1F2B]/60 uppercase tracking-wider mb-3">
                        Inclus
                      </p>
                      <ul className="space-y-2 text-sm text-[#1A1F2B]/70">
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          Certificat de formation
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          Supports de cours
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          Déjeuners inclus
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          Accès communauté alumni
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-[#80368D] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-[#1A1F2B]/60">Chargement...</p>
          </div>
        </main>
        <Footer />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}
