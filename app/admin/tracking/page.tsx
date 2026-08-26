"use client"

import { useCallback, useEffect, useState } from "react"
import { Activity, AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface TrackedEvent {
  event: string
  priority: "P0" | "P1"
  section: string
  trigger: string
  params: string[]
  observability: "supabase" | "datalayer" | "absent"
  where: string
  note: string | null
  count: number
  totalCount: number
  lastSeen: string | null
  missingParams: string[]
}

interface RecentEvent {
  event_name: string
  created_at: string
  source: string | null
  page_url: string | null
  user_id: string | null
}

interface Payload {
  window: string
  since: string
  events: TrackedEvent[]
  recent: RecentEvent[]
}

const WINDOWS = [
  { key: "24h", label: "24 heures" },
  { key: "7d", label: "7 jours" },
  { key: "30d", label: "30 jours" },
]

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return "—"
  }
}

/** Verdict d'une ligne : c'est lui qui porte l'information utile. */
function verdict(e: TrackedEvent): {
  tone: "ok" | "warn" | "bad" | "muted"
  label: string
} {
  if (e.observability === "absent") return { tone: "muted", label: "Sans objet" }
  if (e.observability === "datalayer") return { tone: "muted", label: "À voir dans GTM" }
  if (e.count === 0) {
    // Deux silences distincts : « jamais reçu » demande une investigation
    // (instrumentation pas déployée, ou fonction jamais utilisée) ; « rien sur
    // la période » signifie que la mesure fonctionne mais que l'action ne
    // s'est pas produite dans la fenêtre.
    if (e.totalCount > 0) return { tone: "muted", label: "Rien sur la période" }
    return e.priority === "P0"
      ? { tone: "bad", label: "Jamais reçu" }
      : { tone: "warn", label: "Jamais reçu" }
  }
  if (e.missingParams.length > 0) return { tone: "warn", label: "Paramètres manquants" }
  return { tone: "ok", label: "Conforme" }
}

const TONE_CLASS: Record<string, string> = {
  ok: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warn: "bg-amber-50 text-amber-700 border-amber-200",
  bad: "bg-red-50 text-red-700 border-red-200",
  muted: "bg-muted text-muted-foreground border-transparent",
}

export default function AdminTrackingPage() {
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [windowKey, setWindowKey] = useState("7d")

  const load = useCallback(async (w: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/tracking?window=${encodeURIComponent(w)}`)
      setData(res.ok ? await res.json() : null)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(windowKey)
  }, [load, windowKey])

  const measurable = data?.events.filter((e) => e.observability === "supabase") ?? []
  const arriving = measurable.filter((e) => e.count > 0)
  const p0Silent = measurable.filter(
    (e) => e.priority === "P0" && e.count === 0 && e.totalCount === 0
  )
  const incomplete = measurable.filter((e) => e.count > 0 && e.missingParams.length > 0)

  const sections = Array.from(new Set(data?.events.map((e) => e.section) ?? []))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Activity className="h-6 w-6 text-[#F2B33D]" />
            Suivi du tracking
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {WINDOWS.map((w) => (
            <Button
              key={w.key}
              size="sm"
              variant={windowKey === w.key ? "default" : "outline"}
              onClick={() => setWindowKey(w.key)}
            >
              {w.label}
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={() => load(windowKey)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Lecture des événements…
        </div>
      ) : !data ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Impossible de lire les événements. Vérifiez votre session administrateur.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-5">
                <div className="text-2xl font-bold tabular-nums">
                  {arriving.length}/{measurable.length}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  événements mesurables reçus sur la période
                </p>
              </CardContent>
            </Card>
            <Card className={p0Silent.length > 0 ? "border-red-200" : undefined}>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-2xl font-bold tabular-nums">
                  {p0Silent.length > 0 && <AlertTriangle className="h-5 w-5 text-red-600" />}
                  {p0Silent.length === 0 && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                  {p0Silent.length}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {p0Silent.length === 0
                    ? "aucun événement P0 jamais reçu"
                    : "événements P0 jamais reçus"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="text-2xl font-bold tabular-nums">{incomplete.length}</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  reçus mais sans tous les paramètres du brief
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Derniers événements reçus
            </h2>
            <Card>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Quand</th>
                      <th className="px-4 py-3 font-medium">Événement</th>
                      <th className="px-4 py-3 font-medium">Source</th>
                      <th className="px-4 py-3 font-medium">Page</th>
                      <th className="px-4 py-3 font-medium">Compte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                          Aucun événement enregistré.
                        </td>
                      </tr>
                    ) : (
                      data.recent.map((r, i) => (
                        <tr key={`${r.created_at}-${i}`} className="border-b last:border-0">
                          <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                            {formatDate(r.created_at)}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[13px]">{r.event_name}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{r.source || "—"}</td>
                          <td className="max-w-[220px] truncate px-4 py-2.5 text-muted-foreground">
                            {r.page_url || "—"}
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">
                            {r.user_id ? "connecté" : "anonyme"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          {sections.map((section) => (
            <div key={section} className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {section}
              </h2>
              <Card>
                <CardContent className="overflow-x-auto p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-3 font-medium">Événement</th>
                        <th className="px-4 py-3 font-medium">Prio</th>
                        <th className="px-4 py-3 text-right font-medium">Reçus</th>
                        <th className="px-4 py-3 font-medium">Dernier</th>
                        <th className="px-4 py-3 font-medium">État</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.events
                        .filter((e) => e.section === section)
                        .map((e) => {
                          const v = verdict(e)
                          return (
                            <tr key={e.event} className="border-b last:border-0 align-top">
                              <td className="px-4 py-3">
                                <div className="font-mono text-[13px] font-medium">{e.event}</div>
                                <div className="mt-0.5 max-w-md text-xs text-muted-foreground">
                                  {e.trigger}
                                </div>
                                {e.missingParams.length > 0 && (
                                  <div className="mt-1 text-xs text-amber-700">
                                    Absents de la dernière occurrence :{" "}
                                    <span className="font-mono">
                                      {e.missingParams.join(", ")}
                                    </span>
                                  </div>
                                )}
                                {e.note && (
                                  <div className="mt-1 max-w-md text-xs italic text-muted-foreground">
                                    {e.note}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <Badge
                                  variant="outline"
                                  className={
                                    e.priority === "P0" ? "border-red-300 text-red-700" : ""
                                  }
                                >
                                  {e.priority}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-right font-mono tabular-nums">
                                {e.observability === "supabase" ? e.count : "—"}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                                {e.observability === "supabase" ? formatDate(e.lastSeen) : "—"}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${TONE_CLASS[v.tone]}`}
                                >
                                  {v.label}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          ))}

        </>
      )}
    </div>
  )
}
