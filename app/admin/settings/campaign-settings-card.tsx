"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Megaphone, Loader2, Save, CheckCircle2, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { saveCampaignConfig } from "@/app/actions/user"

const parseBool = (v: unknown) =>
  typeof v === "string" && ["1", "true", "yes", "on", "enabled"].includes(v.trim().toLowerCase())

// Convertit une valeur ISO/datetime stockée en "YYYY-MM-DD" pour <input type=date>.
const toDateInput = (v: unknown): string => {
  if (typeof v !== "string" || !v) return ""
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v.slice(0, 10)
  return d.toISOString().slice(0, 10)
}

export function CampaignSettingsCard() {
  const [enabled, setEnabled] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [freeDays, setFreeDays] = useState(90)
  const [activateExisting, setActivateExisting] = useState(true)
  const [existingActivatedAt, setExistingActivatedAt] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/admin/settings")
        const data = await res.json()
        const s = data.settings || {}
        setEnabled(parseBool(s.campaign_enabled))
        setStartDate(toDateInput(s.campaign_start_date))
        setEndDate(toDateInput(s.campaign_end_date))
        const d = parseInt(s.campaign_free_days ?? "", 10)
        setFreeDays(Number.isFinite(d) && d > 0 ? d : 90)
        setExistingActivatedAt(s.campaign_existing_activated_at || null)
      } catch {
        console.error("Erreur chargement config campagne")
      } finally {
        setIsLoading(false)
      }
    })()
  }, [])

  // La campagne est-elle ouverte au public maintenant (aperçu live) ?
  const publicActiveNow = (() => {
    if (!enabled) return false
    const now = new Date()
    if (startDate && now < new Date(startDate)) return false
    if (endDate && now > new Date(endDate + "T23:59:59.999Z")) return false
    return true
  })()

  const handleSave = async () => {
    if (endDate && startDate && new Date(endDate) <= new Date(startDate)) {
      toast.error("La date de fin doit être après la date de début")
      return
    }
    setIsSaving(true)
    try {
      const res = await saveCampaignConfig({
        enabled,
        startDate: startDate || null,
        endDate: endDate || null,
        freeDays,
        activateExistingNow: activateExisting,
      })
      if (!res.success) {
        toast.error(res.error || "Erreur lors de la sauvegarde")
        return
      }
      if (res.activation) {
        toast.success(
          `Campagne enregistrée — ${res.activation.activated} compte(s) existant(s) activé(s)`
        )
        setExistingActivatedAt(new Date().toISOString())
      } else {
        toast.success("Campagne enregistrée")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="bg-white dark:bg-card border-gray-200 shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#F2B33D]/10">
            <Megaphone className="h-5 w-5 text-[#F2B33D]" />
          </div>
          <div>
            <CardTitle className="text-foreground">Campagne LAVEIYE — Accès Basic gratuit</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Ouvre l&apos;accès Basic gratuitement. Configuration unique : les comptes existants
              sont activés à l&apos;enregistrement, les inscriptions publiques s&apos;ouvrent et se
              ferment automatiquement selon les dates.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 max-w-lg">
        {isLoading ? (
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Chargement...</span>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-foreground text-base">Campagne activée</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Interrupteur maître de la campagne
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} disabled={isSaving} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="campaign-start" className="text-foreground">
                  Ouverture publique (lundi)
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                  Les nouvelles inscriptions reçoivent Basic à partir de cette date
                </p>
                <Input
                  id="campaign-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={isSaving}
                />
              </div>
              <div>
                <Label htmlFor="campaign-end" className="text-foreground">
                  Fin de campagne
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                  Après cette date, plus d&apos;activation automatique
                </p>
                <Input
                  id="campaign-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="max-w-[12rem]">
              <Label htmlFor="campaign-days" className="text-foreground">
                Durée offerte (jours)
              </Label>
              <Input
                id="campaign-days"
                type="number"
                min={1}
                max={730}
                value={freeDays}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10)
                  setFreeDays(Number.isFinite(n) && n > 0 ? n : 90)
                }}
                disabled={isSaving}
                className="mt-1.5"
              />
            </div>

            {/* Statut live */}
            <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Inscriptions publiques :</span>
                {publicActiveNow ? (
                  <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                    <CheckCircle2 className="h-4 w-4" /> ouvertes
                  </span>
                ) : (
                  <span className="text-gray-500">fermées</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Comptes existants :</span>
                {existingActivatedAt ? (
                  <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                    <CheckCircle2 className="h-4 w-4" /> activés le{" "}
                    {new Date(existingActivatedAt).toLocaleDateString("fr-FR")}
                  </span>
                ) : (
                  <span className="text-amber-600">non activés</span>
                )}
              </div>
            </div>

            {!existingActivatedAt && (
              <label className="flex items-start gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={activateExisting}
                  onChange={(e) => setActivateExisting(e.target.checked)}
                  disabled={isSaving}
                  className="mt-0.5 h-4 w-4"
                />
                <span>
                  Activer immédiatement tous les comptes déjà enregistrés (Basic {freeDays}j).
                  Les comptes Pro actifs sont conservés.
                </span>
              </label>
            )}

            {enabled && (
              <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  L&apos;activation des comptes existants est une opération en masse irréversible
                  (un seul déclenchement, idempotent).
                </div>
              </div>
            )}

            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-[#F2B33D] hover:bg-[#e0a435] text-white"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer la campagne
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
