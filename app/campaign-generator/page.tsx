"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { useAuthContext } from "@/components/auth-provider"
import { useRequireActiveSubscription } from "@/hooks/use-require-active-subscription"
import { getGoogleDriveImageUrl } from "@/lib/utils"
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
  ChevronLeft,
  ChevronRight,
  ImageOff,
  Images,
  RotateCcw,
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

const STEPS = [
  { n: 1, label: "Sources" },
  { n: 2, label: "Brief" },
  { n: 3, label: "Génération" },
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

/**
 * Layout de page. Défini au niveau module (PAS dans le composant) sinon il
 * est recréé à chaque render → React démonte/remonte l'arbre → les inputs
 * perdent le focus à chaque frappe.
 */
function Shell({
  isAuthenticated,
  children,
}: {
  isAuthenticated: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#F4F8FB] dark:bg-[#0F0F0F]">
      {isAuthenticated ? <DashboardNavbar /> : <Navbar />}
      <main className="container mx-auto max-w-6xl flex-1 px-4 pb-16 pt-8">{children}</main>
      <Footer />
    </div>
  )
}

/** Vignette cliquable d'une campagne avec état sélectionné. */
function ThumbCard({
  campaign,
  selected,
  onToggle,
}: {
  campaign: SourceCampaign
  selected: boolean
  onToggle: () => void
}) {
  const [imgError, setImgError] = useState(false)
  const src = campaign.thumbnail ? getGoogleDriveImageUrl(campaign.thumbnail) : null
  return (
    <button
      type="button"
      onClick={onToggle}
      title={campaign.title || "Campagne"}
      className={`group relative overflow-hidden rounded-xl border text-left transition-all ${
        selected
          ? "border-[#F2B33D] ring-2 ring-[#F2B33D]/40"
          : "border-black/10 hover:border-[#F2B33D]/50 dark:border-white/10"
      }`}
    >
      <div className="relative aspect-square w-full bg-slate-100 dark:bg-white/5">
        {src && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={campaign.title || "Campagne"}
            loading="lazy"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300 dark:text-white/20">
            <ImageOff className="h-7 w-7" />
          </div>
        )}
        {/* Voile + check si sélectionné */}
        <div
          className={`absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all ${
            selected
              ? "border-white bg-[#F2B33D] text-white"
              : "border-white/80 bg-black/20 text-transparent group-hover:bg-black/30"
          }`}
        >
          <Check className="h-3.5 w-3.5" />
        </div>
      </div>
      <div className="p-2">
        <p className="line-clamp-1 text-xs font-medium text-foreground">
          {campaign.title || "Campagne"}
        </p>
        {campaign.brand && (
          <p className="line-clamp-1 text-[11px] text-muted-foreground">{campaign.brand}</p>
        )}
      </div>
    </button>
  )
}

/** Section de vignettes (Favoris ou une collection) avec bouton tout/aucun. */
function ThumbSection({
  icon,
  title,
  campaigns,
  selectedIds,
  onToggleId,
  onToggleAll,
}: {
  icon: React.ReactNode
  title: string
  campaigns: SourceCampaign[]
  selectedIds: Set<string>
  onToggleId: (id: string) => void
  onToggleAll: (selected: boolean) => void
}) {
  const selectedCount = campaigns.filter((c) => selectedIds.has(c.id)).length
  const allSelected = selectedCount === campaigns.length && campaigns.length > 0
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">
          {selectedCount}/{campaigns.length}
        </span>
        <button
          type="button"
          onClick={() => onToggleAll(!allSelected)}
          className="ml-auto text-xs font-medium text-[#F2B33D] hover:underline"
        >
          {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
        {campaigns.map((c) => (
          <ThumbCard
            key={c.id}
            campaign={c}
            selected={selectedIds.has(c.id)}
            onToggle={() => onToggleId(c.id)}
          />
        ))}
      </div>
    </div>
  )
}

/** En-tête d'étapes (stepper) cliquable. */
function Stepper({
  step,
  onGo,
  canGo,
}: {
  step: number
  onGo: (n: number) => void
  canGo: (n: number) => boolean
}) {
  return (
    <div className="mb-6 flex items-center gap-2">
      {STEPS.map((s, i) => {
        const active = s.n === step
        const done = s.n < step
        const reachable = canGo(s.n)
        return (
          <div key={s.n} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              disabled={!reachable}
              onClick={() => reachable && onGo(s.n)}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                active
                  ? "bg-[#F2B33D] text-white"
                  : done
                    ? "bg-[#F2B33D]/15 text-[#0F0F0F] dark:text-white"
                    : "bg-black/5 text-muted-foreground dark:bg-white/5"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                  active || done ? "bg-white/30" : "bg-black/10 dark:bg-white/10"
                }`}
              >
                {done ? <Check className="h-3 w-3" /> : s.n}
              </span>
              {s.label}
            </button>
            {i < STEPS.length - 1 && (
              <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
            )}
          </div>
        )
      })}
    </div>
  )
}

function CampaignGeneratorContent() {
  const { checking: subChecking, locked: subLocked } = useRequireActiveSubscription()
  const { isAuthenticated } = useAuthContext()

  const [sources, setSources] = useState<GeneratorSources | null>(null)
  const [loadingSources, setLoadingSources] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [step, setStep] = useState(1)

  const [brand, setBrand] = useState("")
  const [product, setProduct] = useState("")
  const [description, setDescription] = useState("")
  const [objective, setObjective] = useState("notoriete")
  const [channel, setChannel] = useState("Instagram")
  const [audience, setAudience] = useState("")
  const [tone, setTone] = useState("inspirant")
  const [useVisuals, setUseVisuals] = useState(false)

  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<GeneratedCampaignWithSource | null>(null)

  useEffect(() => {
    if (subChecking || subLocked || !isAuthenticated) return
    let cancelled = false
    ;(async () => {
      setLoadingSources(true)
      try {
        const data = await getGeneratorSources()
        if (!cancelled) {
          setSources(data)
          setSelectedIds(new Set(data.favorites.map((f) => f.id)))
        }
      } finally {
        if (!cancelled) setLoadingSources(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [subChecking, subLocked, isAuthenticated])

  const cardById = useMemo(() => {
    const m = new Map<string, SourceCampaign>()
    if (sources) for (const c of sources.campaigns) m.set(c.id, c)
    return m
  }, [sources])

  const selectedCampaigns: SourceCampaign[] = useMemo(() => {
    if (!sources) return []
    const seen = new Set<string>()
    const ordered: SourceCampaign[] = []
    const push = (id: string) => {
      if (selectedIds.has(id) && !seen.has(id)) {
        const c = cardById.get(id)
        if (c) {
          seen.add(id)
          ordered.push(c)
        }
      }
    }
    sources.favorites.forEach((f) => push(f.id))
    sources.collections.forEach((col) => col.campaignIds.forEach(push))
    return ordered
  }, [sources, selectedIds, cardById])

  const toggleId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const setManySelected = (ids: string[], selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const id of ids) {
        if (!cardById.has(id)) continue
        selected ? next.add(id) : next.delete(id)
      }
      return next
    })
  }

  // Une étape est atteignable si toutes les précédentes sont valides.
  const canGo = (n: number) => {
    if (n <= 1) return true
    if (selectedIds.size === 0) return false // étape 1 requise pour 2 et 3
    return true
  }

  const handleGenerate = async () => {
    if (selectedIds.size === 0) {
      toast.error("Sélectionnez au moins une campagne.")
      return
    }
    setGenerating(true)
    setResult(null)
    try {
      const res = await generateCampaignFromSources({
        campaignIds: Array.from(selectedIds),
        brief: { brand, product, description, objective, channel, audience, tone },
        useVisuals,
      })
      if (res.success) {
        setResult(res.data)
        toast.success(
          res.data.source === "groq" ? "Campagne générée par IA" : "Campagne générée",
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

  if (subChecking || subLocked) {
    return (
      <Shell isAuthenticated={isAuthenticated}>
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#F2B33D]" />
        </div>
      </Shell>
    )
  }

  if (!isAuthenticated) {
    return (
      <Shell isAuthenticated={isAuthenticated}>
        <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
          <Lock className="h-10 w-10 text-[#F2B33D]" />
          <h1 className="mt-4 text-2xl font-bold">Connexion requise</h1>
          <p className="mt-2 text-muted-foreground">
            Connectez-vous pour utiliser le générateur de campagnes.
          </p>
          <Button asChild className="mt-6 bg-[#F2B33D] text-white hover:bg-[#F2B33D]/90">
            <Link href="/login?redirect=/campaign-generator">Se connecter</Link>
          </Button>
        </div>
      </Shell>
    )
  }

  if (sources?.locked) {
    return (
      <Shell isAuthenticated={isAuthenticated}>
        <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-amber-300/60 bg-white p-8 text-center shadow-lg dark:bg-[#1a1a1a]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <Sparkles className="h-6 w-6 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold">Générateur de campagnes</h1>
          <p className="mt-3 text-muted-foreground">
            Disponible avec un abonnement <strong>Basic</strong> ou <strong>Pro</strong>.
            Sauvegardez vos campagnes préférées et transformez-les en idées prêtes à diffuser.
          </p>
          <Button asChild className="mt-6 bg-[#F2B33D] text-white hover:bg-[#F2B33D]/90">
            <Link href="/subscribe?plan=basic">Passer à Basic</Link>
          </Button>
        </div>
      </Shell>
    )
  }

  const noSources =
    !loadingSources &&
    (sources?.favorites.length ?? 0) === 0 &&
    (sources?.collections.length ?? 0) === 0

  return (
    <Shell isAuthenticated={isAuthenticated}>
      <header className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#F2B33D]/15 px-3 py-1 text-sm font-semibold text-[#0F0F0F] ring-1 ring-[#F2B33D]/30 dark:text-white">
          <Sparkles className="h-4 w-4 text-[#F2B33D]" />
          Générateur de campagnes
        </div>
        <h1 className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-extrabold tracking-tight sm:text-4xl">
          De vos favoris à votre campagne
        </h1>
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
      ) : result ? (
        /* ---------- Résultat ---------- */
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Votre campagne</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setResult(null); setStep(2) }}>
                Modifier le brief
              </Button>
              <Button
                className="gap-1.5 bg-[#F2B33D] text-white hover:bg-[#F2B33D]/90"
                onClick={() => { setResult(null); setStep(1) }}
              >
                <RotateCcw className="h-4 w-4" /> Nouvelle génération
              </Button>
            </div>
          </div>

          {result.insights.topKeywords.length > 0 && (
            <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
              <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Ce qu'on a repéré dans vos sources
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
                      ? "Généré par IA via Groq"
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
        </div>
      ) : (
        /* ---------- Wizard ---------- */
        <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a] sm:p-6">
          <Stepper step={step} onGo={setStep} canGo={canGo} />

          {/* Étape 1 — Sources (vignettes) */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold">Choisissez vos sources d'inspiration</h2>
                <p className="text-sm text-muted-foreground">
                  Cliquez sur les visuels des campagnes à analyser (favoris et collections).
                </p>
              </div>
              {loadingSources ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-[#F2B33D]" />
                </div>
              ) : (
                <div className="space-y-8">
                  {(sources?.favorites.length ?? 0) > 0 && (
                    <ThumbSection
                      icon={<Heart className="h-4 w-4 text-[#F2B33D]" />}
                      title="Favoris"
                      campaigns={sources!.favorites}
                      selectedIds={selectedIds}
                      onToggleId={toggleId}
                      onToggleAll={(sel) =>
                        setManySelected(sources!.favorites.map((f) => f.id), sel)
                      }
                    />
                  )}
                  {sources?.collections.map((col) => {
                    const cards = col.campaignIds
                      .map((id) => cardById.get(id))
                      .filter((c): c is SourceCampaign => !!c)
                    if (cards.length === 0) return null
                    return (
                      <ThumbSection
                        key={col.id}
                        icon={<FolderOpen className="h-4 w-4 text-[#F2B33D]" />}
                        title={col.name}
                        campaigns={cards}
                        selectedIds={selectedIds}
                        onToggleId={toggleId}
                        onToggleAll={(sel) => setManySelected(cards.map((c) => c.id), sel)}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Étape 2 — Brief */}
          {step === 2 && (
            <div className="max-w-2xl space-y-5">
              <div>
                <h2 className="text-lg font-bold">Votre brief</h2>
                <p className="text-sm text-muted-foreground">
                  Décrivez votre marque et votre objectif pour orienter la génération.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
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
                <label className="mb-1.5 block text-sm font-semibold">
                  Description de la marque / du service
                </label>
                <p className="mb-1.5 text-xs text-muted-foreground">
                  Positionnement, valeurs, ce qui vous distingue. Utilisé dans l'analyse envoyée au modèle.
                </p>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Ex. Marque de cosmétiques naturels made in Côte d'Ivoire, positionnée premium, valeurs : authenticité, durabilité…"
                  className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
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
              </div>
            </div>
          )}

          {/* Étape 3 — Génération */}
          {step === 3 && (
            <div className="max-w-2xl space-y-5">
              <div>
                <h2 className="text-lg font-bold">Prêt à générer</h2>
                <p className="text-sm text-muted-foreground">
                  Vérifiez le récapitulatif puis lancez la génération.
                </p>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-input bg-background p-4">
                <input
                  type="checkbox"
                  checked={useVisuals}
                  onChange={(e) => setUseVisuals(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-input"
                />
                <span className="flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    <Images className="h-4 w-4 text-[#F2B33D]" />
                    Analyser aussi le visuel
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Envoie le visuel de la 1re campagne sélectionnée au modèle (vision) pour une
                    intention visuelle plus ancrée. Génération un peu plus lente.
                  </span>
                </span>
              </label>

              <div className="rounded-xl border border-black/5 bg-black/[0.02] p-4 text-sm dark:border-white/10 dark:bg-white/5">
                <p>
                  <span className="font-semibold">{selectedIds.size}</span> campagne(s)
                  sélectionnée(s)
                </p>
                <p className="mt-1 text-muted-foreground">
                  {brand || "Marque non renseignée"}
                  {product ? ` · ${product}` : ""} · {channel} ·{" "}
                  {TONES.find((t) => t.value === tone)?.label}
                </p>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={generating || selectedIds.size === 0}
                className="w-full gap-2 bg-[#F2B33D] text-white hover:bg-[#F2B33D]/90"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                Générer ma campagne
              </Button>
            </div>
          )}

          {/* Navigation wizard */}
          <div className="mt-8 flex items-center justify-between border-t border-black/5 pt-5 dark:border-white/10">
            <Button
              variant="outline"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
              className="gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" /> Précédent
            </Button>
            <span className="text-xs text-muted-foreground">
              {step === 1 && `${selectedIds.size} sélectionnée(s)`}
            </span>
            {step < 3 ? (
              <Button
                onClick={() => setStep((s) => Math.min(3, s + 1))}
                disabled={step === 1 && selectedIds.size === 0}
                className="gap-1.5 bg-[#F2B33D] text-white hover:bg-[#F2B33D]/90"
              >
                Suivant <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <span />
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
