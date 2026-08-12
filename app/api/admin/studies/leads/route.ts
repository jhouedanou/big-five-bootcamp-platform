import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { checkAdmin } from '@/lib/admin-auth'
import { parseLeadFilters, applyLeadFilters, endOfDayIso } from '@/lib/study-leads'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50
const MAX_PAGE_SIZE = 200

/**
 * GET /api/admin/studies/leads?studyId=&source=&from=&to=&offset=&limit=
 * Liste des contacts + KPI du funnel.
 */
export async function GET(request: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const filters = parseLeadFilters(searchParams)
    const offset = Math.max(0, Number(searchParams.get('offset')) || 0)
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number(searchParams.get('limit')) || PAGE_SIZE)
    )

    const admin = getSupabaseAdmin()

    let query = admin
      .from('study_leads')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    query = applyLeadFilters(query, filters)

    const { data, count, error } = await query
    if (error) {
      if ((error as any).code === '42P01') {
        return NextResponse.json(
          { error: 'Table study_leads absente. Exécutez la migration 12.' },
          { status: 503 }
        )
      }
      throw error
    }

    const leads = (data as any[]) || []

    // Téléchargements et répartition par source, sur l'ensemble filtré (pas
    // seulement la page courante), sinon les KPI changeraient à la pagination.
    let statsQuery = admin.from('study_leads').select('utm_source, downloaded_at')
    statsQuery = applyLeadFilters(statsQuery, filters)
    const { data: allRows } = await statsQuery

    const bySource = new Map<string, number>()
    let downloads = 0
    for (const row of (allRows as any[]) || []) {
      const source = row.utm_source || 'direct'
      bySource.set(source, (bySource.get(source) || 0) + 1)
      if (row.downloaded_at) downloads++
    }

    // Funnel amont : visites et ouvertures de formulaire vivent dans
    // analytics_events (visiteurs anonymes compris). Table optionnelle.
    let pageViews: number | null = null
    let formOpens: number | null = null
    try {
      const eventCount = async (name: string) => {
        let q = admin
          .from('analytics_events')
          .select('*', { count: 'exact', head: true })
          .eq('event_name', name)
        if (filters.from) q = q.gte('created_at', new Date(filters.from).toISOString())
        if (filters.to) q = q.lte('created_at', endOfDayIso(filters.to))
        const { count } = await q
        return count ?? 0
      }
      pageViews = await eventCount('study_page_view')
      formOpens = await eventCount('study_form_open')
    } catch {
      // analytics_events absente : les KPI amont restent indisponibles, le
      // reste du tableau de bord fonctionne.
    }

    const total = count ?? leads.length

    return NextResponse.json({
      leads,
      total,
      hasMore: offset + leads.length < total,
      stats: {
        leads: total,
        downloads,
        pageViews,
        formOpens,
        // Taux de conversion visite → lead. Null si les visites sont inconnues.
        conversionRate: pageViews && pageViews > 0 ? total / pageViews : null,
        bySource: [...bySource.entries()]
          .map(([source, leadCount]) => ({ source, leads: leadCount }))
          .sort((a, b) => b.leads - a.leads),
      },
    })
  } catch (error: any) {
    console.error('Erreur GET admin leads étude:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
