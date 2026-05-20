"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  CreditCard,
  Globe,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Wallet,
  RefreshCw,
  Smartphone,
  WifiOff,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ActiveConfEntry } from "@/app/api/admin/pawapay-active-conf/route";

// ============================================================================
// Helpers
// ============================================================================

const COUNTRY_INFO: Record<string, { name: string; flag: string }> = {
  CIV: { name: "Côte d'Ivoire", flag: "🇨🇮" },
  SEN: { name: "Sénégal",       flag: "🇸🇳" },
  BFA: { name: "Burkina Faso",  flag: "🇧🇫" },
  BEN: { name: "Bénin",         flag: "🇧🇯" },
  MLI: { name: "Mali",          flag: "🇲🇱" },
  TGO: { name: "Togo",          flag: "🇹🇬" },
  CMR: { name: "Cameroun",      flag: "🇨🇲" },
  NER: { name: "Niger",         flag: "🇳🇪" },
  GHA: { name: "Ghana",         flag: "🇬🇭" },
  RWA: { name: "Rwanda",        flag: "🇷🇼" },
  TZA: { name: "Tanzanie",      flag: "🇹🇿" },
  UGA: { name: "Ouganda",       flag: "🇺🇬" },
  ZMB: { name: "Zambie",        flag: "🇿🇲" },
  MOZ: { name: "Mozambique",    flag: "🇲🇿" },
  GIN: { name: "Guinée",        flag: "🇬🇳" },
}

function countryInfo(iso3: string) {
  return COUNTRY_INFO[iso3] ?? { name: iso3, flag: "🌍" }
}

const CORRESPONDENT_LABELS: Record<string, string> = {
  MTN_MOMO:  "MTN Mobile Money",
  MTN:       "MTN Mobile Money",
  ORANGE:    "Orange Money",
  MOOV:      "Moov Money",
  FREE:      "Free Money",
  WAVE:      "Wave",
  VODAFONE:  "Vodafone Cash",
  AIRTEL:    "Airtel Money",
  TIGO:      "Tigo Pesa",
  HALOTEL:   "Halotel",
  ZANTEL:    "Zantel",
  ZAMTEL:    "Zamtel",
  MPESA:     "M-Pesa",
}

function correspondentLabel(code: string): string {
  const prefix = code.split("_").slice(0, -1).join("_")
  return CORRESPONDENT_LABELS[prefix] ?? code
}

interface CountryGroup {
  iso3: string
  name: string
  flag: string
  currency: string
  correspondents: ActiveConfEntry[]
}

function groupByCountry(entries: ActiveConfEntry[]): CountryGroup[] {
  const map = new Map<string, CountryGroup>()
  for (const entry of entries) {
    if (!map.has(entry.country)) {
      const info = countryInfo(entry.country)
      map.set(entry.country, { iso3: entry.country, name: info.name, flag: info.flag, currency: entry.currency, correspondents: [] })
    }
    map.get(entry.country)!.correspondents.push(entry)
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "fr"))
}

function getOps(entry: ActiveConfEntry) {
  return entry.correspondentDescription?.paymentOperations ?? []
}

function isOpActive(entry: ActiveConfEntry, type: string) {
  const ops = getOps(entry)
  if (ops.length === 0) return true // pas de détail → assume actif
  return ops.some((op) => op.operationType === type && op.isActive)
}

// ============================================================================
// Page
// ============================================================================

export default function PaymentMethodsPage() {
  const [groups, setGroups] = useState<CountryGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set())
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/pawapay-active-conf", { credentials: "include" })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Erreur PawaPay API")
      const entries: ActiveConfEntry[] = Array.isArray(json.correspondents) ? json.correspondents : []
      setGroups(groupByCountry(entries))
      setLastUpdated(new Date())
    } catch (e: any) {
      setError(e?.message || "Impossible de joindre PawaPay")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const toggleExpanded = (iso3: string) => {
    setExpandedCountries((prev) => {
      const next = new Set(prev)
      next.has(iso3) ? next.delete(iso3) : next.add(iso3)
      return next
    })
  }

  const totalCorrespondents = groups.reduce((s, g) => s + g.correspondents.length, 0)
  const activeDeposits = groups.reduce(
    (s, g) => s + g.correspondents.filter((c) => isOpActive(c, "DEPOSIT")).length,
    0
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <p className="text-slate-500 text-sm">Chargement depuis PawaPay…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl text-white shadow-lg shadow-orange-500/25">
              <CreditCard className="w-6 h-6" />
            </div>
            Moyens de paiement
          </h1>
          <p className="text-slate-500 mt-2">
            État en temps réel des correspondents configurés sur votre compte PawaPay
            {lastUpdated && (
              <span className="text-xs text-slate-400 ml-2">
                · mis à jour à {lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={isLoading}
          className="gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {/* Erreur */}
      {error && (
        <div className="flex items-start gap-3 px-4 py-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <WifiOff className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Impossible de joindre l'API PawaPay</p>
            <p className="text-red-600 mt-1">{error}</p>
            <p className="text-red-500 mt-1 text-xs">Vérifiez que <code>PAWAPAY_API_TOKEN</code> est configuré et valide.</p>
          </div>
        </div>
      )}

      {/* Stats */}
      {!error && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={<Globe className="w-5 h-5 text-emerald-600" />} bg="bg-emerald-50" value={`${groups.length}`} label="Pays configurés" />
          <StatCard icon={<Smartphone className="w-5 h-5 text-blue-600" />} bg="bg-blue-50" value={`${totalCorrespondents}`} label="Correspondents total" />
          <StatCard icon={<Wallet className="w-5 h-5 text-orange-600" />} bg="bg-orange-50" value={`${activeDeposits}`} label="Dépôts actifs" />
        </div>
      )}

      {/* Actions */}
      {groups.length > 0 && (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setExpandedCountries(
                expandedCountries.size === groups.length
                  ? new Set()
                  : new Set(groups.map((g) => g.iso3))
              )
            }
            className="gap-2"
          >
            {expandedCountries.size === groups.length
              ? <><ChevronUp className="w-4 h-4" /> Tout replier</>
              : <><ChevronDown className="w-4 h-4" /> Tout déplier</>
            }
          </Button>
        </div>
      )}

      {/* Vide */}
      {!error && groups.length === 0 && (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          <Smartphone className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="font-medium">Aucun correspondent retourné par PawaPay</p>
          <p className="text-sm mt-1">Vérifiez votre configuration dans le Dashboard PawaPay.</p>
        </div>
      )}

      {/* Liste pays */}
      <div className="space-y-3">
        {groups.map((group) => {
          const isExpanded = expandedCountries.has(group.iso3)
          const depositActiveCount = group.correspondents.filter((c) => isOpActive(c, "DEPOSIT")).length
          const allActive = depositActiveCount === group.correspondents.length

          return (
            <div key={group.iso3} className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <button
                onClick={() => toggleExpanded(group.iso3)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left"
              >
                <span className="text-2xl">{group.flag}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900">{group.name}</h3>
                  <p className="text-xs text-slate-400">
                    {group.currency} · {group.correspondents.length} correspondent{group.correspondents.length > 1 ? "s" : ""}
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                  allActive
                    ? "bg-emerald-50 text-emerald-700"
                    : depositActiveCount > 0
                      ? "bg-orange-50 text-orange-700"
                      : "bg-red-50 text-red-600"
                }`}>
                  {allActive
                    ? <><CheckCircle2 className="w-3 h-3" /> Tous actifs</>
                    : depositActiveCount > 0
                      ? `${depositActiveCount}/${group.correspondents.length} actifs`
                      : <><XCircle className="w-3 h-3" /> Inactifs</>
                  }
                </div>
                {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />}
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 pt-2 border-t border-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {group.correspondents.map((entry) => {
                      const depositOk = isOpActive(entry, "DEPOSIT")
                      const payoutOk  = isOpActive(entry, "PAYOUT")
                      const refundOk  = isOpActive(entry, "REFUND")
                      const ops = getOps(entry)

                      return (
                        <div
                          key={entry.correspondent}
                          className={`flex flex-col gap-2.5 p-3.5 rounded-xl border-2 ${
                            depositOk ? "border-emerald-200 bg-emerald-50/40" : "border-red-100 bg-red-50/30"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg shrink-0 ${depositOk ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-500"}`}>
                              <Smartphone className="w-4 h-4" />
                            </div>
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {correspondentLabel(entry.correspondent)}
                            </p>
                          </div>

                          <code className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded truncate">
                            {entry.correspondent}
                          </code>

                          {ops.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {depositOk && (
                                <Badge variant="outline" className="text-[9px] gap-1 py-0 border-emerald-300 text-emerald-700">
                                  <ArrowDownCircle className="w-2.5 h-2.5" /> Dépôt
                                </Badge>
                              )}
                              {!depositOk && (
                                <Badge variant="outline" className="text-[9px] gap-1 py-0 border-red-300 text-red-600">
                                  <XCircle className="w-2.5 h-2.5" /> Dépôt inactif
                                </Badge>
                              )}
                              {payoutOk && (
                                <Badge variant="outline" className="text-[9px] gap-1 py-0 border-blue-300 text-blue-700">
                                  <ArrowUpCircle className="w-2.5 h-2.5" /> Payout
                                </Badge>
                              )}
                              {refundOk && (
                                <Badge variant="outline" className="text-[9px] gap-1 py-0 border-orange-300 text-orange-700">
                                  Remb.
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-[9px] py-0 border-emerald-300 text-emerald-700 self-start">
                              <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> Actif
                            </Badge>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!error && groups.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h4 className="font-semibold text-blue-900 flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4" />
            Source de données
          </h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Données chargées depuis <code className="bg-blue-100 px-1 rounded">GET /v2/active-conf</code> PawaPay en temps réel.</li>
            <li>• Pour modifier les correspondents disponibles, utilisez le <a href="https://dashboard.pawapay.io" target="_blank" rel="noreferrer" className="underline font-medium">Dashboard PawaPay</a>.</li>
          </ul>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, bg, value, label }: { icon: React.ReactNode; bg: string; value: string; label: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`p-2 ${bg} rounded-lg`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  )
}
