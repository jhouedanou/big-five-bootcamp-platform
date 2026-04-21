"use client"

import Link from "next/link"
import { Clock, Check, ArrowRight, LogOut, Sparkles, Smartphone, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function PaywallPage() {
  const benefits = [
    "Acces illimite a toute la bibliotheque",
    "Nouveaux contenus ajoutes quotidiennement",
    "Filtres et recherche avances",
    "Annulation possible a tout moment"
  ]

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#F5F5F5]/30 to-white px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F2B33D]">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <span className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[#0F0F0F]">Laveiye</span>
          </Link>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl border border-[#F5F5F5] bg-white p-8 text-center shadow-xl">
          {/* Icon */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#F2B33D]/20">
            <Clock className="h-10 w-10 text-[#F2B33D]" />
          </div>
          
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[#0F0F0F]">
            Passez à un abonnement payant
          </h1>

          <p className="mt-3 text-[#0F0F0F]/70">
            Débloquez {"l'accès"} complet à la bibliothèque à partir de{" "}
            <span className="font-semibold text-[#0F0F0F]">4 900 XOF/mois</span>.
          </p>

          {/* Benefits */}
          <ul className="mt-6 space-y-3 text-left">
            {benefits.map((benefit, index) => (
              <li key={index} className="flex items-center gap-3">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#10B981]/20">
                  <Check className="h-3 w-3 text-[#10B981]" />
                </div>
                <span className="text-sm text-[#0F0F0F]">{benefit}</span>
              </li>
            ))}
          </ul>

          {/* Pricing Card */}
          <div className="mt-8 rounded-xl bg-[#F2B33D] p-6 text-left">
            <div className="flex items-baseline gap-1">
              <span className="font-[family-name:var(--font-heading)] text-4xl font-bold text-white">25 000</span>
              <span className="text-lg text-white/70">XOF/mois</span>
            </div>
            <p className="mt-1 text-sm text-white/60">Soit ~833 XOF/jour pour booster ta créa</p>
            
            {/* Payment options */}
            <div className="mt-4 flex items-center gap-3">
              <div className="flex items-center gap-1 rounded bg-white/10 px-2 py-1">
                <Smartphone className="h-4 w-4 text-[#F2B33D]" />
                <span className="text-xs text-white/80">Mobile Money</span>
              </div>
              <div className="flex items-center gap-1 rounded bg-white/10 px-2 py-1">
                <CreditCard className="h-4 w-4 text-[#F2B33D]" />
                <span className="text-xs text-white/80">Carte bancaire</span>
              </div>
            </div>
          </div>

          {/* CTA */}
          <Button asChild className="mt-6 h-12 w-full text-base shadow-lg shadow-[#F2B33D]/25 bg-[#F2B33D] hover:bg-[#F2B33D]/90 text-white">
            <Link href="/subscribe">
              {"S'abonner"} maintenant
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>

          {/* Logout link */}
          <Link 
            href="/"
            className="mt-4 inline-flex items-center gap-1 text-sm text-[#0F0F0F]/60 transition-colors hover:text-[#0F0F0F]"
          >
            <LogOut className="h-4 w-4" />
            Non merci, me deconnecter
          </Link>
        </div>
      </div>
    </div>
  )
}
