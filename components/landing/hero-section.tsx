"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Play, Target, BarChart3, Search, CheckCircle, Zap, RefreshCw, Globe } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
      
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col items-start">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#10B981]/10 px-3 py-1 text-xs font-medium text-[#10B981]">
                <CheckCircle className="h-3 w-3" />
                100+ marques
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <RefreshCw className="h-3 w-3" />
                Mise a jour quotidienne
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0A1F44]/10 px-3 py-1 text-xs font-medium text-[#0A1F44]">
                <Globe className="h-3 w-3" />
                Afrique & International
              </span>
            </div>
            
            <h1 className="font-[family-name:var(--font-heading)] text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              {"L'inspiration creative a portee de clic"}
            </h1>
            
            <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
              {"Des milliers de campagnes reelles, filtrees pour les pros de la com' africaine. Trouvez l'inspiration en quelques clics."}
            </p>
            
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button size="lg" asChild className="h-12 px-6 text-base shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30">
                <Link href="/register">
                  Essai gratuit 30 jours
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-12 bg-transparent px-6 text-base">
                <Link href="/dashboard">
                  <Play className="mr-2 h-4 w-4" />
                  Voir une demo
                </Link>
              </Button>
            </div>
            
            <p className="mt-4 text-sm text-muted-foreground">
              Sans carte bancaire. Annulez a tout moment.
            </p>
          </div>
          
          <div className="relative">
            <div className="absolute -inset-4 rounded-2xl bg-gradient-to-r from-primary/20 via-accent/20 to-[#10B981]/10 blur-2xl" />
            <div className="relative overflow-hidden rounded-xl border border-border bg-card/80 shadow-2xl backdrop-blur">
              <div className="flex items-center gap-2 border-b border-border bg-[#0A1F44] px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-[#EF4444]" />
                <div className="h-3 w-3 rounded-full bg-accent" />
                <div className="h-3 w-3 rounded-full bg-[#10B981]" />
                <span className="ml-2 text-xs text-white/70">Big Five - Bibliotheque</span>
              </div>
              <div className="p-4">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex flex-1 items-center rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-muted-foreground">
                    <Search className="mr-2 h-4 w-4" />
                    Rechercher des campagnes...
                  </div>
                  <div className="rounded-lg bg-primary px-3 py-2.5">
                    <Search className="h-4 w-4 text-primary-foreground" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { title: "MTN Ghana", tags: ["Telecoms", "Social"] },
                    { title: "Orange CI", tags: ["FMCG", "Video"] },
                    { title: "Jumia NG", tags: ["E-commerce", "Display"] },
                    { title: "Wave SN", tags: ["Fintech", "Story"] },
                  ].map((item, i) => (
                    <div key={i} className="group overflow-hidden rounded-lg border border-border bg-background transition-all hover:border-primary/50 hover:shadow-md">
                      <div className="aspect-video bg-gradient-to-br from-[#0A1F44] to-[#1a3a6e]" />
                      <div className="p-2.5">
                        <div className="text-xs font-medium text-foreground">{item.title}</div>
                        <div className="mt-1.5 flex gap-1">
                          {item.tags.map((tag, j) => (
                            <span key={j} className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
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
      description: "Fini les heures sur Instagram/TikTok a chercher l'inspi. Tout est centralise et organise pour vous."
    },
    {
      icon: BarChart3,
      title: "Contenus reels uniquement",
      description: "Pas de concepts, que des campagnes qui ont tourne. Resultats et strategies documentes."
    },
    {
      icon: Search,
      title: "Filtres ultra-precis",
      description: "Pays, secteur, format, plateforme... Trouvez exactement ce dont vous avez besoin en 3 clics."
    }
  ]

  return (
    <section className="border-t border-border bg-card py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-[family-name:var(--font-heading)] text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Pourquoi choisir Big Five ?
          </h2>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">
            Une plateforme pensee pour les creatifs et marketeurs exigeants.
          </p>
        </div>
        
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-xl border border-border bg-background p-8 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-card-foreground">{feature.title}</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">{feature.description}</p>
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
    <section className="border-t border-border bg-card py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl bg-[#0A1F44] px-6 py-16 sm:px-12 sm:py-20">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
          
          <div className="relative mx-auto max-w-2xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#10B981]/20 px-4 py-1.5 text-sm text-[#10B981]">
              <Zap className="h-4 w-4" />
              Offre speciale lancement
            </div>
            
            <h2 className="font-[family-name:var(--font-heading)] text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
              30 jours gratuits, 100% des fonctionnalites
            </h2>
            
            <div className="mt-8 flex flex-col items-center">
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-bold text-white">4 500</span>
                <span className="text-xl text-white/80">FCFA/mois</span>
              </div>
              <p className="mt-2 text-white/60">Sans engagement, annulation a tout moment</p>
            </div>
            
            <div className="mt-8">
              <Button size="lg" asChild className="h-12 bg-accent px-8 text-base text-accent-foreground shadow-lg transition-all hover:bg-accent/90 hover:shadow-xl">
                <Link href="/register">
                  Commencer maintenant
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
