"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowRight, Play, Users, Award, Clock, Star } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#80368D] via-[#29358B] to-[#0A74C0] pt-8 pb-24 sm:pt-16 sm:pb-32">
      {/* Animated background patterns */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Organic curved shapes */}
        <svg className="absolute -top-1/2 -right-1/4 w-full h-full opacity-10" viewBox="0 0 800 800" fill="none">
          <path d="M400 0C600 0 800 200 800 400C800 600 600 800 400 800C200 800 0 600 0 400C0 200 200 0 400 0Z" fill="url(#hero-gradient)" />
          <defs>
            <linearGradient id="hero-gradient" x1="0" y1="0" x2="800" y2="800">
              <stop offset="0%" stopColor="white" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#F2B33D]/10 rounded-full blur-3xl animate-pulse delay-1000" />
        
        {/* Fingerprint pattern subtle */}
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/10 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Tagline badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-5 py-2.5 ring-1 ring-white/20">
            <span className="text-sm font-semibold text-white/90 tracking-wide uppercase">
              Laissez Votre Empreinte
            </span>
          </div>

          {/* Main headline */}
          <h1 className="font-[family-name:var(--font-heading)] text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1]">
            Développez vos<br />
            <span className="relative inline-block">
              compétences digitales
              <svg className="absolute -bottom-2 left-0 w-full" height="12" viewBox="0 0 400 12" fill="none">
                <path d="M2 10C100 2 300 2 398 10" stroke="#F2B33D" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mt-8 max-w-2xl text-lg sm:text-xl text-white/80 leading-relaxed font-[family-name:var(--font-body)]">
            Bootcamps intensifs pour professionnels du digital. 
            <span className="text-[#F2B33D] font-semibold"> 2 jours </span>
            pour transformer votre carrière avec Big Five Academy.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              asChild 
              className="group h-14 px-8 text-base font-bold bg-white text-[#80368D] hover:bg-white/90 shadow-2xl shadow-black/20 transition-all duration-300 hover:scale-[1.02]"
            >
              <Link href="/bootcamps">
                Découvrir nos bootcamps
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              asChild 
              className="group h-14 px-8 text-base font-semibold border-white/30 bg-white/5 text-white hover:bg-white/10 backdrop-blur-sm transition-all duration-300"
            >
              <Link href="#featured">
                <Play className="mr-2 h-5 w-5" />
                Voir le programme
              </Link>
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            <div className="flex items-center gap-3 text-white/80">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                <Users className="h-6 w-6 text-[#F2B33D]" />
              </div>
              <div className="text-left">
                <p className="text-2xl font-bold text-white">500+</p>
                <p className="text-sm text-white/60">Professionnels formés</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-white/80">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                <Award className="h-6 w-6 text-[#F2B33D]" />
              </div>
              <div className="text-left">
                <p className="text-2xl font-bold text-white">98%</p>
                <p className="text-sm text-white/60">Taux de satisfaction</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-white/80">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                <Clock className="h-6 w-6 text-[#F2B33D]" />
              </div>
              <div className="text-left">
                <p className="text-2xl font-bold text-white">14h</p>
                <p className="text-sm text-white/60">Format intensif</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Curved bottom */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden">
        <svg viewBox="0 0 1440 120" fill="none" className="w-full h-auto">
          <path d="M0 120L48 110C96 100 192 80 288 70C384 60 480 60 576 65C672 70 768 80 864 85C960 90 1056 90 1152 85C1248 80 1344 70 1392 65L1440 60V120H1392C1344 120 1248 120 1152 120C1056 120 960 120 864 120C768 120 672 120 576 120C480 120 384 120 288 120C192 120 96 120 48 120H0Z" fill="white"/>
        </svg>
      </div>
    </section>
  )
}

  return (
    <section className="py-24 bg-[#D0E4F2]/30 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(208,228,242,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(208,228,242,0.5)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,black_70%,transparent_100%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight text-[#1A1F2B] sm:text-4xl">
            Pourquoi les meilleures agences utilisent <span className="gradient-text">Big Five</span> ?
          </h2>
          <p className="mt-4 text-lg text-[#1A1F2B]/70">
            Une suite d'outils conçue pour accélérer votre processus créatif et valider vos intuitions.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <div key={idx} className="bg-white p-8 rounded-2xl border border-[#D0E4F2] shadow-sm hover:shadow-lg hover:border-[#80368D]/30 transition-all group">
              <div className={`h-12 w-12 rounded-xl ${feature.bg} ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-[#1A1F2B]">{feature.title}</h3>
              <p className="text-[#1A1F2B]/70 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function PreviewSection() {
  return (
    <section className="py-24 overflow-hidden bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-16 items-center">
          <div className="lg:col-span-6 mb-12 lg:mb-0">
            <h2 className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight text-[#1A1F2B] sm:text-4xl mb-6">
              Une interface pensée pour la <span className="text-[#80368D]">vitesse</span>.
            </h2>
            <p className="text-lg text-[#1A1F2B]/70 mb-8">
              Ne perdez plus de temps sur des captures d'écran désorganisées. Notre dashboard unifié vous donne une vue d'ensemble sur le marché en temps réel.
            </p>

            <ul className="space-y-4">
              {[
                "Sauvegardez vos favoris dans des collections",
                "Partagez des moodboards avec vos clients",
                "Téléchargez les assets en haute qualité",
                "Recevez des alertes sur vos concurrents"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-[#10B981]" />
                  <span className="text-[#1A1F2B]/80 font-medium">{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-10">
              <Button variant="ghost" className="text-[#80368D] hover:text-[#80368D]/80 hover:bg-[#80368D]/5 p-0 font-semibold group">
                Explorer toutes les fonctionnalités
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </div>

          <div className="lg:col-span-6 relative">
            <div className="absolute inset-0 bg-[#D0E4F2]/30 blur-3xl rounded-full opacity-50" />
            <div className="relative bg-white rounded-xl border border-[#D0E4F2] shadow-2xl overflow-hidden group">
              <div className="aspect-[4/3] bg-[#D0E4F2]/20 relative">
                {/* Abstract UI representation */}
                <div className="absolute inset-0 bg-white p-6">
                  <div className="h-8 w-1/3 bg-[#D0E4F2] rounded mb-6" />
                  <div className="grid grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(n => (
                      <div key={n} className="aspect-video bg-[#D0E4F2]/50 rounded-lg border border-[#D0E4F2]" />
                    ))}
                  </div>
                </div>

                {/* Overlay CTA */}
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                  <Button className="rounded-full shadow-lg bg-[#80368D] hover:bg-[#80368D]/90">Voir en action</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export function PricingTeaser() {
  return (
    <section className="py-24 bg-[#D0E4F2]/30 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(208,228,242,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(208,228,242,0.3)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
        {/* Free Trial Banner */}
        <div className="mb-8 inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-[#F2B33D]/30 to-[#F2B33D]/10 px-6 py-3 ring-2 ring-[#F2B33D]/40 shadow-lg">
          <span className="text-lg font-bold text-[#1A1F2B]">
            🎉 Essai gratuit de 30 jours
          </span>
        </div>
        
        <h2 className="font-[family-name:var(--font-heading)] text-4xl font-bold mb-6 text-[#1A1F2B]">
          Commencez à créer des campagnes impactantes.
        </h2>
        <p className="text-[#1A1F2B]/70 text-xl mb-10 max-w-2xl mx-auto">
          Rejoignez des centaines de créatifs qui utilisent Big Five Bootcamp pour élever leur niveau de jeu. Sans carte bancaire requise à l'inscription.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" className="h-14 px-8 text-lg bg-[#80368D] hover:bg-[#80368D]/90 text-white font-bold rounded-full shadow-lg shadow-[#80368D]/25 hover:shadow-[#80368D]/40 transition-all hover:-translate-y-1" asChild>
            <Link href="/pricing">
              Commencer gratuitement
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-[#29358B]/30 text-[#29358B] hover:bg-[#29358B]/10 rounded-full" asChild>
            <Link href="/pricing">
              Voir les tarifs
            </Link>
          </Button>
        </div>

        <p className="mt-8 text-sm text-[#1A1F2B]/50">
          Puis 4 500 XOF/mois • Annulation à tout moment • Support 24/7
        </p>
      </div>
    </section>
  )
}
