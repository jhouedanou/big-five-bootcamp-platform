"use client"

import { useEffect } from "react"
import Link from "next/link"
import { CalendarDays, Clock, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { trackEvent } from "@/lib/analytics"

interface PreviewData {
  id: string
  slug: string
  title: string
  short_description: string | null
  date: string
  start_time: string | null
  end_time: string | null
  timezone: string
  speaker_name: string | null
}

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

/** Aperçu public partageable d'une session (non connecté). */
export function PreviewView({ webinar }: { webinar: PreviewData }) {
  useEffect(() => {
    trackEvent("webinar_preview_viewed", { webinar_id: webinar.id, slug: webinar.slug })
  }, [webinar.id, webinar.slug])

  const redirect = encodeURIComponent(`/webinaires?session=${webinar.slug}`)
  const start = (webinar.start_time || "").slice(0, 5)
  const end = (webinar.end_time || "").slice(0, 5)
  const timeStr = start ? (end ? `${start} – ${end}` : start) : "Heure à confirmer"

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-neutral-900 px-3 py-1 text-xs font-semibold text-[#F2B33D]">
          <Sparkles className="size-3.5" /> #BigFiveDécrypte
        </div>

        <h1 className="mb-2 text-2xl font-bold text-neutral-900">{webinar.title}</h1>
        {webinar.short_description && (
          <p className="mb-5 text-sm text-neutral-600">{webinar.short_description}</p>
        )}

        <div className="mb-6 space-y-2 text-sm text-neutral-700">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-neutral-400" /> {fmtDate(webinar.date)}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-neutral-400" /> {timeStr} ({webinar.timezone})
          </div>
          {webinar.speaker_name && (
            <div className="text-neutral-500">Intervenant : {webinar.speaker_name}</div>
          )}
        </div>

        <div className="space-y-2">
          <Button asChild className="w-full bg-neutral-900 text-white hover:bg-neutral-800">
            <Link href={`/login?redirect=${redirect}`}>Se connecter pour s'inscrire</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href={`/register?redirect=${redirect}`}>Créer un compte pour s'inscrire</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
