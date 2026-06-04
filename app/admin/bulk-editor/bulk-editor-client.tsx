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
} from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { isGoogleDriveHostedUrl } from "@/lib/utils"
import { useBulkUpdate } from "@/hooks/use-bulk-update"
import { useMediaValidation } from "@/hooks/use-media-validation"
import { InlineImageEditor } from "./inline-image-editor"
import {
  bulkSecureDriveImages,
  type BulkCampaign,
  type BulkEditableField,
  type SecureDriveSummary,
} from "@/app/actions/bulk-editor"

const STATUS_OPTIONS = ["Brouillon", "En attente", "Publié"]
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

  // ── Sélection ────────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // ── Hooks métier ─────────────────────────────────────────────────────────
  const update = useBulkUpdate()
  const { validate, isValidating } = useMediaValidation()
  const router = useRouter()

  const [diffOpen, setDiffOpen] = useState(false)

  // ── Re-hébergement en masse des images Drive ──────────────────────────────
  const driveCount = useMemo(
    () => campaigns.filter((c) => c.thumbnail && isGoogleDriveHostedUrl(c.thumbnail)).length,
    [campaigns],
  )
  const [securing, setSecuring] = useState(false)
  const [secureResult, setSecureResult] = useState<SecureDriveSummary | null>(null)
  const [secureOpen, setSecureOpen] = useState(false)

  const handleSecureAll = async () => {
    setSecuring(true)
    try {
      const res = await bulkSecureDriveImages()
      setSecureResult(res)
      setSecureOpen(true)
      if (res.success) {
        toast.success(`${res.secured ?? 0} image(s) sécurisée(s), ${res.restricted ?? 0} restreinte(s)`)
        router.refresh() // recharge les thumbnails re-hébergées
      } else {
        toast.error(res.error || "Échec")
      }
    } finally {
      setSecuring(false)
    }
  }

  const exportSecureCsv = () => {
    const items = (secureResult?.items || []).filter((i) => i.status !== "secured")
    if (items.length === 0) return
    const rows = [
      ["id", "slug", "title", "status", "reason", "oldUrl"],
      ...items.map((i) => [i.id, i.slug ?? "", i.title ?? "", i.status, i.reason ?? "", i.oldUrl]),
    ]
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "drive-secure-report.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

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
      return true
    })
  }, [campaigns, search, brandFilter, statusFilter, formatFilter])

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
      {/* ── Bandeau images Drive ── */}
      {driveCount > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950">
          <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0" />
          <span className="text-amber-800 dark:text-amber-200">
            <strong>{driveCount}</strong> image(s) hébergée(s) sur Google Drive (cassées pour les
            utilisateurs). Re-hébergez-les sur Supabase en une passe.
          </span>
          <Button
            size="sm"
            className="ml-auto bg-amber-600 hover:bg-amber-700 text-white"
            onClick={handleSecureAll}
            disabled={securing}
          >
            {securing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            Sécuriser toutes les images Drive
          </Button>
        </div>
      )}

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
        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} / {campaigns.length} campagnes
        </span>
      </div>

      {/* ── Barre d'actions sur la sélection ── */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-3">
          <span className="text-sm font-medium">{selected.size} sélectionnée(s) :</span>
          <BulkApply label="Statut" options={STATUS_OPTIONS} onApply={(v) => applyToSelected("status", v)} />
          <BulkApply label="Format" options={FORMAT_OPTIONS} onApply={(v) => applyToSelected("format", v)} />
          <InlineText placeholder="Marque…" onSubmit={(v) => applyToSelected("brand", v)} />
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Désélectionner</Button>
        </div>
      )}

      {/* ── Tableau ── */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={allVisibleSelected} onCheckedChange={toggleAll} aria-label="Tout sélectionner" />
              </TableHead>
              <TableHead className="w-32">Image</TableHead>
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
                    <InlineImageEditor
                      value={thumb}
                      onChange={(url) => update.stageChange(c.id, "thumbnail", url)}
                    />
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

      {/* ── Dialog résultat re-hébergement Drive ── */}
      <Dialog open={secureOpen} onOpenChange={setSecureOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Re-hébergement des images Drive</DialogTitle>
            <DialogDescription>
              {secureResult?.success
                ? `${secureResult.secured ?? 0} sécurisée(s) · ${secureResult.restricted ?? 0} restreinte(s) · ${secureResult.errors ?? 0} erreur(s) sur ${secureResult.totalDrive ?? 0}`
                : secureResult?.error}
            </DialogDescription>
          </DialogHeader>
          {secureResult?.items && secureResult.items.some((i) => i.status !== "secured") && (
            <div className="max-h-72 overflow-auto rounded border text-xs">
              <table className="w-full">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="px-2 py-1 text-left">Campagne</th>
                    <th className="px-2 py-1 text-left">Statut</th>
                    <th className="px-2 py-1 text-left">Raison</th>
                  </tr>
                </thead>
                <tbody>
                  {secureResult.items
                    .filter((i) => i.status !== "secured")
                    .map((i) => (
                      <tr key={i.id} className="border-t">
                        <td className="px-2 py-1">{i.title ?? i.slug ?? i.id}</td>
                        <td className="px-2 py-1">
                          {i.status === "restricted" ? (
                            <span className="text-amber-600">restreint</span>
                          ) : (
                            <span className="text-destructive">erreur</span>
                          )}
                        </td>
                        <td className="px-2 py-1 text-muted-foreground">{i.reason}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
          <DialogFooter>
            {secureResult?.items && secureResult.items.some((i) => i.status !== "secured") && (
              <Button variant="outline" onClick={exportSecureCsv}>
                <Download className="mr-2 h-4 w-4" /> Rapport CSV
              </Button>
            )}
            <Button onClick={() => setSecureOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Sous-composants ──────────────────────────────────────────────────────────

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
