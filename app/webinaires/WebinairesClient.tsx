"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { CalendarDays, Clock, User, Users, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar"
import { StatusBadge } from "@/components/webinars/StatusBadge"
import { AddToCalendar } from "@/components/webinars/AddToCalendar"
import { trackGA4 } from "@/lib/analytics"
import { cn } from "@/lib/utils"
import {
  computePublicStatus,
  canRegister,
  isPast,
  type WebinarWithMeta,
} from "@/lib/webinars"

function fmtDate(date: string) {
  try {
    return new Date(`${date}T00:00:00`).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
  } catch {
    return date
  }
}

function fmtTime(w: WebinarWithMeta) {
  const s = (w.start_time || "").slice(0, 5)
  const e = (w.end_time || "").slice(0, 5)
  if (s && e) return `${s} – ${e}`
  if (s) return s
  return "Heure à confirmer"
}

export function WebinairesClient({ highlightSlug }: { highlightSlug?: string }) {
  const [webinars, setWebinars] = useState<WebinarWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [registeringId, setRegisteringId] = useState<string | null>(null)
  const [registerTarget, setRegisterTarget] = useState<WebinarWithMeta | null>(null)
  const [phone, setPhone] = useState("")
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Préserve l'intention d'inscription venue de l'aperçu public : scroll + halo.
  useEffect(() => {
    if (loading || !highlightSlug) return
    const target = webinars.find((w) => w.slug === highlightSlug)
    if (target && cardRefs.current[target.id]) {
      cardRefs.current[target.id]?.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [loading, highlightSlug, webinars])

  useEffect(() => {
    fetch("/api/webinars", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((d) => {
        setWebinars(d.webinars ?? [])
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [])

  // Prochaines sessions en premier, puis passées.
  const sorted = useMemo(() => {
    const now = Date.now()
    const upcoming = webinars.filter((w) => !isPast(w, now))
    const past = webinars.filter((w) => isPast(w, now))
    past.reverse()
    return [...upcoming, ...past]
  }, [webinars])

  function openRegister(w: WebinarWithMeta) {
    trackGA4("webinar_signup_clicked", { webinar_id: w.id })
    setPhone("")
    setRegisterTarget(w)
  }

  async function confirmRegister() {
    const w = registerTarget
    if (!w) return
    setRegisteringId(w.id)
    try {
      const res = await fetch(`/api/webinars/${w.id}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? "Inscription impossible.")
        if (data?.alreadyRegistered) {
          setWebinars((prev) => prev.map((x) => (x.id === w.id ? { ...x, is_registered: true } : x)))
          setRegisterTarget(null)
        }
        return
      }
      toast.success("Inscription confirmée. Un email de confirmation vous a été envoyé.")
      setWebinars((prev) =>
        prev.map((x) =>
          x.id === w.id
            ? { ...x, is_registered: true, registrations_count: x.registrations_count + 1 }
            : x
        )
      )
      setRegisterTarget(null)
    } catch {
      toast.error("Erreur réseau.")
    } finally {
      setRegisteringId(null)
    }
  }

  return (
    <>
    <DashboardNavbar showSearch={false} />
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-neutral-900">Webinaires #BigFiveDécrypte</h1>
        <p className="text-sm text-neutral-500">
          Le programme complet de nos sessions. Inscrivez-vous en un clic.
        </p>
      </header>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl bg-neutral-100" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          Impossible de charger les webinaires. Réessayez plus tard.
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-10 text-center text-neutral-500">
          Aucun webinaire programmé pour le moment.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sorted.map((w) => {
            const status = computePublicStatus(w, w.registrations_count)
            const eligible = canRegister(w, w.registrations_count)
            return (
              <div
                key={w.id}
                ref={(el) => {
                  cardRefs.current[w.id] = el
                }}
                className={cn(
                  "flex flex-col rounded-xl border bg-white p-5 transition-shadow",
                  highlightSlug && w.slug === highlightSlug
                    ? "border-[#F2B33D] ring-2 ring-[#F2B33D]/40"
                    : "border-neutral-200"
                )}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-neutral-900">{w.title}</h2>
                  <StatusBadge status={status} />
                </div>
                {w.short_description && (
                  <p className="mb-3 line-clamp-2 text-sm text-neutral-500">{w.short_description}</p>
                )}
                <div className="space-y-1.5 text-sm text-neutral-600">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="size-4 text-neutral-400" /> {fmtDate(w.date)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 text-neutral-400" /> {fmtTime(w)} ({w.timezone})
                  </div>
                  {w.speaker_name && (
                    <div className="flex items-center gap-2">
                      <User className="size-4 text-neutral-400" /> {w.speaker_name}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Users className="size-4 text-neutral-400" /> {w.registrations_count} inscrit(s)
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {w.is_registered ? (
                    <>
                      <span className="inline-flex items-center rounded-lg bg-green-100 px-3 py-1.5 text-sm font-medium text-green-700">
                        Inscrit ✓
                      </span>
                      <AddToCalendar webinar={w} />
                    </>
                  ) : eligible ? (
                    <Button
                      onClick={() => openRegister(w)}
                      disabled={registeringId === w.id}
                      className="gap-2 bg-neutral-900 text-white hover:bg-neutral-800"
                    >
                      {registeringId === w.id && <Loader2 className="size-4 animate-spin" />}
                      S'inscrire
                    </Button>
                  ) : (
                    <span className="text-sm text-neutral-400">
                      {status === "complet" ? "Session complète" : "Inscriptions fermées"}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>

    <Dialog open={!!registerTarget} onOpenChange={(o) => !o && setRegisterTarget(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmer votre inscription</DialogTitle>
          <DialogDescription>
            {registerTarget?.title}. Laissez votre numéro WhatsApp pour recevoir le
            rappel et le lien de la session (facultatif).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-neutral-900">Téléphone (WhatsApp)</label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="07 00 00 00 00"
            inputMode="tel"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setRegisterTarget(null)}
            disabled={!!registeringId}
          >
            Annuler
          </Button>
          <Button
            onClick={confirmRegister}
            disabled={!!registeringId}
            className="gap-2 bg-neutral-900 text-white hover:bg-neutral-800"
          >
            {registeringId && <Loader2 className="size-4 animate-spin" />}
            Confirmer l'inscription
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
