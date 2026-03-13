"use client"

import { useState } from "react"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Check, X, Gift, Zap, Star } from "lucide-react"
import { PLAN_FREE, PLAN_BASIC, PLAN_PRO } from "@/lib/pricing"

const featureMatrix = [
  { label: "Accès bibliothèque", free: "Aperçu scroll", basic: "Complet", pro: "Complet" },
  { label: "Clics par jour", free: "5", basic: "Illimité", pro: "Illimité" },
  { label: "Recherches par filtre/jour", free: "3", basic: "10", pro: "Illimité" },
  { label: "Filtres pays / secteur / tags", free: false, basic: true, pro: true },
  { label: "Filtres plateforme & format", free: true, basic: true, pro: true },
  { label: "Favoris & collections", free: false, basic: true, pro: true },
  { label: "Téléchargement", free: false, basic: true, pro: true },
  { label: "Alertes email hebdo", free: true, basic: true, pro: true },
  { label: "Compteur d'usage", free: false, basic: true, pro: true },
  { label: "Essai gratuit 14 jours", free: false, basic: false, pro: true },
]

function FeatureCell({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="mx-auto h-5 w-5 text-[#80368D]" />
  if (value === false) return <X className="mx-auto h-4 w-4 text-[#1A1F2B]/20" />
  return <span className="text-sm font-medium text-[#1A1F2B]">{value}</span>
}

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false)

  const basicPrice = isAnnual
    ? Math.round(PLAN_BASIC.annualPrice! / 12)
    : PLAN_BASIC.price
  const proPrice = isAnnual
    ? Math.round(PLAN_PRO.annualPrice! / 12)
    : PLAN_PRO.price

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />
      <main className="flex-1">
        {/* Header */}
        <section className="relative py-20 lg:py-28 overflow-hidden bg-gradient-to-b from-[#D0E4F2] to-white">
          <div className="container relative mx-auto px-4 text-center">
            <div className="mb-8 inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-[#F2B33D]/30 to-[#F2B33D]/10 px-6 py-3 ring-2 ring-[#F2B33D]/40 shadow-lg">
              <Gift className="h-6 w-6 text-[#F2B33D]" />
              <span className="text-lg font-bold text-[#1A1F2B]">
                🎉 Essai gratuit de 14 jours sur le plan Pro — Sans carte bancaire !
              </span>
            </div>

            <h1 className="font-[family-name:var(--font-heading)] text-4xl lg:text-6xl font-extrabold tracking-tight mb-6 text-[#1A1F2B]">
              Des tarifs adaptés à <br /> <span className="text-[#80368D]">votre ambition</span>
            </h1>
            <p className="text-lg text-[#1A1F2B]/70 max-w-2xl mx-auto mb-10">
              Investissez dans votre veille créative et prenez une longueur d'avance sur la concurrence.
            </p>

            {/* Toggle mensuel/annuel */}
            <div className="inline-flex items-center gap-3 rounded-full bg-white border border-[#D0E4F2] p-1 shadow-sm">
              <button
                onClick={() => setIsAnnual(false)}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                  !isAnnual
                    ? "bg-[#80368D] text-white shadow-md"
                    : "text-[#1A1F2B]/60 hover:text-[#1A1F2B]"
                }`}
              >
                Mensuel
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition-all flex items-center gap-2 ${
                  isAnnual
                    ? "bg-[#80368D] text-white shadow-md"
                    : "text-[#1A1F2B]/60 hover:text-[#1A1F2B]"
                }`}
              >
                Annuel
                <span className="rounded-full bg-[#F2B33D] px-2 py-0.5 text-[10px] font-bold text-[#1A1F2B]">
                  -17%
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* Cards */}
        <section className="py-20 -mt-8 relative z-10">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
              {/* Gratuit */}
              <div className="rounded-2xl border border-[#D0E4F2] bg-white p-8 shadow-md flex flex-col">
                <div className="mb-6">
                  <h3 className="font-bold text-xl mb-1 text-[#1A1F2B]">Gratuit</h3>
                  <p className="text-[#1A1F2B]/60 text-sm">Pour explorer la plateforme.</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-[#1A1F2B]">0</span>
                  <span className="text-[#1A1F2B]/60 ml-1">FCFA/mois</span>
                </div>
                <Button asChild variant="outline" className="w-full mb-8 border-[#D0E4F2] text-[#1A1F2B]">
                  <Link href="/register">Commencer</Link>
                </Button>
                <ul className="space-y-3 text-sm flex-1">
                  <li className="flex items-start gap-2 text-[#1A1F2B]/70">
                    <Check className="h-4 w-4 text-[#80368D] mt-0.5 shrink-0" />
                    Aperçu scroll (clic bloqué après 5/jour)
                  </li>
                  <li className="flex items-start gap-2 text-[#1A1F2B]/70">
                    <Check className="h-4 w-4 text-[#80368D] mt-0.5 shrink-0" />
                    Filtres plateforme & format
                  </li>
                  <li className="flex items-start gap-2 text-[#1A1F2B]/70">
                    <Check className="h-4 w-4 text-[#80368D] mt-0.5 shrink-0" />
                    3 recherches par filtre/jour
                  </li>
                  <li className="flex items-start gap-2 text-[#1A1F2B]/70">
                    <Check className="h-4 w-4 text-[#80368D] mt-0.5 shrink-0" />
                    Alertes email hebdomadaires
                  </li>
                  <li className="flex items-start gap-2 text-[#1A1F2B]/30">
                    <X className="h-4 w-4 mt-0.5 shrink-0" />
                    Filtres pays / secteur / tags
                  </li>
                  <li className="flex items-start gap-2 text-[#1A1F2B]/30">
                    <X className="h-4 w-4 mt-0.5 shrink-0" />
                    Favoris & collections
                  </li>
                </ul>
              </div>

              {/* Pro (central, mis en avant) */}
              <div className="rounded-2xl border-2 border-[#80368D] bg-white p-8 shadow-2xl shadow-[#80368D]/20 relative flex flex-col transform md:-translate-y-4 scale-[1.02]">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#F2B33D] text-[#1A1F2B] px-4 py-1.5 rounded-full text-sm font-bold shadow-lg flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  Populaire — 14 jours gratuits
                </div>
                <div className="mb-6 mt-3">
                  <h3 className="font-bold text-xl mb-1 text-[#80368D]">Pro</h3>
                  <p className="text-[#1A1F2B]/60 text-sm">Pour les créatifs exigeants.</p>
                </div>
                <div className="mb-1">
                  <span className="text-4xl font-extrabold text-[#1A1F2B]">
                    {proPrice.toLocaleString("fr-FR")}
                  </span>
                  <span className="text-[#1A1F2B]/60 ml-1">FCFA/mois</span>
                </div>
                {isAnnual && (
                  <p className="text-xs text-[#F2B33D] font-semibold mb-1">
                    Facturé {PLAN_PRO.annualPrice!.toLocaleString("fr-FR")} FCFA/an
                  </p>
                )}
                <p className="text-xs text-[#1A1F2B]/50 mb-6">Après 14 jours d'essai gratuit</p>
                <Button asChild className="w-full mb-8 font-bold shadow-lg shadow-[#80368D]/25 h-12 text-base bg-[#80368D] hover:bg-[#80368D]/90 text-white">
                  <Link href="/register">Commencer l'essai gratuit</Link>
                </Button>
                <ul className="space-y-3 text-sm flex-1">
                  <li className="flex items-start gap-2 text-[#1A1F2B]">
                    <Check className="h-4 w-4 text-[#80368D] mt-0.5 shrink-0" />
                    <strong>Accès illimité</strong> à toutes les campagnes
                  </li>
                  <li className="flex items-start gap-2 text-[#1A1F2B]">
                    <Check className="h-4 w-4 text-[#80368D] mt-0.5 shrink-0" />
                    Filtres complets (Pays, Secteur, Tags…)
                  </li>
                  <li className="flex items-start gap-2 text-[#1A1F2B]">
                    <Check className="h-4 w-4 text-[#80368D] mt-0.5 shrink-0" />
                    Recherches <strong>illimitées</strong> par filtre
                  </li>
                  <li className="flex items-start gap-2 text-[#1A1F2B]">
                    <Check className="h-4 w-4 text-[#80368D] mt-0.5 shrink-0" />
                    Favoris & collections personnalisées
                  </li>
                  <li className="flex items-start gap-2 text-[#1A1F2B]">
                    <Check className="h-4 w-4 text-[#80368D] mt-0.5 shrink-0" />
                    Téléchargement des créatifs
                  </li>
                  <li className="flex items-start gap-2 text-[#1A1F2B]">
                    <Check className="h-4 w-4 text-[#80368D] mt-0.5 shrink-0" />
                    Compteur d'usage mensuel
                  </li>
                </ul>
              </div>

              {/* Basic */}
              <div className="rounded-2xl border border-[#D0E4F2] bg-white p-8 shadow-md flex flex-col">
                <div className="mb-6">
                  <h3 className="font-bold text-xl mb-1 text-[#1A1F2B]">Basic</h3>
                  <p className="text-[#1A1F2B]/60 text-sm">Pour commencer en douceur.</p>
                </div>
                <div className="mb-1">
                  <span className="text-4xl font-extrabold text-[#1A1F2B]">
                    {basicPrice.toLocaleString("fr-FR")}
                  </span>
                  <span className="text-[#1A1F2B]/60 ml-1">FCFA/mois</span>
                </div>
                {isAnnual && (
                  <p className="text-xs text-[#F2B33D] font-semibold mb-5">
                    Facturé {PLAN_BASIC.annualPrice!.toLocaleString("fr-FR")} FCFA/an
                  </p>
                )}
                <div className="mb-6 mt-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-[#D0E4F2] px-3 py-1 text-xs font-medium text-[#1A1F2B]">
                    <Zap className="h-3 w-3 text-[#80368D]" />
                    Accès complet
                  </div>
                </div>
                <Button asChild variant="outline" className="w-full mb-8 border-[#80368D]/40 text-[#80368D] hover:bg-[#80368D]/5">
                  <Link href="/subscribe?plan=basic">Choisir Basic</Link>
                </Button>
                <ul className="space-y-3 text-sm flex-1">
                  <li className="flex items-start gap-2 text-[#1A1F2B]">
                    <Check className="h-4 w-4 text-[#80368D] mt-0.5 shrink-0" />
                    Accès complet bibliothèque
                  </li>
                  <li className="flex items-start gap-2 text-[#1A1F2B]">
                    <Check className="h-4 w-4 text-[#80368D] mt-0.5 shrink-0" />
                    Filtres complets
                  </li>
                  <li className="flex items-start gap-2 text-[#1A1F2B]">
                    <Check className="h-4 w-4 text-[#80368D] mt-0.5 shrink-0" />
                    10 recherches par filtre/jour
                  </li>
                  <li className="flex items-start gap-2 text-[#1A1F2B]">
                    <Check className="h-4 w-4 text-[#80368D] mt-0.5 shrink-0" />
                    Favoris & collections
                  </li>
                  <li className="flex items-start gap-2 text-[#1A1F2B]">
                    <Check className="h-4 w-4 text-[#80368D] mt-0.5 shrink-0" />
                    Téléchargement des créatifs
                  </li>
                  <li className="flex items-start gap-2 text-[#1A1F2B]/30">
                    <X className="h-4 w-4 mt-0.5 shrink-0" />
                    Recherches illimitées (Pro seulement)
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison Matrix */}
        <section className="py-16 bg-[#D0E4F2]/20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-center text-[#1A1F2B] mb-10">
                Comparaison complète
              </h2>
              <div className="rounded-2xl border border-[#D0E4F2] bg-white overflow-hidden shadow-sm">
                {/* Header */}
                <div className="grid grid-cols-4 border-b border-[#D0E4F2] bg-[#F8FAFC]">
                  <div className="p-4 text-sm font-bold text-[#1A1F2B]/60 uppercase tracking-wider">
                    Fonctionnalité
                  </div>
                  <div className="p-4 text-center text-sm font-bold text-[#1A1F2B]">Gratuit</div>
                  <div className="p-4 text-center text-sm font-bold text-[#80368D] border-x border-[#80368D]/20 bg-[#80368D]/5">
                    Pro ⭐
                  </div>
                  <div className="p-4 text-center text-sm font-bold text-[#1A1F2B]">Basic</div>
                </div>
                {/* Rows */}
                {featureMatrix.map((row, i) => (
                  <div
                    key={i}
                    className={`grid grid-cols-4 border-b border-[#D0E4F2] last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-[#F8FAFC]/50"}`}
                  >
                    <div className="p-4 text-sm text-[#1A1F2B] font-medium">{row.label}</div>
                    <div className="p-4 text-center">
                      <FeatureCell value={row.free} />
                    </div>
                    <div className="p-4 text-center border-x border-[#80368D]/20 bg-[#80368D]/5">
                      <FeatureCell value={row.pro} />
                    </div>
                    <div className="p-4 text-center">
                      <FeatureCell value={row.basic} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
