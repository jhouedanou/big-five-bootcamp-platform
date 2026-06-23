"use client"

import { useEffect, useState } from "react"
import {
  Megaphone,
  Activity,
  Building2,
  Globe,
  Gem,
  Star,
  Crown,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface AdminStats {
  campaigns: number
  activeUsers: number
  brands: number
  countries: number
  subscribers: { decouverte: number; basic: number; pro: number }
}

interface Kpi {
  label: string
  value: number
  icon: React.ElementType
  accent?: boolean
}

export function AdminStatsBlock({ className }: { className?: string }) {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    fetch("/api/admin/stats", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((d) => {
        if (alive) {
          setStats(d)
          setLoading(false)
        }
      })
      .catch(() => {
        if (alive) {
          setError(true)
          setLoading(false)
        }
      })
    return () => {
      alive = false
    }
  }, [])

  if (loading) {
    return (
      <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7", className)}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800/50"
          />
        ))}
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Impossible de charger les statistiques.
      </div>
    )
  }

  const kpis: Kpi[] = [
    { label: "Campagnes", value: stats.campaigns, icon: Megaphone },
    { label: "Utilisateurs actifs", value: stats.activeUsers, icon: Activity, accent: true },
    { label: "Marques", value: stats.brands, icon: Building2 },
    { label: "Pays couverts", value: stats.countries, icon: Globe },
    { label: "Abonnés Découverte", value: stats.subscribers.decouverte, icon: Gem },
    { label: "Abonnés Basic", value: stats.subscribers.basic, icon: Star },
    { label: "Abonnés Pro", value: stats.subscribers.pro, icon: Crown, accent: true },
  ]

  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7", className)}>
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className={cn(
            "rounded-xl border bg-white p-4 dark:bg-slate-900",
            kpi.accent
              ? "border-[#F2B33D]/40 dark:border-[#F2B33D]/30"
              : "border-slate-200 dark:border-slate-800"
          )}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">{kpi.label}</span>
            <kpi.icon
              className={cn("size-4", kpi.accent ? "text-[#F2B33D]" : "text-slate-400")}
            />
          </div>
          <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
            {kpi.value.toLocaleString("fr-FR")}
          </p>
        </div>
      ))}
    </div>
  )
}
