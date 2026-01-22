"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Play, Target, BarChart3, Search, CheckCircle, Zap, RefreshCw, Globe } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-[#0A1F44]/5">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl animate-pulse-glow" />
        <div className="absolute top-1/2 -left-40 h-80 w-80 rounded-full bg-accent/10 blur-3xl animate-pulse-glow delay-300" />
        <div className="absolute bottom-0 right-1/4 h-60 w-60 rounded-full bg-[#10B981]/10 blur-3xl animate-pulse-glow delay-500" />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="flex flex-col items-start">
            <div className="mb-6 flex flex-wrap items-center gap-3 animate-fade-in-up">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#10B981]/10 px-4 py-1.5 text-xs font-semibold text-[#10B981] ring-1 ring-[#10B981]/20 hover-lift cursor-default">
                <CheckCircle className="h-3.5 w-3.5" />
                100+ marques
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary ring-1 ring-primary/20 hover-lift cursor-default">
                <RefreshCw className="h-3.5 w-3.5" />
                Mise a jour quotidienne
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0A1F44]/10 px-4 py-1.5 text-xs font-semibold text-[#0A1F44] ring-1 ring-[#0A1F44]/20 hover-lift cursor-default">
                <Globe className="h-3.5 w-3.5" />
                Afrique & International
              </span>
            </div>

            <h1 className="font-[family-name:var(--font-heading)] text-balance text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl animate-fade-in-up delay-100">
              <span className="gradient-text">{"L'inspiration creative"}</span>
              <br />
              {"a portee de clic"}
            </h1>

            <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground animate-fade-in-up delay-200">
              {"Des milliers de campagnes reelles, filtrees pour les pros de la com' africaine. Trouvez l'inspiration en quelques clics."}
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row animate-fade-in-up delay-300">
              <Button size="lg" asChild className="group h-14 px-8 text-base font-semibold shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/40 hover:scale-105">
                <Link href="/register">
                  Essai gratuit 30 jours
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="group h-14 bg-transparent px-8 text-base font-semibold border-2 transition-all duration-300 hover:bg-foreground/5 hover:scale-105">
                <Link href="/dashboard">
                  <Play className="mr-2 h-5 w-5 transition-transform group-hover:scale-110" />
                  Voir une demo
                </Link>
              </Button>
            </div>

            <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground animate-fade-in-up delay-400">
              <CheckCircle className="h-4 w-4 text-[#10B981]" />
              Sans carte bancaire. Annulez a tout moment.
            </p>
          </div>
          
          <div className="relative animate-scale-in delay-200">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-primary/30 via-accent/20 to-[#10B981]/20 blur-3xl animate-pulse-glow" />
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-card/90 shadow-2xl backdrop-blur-xl animate-float">
              <div className="flex items-center gap-2 border-b border-white/10 bg-gradient-to-r from-[#0A1F44] to-[#122a52] px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-[#EF4444] shadow-lg shadow-[#EF4444]/50" />
                <div className="h-3 w-3 rounded-full bg-accent shadow-lg shadow-accent/50" />
                <div className="h-3 w-3 rounded-full bg-[#10B981] shadow-lg shadow-[#10B981]/50" />
                <span className="ml-3 text-xs font-medium text-white/80">Big Five Bootcamp - Bibliotheque</span>
              </div>
              <div className="p-5">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex flex-1 items-center rounded-xl border border-border bg-background/80 px-4 py-3 text-sm text-muted-foreground shadow-inner">
                    <Search className="mr-3 h-4 w-4" />
                    Rechercher des campagnes...
                  </div>
                  <div className="rounded-xl bg-gradient-to-r from-primary to-primary/80 px-4 py-3 shadow-lg shadow-primary/30 transition-all hover:shadow-xl hover:shadow-primary/40">
                    <Search className="h-4 w-4 text-primary-foreground" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { title: "MTN Ghana", tags: ["Telecoms", "Social"], gradient: "from-[#FFCC00] to-[#FF9500]" },
                    { title: "Orange CI", tags: ["FMCG", "Video"], gradient: "from-[#FF6B35] to-[#FF4500]" },
                    { title: "Jumia NG", tags: ["E-commerce", "Display"], gradient: "from-[#F68B1E] to-[#E8650E]" },
                    { title: "Wave SN", tags: ["Fintech", "Story"], gradient: "from-[#1DA1F2] to-[#0D8ECF]" },
                  ].map((item, i) => (
                    <div key={i} className="group overflow-hidden rounded-xl border border-border/50 bg-background/80 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:-translate-y-1">
                      <div className={`aspect-video bg-gradient-to-br ${item.gradient} relative overflow-hidden`}>
                        <div className="absolute inset-0 bg-black/20" />
                        <div className="absolute bottom-2 left-2 h-6 w-6 rounded-full bg-white/90 flex items-center justify-center">
                          <Play className="h-3 w-3 text-foreground ml-0.5" />
                        </div>
                      </div>
                      <div className="p-3">
                        <div className="text-sm font-semibold text-foreground">{item.title}</div>
                        <div className="mt-2 flex gap-1.5">
                          {item.tags.map((tag, j) => (
                            <span key={j} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export function FeaturesSection() {
  const features = [
    {
      icon: Target,
      title: "Gain de temps brutal",
      description: "Fini les heures sur Instagram/TikTok a chercher l'inspi. Tout est centralise et organise pour vous.",
      color: "from-primary to-[#FF4500]",
      bgColor: "bg-primary/10"
    },
    {
      icon: BarChart3,
      title: "Contenus reels uniquement",
      description: "Pas de concepts, que des campagnes qui ont tourne. Resultats et strategies documentes.",
      color: "from-accent to-[#FFA500]",
      bgColor: "bg-accent/10"
    },
    {
      icon: Search,
      title: "Filtres ultra-precis",
      description: "Pays, secteur, format, plateforme... Trouvez exactement ce dont vous avez besoin en 3 clics.",
      color: "from-[#10B981] to-[#059669]",
      bgColor: "bg-[#10B981]/10"
    }
  ]

  return (
    <section className="relative border-t border-border bg-gradient-to-b from-card to-background py-24 sm:py-32 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary mb-4">
            <Zap className="h-4 w-4" />
            Fonctionnalites
          </span>
          <h2 className="font-[family-name:var(--font-heading)] text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Pourquoi choisir <span className="gradient-text">Big Five</span> ?
          </h2>
          <p className="mt-6 text-pretty text-lg text-muted-foreground">
            Une plateforme pensee pour les creatifs et marketeurs exigeants.
          </p>
        </div>

        <div className="mt-20 grid gap-8 md:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className="modern-card group relative p-8 hover-lift"
            >
              {/* Gradient background on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-xl`} />

              <div className={`relative mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl ${feature.bgColor} transition-all duration-300 group-hover:scale-110`}>
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <feature.icon className="relative h-7 w-7 text-foreground transition-colors duration-300 group-hover:text-white" />
              </div>

              <h3 className="font-[family-name:var(--font-heading)] text-xl font-bold text-card-foreground mb-3">{feature.title}</h3>
              <p className="leading-relaxed text-muted-foreground">{feature.description}</p>

              {/* Decorative arrow */}
              <div className="mt-6 flex items-center text-sm font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                En savoir plus
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function PreviewSection() {
  return (
    <section className="border-t border-border bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-[family-name:var(--font-heading)] text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Navigue dans une bibliotheque organisee comme jamais
          </h2>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">
            Interface intuitive, filtres puissants, recherche instantanee. Tout pour trouver {"l'inspiration"} rapidement.
          </p>
        </div>
        
        <div className="relative mt-12">
          <div className="absolute -inset-4 rounded-2xl bg-gradient-to-r from-primary/10 via-accent/10 to-[#10B981]/10 blur-xl" />
          <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
            <div className="flex items-center gap-2 border-b border-border bg-[#0A1F44] px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-[#EF4444]" />
              <div className="h-3 w-3 rounded-full bg-accent" />
              <div className="h-3 w-3 rounded-full bg-[#10B981]" />
              <span className="ml-2 text-xs text-white/70">Big Five - Dashboard</span>
            </div>
            <div className="flex">
              <div className="hidden w-64 border-r border-border bg-background p-4 md:block">
                <div className="space-y-4">
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pays</div>
                    <div className="space-y-1.5">
                      {["Cote d'Ivoire", "Senegal", "Nigeria", "France"].map((country) => (
                        <div key={country} className="flex items-center gap-2 text-sm text-foreground">
                          <div className="h-3.5 w-3.5 rounded border border-border bg-background" />
                          {country}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Secteur</div>
                    <div className="space-y-1.5">
                      {["Telecoms", "Banque", "FMCG", "Tech"].map((sector) => (
                        <div key={sector} className="flex items-center gap-2 text-sm text-foreground">
                          <div className="h-3.5 w-3.5 rounded border border-border bg-background" />
                          {sector}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">127 resultats</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Trier par:</span>
                    <span className="text-xs font-medium text-foreground">Plus recent</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="overflow-hidden rounded-lg border border-border bg-background">
                      <div className="aspect-video bg-gradient-to-br from-muted to-muted/50" />
                      <div className="p-2">
                        <div className="h-2 w-3/4 rounded bg-muted" />
                        <div className="mt-1 flex gap-1">
                          <div className="h-1.5 w-8 rounded bg-primary/30" />
                          <div className="h-1.5 w-6 rounded bg-accent/30" />
                        </div>
                      </div>
                    </div>
                  ))}
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
    <section className="relative border-t border-border bg-gradient-to-b from-card to-background py-24 sm:py-32 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0A1F44] via-[#122a52] to-[#0A1F44] px-6 py-20 sm:px-12 sm:py-24">
          {/* Animated background effects */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-primary/20 blur-3xl animate-pulse-glow" />
            <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-accent/20 blur-3xl animate-pulse-glow delay-300" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-80 rounded-full bg-[#10B981]/10 blur-3xl animate-pulse-glow delay-500" />
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent" />

          {/* Grid pattern overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] bg-[size:60px_60px]" />

          <div className="relative mx-auto max-w-2xl text-center">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#10B981]/20 to-[#10B981]/10 px-5 py-2 text-sm font-semibold text-[#10B981] ring-1 ring-[#10B981]/30 animate-shimmer">
              <Zap className="h-4 w-4" />
              Offre speciale lancement
            </div>

            <h2 className="font-[family-name:var(--font-heading)] text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              30 jours gratuits,{" "}
              <span className="bg-gradient-to-r from-accent via-primary to-[#10B981] bg-clip-text text-transparent">
                100% des fonctionnalites
              </span>
            </h2>

            <div className="mt-10 flex flex-col items-center">
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-extrabold text-white sm:text-7xl">4 500</span>
                <div className="flex flex-col items-start">
                  <span className="text-xl font-semibold text-white/90">FCFA</span>
                  <span className="text-sm text-white/60">/mois</span>
                </div>
              </div>
              <p className="mt-4 text-white/60 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-[#10B981]" />
                Sans engagement, annulation a tout moment
              </p>
            </div>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" asChild className="group h-14 bg-gradient-to-r from-accent to-accent/90 px-10 text-base font-semibold text-accent-foreground shadow-lg shadow-accent/30 transition-all duration-300 hover:shadow-xl hover:shadow-accent/40 hover:scale-105">
                <Link href="/register">
                  Commencer maintenant
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-14 border-white/20 bg-white/5 px-8 text-base font-semibold text-white hover:bg-white/10 hover:border-white/30 transition-all duration-300">
                <Link href="/dashboard">
                  Voir la demo
                </Link>
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-white/50">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-[#10B981]" />
                Sans carte bancaire
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-[#10B981]" />
                Acces immediat
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-[#10B981]" />
                Support inclus
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
