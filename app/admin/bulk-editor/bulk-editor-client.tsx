"use client"

import { useCallback, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Link2,
  Download,
  ShieldCheck,
  ShieldAlert,
  ImageOff,
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"
import { useBulkUpdate } from "@/hooks/use-bulk-update"
import { useMediaValidation } from "@/hooks/use-media-validation"
import { useMediaSecuring, mediaExceptionsCsv } from "@/hooks/use-media-securing"
import { InlineImageEditor } from "./inline-image-editor"
import {
  type BulkCampaign,
  type BulkEditableField,
} from "@/app/actions/bulk-editor"
import type { MediaState } from "@/lib/media-validation"

const STATUS_OPTIONS = ["Brouillon", "En attente", "Publié"]

/**
 * Vocabulaire du brief (§10) : vert / orange / rouge. Les libellés parlent de
 * ce que l'administrateur doit faire, pas de la mécanique de stockage.
 */
const MEDIA_FILTER_OPTIONS = [
  { value: "secured", label: "Sécurisé" },
  { value: "external", label: "À sécuriser" },
  { value: "broken", label: "Inaccessible" },
  { value: "empty", label: "Sans visuel" },
  { value: "unchecked", label: "Jamais contrôlé" },
]
const FORMAT_OPTIONS = [
  "Story",
  "Carrousel",
  "Vidéo",
  "Image",
  "Photo",
  "Vidéos Ad",
  "Image Ad",
  "Carrousel Ad",
]

export function BulkEditorClient({ campaigns }: { campaigns: BulkCampaign[] }) {
  // ── Filtres ──────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("")
  const [brandFilter, setBrandFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [formatFilter, setFormatFilter] = useState<string>("all")
  const [mediaFilter, setMediaFilter] = useState<string>("all")

  // ── Sélection ────────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // ── Hooks métier ─────────────────────────────────────────────────────────
  const update = useBulkUpdate()
  const { validate, isValidating } = useMediaValidation()
  const media = useMediaSecuring()

  const [diffOpen, setDiffOpen] = useState(false)

  const brands = useMemo(() => {
    const set = new Set<string>()
    campaigns.forEach((c) => c.brand && set.add(c.brand))
    return Array.from(set).sort()
  }, [campaigns])

  // Valeur effective = staged si modifié, sinon original.
  const valueOf = useCallback(
    (c: BulkCampaign, field: BulkEditableField): string => {
      const st = update.staged[c.id]?.[field]
      if (st !== undefined) return Array.isArray(st) ? st.join(", ") : (st ?? "")
      const raw = (c as any)[field]
      if (Array.isArray(raw)) return raw.join(", ")
      return raw ?? ""
    },
    [update.staged],
  )

  const isDirty = useCallback(
    (id: string, field: BulkEditableField) => update.staged[id]?.[field] !== undefined,
    [update.staged],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return campaigns.filter((c) => {
      if (q && !`${c.title ?? ""} ${c.brand ?? ""} ${c.slug ?? ""}`.toLowerCase().includes(q))
        return false
      if (brandFilter !== "all" && c.brand !== brandFilter) return false
      if (statusFilter !== "all" && c.status !== statusFilter) return false
      if (formatFilter !== "all" && c.format !== formatFilter) return false
      if (mediaFilter !== "all") {
        const state = c.media_status ?? "unchecked"
        if (state !== mediaFilter) return false
      }
      return true
    })
  }, [campaigns, search, brandFilter, statusFilter, formatFilter, mediaFilter])

  /**
   * Compteurs sur ce que l'administrateur a sous les yeux. Ils viennent de la
   * colonne persistée : les recalculer imposerait de resonder chaque visuel à
   * chaque rendu.
   */
  const counts = useMemo(() => {
    const c = { secured: 0, external: 0, broken: 0, empty: 0, unchecked: 0 }
    campaigns.forEach((x) => {
      c[(x.media_status ?? "unchecked") as keyof typeof c]++
    })
    return c
  }, [campaigns])

  const allVisibleSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id))

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) filtered.forEach((c) => next.delete(c.id))
      else filtered.forEach((c) => next.add(c.id))
      return next
    })
  }
  const toggleRow = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  // ── Édition en masse sur la sélection ────────────────────────────────────
  const applyToSelected = (field: BulkEditableField, value: string) => {
    if (selected.size === 0) {
      toast.error("Sélectionnez au moins une campagne")
      return
    }
    update.stageBulk(Array.from(selected), field, value)
    toast.success(`${field} appliqué à ${selected.size} campagne(s)`)
  }

  // ── Validation vidéo / média inline ──────────────────────────────────────
  const [videoCheck, setVideoCheck] = useState<Record<string, { ok: boolean; reason: string | null }>>({})

  const checkVideo = async (c: BulkCampaign) => {
    const url = valueOf(c, "video_url").trim()
    if (!url) {
      toast.error("Aucune URL vidéo à vérifier")
      return
    }
    const r = await validate(url)
    setVideoCheck((p) => ({ ...p, [c.id]: { ok: r.ok, reason: r.reason } }))
    if (r.ok) {
      // Si une image Drive a été re-hébergée, on stage la thumbnail au passage.
      if (r.rehostedUrl) update.stageChange(c.id, "thumbnail", r.rehostedUrl)
      toast.success(
        r.embeddable === false
          ? "Accessible mais non intégrable"
          : "Vidéo valide et intégrable",
      )
    } else {
      toast.error(r.reason || "Média invalide")
    }
  }

  // ── Audit et sécurisation des médias ─────────────────────────────────────
  const [mediaResultOpen, setMediaResultOpen] = useState(false)

  const runAudit = async () => {
    const ids = filtered.map((c) => c.id)
    const r = await media.audit(ids)
    if (!r.ok) {
      toast.error(r.error || "Audit impossible")
      return
    }
    toast.success(`${ids.length} visuel(s) contrôlé(s)`, {
      description: "Rechargez la page pour voir les pastilles à jour.",
    })
  }

  const runSecure = async () => {
    const ids = Array.from(selected)
    if (ids.length === 0) {
      toast.error("Sélectionnez au moins une campagne")
      return
    }
    const r = await media.secure(ids)
    if (!r.ok) {
      toast.error(r.error || "Sécurisation impossible")
      return
    }
    setMediaResultOpen(true)
  }

  const selectAllFiltered = () => {
    setSelected(new Set(filtered.map((c) => c.id)))
    toast.success(`${filtered.length} campagne(s) sélectionnée(s)`)
  }

  const exportMediaExceptions = () => {
    const items = media.result?.items ?? []
    const csv = mediaExceptionsCsv(items)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "medias-a-reuploader.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Application finale ───────────────────────────────────────────────────
  const handleApply = async () => {
    const results = await update.apply()
    const okCount = results.filter((r) => r.ok).length
    const errCount = results.length - okCount
    setDiffOpen(false)
    if (errCount === 0) toast.success(`${okCount} campagne(s) mise(s) à jour`)
    else toast.error(`${okCount} OK, ${errCount} en erreur`)
  }

  const exportErrorsCsv = () => {
    const errs = (update.results || []).filter((r) => !r.ok)
    if (errs.length === 0) return
    const byId = new Map(campaigns.map((c) => [c.id, c]))
    const rows = [
      ["id", "slug", "title", "error"],
      ...errs.map((e) => {
        const c = byId.get(e.id)
        return [e.id, c?.slug ?? "", c?.title ?? "", e.error ?? ""]
      }),
    ]
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "bulk-editor-errors.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const resultById = useMemo(() => {
    const m = new Map<string, boolean>()
    ;(update.results || []).forEach((r) => m.set(r.id, r.ok))
    return m
  }, [update.results])

  return (
    <div className="space-y-5">
      {/* ── Barre de filtres ── */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Rechercher (titre, marque, slug)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <FilterSelect label="Marque" value={brandFilter} onChange={setBrandFilter} options={brands} />
        <FilterSelect label="Statut" value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
        <FilterSelect label="Format" value={formatFilter} onChange={setFormatFilter} options={FORMAT_OPTIONS} />
        <Select value={mediaFilter} onValueChange={setMediaFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="État du média" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">État du média : tous</SelectItem>
            {MEDIA_FILTER_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} / {campaigns.length} campagnes
        </span>
      </div>

      {/* ── État de la bibliothèque ── */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md border bg-muted/20 p-3">
        <span className="text-sm font-medium">État des visuels :</span>
        <Counter n={counts.secured} label="sécurisés" tone="ok" />
        <Counter n={counts.external} label="à sécuriser" tone="risk" />
        <Counter n={counts.broken} label="inaccessibles" tone="dead" />
        {counts.empty > 0 && <Counter n={counts.empty} label="sans visuel" tone="muted" />}
        {counts.unchecked > 0 && <Counter n={counts.unchecked} label="jamais contrôlés" tone="muted" />}

        <div className="ml-auto flex items-center gap-2">
          {media.progress && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {media.progress.label} {media.progress.done} / {media.progress.total}
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={runAudit}
            disabled={media.running !== null || filtered.length === 0}
            title="Recontrôle chaque visuel affiché, sans rien modifier"
          >
            {media.running === "audit" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Auditer les {filtered.length} affichées
          </Button>
        </div>
      </div>

      {/* ── Barre d'actions sur la sélection ── */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-3">
          <span className="text-sm font-medium">{selected.size} sélectionnée(s) :</span>
          <BulkApply label="Statut" options={STATUS_OPTIONS} onApply={(v) => applyToSelected("status", v)} />
          <BulkApply label="Format" options={FORMAT_OPTIONS} onApply={(v) => applyToSelected("format", v)} />
          <InlineText placeholder="Marque…" onSubmit={(v) => applyToSelected("brand", v)} />
          <Button
            size="sm"
            onClick={runSecure}
            disabled={media.running !== null}
            className="bg-[#F2B33D] text-black hover:bg-[#E4A82F]"
          >
            {media.running === "secure" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="mr-2 h-4 w-4" />
            )}
            Sécuriser les médias sélectionnés
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Désélectionner</Button>
        </div>
      )}

      {/* ── Sélectionner tout le filtre ── */}
      {filtered.length > 0 && !allVisibleSelected && (
        <Button size="sm" variant="outline" onClick={selectAllFiltered}>
          Sélectionner les {filtered.length} campagnes du filtre
        </Button>
      )}

      {/* ── Tableau ── */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={allVisibleSelected} onCheckedChange={toggleAll} aria-label="Tout sélectionner" />
              </TableHead>
              <TableHead className="w-40">Image</TableHead>
              <TableHead>Campagne</TableHead>
              <TableHead className="w-36">Statut</TableHead>
              <TableHead className="w-40">Marque</TableHead>
              <TableHead className="min-w-[260px]">Vidéo</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => {
              const thumb = valueOf(c, "thumbnail")
              const res = resultById.get(c.id)
              const vc = videoCheck[c.id]
              return (
                <TableRow key={c.id} className={selected.has(c.id) ? "bg-[#F2B33D]/5" : ""}>
                  <TableCell>
                    <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggleRow(c.id)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1.5">
                      <InlineImageEditor
                        value={thumb}
                        onChange={(url) => update.stageChange(c.id, "thumbnail", url)}
                      />
                      <MediaBadge state={c.media_status} reason={c.media_reason} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium leading-tight">{c.title}</div>
                    <div className="text-xs text-muted-foreground font-mono">{c.slug}</div>
                  </TableCell>
                  <TableCell>
                    <Select value={valueOf(c, "status") || undefined} onValueChange={(v) => update.stageChange(c.id, "status", v)}>
                      <SelectTrigger className={isDirty(c.id, "status") ? "border-[#F2B33D]" : ""}>
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={valueOf(c, "brand")}
                      onChange={(e) => update.stageChange(c.id, "brand", e.target.value)}
                      className={isDirty(c.id, "brand") ? "border-[#F2B33D]" : ""}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Input
                        value={valueOf(c, "video_url")}
                        placeholder="URL vidéo / Drive…"
                        onChange={(e) => update.stageChange(c.id, "video_url", e.target.value)}
                        className={isDirty(c.id, "video_url") ? "border-[#F2B33D]" : ""}
                      />
                      <Button size="sm" variant="outline" onClick={() => checkVideo(c)} disabled={isValidating} title="Vérifier public + intégrable">
                        {isValidating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                    {vc && (
                      <div className={`mt-1 text-xs ${vc.ok ? "text-green-600" : "text-destructive"}`}>
                        {vc.ok ? "✓ Vérifié" : vc.reason}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {res === true && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    {res === false && <XCircle className="h-4 w-4 text-destructive" />}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* ── Barre d'application ── */}
      {update.changeCount > 0 && (
        <div className="sticky bottom-0 flex items-center gap-3 rounded-md border bg-background p-3 shadow-lg">
          <span className="text-sm">
            <strong>{update.changeCount}</strong> changement(s) sur{" "}
            <strong>{update.changedIds.length}</strong> campagne(s)
          </span>
          <Button variant="ghost" size="sm" onClick={update.reset}>Annuler</Button>
          <Button className="ml-auto" onClick={() => setDiffOpen(true)} disabled={update.isApplying}>
            Vérifier et appliquer
          </Button>
        </div>
      )}

      {/* ── Export erreurs ── */}
      {update.results && update.results.some((r) => !r.ok) && (
        <Button variant="outline" size="sm" onClick={exportErrorsCsv}>
          <Download className="mr-2 h-4 w-4" /> Exporter les erreurs (CSV)
        </Button>
      )}

      {/* ── Dialog récapitulatif de sécurisation ── */}
      <Dialog open={mediaResultOpen} onOpenChange={setMediaResultOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sécurisation terminée</DialogTitle>
            <DialogDescription>
              {media.result
                ? `${media.result.selected} média(s) sélectionné(s) — ${media.result.secured} sécurisé(s) avec succès — ${media.result.failed} impossible(s) à récupérer.`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {media.result && media.result.failed > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">
                Ces visuels n'existent plus à leur source : ils demandent un réupload manuel.
              </p>
              <div className="max-h-72 overflow-auto rounded border text-xs">
                <table className="w-full">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="px-2 py-1 text-left">Campagne</th>
                      <th className="px-2 py-1 text-left">Motif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {media.result.items
                      .filter((i) => i.status !== "secured")
                      .map((i) => (
                        <tr key={i.id} className="border-t align-top">
                          <td className="px-2 py-1">
                            <div className="font-medium">{i.title}</div>
                            <div className="font-mono text-[11px] text-muted-foreground">{i.slug}</div>
                          </td>
                          <td className="px-2 py-1 text-muted-foreground">{i.reason}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-sm text-green-600">
              Tous les médias sélectionnés sont désormais hébergés par LAVEIYE.
            </p>
          )}

          <DialogFooter>
            {media.result && media.result.failed > 0 && (
              <Button variant="outline" onClick={exportMediaExceptions}>
                <Download className="mr-2 h-4 w-4" /> Exporter les exceptions (CSV)
              </Button>
            )}
            <Button onClick={() => { setMediaResultOpen(false); window.location.reload() }}>
              Recharger la liste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog diff/confirmation ── */}
      <Dialog open={diffOpen} onOpenChange={setDiffOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirmer les modifications</DialogTitle>
            <DialogDescription>
              {update.changeCount} changement(s) seront appliqués à {update.changedIds.length} campagne(s).
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-72 overflow-auto rounded border text-xs">
            <table className="w-full">
              <thead className="sticky top-0 bg-muted">
                <tr><th className="px-2 py-1 text-left">Campagne</th><th className="px-2 py-1 text-left">Champs modifiés</th></tr>
              </thead>
              <tbody>
                {update.changedIds.map((id) => {
                  const c = campaigns.find((x) => x.id === id)
                  const fields = Object.keys(update.staged[id])
                  return (
                    <tr key={id} className="border-t">
                      <td className="px-2 py-1">{c?.title ?? id}</td>
                      <td className="px-2 py-1 text-muted-foreground">{fields.join(", ")}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiffOpen(false)} disabled={update.isApplying}>Annuler</Button>
            <Button onClick={handleApply} disabled={update.isApplying}>
              {update.isApplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Appliquer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Sous-composants ──────────────────────────────────────────────────────────

function Counter({
  n,
  label,
  tone,
}: {
  n: number
  label: string
  tone: "ok" | "risk" | "dead" | "muted"
}) {
  const color =
    tone === "ok"
      ? "text-green-600"
      : tone === "risk"
        ? "text-amber-600"
        : tone === "dead"
          ? "text-destructive"
          : "text-muted-foreground"
  return (
    <span className="text-sm">
      <strong className={`tabular-nums ${color}`}>{n}</strong>{" "}
      <span className="text-muted-foreground">{label}</span>
    </span>
  )
}

/**
 * Pastille d'état lue depuis la base, et non depuis un état local : le verdict
 * survit au rechargement de la page, ce qui est le point du brief §8.
 */
function MediaBadge({ state, reason }: { state: MediaState | null; reason: string | null }) {
  if (state === null) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        Non contrôlé
      </span>
    )
  }
  if (state === "secured") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-green-600">
        <ShieldCheck className="h-3 w-3" /> Sécurisé
      </span>
    )
  }
  if (state === "external") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-amber-600" title="Encore servi par une source externe">
        <ShieldAlert className="h-3 w-3" /> À sécuriser
      </span>
    )
  }
  if (state === "empty") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <ImageOff className="h-3 w-3" /> Sans visuel
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-destructive" title={reason ?? undefined}>
      <XCircle className="h-3 w-3" /> Inaccessible
    </span>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[150px]">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{label} : tous</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>{o}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function BulkApply({
  label,
  options,
  onApply,
}: {
  label: string
  options: string[]
  onApply: (v: string) => void
}) {
  return (
    <Select onValueChange={onApply}>
      <SelectTrigger className="w-[150px]">
        <SelectValue placeholder={`${label} →`} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>{o}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function InlineText({ placeholder, onSubmit }: { placeholder: string; onSubmit: (v: string) => void }) {
  const [v, setV] = useState("")
  return (
    <div className="flex items-center gap-1">
      <Input
        value={v}
        placeholder={placeholder}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && v.trim()) {
            onSubmit(v.trim())
            setV("")
          }
        }}
        className="w-32"
      />
    </div>
  )
}
