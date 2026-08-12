/**
 * Filtres partagés par la liste des leads et l'export CSV.
 *
 * Volontairement dans une lib et non dans l'un des deux fichiers de route :
 * si les deux ne filtrent pas exactement pareil, l'export ne correspond plus à
 * ce que l'admin voit à l'écran — le genre d'écart qu'on ne remarque qu'une
 * fois le fichier envoyé au client.
 */

export interface LeadFilters {
  studyId: string | null
  source: string | null
  from: string | null
  to: string | null
}

export function parseLeadFilters(searchParams: URLSearchParams): LeadFilters {
  return {
    studyId: searchParams.get('studyId') || null,
    source: searchParams.get('source') || null,
    from: searchParams.get('from') || null,
    to: searchParams.get('to') || null,
  }
}

/** Borne haute inclusive : l'utilisateur choisit un jour, pas un instant. */
export function endOfDayIso(date: string): string {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

export function applyLeadFilters<T>(query: T, filters: LeadFilters): T {
  let q: any = query
  if (filters.studyId) q = q.eq('study_id', filters.studyId)
  if (filters.source) {
    // « direct » = aucune source d'acquisition renseignée.
    q = filters.source === 'direct' ? q.is('utm_source', null) : q.eq('utm_source', filters.source)
  }
  if (filters.from) q = q.gte('created_at', new Date(filters.from).toISOString())
  if (filters.to) q = q.lte('created_at', endOfDayIso(filters.to))
  return q as T
}
