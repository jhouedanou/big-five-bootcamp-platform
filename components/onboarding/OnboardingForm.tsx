"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CountrySelect } from "@/components/ui/country-select"
import { JobFunctionSelect } from "./JobFunctionSelect"
import { SectorSelector } from "./SectorSelector"
import { trackEvent, trackGA4 } from "@/lib/analytics"
import {
  OTHER_JOB_FUNCTION,
  OTHER_SECTOR_SLUG,
  validateOnboarding,
  type OnboardingPayload,
  type Sector,
  type SelectedSector,
} from "@/lib/onboarding"

interface OnboardingFormProps {
  /** d'où vient l'onboarding : page dédiée ou modal bloquante (tracking) */
  source: "onboarding" | "popup"
  /** appelé après enregistrement réussi (profile_completed = true) */
  onCompleted: () => void
}

export function OnboardingForm({ source, onCompleted }: OnboardingFormProps) {
  // --- secteurs (source Supabase) ---
  const [sectors, setSectors] = useState<Sector[]>([])
  const [sectorsLoading, setSectorsLoading] = useState(true)
  const [sectorsError, setSectorsError] = useState<string | null>(null)

  // --- état formulaire ---
  const [country, setCountry] = useState("")
  const [jobFunction, setJobFunction] = useState("")
  const [jobFunctionOther, setJobFunctionOther] = useState("")
  const [selected, setSelected] = useState<SelectedSector[]>([])

  const [submitting, setSubmitting] = useState(false)

  const otherSectorId = useMemo(
    () => sectors.find((s) => s.slug === OTHER_SECTOR_SLUG)?.id ?? null,
    [sectors]
  )

  async function loadSectors() {
    setSectorsLoading(true)
    setSectorsError(null)
    try {
      const res = await fetch("/api/sectors", { cache: "no-store" })
      if (!res.ok) throw new Error("Erreur de chargement")
      const data = await res.json()
      setSectors(data.sectors ?? [])
    } catch {
      setSectorsError("Impossible de charger les secteurs. Réessayez.")
    } finally {
      setSectorsLoading(false)
    }
  }

  useEffect(() => {
    void loadSectors()
    // Démarrage de l'onboarding (GA4).
    trackGA4("onboarding_started", { source })
  }, [source])

  const payload: Partial<OnboardingPayload> = {
    country,
    job_function: jobFunction,
    job_function_other: jobFunctionOther,
    sectors: selected,
  }
  const isValid = validateOnboarding(payload, otherSectorId) === null

  async function handleSubmit() {
    const validationError = validateOnboarding(payload, otherSectorId)
    if (validationError) {
      toast.error(validationError)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/me/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country,
          job_function: jobFunction,
          job_function_other:
            jobFunction === OTHER_JOB_FUNCTION ? jobFunctionOther.trim() : null,
          sectors: selected,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? "Une erreur est survenue.")
        return
      }

      // GA4 : onboarding_completed (Supabase est écrit côté serveur).
      trackGA4("onboarding_completed", { source, sectors_count: selected.length })
      // Pour le flux popup, persister aussi l'événement critique dédié.
      if (source === "popup") {
        trackEvent(
          "profile_completion_popup_completed",
          { sectors_count: selected.length },
          true
        )
      }

      toast.success("Profil complété. Bienvenue sur Laveiye !")
      onCompleted()
    } catch {
      toast.error("Erreur réseau. Réessayez.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1.5">
        <h2 className="text-xl font-semibold text-neutral-900">
          Complétez votre profil pour continuer
        </h2>
        <p className="text-sm text-neutral-500">
          Ces informations nous permettent de mieux personnaliser votre expérience
          sur Laveiye.
        </p>
      </header>

      {/* Pays — liste complète ISO 3166 + recherche (QA T04) */}
      <div className="space-y-1.5">
        <label htmlFor="onboarding-country" className="text-sm font-medium text-neutral-900">
          Pays <span className="text-[#F2B33D]">*</span>
        </label>
        <CountrySelect
          id="onboarding-country"
          value={country || null}
          onChange={(c) => setCountry(c.name)}
        />
      </div>

      {/* Fonction */}
      <JobFunctionSelect
        value={jobFunction}
        onChange={(v) => {
          setJobFunction(v)
          trackGA4("job_function_selected", { job_function: v })
        }}
        otherValue={jobFunctionOther}
        onOtherChange={setJobFunctionOther}
      />

      {/* Secteurs */}
      {sectorsLoading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-neutral-400">
          <Loader2 className="size-4 animate-spin" />
          Chargement des secteurs…
        </div>
      ) : sectorsError ? (
        <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p>{sectorsError}</p>
          <Button type="button" variant="outline" size="sm" onClick={loadSectors}>
            Réessayer
          </Button>
        </div>
      ) : (
        <SectorSelector
          sectors={sectors}
          selected={selected}
          onChange={setSelected}
          otherSectorId={otherSectorId}
          onSectorSelected={(s) =>
            trackGA4("sector_selected", { sector: s.slug, sector_name: s.name })
          }
        />
      )}

      {/* Validation */}
      <Button
        type="button"
        onClick={handleSubmit}
        disabled={!isValid || submitting}
        className="w-full bg-neutral-900 text-white hover:bg-neutral-800"
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Enregistrement…
          </>
        ) : (
          "Valider et accéder à la plateforme"
        )}
      </Button>
    </div>
  )
}
