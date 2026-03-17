"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { ArrowRight, Play, Target, BarChart3, Search, CheckCircle, Zap, RefreshCw, Globe, Layers, Sparkles } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { getGoogleDriveImageUrl } from "@/lib/utils"

function useStats() {
  const [stats, setStats] = useState({ users: 0, campaigns: 0, brands: 0, countries: 0 })

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(() => setStats({ users: 0, campaigns: 0, brands: 0, countries: 0 }))
  }, [])

  return stats
}

function useRecentUsers() {
  const [recentUsers, setRecentUsers] = useState<{ initials: string }[]>([])

  useEffect(() => {
    fetch("/api/users/recent")
      .then((res) => res.json())
      .then((data) => setRecentUsers(data.users || []))
      .catch(() => setRecentUsers([]))
  }, [])

  return recentUsers
}

interface RecentCampaign {
  id: string
  title: string
  category: string | null
  thumbnail: string | null
  slug: string | null
}

function useRecentCampaigns() {
  const [campaigns, setCampaigns] = useState<RecentCampaign[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("campaigns")
      .select("id, title, category, thumbnail, slug")
      .eq("status", "Publié")
      .order("created_at", { ascending: false })
      .limit(4)
      .then(({ data }) => setCampaigns(data || []))
  }, [])

  return campaigns
}

function formatNumber(n: number): string {
  if (n >= 1000) {
    return new Intl.NumberFormat("fr-FR").format(n)
  }
  return n.toString()
}

export function HeroSection() {
  const stats = useStats()
  const recentUsers = useRecentUsers()
  const recentCampaigns = useRecentCampaigns()

  // Fallback si pas encore chargé
  const displayUsers = recentUsers.length > 0
    ? recentUsers
    : [{ initials: '...' }, { initials: '...' }, { initials: '...' }, { initials: '...' }]

  return (
    <section className="relative overflow-hidden bg-white pt-20 pb-32 sm:pt-32 sm:pb-40 lg:pb-48">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(208,228,242,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(208,228,242,0.3)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-24">

          {/* Text Content */}
          <div className="flex flex-col items-start text-left z-10">
            {/* Value Proposition Banner */}
            <div className="mb-6 w-full sm:w-auto animate-fade-in-up">
              <div className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#80368D]/15 to-[#80368D]/5 px-5 py-3 ring-2 ring-[#80368D]/20 shadow-lg shadow-[#80368D]/10">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#80368D] text-white">
                  <CheckCircle className="h-5 w-5" />
                </span>
                <span className="text-base font-bold text-[#1A1F2B]">
                  La plus grande bibliothèque créative africaine
                </span>
              </div>
            </div>

            <div className="mb-8 flex flex-wrap items-center gap-3 animate-fade-in-up">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#80368D]/10 px-4 py-1.5 text-xs font-semibold text-[#80368D] ring-1 ring-[#80368D]/20 hover-lift cursor-default">
                <Sparkles className="h-3.5 w-3.5" />
                Nouveau: Version 2.0
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#D0E4F2] px-4 py-1.5 text-xs font-semibold text-[#1A1F2B] ring-1 ring-[#D0E4F2] hover-lift cursor-default">
                <Globe className="h-3.5 w-3.5 text-[#29358B]" />
                {stats.countries > 0 ? `${stats.countries}+` : '...'} Pays Africains
              </span>
            </div>

            <h1 className="font-[family-name:var(--font-heading)] text-5xl font-extrabold tracking-tight text-[#1A1F2B] sm:text-6xl lg:text-7xl leading-[1.1] animate-fade-in-up delay-100">
              L'inspiration <br />
              <span className="gradient-text relative inline-block">
                créative
                <span className="absolute -bottom-2 left-0 w-full h-2 bg-[#80368D]/20 -rotate-1 rounded-full blur-sm"></span>
              </span> <br />
              sans limites.
            </h1>

            <p className="mt-8 max-w-xl text-lg text-[#1A1F2B]/70 leading-relaxed animate-fade-in-up delay-200">
              Accédez à la plus grande bibliothèque de campagnes marketing réelles en Afrique. Analysez, benchmarkez et créez des concepts gagnants en quelques minutes.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row animate-fade-in-up delay-300 w-full sm:w-auto">
              <Button size="lg" asChild className="group h-14 px-8 text-base font-bold bg-[#80368D] hover:bg-[#80368D]/90 text-white shadow-xl shadow-[#80368D]/20 transition-all duration-300 hover:scale-[1.02]">
                <Link href="/pricing">
                  Commencer gratuitement
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="group h-14 px-8 text-base font-semibold border-[#D0E4F2] bg-white text-[#1A1F2B] hover:bg-[#D0E4F2]/50 hover:border-[#D0E4F2] transition-all duration-300">
                <Link href="/dashboard">
                  <Play className="mr-2 h-5 w-5 fill-current text-[#80368D] opacity-80" />
                  Voir la démo
                </Link>
              </Button>
            </div>

            {/* Price info below buttons */}
            <p className="mt-4 text-sm text-[#1A1F2B]/60 animate-fade-in-up delay-300">
              À partir de <span className="font-semibold text-foreground">4 900 XOF/mois</span> — Accès illimité
            </p>

            <div className="mt-10 flex items-center gap-6 animate-fade-in-up delay-400">
              <div className="flex -space-x-3">
                {displayUsers.map((user, i) => (
                  <div key={i} className={`h-10 w-10 rounded-full border-2 border-background bg-gradient-to-br from-[#80368D]/20 to-[#29358B]/20 z-${10 - i} flex items-center justify-center text-xs font-bold text-[#80368D]`}>
                    {user.initials}
                  </div>
                ))}
              </div>
              <div className="flex flex-col">
                <div className="flex gap-1 text-[#F2B33D]">
                  {"★★★★★"}
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  Approuvé par <span className="text-foreground font-bold">{stats.users > 0 ? `${formatNumber(stats.users)}+` : '...'}</span> marketeurs
                </span>
              </div>
            </div>
          </div>

          {/* Visual Content - Floating Interface */}
          <div className="relative animate-slide-in-right delay-200 hidden lg:block perspective-1000">
            {/* Subtle decorative elements */}
            <div className="absolute -top-12 -right-12 h-64 w-64 bg-[#D0E4F2]/50 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-8 -left-8 h-48 w-48 bg-[#F2B33D]/10 rounded-full blur-3xl"></div>

            <div className="glass-panel rounded-2xl p-4 transform rotate-y-[-5deg] rotate-x-[5deg] transition-transform duration-500 hover:rotate-0 hover:scale-[1.02]">
              <div className="rounded-xl bg-white border border-[#D0E4F2] shadow-2xl overflow-hidden">
                {/* Window Header */}
                <div className="flex items-center justify-between border-b border-[#D0E4F2] bg-[#D0E4F2]/30 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-[#EF4444]" />
                    <div className="h-3 w-3 rounded-full bg-[#F2B33D]" />
                    <div className="h-3 w-3 rounded-full bg-[#10B981]" />
                  </div>
                  <div className="flex-1 text-center">
                    <div className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-1 text-xs font-medium text-[#1A1F2B]/70 border border-[#D0E4F2] shadow-sm">
                      <Search className="h-3 w-3" />
                      bigfive-Creative Library.com
                    </div>
                  </div>
                  <div className="w-12"></div>
                </div>

                {/* Dashboard Preview Content */}
                <div className="p-6 bg-white">
                  <div className="mb-6 flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                    {["Tous", "Télécoms", "FMCG", "Fintech", "Banque"].map((filter, i) => (
                      <span key={i} className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition-colors cursor-pointer ${i === 0 ? 'bg-[#80368D] text-white shadow-lg shadow-[#80368D]/25' : 'bg-[#D0E4F2] text-[#1A1F2B] hover:bg-[#D0E4F2]/80'}`}>
                        {filter}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {recentCampaigns.length > 0
                      ? recentCampaigns.map((campaign) => (
                        <Link key={campaign.id} href={`/content/${campaign.slug || campaign.id}`} className="group cursor-pointer rounded-lg border border-[#D0E4F2] bg-white p-2 transition-all hover:shadow-lg hover:-translate-y-1">
                          <div className="aspect-video w-full rounded-md bg-[#D0E4F2] relative overflow-hidden">
                            {campaign.thumbnail ? (
                              <Image
                                src={getGoogleDriveImageUrl(campaign.thumbnail)}
                                alt={campaign.title}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="absolute inset-0 bg-gradient-to-br from-[#80368D]/30 to-[#29358B]/30 flex items-center justify-center text-white/80 text-xs font-bold">
                                {campaign.title.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                            <div className="absolute bottom-2 right-2 h-6 w-6 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Play className="h-3 w-3 text-white fill-current" />
                            </div>
                          </div>
                          <div className="mt-3 px-1">
                            <h4 className="font-semibold text-sm text-[#1A1F2B] line-clamp-1">{campaign.title}</h4>
                            <span className="text-xs text-[#1A1F2B]/60">{campaign.category || "Campagne"}</span>
                          </div>
                        </Link>
                      ))
                      : /* Skeleton placeholders while loading */
                      Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="rounded-lg border border-[#D0E4F2] bg-white p-2">
                          <div className="aspect-video w-full rounded-md skeleton-shimmer" />
                          <div className="mt-3 px-1 space-y-1.5">
                            <div className="skeleton-line h-4 w-3/4 rounded" />
                            <div className="skeleton-line h-3 w-1/2 rounded" />
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Badge */}
            <div className="absolute -right-8 top-1/2 -translate-y-1/2 bg-white p-4 rounded-xl shadow-xl border border-[#D0E4F2] animate-float hidden xl:block">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-[#1A1F2B]/60">Taux de clic</div>
                  <div className="text-sm font-bold text-[#1A1F2B]">+127%</div>
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
  const stats = useStats()

  const features = [
    {
      icon: Target,
      title: "Ciblage Ultra-Précis",
      description: "Filtrez par pays, industrie, format ou objectif. Trouvez exactement ce que vous cherchez.",
      color: "text-[#80368D]",
      bg: "bg-[#80368D]/10"
    },
    {
      icon: Layers,
      title: "Bibliothèque Massive",
      description: stats.campaigns > 0
        ? `Plus de ${formatNumber(stats.campaigns)} campagnes archivées et mises à jour quotidiennement par nos équipes.`
        : "Des campagnes archivées et mises à jour quotidiennement par nos équipes.",
      color: "text-[#29358B]",
      bg: "bg-[#29358B]/10"
    },
    {
      icon: Zap,
      title: "Analyse Instantanée",
      description: "Décortiquez les stratégies gagnantes. Comprenez pourquoi une campagne fonctionne.",
      color: "text-[#F2B33D]",
      bg: "bg-[#F2B33D]/20"
    }
  ]

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
    <section className="py-16 sm:py-20 bg-[#D0E4F2]/30 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(208,228,242,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(208,228,242,0.3)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative z-10">
        {/* Pricing teaser */}
        <div className="mb-5 inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-[#80368D]/15 to-[#80368D]/5 px-5 py-2.5 ring-2 ring-[#80368D]/20 shadow-lg">
          <span className="text-base font-bold text-[#1A1F2B]">
            À partir de 4 900 XOF/mois
          </span>
        </div>

        <h2 id="samer" className="font-[family-name:var(--font-heading)] text-3xl sm:text-4xl font-bold mb-4 text-[#1A1F2B] mb">
          Commencez à créer des campagnes impactantes.
        </h2>
        <p id="lagross" className="text-[#1A1F2B]/70 text-lg sm:text-xl mb-8 max-w-2xl mx-auto">
          Rejoignez des centaines de créatifs qui utilisent Big Five Creative Library pour élever leur niveau de jeu. Sans carte bancaire requise à l'inscription.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
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

        <p className="mt-5 text-sm text-[#1A1F2B]/50">
        </p>
      </div>
    </section>
  )
}
