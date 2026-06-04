"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Plus, Loader2, Copy, RefreshCw, Trash2, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
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
  DialogFooter,
} from "@/components/ui/dialog"

interface AdminWebinar {
  id: string
  title: string
  slug: string
  short_description: string | null
  full_description: string | null
  date: string
  start_time: string | null
  end_time: string | null
  timezone: string
  meeting_link: string | null
  speaker_name: string | null
  status: "draft" | "published" | "completed" | "cancelled"
  registration_enabled: boolean
  public_preview_enabled: boolean
  max_participants: number | null
  registrations_count: number
}

type FormState = Partial<AdminWebinar>

const EMPTY_FORM: FormState = {
  title: "",
  date: "",
  timezone: "Africa/Abidjan",
  status: "draft",
  registration_enabled: true,
  public_preview_enabled: true,
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  published: "Publié",
  completed: "Terminé",
  cancelled: "Annulé",
}

export function AdminWebinarsClient() {
  const [webinars, setWebinars] = useState<AdminWebinar[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/webinars", { cache: "no-store" })
      const data = await res.json()
      setWebinars(data.webinars ?? [])
    } catch {
      toast.error("Chargement impossible.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(w: AdminWebinar) {
    setEditingId(w.id)
    setForm({ ...w })
    setDialogOpen(true)
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function save() {
    if (!form.title?.trim() || !form.date) {
      toast.error("Titre et date obligatoires.")
      return
    }
    setSaving(true)
    try {
      const isEdit = !!editingId
      const url = isEdit ? `/api/admin/webinars/${editingId}` : "/api/admin/webinars"
      const payload: FormState = {
        title: form.title,
        short_description: form.short_description ?? null,
        full_description: form.full_description ?? null,
        date: form.date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        timezone: form.timezone || "Africa/Abidjan",
        meeting_link: form.meeting_link ?? null,
        speaker_name: form.speaker_name ?? null,
        status: form.status,
        registration_enabled: form.registration_enabled,
        public_preview_enabled: form.public_preview_enabled,
        max_participants: form.max_participants ?? null,
      }
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? "Enregistrement impossible.")
        return
      }
      toast.success(isEdit ? "Session mise à jour." : "Session créée.")
      setDialogOpen(false)
      await load()
    } catch {
      toast.error("Erreur réseau.")
    } finally {
      setSaving(false)
    }
  }

  async function patch(id: string, patchData: Partial<AdminWebinar>, msg: string) {
    try {
      const res = await fetch(`/api/admin/webinars/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchData),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast.error(d?.error ?? "Action impossible.")
        return
      }
      toast.success(msg)
      await load()
    } catch {
      toast.error("Erreur réseau.")
    }
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cette session ? Les inscriptions associées seront supprimées.")) return
    try {
      const res = await fetch(`/api/admin/webinars/${id}`, { method: "DELETE" })
      if (!res.ok) {
        toast.error("Suppression impossible.")
        return
      }
      toast.success("Session supprimée.")
      await load()
    } catch {
      toast.error("Erreur réseau.")
    }
  }

  async function syncMailchimp(id: string) {
    toast.loading("Sync Mailchimp…", { id: "mc" })
    try {
      const res = await fetch(`/api/webinars/${id}/sync-mailchimp`, { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? "Sync impossible.", { id: "mc" })
        return
      }
      toast.success(`${data.synced} contact(s) synchronisé(s).`, { id: "mc" })
    } catch {
      toast.error("Erreur réseau.", { id: "mc" })
    }
  }

  function copyPublicLink(slug: string) {
    const url = `${window.location.origin}/webinaires/${slug}/preview`
    navigator.clipboard.writeText(url).then(
      () => toast.success("Lien public copié."),
      () => toast.error("Copie impossible.")
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Webinaires #BigFiveDécrypte</h1>
          <p className="text-sm text-slate-400">Créer, publier et suivre les sessions.</p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-[#F2B33D] text-black hover:bg-[#d99a2a]">
          <Plus className="size-4" /> Nouvelle session
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-900/50">
        <table className="w-full text-sm text-slate-200">
          <thead className="bg-slate-800/60 text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="p-3">Titre</th>
              <th className="p-3">Date</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Inscrits</th>
              <th className="p-3">Inscriptions</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-6 text-center text-slate-400">Chargement…</td></tr>
            ) : webinars.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-slate-400">Aucune session. Créez-en une.</td></tr>
            ) : (
              webinars.map((w) => (
                <tr key={w.id} className="border-t border-slate-800">
                  <td className="p-3 font-medium">{w.title}</td>
                  <td className="p-3 whitespace-nowrap">{w.date}</td>
                  <td className="p-3">
                    <Select value={w.status} onValueChange={(v) => patch(w.id, { status: v as any }, "Statut mis à jour.")}>
                      <SelectTrigger className="h-8 w-32 bg-slate-800"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABELS).map(([v, l]) => (
                          <SelectItem key={v} value={v}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3">{w.registrations_count}</td>
                  <td className="p-3">
                    <Switch
                      checked={w.registration_enabled}
                      onCheckedChange={(v) => patch(w.id, { registration_enabled: v }, v ? "Inscriptions activées." : "Inscriptions désactivées.")}
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(w)} title="Modifier"><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => copyPublicLink(w.slug)} title="Copier lien public"><Copy className="size-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => syncMailchimp(w.id)} title="Sync Mailchimp"><RefreshCw className="size-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => remove(w.id)} title="Supprimer"><Trash2 className="size-4 text-red-400" /></Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Dialog création / édition */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier la session" : "Nouvelle session"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Field label="Titre *">
              <Input value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} />
            </Field>
            <Field label="Description courte">
              <Input value={form.short_description ?? ""} onChange={(e) => set("short_description", e.target.value)} maxLength={500} />
            </Field>
            <Field label="Description complète">
              <Textarea value={form.full_description ?? ""} onChange={(e) => set("full_description", e.target.value)} rows={3} />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Date *">
                <Input type="date" value={form.date ?? ""} onChange={(e) => set("date", e.target.value)} />
              </Field>
              <Field label="Début">
                <Input type="time" value={form.start_time ?? ""} onChange={(e) => set("start_time", e.target.value)} />
              </Field>
              <Field label="Fin">
                <Input type="time" value={form.end_time ?? ""} onChange={(e) => set("end_time", e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fuseau horaire">
                <Input value={form.timezone ?? ""} onChange={(e) => set("timezone", e.target.value)} />
              </Field>
              <Field label="Intervenant">
                <Input value={form.speaker_name ?? ""} onChange={(e) => set("speaker_name", e.target.value)} />
              </Field>
            </div>
            <Field label="Lien de réunion">
              <Input value={form.meeting_link ?? ""} onChange={(e) => set("meeting_link", e.target.value)} placeholder="https://…" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Participants max">
                <Input
                  type="number"
                  value={form.max_participants ?? ""}
                  onChange={(e) => set("max_participants", e.target.value ? Number(e.target.value) : null)}
                />
              </Field>
              <Field label="Statut">
                <Select value={form.status} onValueChange={(v) => set("status", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
              <span className="text-sm">Inscriptions ouvertes</span>
              <Switch checked={!!form.registration_enabled} onCheckedChange={(v) => set("registration_enabled", v)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
              <span className="text-sm">Aperçu public activé</span>
              <Switch checked={!!form.public_preview_enabled} onCheckedChange={(v) => set("public_preview_enabled", v)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Annuler</Button>
            <Button onClick={save} disabled={saving} className="gap-2 bg-neutral-900 text-white hover:bg-neutral-800">
              {saving && <Loader2 className="size-4 animate-spin" />}
              {editingId ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-500">{label}</label>
      {children}
    </div>
  )
}
