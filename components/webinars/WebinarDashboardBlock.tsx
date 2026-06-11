"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { CalendarDays, Clock, Users, Loader2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AddToCalendar } from "./AddToCalendar"
import { trackEvent, trackGA4 } from "@/lib/analytics"
import { canRegister, type WebinarWithMeta } from "@/lib/webinars"

function fmtDate(date: string) {
  try {
    return new Date(`${date}T00:00:00`).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    })
  } catch {
    return date
  }
}

/** Bloc "À ne pas manquer" — prochaine session #BigFiveDécrypte. */
export function WebinarDashboardBlock() {
  const [webinar, setWebinar] = useState<WebinarWithMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const viewedRef = useRef(false)

  useEffect(() => {
    fetch("/api/webinars/next", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setWebinar(d.webinar ?? null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!loading && !viewedRef.current) {
      viewedRef.current = true
      trackEvent("webinar_block_viewed", { webinar_id: webinar?.id ?? null })
    }
  }, [loading, webinar])

  async function register() {
    if (!webinar) return
    trackGA4("webinar_signup_clicked", { webinar_id: webinar.id, source: "dashboard_block" })
    setRegistering(true)
    try {
      const res = await fetch(`/api/webinars/${webinar.id}/register`, { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? "Inscription impossible.")
        if (data?.alreadyRegistered) setWebinar({ ...webinar, is_registered: true })
        return
      }
      toast.success("Inscription confirmée. Email de confirmation envoyé.")
      setWebinar({ ...webinar, is_registered: true, registrations_count: webinar.registrations_count + 1 })
    } catch {
      toast.error("Erreur réseau.")
    } finally {
      setRegistering(false)
    }
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-neutral-100" />
  }

  // Pleine largeur (QA T47) : mêmes dimensions que la bannière « Temps forts »
  // (rounded-2xl, min-h-56) — contenu à gauche, actions à droite sur desktop.
  return (
    <div className="flex min-h-56 flex-col justify-center gap-4 rounded-2xl border border-[#F2B33D]/30 bg-gradient-to-br from-[#F2B33D]/10 to-white px-6 py-7 sm:px-8">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <CalendarDays className="size-4 text-[#F2B33D]" />
          <h3 className="font-semibold text-neutral-900">À ne pas manquer</h3>
        </div>
        <p className="text-xs font-medium uppercase tracking-wide text-[#b8860b]">
          Prochaine session #BigFiveDécrypte
        </p>
      </div>

      {!webinar ? (
        <p className="text-sm text-neutral-500">Aucune session programmée pour le moment.</p>
      ) : (
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xl font-semibold text-neutral-900">{webinar.title}</p>
            <div className="mt-2 flex flex-col gap-1 text-sm text-neutral-600 sm:flex-row sm:flex-wrap sm:gap-x-5">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-3.5 text-neutral-400" /> {fmtDate(webinar.date)}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="size-3.5 text-neutral-400" />
                {(webinar.start_time || "").slice(0, 5) || "Heure à confirmer"}
              </div>
              <div className="flex items-center gap-2">
                <Users className="size-3.5 text-neutral-400" /> {webinar.registrations_count} inscrit(s)
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:shrink-0">
            {webinar.is_registered ? (
              <AddToCalendar webinar={webinar} />
            ) : canRegister(webinar, webinar.registrations_count) ? (
              <Button
                onClick={register}
                disabled={registering}
                className="gap-2 bg-neutral-900 text-white hover:bg-neutral-800"
              >
                {registering && <Loader2 className="size-4 animate-spin" />}
                S'inscrire
              </Button>
            ) : (
              <span className="text-sm text-neutral-400">Inscriptions fermées</span>
            )}
          </div>
        </div>
      )}

      <Link
        href="/webinaires"
        onClick={() => trackEvent("webinar_program_clicked", {})}
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-neutral-700 hover:text-neutral-900"
      >
        Voir le programme des webinaires <ArrowRight className="size-3.5" />
      </Link>
    </div>
  )
}
