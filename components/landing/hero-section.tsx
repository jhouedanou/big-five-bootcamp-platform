"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Play, Target, BarChart3, Search, CheckCircle, Zap, RefreshCw, Globe, Layers, Sparkles } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-background pt-20 pb-32 sm:pt-32 sm:pb-40 lg:pb-48">
      {/* Background gradients and blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[500px] bg-primary/20 blur-[120px] rounded-full mix-blend-screen opacity-60 animate-pulse-glow" />
        <div className="absolute bottom-0 right-0 h-[600px] w-[600px] bg-accent/10 blur-[130px] rounded-full mix-blend-screen opacity-50" />
        <div className="absolute top-1/2 left-0 h-[400px] w-[400px] bg-sky-500/10 blur-[100px] rounded-full mix-blend-screen opacity-40" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-24">

          {/* Text Content */}
          <div className="flex flex-col items-start text-left z-10">
            <div className="mb-8 flex flex-wrap items-center gap-3 animate-fade-in-up">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary ring-1 ring-primary/20 hover-lift cursor-default backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5" />
                Nouveau: Version 2.0
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-1.5 text-xs font-semibold text-foreground ring-1 ring-border hover-lift cursor-default backdrop-blur-sm">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                15+ Pays Africains
              </span>
            </div>

            <h1 className="font-[family-name:var(--font-heading)] text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl lg:text-7xl leading-[1.1] animate-fade-in-up delay-100">
              L'inspiration <br />
              <span className="gradient-text relative inline-block">
                créative
                <span className="absolute -bottom-2 left-0 w-full h-2 bg-primary/20 -rotate-1 rounded-full blur-sm"></span>
              </span> <br />
              sans limites.
            </h1>

            <p className="mt-8 max-w-xl text-lg text-muted-foreground leading-relaxed animate-fade-in-up delay-200">
              Accédez à la plus grande bibliothèque de campagnes marketing réelles en Afrique. Analysez, benchmarkez et créez des concepts gagnants en quelques minutes.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row animate-fade-in-up delay-300 w-full sm:w-auto">
              <Button size="lg" asChild className="btn-glow group h-14 px-8 text-base font-bold shadow-xl shadow-primary/20 transition-all duration-300 hover:scale-[1.02]">
                <Link href="/register">
                  Essai gratuit 30 jours
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="glass group h-14 px-8 text-base font-semibold border-border/50 hover:bg-secondary/50 hover:border-border transition-all duration-300">
                <Link href="/dashboard">
                  <Play className="mr-2 h-5 w-5 fill-current text-primary opacity-80" />
                  Voir la démo
                </Link>
              </Button>
            </div>

            <div className="mt-10 flex items-center gap-6 animate-fade-in-up delay-400">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={`h-10 w-10 rounded-full border-2 border-background bg-slate-200 z-${10 - i} flex items-center justify-center text-xs font-medium text-slate-600`}>
                    U{i}
                  </div>
                ))}
              </div>
              <div className="flex flex-col">
                <div className="flex gap-1 text-[#FFD23F]">
                  {"★★★★★"}
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  Approuvé par <span className="text-foreground font-bold">2,500+</span> marketeurs
                </span>
              </div>
            </div>
          </div>

          {/* Visual Content - Floating Interface */}
          <div className="relative animate-slide-in-right delay-200 hidden lg:block perspective-1000">
            {/* Decorative Elements behind card */}
            <div className="absolute -top-12 -right-12 h-64 w-64 bg-accent/20 rounded-full blur-3xl animate-pulse-glow"></div>
            <div className="absolute -bottom-8 -left-8 h-48 w-48 bg-primary/20 rounded-full blur-3xl animate-pulse-glow delay-700"></div>

            <div className="glass-panel rounded-2xl p-4 transform rotate-y-[-5deg] rotate-x-[5deg] transition-transform duration-500 hover:rotate-0 hover:scale-[1.02]">
              <div className="rounded-xl bg-card border border-border shadow-2xl overflow-hidden">
                {/* Window Header */}
                <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-[#EF4444]" />
                    <div className="h-3 w-3 rounded-full bg-[#FFD23F]" />
                    <div className="h-3 w-3 rounded-full bg-[#10B981]" />
                  </div>
                  <div className="flex-1 text-center">
                    <div className="inline-flex items-center gap-2 rounded-md bg-background px-3 py-1 text-xs font-medium text-muted-foreground border border-border/50 shadow-sm">
                      <Search className="h-3 w-3" />
                      bigfive-bootcamp.com
                    </div>
                  </div>
                  <div className="w-12"></div>
                </div>

                {/* Dashboard Preview Content */}
                <div className="p-6 bg-gradient-to-b from-card to-muted/20">
                  <div className="mb-6 flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                    {["Tous", "Télécoms", "FMCG", "Fintech", "Banque"].map((filter, i) => (
                      <span key={i} className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition-colors cursor-pointer ${i === 0 ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>
                        {filter}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { title: "MTN - Yello", cat: "Télécom", imgGrad: "from-[#FFCC00] to-[#FF9500]" },
                      { title: "Orange Money", cat: "Fintech", imgGrad: "from-[#FF6B35] to-[#E8650E]" },
                      { title: "Nescafé", cat: "FMCG", imgGrad: "from-red-600 to-red-900" },
                      { title: "Wave", cat: "Mobile Money", imgGrad: "from-sky-400 to-blue-600" },
                    ].map((card, i) => (
                      <div key={i} className="group cursor-pointer rounded-lg border border-border bg-background p-2 transition-all hover:shadow-lg hover:-translate-y-1">
                        <div className={`aspect-video w-full rounded-md bg-gradient-to-br ${card.imgGrad} relative overflow-hidden`}>
                          <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                          <div className="absolute bottom-2 right-2 h-6 w-6 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="h-3 w-3 text-white fill-current" />
                          </div>
                        </div>
                        <div className="mt-3 px-1">
                          <h4 className="font-semibold text-sm text-foreground">{card.title}</h4>
                          <span className="text-xs text-muted-foreground">{card.cat}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Badge */}
            <div className="absolute -right-8 top-1/2 -translate-y-1/2 glass-panel p-4 rounded-xl animate-float shadow-xl hidden xl:block">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Taux de clic</div>
                  <div className="text-sm font-bold text-foreground">+127%</div>
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
      title: "Ciblage Ultra-Précis",
      description: "Filtrez par pays, industrie, format ou objectif. Trouvez exactement ce que vous cherchez.",
      color: "text-primary",
      bg: "bg-primary/10"
    },
    {
      icon: Layers,
      title: "Bibliothèque Massive",
      description: "Plus de 10,000 campagnes archivées et mises à jour quotidiennement par nos équipes.",
      color: "text-blue-500",
      bg: "bg-blue-500/10"
    },
    {
      icon: Zap,
      title: "Analyse Instantanée",
      description: "Décortiquez les stratégies gagnantes. Comprenez pourquoi une campagne fonctionne.",
      color: "text-amber-500",
      bg: "bg-amber-500/10"
    }
  ]

  return (
    <section className="py-24 bg-muted/30 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,black_70%,transparent_100%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Pourquoi les meilleures agences utilisent <span className="gradient-text">Big Five</span> ?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Une suite d'outils conçue pour accélérer votre processus créatif et valider vos intuitions.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <div key={idx} className="glass-panel p-8 rounded-2xl hover:border-primary/30 transition-colors group">
              <div className={`h-12 w-12 rounded-xl ${feature.bg} ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
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
    <section className="py-24 overflow-hidden bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-16 items-center">
          <div className="lg:col-span-6 mb-12 lg:mb-0">
            <h2 className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-6">
              Une interface pensée pour la <span className="text-primary">vitesse</span>.
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
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
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-foreground/80 font-medium">{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-10">
              <Button variant="ghost" className="text-primary hover:text-primary/80 hover:bg-primary/5 p-0 font-semibold group">
                Explorer toutes les fonctionnalités
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </div>

          <div className="lg:col-span-6 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 blur-3xl rounded-full opacity-30 animate-pulse-glow" />
            <div className="relative glass-panel rounded-xl border border-border/50 shadow-2xl overflow-hidden group">
              <div className="aspect-[4/3] bg-muted relative">
                {/* Abstract UI representation */}
                <div className="absolute inset-0 bg-gradient-to-br from-card to-background p-6">
                  <div className="h-8 w-1/3 bg-muted-foreground/10 rounded mb-6 animate-pulse" />
                  <div className="grid grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(n => (
                      <div key={n} className="aspect-video bg-muted-foreground/5 rounded-lg border border-border/50" />
                    ))}
                  </div>
                </div>

                {/* Overlay CTA */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                  <Button className="rounded-full shadow-lg">Voir en action</Button>
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
    <section className="py-24 bg-[#0F172A] text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-50" />

      <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
        <span className="inline-block py-1 px-3 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold mb-6 animate-bounce">
          Offre Limitée
        </span>
        <h2 className="font-[family-name:var(--font-heading)] text-4xl font-bold mb-6">
          Commencez à créer des campagnes impactantes.
        </h2>
        <p className="text-slate-400 text-xl mb-10 max-w-2xl mx-auto">
          Rejoignez des centaines de créatifs qui utilisent Big Five Bootcamp pour élever leur niveau de jeu. Sans carte bancaire requise à l'inscription.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" className="h-14 px-8 text-lg bg-primary hover:bg-primary/90 text-white font-bold rounded-full shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:-translate-y-1" asChild>
            <Link href="/register">
              Essai Gratuit 30 Jours
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-white/20 text-white hover:bg-white/10 rounded-full" asChild>
            <Link href="/pricing">
              Voir les tarifs
            </Link>
          </Button>
        </div>

        <p className="mt-8 text-sm text-slate-500">
          Pas de carte requise • Annulation à tout moment • Support 24/7
        </p>
      </div>
    </section>
  )
}
