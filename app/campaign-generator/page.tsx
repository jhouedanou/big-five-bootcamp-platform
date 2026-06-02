"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { useAuthContext } from "@/components/auth-provider"
import { useRequireActiveSubscription } from "@/hooks/use-require-active-subscription"
import {
  getGeneratorSources,
  generateCampaignFromSources,
  type GeneratorSources,
  type SourceCampaign,
} from "@/app/actions/campaign-generator"
import type { GeneratedCampaign } from "@/lib/campaign-generator"

type GeneratedCampaignWithSource = GeneratedCampaign & { source: "groq" | "heuristic" }
import { toast } from "sonner"
import {
  Sparkles,
  Wand2,
  Copy,
  Check,
  Heart,
  FolderOpen,
  Loader2,
  Lock,
  ArrowRight,
} from "lucide-react"

const OBJECTIVES = [
  { value: "notoriete", label: "Notoriété — se faire connaître" },
  { value: "lancement", label: "Lancement de produit" },
  { value: "conversion", label: "Conversion / ventes" },
  { value: "engagement", label: "Engagement communauté" },
  { value: "trafic", label: "Trafic (site / point de vente)" },
  { value: "fidelisation", label: "Fidélisation" },
]

const CHANNELS = [
  "Instagram",
  "TikTok",
  "Facebook",
  "LinkedIn",
  "YouTube",
  "Affichage urbain",
  "TV",
  "Email",
]

const TONES = [
  { value: "inspirant", label: "Inspirant" },
  { value: "audacieux", label: "Audacieux" },
  { value: "premium", label: "Premium / élégant" },
  { value: "proche", label: "Proche / authentique" },
  { value: "ludique", label: "Ludique" },
]

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          toast.success("Copié dans le presse-papier")
          setTimeout(() => setCopied(false), 1800)
        } catch {
          toast.error("Impossible de copier")
        }
      }}
      className="gap-1.5"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {label}
    </Button>
  )
}

function CampaignGeneratorContent() {
  const { checking: subChecking, locked: subLocked } = useRequireActiveSubscription()
  const { isAuthenticated } = useAuthContext()

  const [sources, setSources] = useState<GeneratorSources | null>(null)
  const [loadingSources, setLoadingSources] = useState(true)
  const [sourceKey, setSourceKey] = useState<string>("favorites")

  const [brand, setBrand] = useState("")
  const [product, setProduct] = useState("")
  const [objective, setObjective] = useState("notoriete")
  const [channel, setChannel] = useState("Instagram")
  const [audience, setAudience] = useState("")
  const [tone, setTone] = useState("inspirant")

  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<GeneratedCampaignWithSource | null>(null)

  useEffect(() => {
    if (subChecking || subLocked || !isAuthenticated) return
    let cancelled = false
    ;(async () => {
      setLoadingSources(true)
      try {
        const data = await getGeneratorSources()
        if (!cancelled) setSources(data)
      } finally {
        if (!cancelled) setLoadingSources(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [subChecking, subLocked, isAuthenticated])

  const selectedCampaigns: SourceCampaign[] = useMemo(() => {
    if (!sources) return []
    if (sourceKey === "favorites") return sources.favorites
    const col = sources.collections.find((c) => c.id === sourceKey)
    if (!col) return []
    const byId = new Map(sources.favorites.map((f) => [f.id, f]))
    // Les campagnes d'une collection peuvent ne pas être dans les favoris :
    // on affiche au moins celles connues ; le serveur valide le périmètre complet.
    return col.campaignIds.map((id) => byId.get(id)).filter((c): c is SourceCampaign => !!c)
  }, [sources, sourceKey])

  const selectedIds = useMemo(() => {
    if (!sources) return []
    if (sourceKey === "favorites") return sources.favorites.map((f) => f.id)
    return sources.collections.find((c) => c.id === sourceKey)?.campaignIds ?? []
  }, [sources, sourceKey])

  const handleGenerate = async () => {
    if (selectedIds.length === 0) {
      toast.error("Ajoutez d'abord des campagnes à vos favoris ou collections.")
      return
    }
    setGenerating(true)
    setResult(null)
    try {
      const res = await generateCampaignFromSources({
        campaignIds: selectedIds,
        brief: { brand, product, objective, channel, audience, tone },
      })
      if (res.success) {
        setResult(res.data)
        toast.success(
          res.data.source === "groq"
            ? "Campagne générée par IA"
            : "Campagne générée",
        )
      } else {
        toast.error(res.error)
      }
    } catch {
      toast.error("Erreur lors de la génération")
    } finally {
      setGenerating(false)
    }
  }

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="flex min-h-screen flex-col bg-[#F4F8FB] dark:bg-[#0F0F0F]">
      {isAuthenticated ? <DashboardNavbar /> : <Navbar />}
      <main className="container mx-auto max-w-6xl flex-1 px-4 pb-16 pt-8">{children}</main>
      <Footer />
    </div>
  )

  if (subChecking || subLocked) {
    return (
      <Shell>
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#F2B33D]" />
        </div>
      </Shell>
    )
  }

  if (!isAuthenticated) {
    return (
      <Shell>
        <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
          <Lock className="h-10 w-10 text-[#F2B33D]" />
          <h1 className="mt-4 text-2xl font-bold">Connexion requise</h1>
          <p className="mt-2 text-muted-foreground">Connectez-vous pour utiliser le générateur de campagnes.</p>
          <Button asChild className="mt-6 bg-[#F2B33D] text-white hover:bg-[#F2B33D]/90">
            <Link href="/login?redirect=/campaign-generator">Se connecter</Link>
          </Button>
        </div>
      </Shell>
    )
  }

  if (sources?.locked) {
    return (
      <Shell>
        <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-amber-300/60 bg-white p-8 text-center shadow-lg dark:bg-[#1a1a1a]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <Sparkles className="h-6 w-6 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold">Générateur de campagnes</h1>
          <p className="mt-3 text-muted-foreground">
            Disponible avec un abonnement <strong>Basic</strong> ou <strong>Pro</strong>. Sauvegardez vos
            campagnes préférées et transformez-les en idées prêtes à diffuser.
          </p>
          <Button asChild className="mt-6 bg-[#F2B33D] text-white hover:bg-[#F2B33D]/90">
            <Link href="/subscribe?plan=basic">Passer à Basic</Link>
          </Button>
        </div>
      </Shell>
    )
  }

  const noSources = !loadingSources && (sources?.favorites.length ?? 0) === 0 && (sources?.collections.length ?? 0) === 0

  return (
    <Shell>
      <header className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#F2B33D]/15 px-3 py-1 text-sm font-semibold text-[#0F0F0F] ring-1 ring-[#F2B33D]/30 dark:text-white">
          <Sparkles className="h-4 w-4 text-[#F2B33D]" />
          Générateur de campagnes
        </div>
        <h1 className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-extrabold tracking-tight sm:text-4xl">
          De vos favoris à votre campagne
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          On analyse les campagnes que vous avez sauvegardées, on croise avec votre brief, et on vous
          propose un texte de campagne + une intention visuelle à coller dans un générateur d'images.
        </p>
      </header>

      {noSources ? (
        <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-dashed border-[#F2B33D]/40 bg-white p-8 text-center dark:bg-[#1a1a1a]">
          <Heart className="mx-auto h-10 w-10 text-[#F2B33D]" />
          <h2 className="mt-4 text-xl font-bold">Commencez par sauvegarder des campagnes</h2>
          <p className="mt-2 text-muted-foreground">
            Ajoutez des campagnes à vos favoris ou à une collection : elles serviront de matière
            première au générateur.
          </p>
          <Button asChild className="mt-6 bg-[#F2B33D] text-white hover:bg-[#F2B33D]/90">
            <Link href="/dashboard">
              Explorer la bibliothèque <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* Formulaire */}
          <div className="space-y-5 rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
            <div>
              <label className="mb-1.5 block text-sm font-semibold">Source d'inspiration</label>
              <select
                value={sourceKey}
                onChange={(e) => setSourceKey(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="favorites">Tous mes favoris ({sources?.favorites.length ?? 0})</option>
                {sources?.collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    Collection : {c.name} ({c.campaignIds.length})
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {selectedIds.length} campagne(s) analysée(s)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-semibold">Marque</label>
                <input
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Votre marque"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold">Produit (option.)</label>
                <input
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  placeholder="Produit / service"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold">Objectif</label>
              <select
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                {OBJECTIVES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold">Canal de diffusion</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold">Audience cible</label>
              <input
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="Ex. jeunes urbains 18-30 ans"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold">Ton</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                {TONES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generating || loadingSources || selectedIds.length === 0}
              className="w-full gap-2 bg-[#F2B33D] text-white hover:bg-[#F2B33D]/90"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              Générer ma campagne
            </Button>

            {selectedCampaigns.length > 0 && (
              <div className="border-t border-black/5 pt-4 dark:border-white/10">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Basé sur
                </p>
                <ul className="space-y-1.5">
                  {selectedCampaigns.slice(0, 6).map((c) => (
                    <li key={c.id} className="flex items-center gap-2 text-sm">
                      <span className="line-clamp-1">{c.title || "Campagne"}</span>
                      {c.brand && (
                        <span className="shrink-0 text-xs text-muted-foreground">· {c.brand}</span>
                      )}
                    </li>
                  ))}
                  {selectedCampaigns.length > 6 && (
                    <li className="text-xs text-muted-foreground">
                      +{selectedCampaigns.length - 6} autre(s)
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Résultats */}
          <div className="space-y-6">
            {!result && !generating && (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-black/10 bg-white/50 p-8 text-center dark:border-white/10 dark:bg-white/5">
                <Sparkles className="h-10 w-10 text-[#F2B33D]/70" />
                <p className="mt-3 max-w-sm text-muted-foreground">
                  Remplissez le brief à gauche puis cliquez sur « Générer ma campagne ».
                </p>
              </div>
            )}

            {generating && (
              <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-[#1a1a1a]">
                <Loader2 className="h-8 w-8 animate-spin text-[#F2B33D]" />
              </div>
            )}

            {result && (
              <>
                {result.insights.topKeywords.length > 0 && (
                  <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                      Ce qu'on a repéré dans vos favoris
                    </h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {result.insights.topKeywords.slice(0, 10).map((k) => (
                        <span
                          key={k}
                          className="rounded-full bg-[#F2B33D]/10 px-3 py-1 text-xs font-medium text-[#0F0F0F] ring-1 ring-[#F2B33D]/20 dark:text-white"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                    {(result.insights.topAxes.length > 0 || result.insights.topPlatforms.length > 0) && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        {result.insights.topAxes.length > 0 && (
                          <>Axes : {result.insights.topAxes.join(", ")}. </>
                        )}
                        {result.insights.topPlatforms.length > 0 && (
                          <>Plateformes : {result.insights.topPlatforms.join(", ")}.</>
                        )}
                      </p>
                    )}
                  </div>
                )}

                <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold">Texte de campagne</h3>
                      <span
                        className={
                          result.source === "groq"
                            ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-500/30 dark:text-emerald-300"
                            : "rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 ring-1 ring-slate-500/30 dark:text-slate-300"
                        }
                        title={
                          result.source === "groq"
                            ? "Généré par Llama 3.3 70B via Groq"
                            : "Généré par moteur heuristique local (fallback)"
                        }
                      >
                        {result.source === "groq" ? "IA" : "Heuristique"}
                      </span>
                    </div>
                    <CopyButton text={result.campaignText} label="Copier" />
                  </div>
                  <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-foreground">
                    {result.campaignText}
                  </pre>
                </div>

                <div className="rounded-2xl border border-[#F2B33D]/30 bg-[#F2B33D]/5 p-5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-bold">Intention visuelle</h3>
                    <CopyButton text={result.visualIntent} label="Copier le prompt" />
                  </div>
                  <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-foreground">
                    {result.visualIntent}
                  </pre>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Shell>
  )
}

export default function CampaignGeneratorPage() {
  return <CampaignGeneratorContent />
}
