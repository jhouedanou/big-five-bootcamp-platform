"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import {
  Filter as FilterIcon,
  RotateCcw,
  Plus,
  Tag as TagIcon,
  Loader2,
  ChevronDown,
} from "lucide-react"
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AdminStatsBlock } from "@/components/admin/AdminStatsBlock"
import { trackEvent, trackGA4 } from "@/lib/analytics"
import { cn } from "@/lib/utils"
import { COUNTRIES } from "@/lib/onboarding"
import {
  ACCESS_TYPE_OPTIONS,
  SUBSCRIPTION_PLAN_OPTIONS,
  SUBSCRIPTION_STATUS_OPTIONS,
  ACTIVITY_STATUS_OPTIONS,
  accessTypeLabel,
  subscriptionPlanLabel,
  subscriptionStatusLabel,
  activityStatusLabel,
  getActivityStatus,
  DEFAULT_PAGE_SIZE,
  type AdminUserRow,
  type TagSummary,
  type UserFilters,
} from "@/lib/admin-segmentation"

const ALL = "__all"

const EMPTY_FILTERS: UserFilters = {
  country: null,
  subscription_plan: null,
  access_type: null,
  subscription_status: null,
  activity_status: null,
  search: null,
  date_from: null,
  date_to: null,
  tag: null,
}

function fmtDate(value: string | null) {
  if (!value) return "—"
  try {
    return new Date(value).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return "—"
  }
}

function TagBadge({ tag }: { tag: TagSummary }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
      style={{ backgroundColor: tag.color }}
    >
      {tag.name}
    </span>
  )
}

export function AudienceManager() {
  const [filters, setFilters] = useState<UserFilters>(EMPTY_FILTERS)
  const [searchInput, setSearchInput] = useState("")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE)

  const [rows, setRows] = useState<AdminUserRow[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [tags, setTags] = useState<TagSummary[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selectAllMatching, setSelectAllMatching] = useState(false)

  const [showFilters, setShowFilters] = useState(false)

  // Bulk
  const [bulkTagId, setBulkTagId] = useState<string>("")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [applying, setApplying] = useState(false)

  // Création de tag
  const [createOpen, setCreateOpen] = useState(false)
  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState("#0F0F0F")
  const [creating, setCreating] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // --- chargement des tags ---
  const loadTags = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/tags", { cache: "no-store" })
      if (!res.ok) return
      const data = await res.json()
      setTags(data.tags ?? [])
    } catch {
      /* noop */
    }
  }, [])

  useEffect(() => {
    void loadTags()
  }, [loadTags])

  // --- chargement des utilisateurs ---
  const buildQuery = useCallback(() => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.set(k, v)
    })
    params.set("page", String(page))
    params.set("limit", String(limit))
    return params.toString()
  }, [filters, page, limit])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/users?${buildQuery()}`, { cache: "no-store" })
      if (res.status === 403) {
        setError("Accès refusé.")
        setRows([])
        return
      }
      if (!res.ok) throw new Error()
      const data = await res.json()
      setRows(data.users ?? [])
      setTotal(data.total ?? 0)
      setTotalPages(data.totalPages ?? 0)
    } catch {
      setError("Erreur de chargement des utilisateurs.")
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [buildQuery])

  useEffect(() => {
    void fetchUsers()
    // Reset de la sélection à chaque changement de jeu de résultats.
    setSelected(new Set())
    setSelectAllMatching(false)
  }, [fetchUsers])

  // Tracking : filtre appliqué (hors pagination simple).
  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters]
  )
  useEffect(() => {
    if (activeFilterCount > 0) {
      trackEvent("admin_users_filtered", { ...filters }, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  // Debounce de la recherche texte → filters.search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput.trim() || null }))
      setPage(1)
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchInput])

  function setFilter(key: keyof UserFilters, value: string | null) {
    setFilters((f) => ({ ...f, [key]: value === ALL ? null : value || null }))
    setPage(1)
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS)
    setSearchInput("")
    setPage(1)
  }

  // --- sélection ---
  const pageIds = useMemo(() => rows.map((r) => r.id), [rows])
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id))

  function toggleOne(id: string) {
    setSelectAllMatching(false)
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function togglePage() {
    setSelectAllMatching(false)
    setSelected((prev) => {
      const next = new Set(prev)
      if (allPageSelected) pageIds.forEach((id) => next.delete(id))
      else pageIds.forEach((id) => next.add(id))
      return next
    })
  }

  const selectionCount = selectAllMatching ? total : selected.size
  const hasSelection = selectionCount > 0

  const bulkTagName = tags.find((t) => t.id === bulkTagId)?.name ?? ""

  // --- application en masse ---
  async function applyBulk() {
    if (!bulkTagId) {
      toast.error("Choisissez un tag à appliquer.")
      return
    }
    setApplying(true)
    try {
      const body = selectAllMatching
        ? { tag_id: bulkTagId, mode: "filter", filters }
        : { tag_id: bulkTagId, mode: "ids", user_ids: Array.from(selected) }

      const res = await fetch("/api/admin/users/bulk-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? "Application impossible.")
        return
      }
      trackGA4("admin_bulk_tag_applied", { tag_id: bulkTagId, count: data.applied })
      toast.success(`Tag appliqué à ${data.applied} utilisateur(s).`)
      setConfirmOpen(false)
      setSelected(new Set())
      setSelectAllMatching(false)
      setBulkTagId("")
      await fetchUsers()
    } catch {
      toast.error("Erreur réseau.")
    } finally {
      setApplying(false)
    }
  }

  // --- application sur un utilisateur ---
  async function applyToUser(userId: string, tagId: string) {
    try {
      const res = await fetch(`/api/admin/users/${userId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag_ids: [tagId] }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast.error(d?.error ?? "Application impossible.")
        return
      }
      trackGA4("admin_tag_applied", { target_user_id: userId, tag_id: tagId })
      toast.success("Tag appliqué.")
      await fetchUsers()
    } catch {
      toast.error("Erreur réseau.")
    }
  }

  // --- création de tag ---
  async function createTag() {
    const name = newTagName.trim()
    if (!name) return
    setCreating(true)
    try {
      const res = await fetch("/api/admin/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color: newTagColor }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? "Création impossible.")
        return
      }
      if (data.created) trackGA4("admin_tag_created", { name })
      toast.success(data.created ? "Tag créé." : "Ce tag existe déjà.")
      setCreateOpen(false)
      setNewTagName("")
      setNewTagColor("#0F0F0F")
      await loadTags()
    } catch {
      toast.error("Erreur réseau.")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Segmentation</h1>
          <p className="text-sm text-slate-500">KPI, filtres et tags utilisateurs.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} variant="outline" className="gap-2">
          <Plus className="size-4" /> Créer un tag
        </Button>
      </div>

      {/* KPI */}
      <AdminStatsBlock />

      {/* Filtres */}
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between p-4 lg:hidden">
          <button
            className="flex items-center gap-2 text-sm font-medium"
            onClick={() => setShowFilters((s) => !s)}
          >
            <FilterIcon className="size-4" /> Filtres
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-[#F2B33D] px-2 text-xs text-black">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className={cn("size-4 transition-transform", showFilters && "rotate-180")} />
          </button>
        </div>

        <div className={cn("p-4 pt-0 lg:block lg:pt-4", showFilters ? "block" : "hidden")}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              placeholder="Nom, email, téléphone…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />

            <Select value={filters.country ?? ALL} onValueChange={(v) => setFilter("country", v)}>
              <SelectTrigger><SelectValue placeholder="Pays" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous les pays</SelectItem>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.subscription_plan ?? ALL} onValueChange={(v) => setFilter("subscription_plan", v)}>
              <SelectTrigger><SelectValue placeholder="Plan d'abonnement" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous les plans</SelectItem>
                {SUBSCRIPTION_PLAN_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.access_type ?? ALL} onValueChange={(v) => setFilter("access_type", v)}>
              <SelectTrigger><SelectValue placeholder="Type d'accès" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous les accès</SelectItem>
                {ACCESS_TYPE_OPTIONS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.subscription_status ?? ALL} onValueChange={(v) => setFilter("subscription_status", v)}>
              <SelectTrigger><SelectValue placeholder="Statut d'abonnement" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous les statuts</SelectItem>
                {SUBSCRIPTION_STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.activity_status ?? ALL} onValueChange={(v) => setFilter("activity_status", v)}>
              <SelectTrigger><SelectValue placeholder="Statut d'activité" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Toute activité</SelectItem>
                {ACTIVITY_STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.tag ?? ALL} onValueChange={(v) => setFilter("tag", v)}>
              <SelectTrigger><SelectValue placeholder="Tag" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous les tags</SelectItem>
                {tags.map((t) => (
                  <SelectItem key={t.id} value={t.slug}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-slate-500">Inscrit depuis</label>
              <Input
                type="date"
                value={filters.date_from ?? ""}
                onChange={(e) => setFilter("date_from", e.target.value || null)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-slate-500">Inscrit jusqu'à</label>
              <Input
                type="date"
                value={filters.date_to ?? ""}
                onChange={(e) => setFilter("date_to", e.target.value || null)}
              />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-slate-500">
              {loading ? "Chargement…" : `${total.toLocaleString("fr-FR")} utilisateur(s) trouvé(s)`}
            </span>
            <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-2">
              <RotateCcw className="size-3.5" /> Réinitialiser les filtres
            </Button>
          </div>
        </div>
      </div>

      {/* Barre d'action en masse */}
      {hasSelection && (
        <div className="flex flex-col gap-3 rounded-xl border border-[#F2B33D]/40 bg-[#F2B33D]/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <strong>{selectionCount}</strong> utilisateur(s) sélectionné(s).
            {!selectAllMatching && allPageSelected && total > rows.length && (
              <button
                className="ml-2 underline"
                onClick={() => setSelectAllMatching(true)}
              >
                Sélectionner les {total} résultats du filtre
              </button>
            )}
            {selectAllMatching && (
              <button className="ml-2 underline" onClick={() => setSelectAllMatching(false)}>
                Annuler la sélection globale
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Select value={bulkTagId} onValueChange={setBulkTagId}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Choisir un tag" /></SelectTrigger>
              <SelectContent>
                {tags.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={!bulkTagId}
              className="gap-2 bg-neutral-900 text-white hover:bg-neutral-800"
            >
              <TagIcon className="size-4" /> Appliquer
            </Button>
          </div>
        </div>
      )}

      {/* Tableau */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-900">
            <tr>
              <th className="p-3">
                <Checkbox checked={allPageSelected} onCheckedChange={togglePage} aria-label="Tout sélectionner" />
              </th>
              <th className="p-3">Nom</th>
              <th className="p-3">Email</th>
              <th className="p-3">Téléphone</th>
              <th className="p-3">Pays</th>
              <th className="p-3">Inscription</th>
              <th className="p-3">Dernière connexion</th>
              <th className="p-3">Dernière activité</th>
              <th className="p-3">Statut d'activité</th>
              <th className="p-3">Plan d'abonnement</th>
              <th className="p-3">Type d'accès</th>
              <th className="p-3">Statut d'abonnement</th>
              <th className="p-3">Tags</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                  <td colSpan={13} className="p-3">
                    <div className="h-6 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                  </td>
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={13} className="p-8 text-center text-sm text-red-600">{error}</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={13} className="p-8 text-center text-sm text-slate-500">
                  Aucun utilisateur ne correspond à ces filtres.
                </td>
              </tr>
            ) : (
              rows.map((u) => (
                <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900">
                  <td className="p-3">
                    <Checkbox
                      checked={selected.has(u.id) || selectAllMatching}
                      onCheckedChange={() => toggleOne(u.id)}
                      aria-label={`Sélectionner ${u.name ?? u.email}`}
                    />
                  </td>
                  <td className="p-3 font-medium">{u.name || "—"}</td>
                  <td className="p-3 text-slate-600 dark:text-slate-300">{u.email || "—"}</td>
                  <td className="p-3">{u.phone_number || "—"}</td>
                  <td className="p-3">{u.country || "—"}</td>
                  <td className="p-3 whitespace-nowrap">{fmtDate(u.created_at)}</td>
                  <td className="p-3 whitespace-nowrap">{fmtDate(u.last_login_at)}</td>
                  <td className="p-3 whitespace-nowrap">{fmtDate(u.last_activity_at)}</td>
                  <td className="p-3 whitespace-nowrap">
                    {activityStatusLabel(getActivityStatus(u.last_login_at, u.last_activity_at))}
                  </td>
                  <td className="p-3">{subscriptionPlanLabel(u.subscription_plan)}</td>
                  <td className="p-3">{accessTypeLabel(u.access_type)}</td>
                  <td className="p-3">{subscriptionStatusLabel(u.subscription_status)}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {u.tags.length === 0
                        ? <span className="text-slate-400">—</span>
                        : u.tags.map((t) => <TagBadge key={t.id} tag={t} />)}
                    </div>
                  </td>
                  <td className="p-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-1">
                          <TagIcon className="size-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
                        {tags.map((t) => (
                          <DropdownMenuItem key={t.id} onClick={() => applyToUser(u.id, t.id)}>
                            <span className="mr-2 inline-block size-2 rounded-full" style={{ backgroundColor: t.color }} />
                            {t.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Par page</span>
          <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1) }}>
            <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
            Précédent
          </Button>
          <span className="text-sm text-slate-500">Page {page} / {Math.max(1, totalPages)}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>
            Suivant
          </Button>
        </div>
      </div>

      {/* Confirmation application en masse */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer l'application du tag</DialogTitle>
            <DialogDescription>
              Vous allez appliquer le tag <strong>{bulkTagName}</strong> à{" "}
              <strong>{selectionCount}</strong> utilisateurs. Confirmer ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={applying}>
              Annuler
            </Button>
            <Button onClick={applyBulk} disabled={applying} className="gap-2 bg-neutral-900 text-white hover:bg-neutral-800">
              {applying && <Loader2 className="size-4 animate-spin" />}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Création de tag */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un tag</DialogTitle>
            <DialogDescription>Le tag sera disponible pour tous les utilisateurs.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Nom du tag"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              maxLength={60}
            />
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-600">Couleur</label>
              <input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                className="h-9 w-16 cursor-pointer rounded border border-slate-200"
              />
              <span className="text-xs text-slate-400">{newTagColor}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Annuler
            </Button>
            <Button onClick={createTag} disabled={creating || !newTagName.trim()} className="gap-2 bg-neutral-900 text-white hover:bg-neutral-800">
              {creating && <Loader2 className="size-4 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
