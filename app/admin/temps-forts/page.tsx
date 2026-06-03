"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { useAdmin } from "../AdminContext"
import { getTempsFortStatus } from "@/lib/temps-forts"
import {
  useTempsForts,
  invalidateTempsFortsCache,
  fetchTempsForts,
} from "@/components/temps-forts/use-temps-forts"
import {
  useTempsFortsOverrides,
  invalidateTempsFortsOverridesCache,
} from "@/components/temps-forts/use-temps-forts-overrides"
import type { TempsFortsOverrides } from "@/app/api/temps-forts/settings/route"
import type { TempsFort } from "@/types/temps-fort"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ImageUpload } from "@/components/ui/image-upload"
import { toast } from "sonner"
import {
  ArrowRight,
  CalendarHeart,
  ExternalLink,
  ListChecks,
  Loader2,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react"

const DEFAULT_OVERRIDES: TempsFortsOverrides = {
  bannerSlug: null,
  popupSlug: null,
  bannerEnabled: true,
  popupEnabled: true,
  version: 1,
}

type FormState = Partial<TempsFort> & { sortOrder?: number }
type TempsFortOptionKey = "tags" | "sectors" | "axes" | "countries" | "formats" | "platforms"

const EMPTY_FORM: FormState = {
  slug: "",
  title: "",
  shortTitle: "",
  description: "",
  imageUrl: "",
  heroImageUrl: "",
  dateActivation: "",
  eventDate: "",
  endDate: "",
  isActive: true,
  category: "",
  campaignCount: 0,
  tags: [],
  sectors: [],
  axes: [],
  countries: [],
  formats: [],
  platforms: [],
  featured: false,
  popupEnabled: false,
  ctaLabel: "",
  sortOrder: 0,
}

const CHECKBOX_GROUPS: Array<{
  key: TempsFortOptionKey
  label: string
  emptyLabel: string
}> = [
  { key: "tags", label: "Tags", emptyLabel: "Aucun tag disponible dans les campagnes." },
  { key: "sectors", label: "Secteurs", emptyLabel: "Aucun secteur disponible dans les campagnes." },
  { key: "axes", label: "Axes", emptyLabel: "Aucun axe disponible dans les campagnes." },
  { key: "countries", label: "Pays", emptyLabel: "Aucun pays disponible dans les campagnes." },
  { key: "formats", label: "Formats", emptyLabel: "Aucun format disponible dans les campagnes." },
  { key: "platforms", label: "Plateformes", emptyLabel: "Aucune plateforme disponible dans les campagnes." },
]

function uniqueSorted(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])).sort((a, b) =>
    a.localeCompare(b, "fr"),
  )
}

function mergeSelectedOptions(options: string[], selectedValues?: string[]): string[] {
  return uniqueSorted([...options, ...(selectedValues || [])])
}

function toggleStringValue(values: string[] | undefined, value: string, checked: boolean): string[] {
  const current = values || []
  if (checked) return current.includes(value) ? current : [...current, value]
  return current.filter((item) => item !== value)
}

export default function AdminTempsFortsPage() {
  const { campaigns, updateCampaign } = useAdmin()
  const { tempsForts, refresh } = useTempsForts()
  const overrides = useTempsFortsOverrides()

  const [localOverrides, setLocalOverrides] = useState<TempsFortsOverrides>(DEFAULT_OVERRIDES)
  const [savingOverrides, setSavingOverrides] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<TempsFort | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // Campaign association dialog
  const [assocDialogOpen, setAssocDialogOpen] = useState(false)
  const [assocTf, setAssocTf] = useState<TempsFort | null>(null)
  const [assocSearch, setAssocSearch] = useState("")
  const [assocChecked, setAssocChecked] = useState<Set<string>>(new Set())
  const [savingAssoc, setSavingAssoc] = useState(false)
  const [assocPage, setAssocPage] = useState(1)
  const ASSOC_PER_PAGE = 12

  useEffect(() => {
    if (overrides) setLocalOverrides(overrides)
  }, [overrides])

  const countsBySlug = useMemo(() => {
    const map = new Map<string, number>()
    for (const campaign of campaigns) {
      for (const slug of campaign.tempsFortSlugs || []) {
        map.set(slug, (map.get(slug) || 0) + 1)
      }
    }
    return map
  }, [campaigns])

  const totalAssociations = Array.from(countsBySlug.values()).reduce((sum, n) => sum + n, 0)
  const activeCount = tempsForts.filter((tf) => getTempsFortStatus(tf) === "active").length

  const formOptions = useMemo<Record<TempsFortOptionKey, string[]>>(() => {
    const tags: string[] = []
    const sectors: string[] = []
    const axes: string[] = []
    const countries: string[] = []
    const formats: string[] = []
    const platforms: string[] = []

    for (const campaign of campaigns) {
      campaign.tags?.forEach((tag) => tags.push(tag))
      campaign.axe?.forEach((axe) => axes.push(axe))
      if (campaign.sector) sectors.push(campaign.sector)
      if (campaign.country) countries.push(campaign.country)
      if (campaign.format) formats.push(campaign.format)
      if (campaign.platforms?.length) {
        campaign.platforms.forEach((platform) => platforms.push(platform))
      } else if (campaign.platform) {
        platforms.push(campaign.platform)
      }
    }

    return {
      tags: uniqueSorted(tags),
      sectors: uniqueSorted(sectors),
      axes: uniqueSorted(axes),
      countries: uniqueSorted(countries),
      formats: uniqueSorted(formats),
      platforms: uniqueSorted(platforms),
    }
  }, [campaigns])

  const refreshAll = async () => {
    invalidateTempsFortsCache()
    await fetchTempsForts(true)
    await refresh()
  }

  const openAssocDialog = (tf: TempsFort) => {
    setAssocTf(tf)
    setAssocSearch("")
    setAssocPage(1)
    setAssocChecked(new Set(campaigns.filter((c) => (c.tempsFortSlugs || []).includes(tf.slug)).map((c) => c.id)))
    setAssocDialogOpen(true)
  }

  const saveAssoc = async () => {
    if (!assocTf) return
    setSavingAssoc(true)
    try {
      const toUpdate = campaigns.filter((c) => {
        const had = (c.tempsFortSlugs || []).includes(assocTf.slug)
        const has = assocChecked.has(c.id)
        return had !== has
      })
      await Promise.all(
        toUpdate.map((c) => {
          const current = c.tempsFortSlugs || []
          const next = assocChecked.has(c.id)
            ? [...current, assocTf.slug]
            : current.filter((s) => s !== assocTf.slug)
          return updateCampaign(c.id, { tempsFortSlugs: next })
        }),
      )
      toast.success(`${toUpdate.length} campagne${toUpdate.length > 1 ? "s" : ""} mise${toUpdate.length > 1 ? "s" : ""} à jour`)
      setAssocDialogOpen(false)
    } catch (e: any) {
      toast.error(e?.message || "Erreur enregistrement")
    } finally {
      setSavingAssoc(false)
    }
  }

  const saveOverrides = async (patch: Partial<TempsFortsOverrides>) => {
    setSavingOverrides(true)
    try {
      const res = await fetch("/api/temps-forts/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Erreur")
      setLocalOverrides(json.overrides)
      invalidateTempsFortsOverridesCache()
      toast.success("Réglages enregistrés")
    } catch (e: any) {
      toast.error(e?.message || "Erreur enregistrement")
    } finally {
      setSavingOverrides(false)
    }
  }

  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM })
    setDialogOpen(true)
  }

  const openEdit = (tf: TempsFort) => {
    setEditing(tf)
    setForm({ ...tf })
    setDialogOpen(true)
  }

  const submit = async () => {
    if (!form.title?.trim()) {
      toast.error("Titre requis")
      return
    }
    if (!form.dateActivation || !form.eventDate) {
      toast.error("Dates d'activation et d'événement requises")
      return
    }
    setSaving(true)
    try {
      const payload: any = { ...form }
      if (!payload.endDate) payload.endDate = ""
      const res = await fetch("/api/temps-forts", {
        method: editing ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { ...payload, id: editing.id } : payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Erreur")
      toast.success(editing ? "Temps fort mis à jour" : "Temps fort créé")
      setDialogOpen(false)
      await refreshAll()
    } catch (e: any) {
      toast.error(e?.message || "Erreur enregistrement")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (tf: TempsFort) => {
    if (!confirm(`Supprimer le temps fort "${tf.title}" ?`)) return
    try {
      const res = await fetch(`/api/temps-forts?id=${encodeURIComponent(tf.id)}`, {
        method: "DELETE",
        credentials: "include",
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Erreur")
      toast.success("Temps fort supprimé")
      await refreshAll()
    } catch (e: any) {
      toast.error(e?.message || "Erreur suppression")
    }
  }

  const slugOptions = useMemo(
    () => tempsForts.slice().sort((a, b) => a.title.localeCompare(b.title, "fr")),
    [tempsForts],
  )

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-orange-700">
            <Sparkles className="h-3.5 w-3.5" />
            Temps forts
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            Pilotage des temps forts
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Gérez la bannière, le pop-up et la liste des temps forts (Coupe du monde, Ramadan, Black Friday…).
          </p>
        </div>
        <Button onClick={openCreate} className="bg-[#F2B33D] hover:bg-[#d99a2a] text-white">
          <Plus className="mr-2 h-4 w-4" />
          Nouveau temps fort
        </Button>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Temps forts définis" value={tempsForts.length.toString()} icon={CalendarHeart} />
        <StatCard label="Actifs aujourd'hui" value={activeCount.toString()} icon={Sparkles} />
        <StatCard label="Campagnes rattachées" value={totalAssociations.toString()} icon={ArrowRight} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <PilotageCard
          title="Bannière dashboard"
          description="Bannière affichée en haut du dashboard. Activez et choisissez le temps fort à mettre en avant (sinon : le featured)."
          enabled={localOverrides.bannerEnabled}
          slug={localOverrides.bannerSlug}
          options={slugOptions}
          disabled={savingOverrides}
          onToggle={(v) => saveOverrides({ bannerEnabled: v })}
          onSlugChange={(slug) => saveOverrides({ bannerSlug: slug })}
        />
        <PilotageCard
          title="Pop-up dashboard"
          description="Pop-up affiché aux utilisateurs une fois connectés. Choisissez un temps fort spécifique ou laissez le défaut."
          enabled={localOverrides.popupEnabled}
          slug={localOverrides.popupSlug}
          options={slugOptions}
          disabled={savingOverrides}
          onToggle={(v) => saveOverrides({ popupEnabled: v })}
          onSlugChange={(slug) => saveOverrides({ popupSlug: slug })}
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white dark:bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Liste des temps forts</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Source : <code className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5">temps_forts (DB)</code>
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {tempsForts.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              Aucun temps fort. Cliquez sur « Nouveau temps fort » pour en créer un.
            </div>
          ) : (
            tempsForts.map((tf) => {
              const status = getTempsFortStatus(tf)
              const count = countsBySlug.get(tf.slug) || 0
              return (
                <div key={tf.slug} className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center">
                  <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                    {tf.imageUrl && (
                      <Image src={tf.imageUrl} alt={tf.title} fill sizes="96px" className="object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-foreground truncate">
                        {tf.shortTitle || tf.title}
                      </h3>
                      <StatusBadge status={status} />
                      {tf.category && (
                        <Badge variant="secondary" className="text-[10px] uppercase">{tf.category}</Badge>
                      )}
                      {tf.featured && (
                        <Badge className="bg-amber-100 text-amber-700 text-[10px] uppercase">Featured</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 line-clamp-2">{tf.description}</p>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">
                      Activation : {tf.dateActivation} · Événement : {tf.eventDate}
                      {tf.endDate ? ` · Fin : ${tf.endDate}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button asChild size="sm" variant="outline" className="text-slate-600 dark:text-slate-300">
                      <Link href={`/admin/campaigns?temps_fort=${tf.slug}`}>
                        <span className="font-bold mr-1">{count}</span>
                        campagne{count > 1 ? "s" : ""}
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" className="text-orange-600 hover:text-orange-700" onClick={() => openAssocDialog(tf)}>
                      <ListChecks className="mr-1 h-3.5 w-3.5" />
                      Gérer
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(tf)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Éditer
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => remove(tf)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button asChild size="sm" variant="ghost" className="text-slate-500 dark:text-slate-400">
                      <Link href={`/temps-forts/${tf.slug}`} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>

      <Dialog open={assocDialogOpen} onOpenChange={setAssocDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-orange-500" />
              Campagnes associées à « {assocTf?.shortTitle || assocTf?.title} »
            </DialogTitle>
          </DialogHeader>

          {assocTf && (() => {
            const filtered = campaigns.filter((c) =>
              !assocSearch.trim() ||
              c.title.toLowerCase().includes(assocSearch.toLowerCase()) ||
              (c.brand || "").toLowerCase().includes(assocSearch.toLowerCase())
            )
            const totalPages = Math.ceil(filtered.length / ASSOC_PER_PAGE)
            const paginated = filtered.slice((assocPage - 1) * ASSOC_PER_PAGE, assocPage * ASSOC_PER_PAGE)
            const checkedCount = assocChecked.size
            const allFilteredChecked = filtered.length > 0 && filtered.every((c) => assocChecked.has(c.id))

            return (
              <div className="flex flex-col gap-3 overflow-hidden flex-1">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 dark:text-slate-400" />
                    <Input
                      placeholder="Rechercher par titre ou marque…"
                      value={assocSearch}
                      onChange={(e) => { setAssocSearch(e.target.value); setAssocPage(1) }}
                      className="pl-9"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (allFilteredChecked) {
                        setAssocChecked((prev) => {
                          const next = new Set(prev)
                          filtered.forEach((c) => next.delete(c.id))
                          return next
                        })
                      } else {
                        setAssocChecked((prev) => {
                          const next = new Set(prev)
                          filtered.forEach((c) => next.add(c.id))
                          return next
                        })
                      }
                    }}
                  >
                    {allFilteredChecked ? "Tout désélectionner" : "Tout sélectionner"}
                  </Button>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {checkedCount} sélectionnée{checkedCount > 1 ? "s" : ""} · {filtered.length} sur {campaigns.length} campagne{campaigns.length > 1 ? "s" : ""}
                </p>

                <div className="overflow-y-auto flex-1">
                  {paginated.length === 0 ? (
                    <p className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">Aucune campagne trouvée.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {paginated.map((c) => {
                        const checked = assocChecked.has(c.id)
                        return (
                          <label
                            key={c.id}
                            className={`group relative flex flex-col cursor-pointer rounded-xl border-2 overflow-hidden transition-all ${
                              checked
                                ? "border-orange-400 shadow-md shadow-orange-100"
                                : "border-slate-200 hover:border-slate-300"
                            }`}
                            onClick={() =>
                              setAssocChecked((prev) => {
                                const next = new Set(prev)
                                if (next.has(c.id)) next.delete(c.id)
                                else next.add(c.id)
                                return next
                              })
                            }
                          >
                            <div className="relative aspect-video bg-slate-100 dark:bg-slate-800 shrink-0">
                              {c.imageUrl ? (
                                <Image src={c.imageUrl} alt={c.title} fill sizes="200px" className="object-cover" />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                                  <Sparkles className="h-6 w-6" />
                                </div>
                              )}
                              <div className={`absolute top-2 right-2 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                checked ? "bg-orange-500 border-orange-500" : "bg-white/80 border-slate-300"
                              }`}>
                                {checked && (
                                  <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                              </div>
                            </div>
                            <div className="p-2.5 flex flex-col gap-0.5">
                              <p className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">{c.title}</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{c.brand}{c.sector ? ` · ${c.sector}` : ""}</p>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={assocPage <= 1}
                      onClick={() => setAssocPage((p) => p - 1)}
                    >
                      ← Précédent
                    </Button>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Page {assocPage} / {totalPages}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={assocPage >= totalPages}
                      onClick={() => setAssocPage((p) => p + 1)}
                    >
                      Suivant →
                    </Button>
                  </div>
                )}
              </div>
            )
          })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssocDialogOpen(false)} disabled={savingAssoc}>
              Annuler
            </Button>
            <Button onClick={saveAssoc} disabled={savingAssoc} className="bg-[#F2B33D] hover:bg-[#d99a2a] text-white">
              {savingAssoc && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Éditer le temps fort" : "Nouveau temps fort"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Titre *">
                <Input
                  value={form.title || ""}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </Field>
              <Field label="Titre court">
                <Input
                  value={form.shortTitle || ""}
                  onChange={(e) => setForm({ ...form, shortTitle: e.target.value })}
                />
              </Field>
              <Field label="Slug">
                <Input
                  placeholder="auto depuis le titre"
                  value={form.slug || ""}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
              </Field>
              <Field label="Catégorie">
                <Input
                  value={form.category || ""}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
              </Field>
            </div>

            <Field label="Description">
              <Textarea
                rows={3}
                value={form.description || ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <ImageUpload
                value={form.imageUrl || ""}
                onChange={(url) => setForm({ ...form, imageUrl: url })}
                label="Image (carte / pop-up)"
                previewClassName="w-full h-40"
              />
              <ImageUpload
                value={form.heroImageUrl || ""}
                onChange={(url) => setForm({ ...form, heroImageUrl: url })}
                label="Image hero (bannière, page détail)"
                previewClassName="w-full h-40"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Date d'activation *">
                <Input
                  type="date"
                  value={form.dateActivation || ""}
                  onChange={(e) => setForm({ ...form, dateActivation: e.target.value })}
                />
              </Field>
              <Field label="Date de l'événement *">
                <Input
                  type="date"
                  value={form.eventDate || ""}
                  onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                />
              </Field>
              <Field label="Date de fin">
                <Input
                  type="date"
                  value={form.endDate || ""}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="CTA label (bannière)">
                <Input
                  value={form.ctaLabel || ""}
                  onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}
                />
              </Field>
              <Field label="Sort order">
                <Input
                  type="number"
                  value={form.sortOrder ?? 0}
                  onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <ToggleField
                label="Actif"
                checked={!!form.isActive}
                onChange={(v) => setForm({ ...form, isActive: v })}
              />
              <ToggleField
                label="Featured (banner par défaut)"
                checked={!!form.featured}
                onChange={(v) => setForm({ ...form, featured: v })}
              />
              <ToggleField
                label="Pop-up enabled (par défaut)"
                checked={!!form.popupEnabled}
                onChange={(v) => setForm({ ...form, popupEnabled: v })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {CHECKBOX_GROUPS.map((group) => {
                const selectedValues = (form[group.key] || []) as string[]
                return (
                  <MultiCheckboxField
                    key={group.key}
                    label={group.label}
                    options={mergeSelectedOptions(formOptions[group.key], selectedValues)}
                    selectedValues={selectedValues}
                    emptyLabel={group.emptyLabel}
                    onToggle={(value, checked) =>
                      setForm((current) => ({
                        ...current,
                        [group.key]: toggleStringValue(current[group.key] as string[] | undefined, value, checked),
                      }))
                    }
                  />
                )
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={submit} disabled={saving} className="bg-[#F2B33D] hover:bg-[#d99a2a] text-white">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
        {label}
      </Label>
      {children}
    </div>
  )
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white dark:bg-card px-3 py-2.5">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  )
}

function MultiCheckboxField({
  label,
  options,
  selectedValues,
  emptyLabel,
  onToggle,
}: {
  label: string
  options: string[]
  selectedValues: string[]
  emptyLabel: string
  onToggle: (value: string, checked: boolean) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
        {label}
      </Label>
      {options.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 dark:bg-slate-900/40 p-3 text-sm text-slate-500 dark:text-slate-400">
          {emptyLabel}
        </div>
      ) : (
        <div className="grid max-h-52 grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-slate-200 bg-white dark:bg-card p-3">
          {options.map((option) => {
            const checked = selectedValues.includes(option)
            return (
              <label
                key={option}
                className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm text-slate-800 hover:bg-slate-50 dark:bg-slate-900/40"
              >
                <Checkbox checked={checked} onCheckedChange={(value) => onToggle(option, value === true)} />
                <span className="min-w-0 truncate">{option}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PilotageCard({
  title,
  description,
  enabled,
  slug,
  options,
  disabled,
  onToggle,
  onSlugChange,
}: {
  title: string
  description: string
  enabled: boolean
  slug: string | null
  options: TempsFort[]
  disabled: boolean
  onToggle: (value: boolean) => void
  onSlugChange: (slug: string | null) => void
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white dark:bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{description}</p>
        </div>
        <Switch checked={enabled} onCheckedChange={onToggle} disabled={disabled} />
      </div>
      <div className="mt-4 space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          Temps fort à afficher
        </Label>
        <Select
          value={slug ?? "__default__"}
          onValueChange={(v) => onSlugChange(v === "__default__" ? null : v)}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Par défaut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__default__">Par défaut (featured / popupEnabled)</SelectItem>
            {options.map((tf) => (
              <SelectItem key={tf.slug} value={tf.slug}>
                {tf.shortTitle || tf.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white dark:bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        <div className="rounded-lg bg-orange-100 p-2 text-orange-600">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: "active" | "upcoming" | "past" }) {
  if (status === "active") {
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
        Actif
      </span>
    )
  }
  if (status === "upcoming") {
    return (
      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase text-sky-700">
        À venir
      </span>
    )
  }
  return (
    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300">
      Passé
    </span>
  )
}
