/**
 * Constantes et types partagés de l'onboarding obligatoire Laveiye.
 * Les secteurs NE sont PAS ici : ils vivent dans Supabase (table `sectors`).
 * Les fonctions et la liste pays restent en dur (listes courtes et stables).
 */

export const MIN_SECTORS = 1
export const MAX_SECTORS = 3

/** slug spécial du secteur "Autre" → déclenche le champ texte libre */
export const OTHER_SECTOR_SLUG = "autre"

/** Valeur spéciale de fonction "Autre" → déclenche le champ texte obligatoire */
export const OTHER_JOB_FUNCTION = "Autre"

export const JOB_FUNCTIONS: readonly string[] = [
  "Community Manager",
  "Responsable communication",
  "Directeur communication",
  "Responsable marketing",
  "Chef de projet",
  "Social media manager",
  "Directeur artistique",
  "Manager de marque",
  "Directeur marketing",
  "Entrepreneur",
  "Étudiant",
  OTHER_JOB_FUNCTION,
] as const

/**
 * Liste pays — Afrique francophone en priorité puis quelques marchés clés.
 * Liste courte et stable → acceptable en dur. Si elle devient évolutive,
 * la migrer vers une table Supabase comme les secteurs.
 */
export const COUNTRIES: readonly string[] = [
  "Bénin",
  "Burkina Faso",
  "Cameroun",
  "Congo",
  "Côte d'Ivoire",
  "Gabon",
  "Guinée",
  "Mali",
  "Maroc",
  "Niger",
  "République démocratique du Congo",
  "Sénégal",
  "Togo",
  "Tunisie",
  "France",
  "Canada",
  "Belgique",
  "Autre",
] as const

export interface Sector {
  id: string
  name: string
  slug: string
  display_order: number
}

export interface SelectedSector {
  sector_id: string
  /** renseigné uniquement quand le secteur est "Autre" */
  sector_other_value?: string | null
}

export interface ProfileStatus {
  profile_completed: boolean
  onboarding_completed: boolean
  country: string | null
  job_function: string | null
  job_function_other: string | null
  sector_ids: string[]
}

/** Payload attendu par PATCH /api/me/onboarding */
export interface OnboardingPayload {
  country: string
  job_function: string
  job_function_other?: string | null
  sectors: SelectedSector[]
}

/**
 * Validation métier partagée client/serveur.
 * Retourne un message d'erreur ou null si valide.
 */
export function validateOnboarding(
  payload: Partial<OnboardingPayload>,
  otherSectorId: string | null
): string | null {
  const country = payload.country?.trim()
  const jobFunction = payload.job_function?.trim()
  const sectors = payload.sectors ?? []

  if (!country) return "Le pays est obligatoire."
  if (!jobFunction) return "La fonction est obligatoire."

  if (jobFunction === OTHER_JOB_FUNCTION && !payload.job_function_other?.trim()) {
    return "Veuillez préciser votre fonction."
  }

  if (sectors.length < MIN_SECTORS) {
    return "Veuillez sélectionner au moins 1 secteur."
  }
  if (sectors.length > MAX_SECTORS) {
    return `Vous pouvez sélectionner jusqu'à ${MAX_SECTORS} secteurs maximum.`
  }

  // Si le secteur "Autre" est choisi, sa valeur texte est attendue.
  if (otherSectorId) {
    const other = sectors.find((s) => s.sector_id === otherSectorId)
    if (other && !other.sector_other_value?.trim()) {
      return "Veuillez préciser votre secteur d'activité."
    }
  }

  return null
}
