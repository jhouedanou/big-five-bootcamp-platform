import { NextResponse } from 'next/server'
import { getSupabaseAdmin, getAuthenticatedUser } from '@/lib/supabase-server'
import { mapBannerRow } from '@/lib/dashboard-banners'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/banners/active
 * Bannières diffusables maintenant, pour le carrousel du dashboard.
 *
 * Le filtrage par fenêtre de dates se fait en SQL et non côté client : une
 * bannière expirée ne doit pas pouvoir réapparaître en trafiquant l'horloge
 * du navigateur.
 */
export async function GET() {
  try {
    // Le dashboard est un espace connecté ; on ne sert pas de bannière à un
    // visiteur anonyme (la policy RLS dit la même chose).
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ banners: [] })
    }

    const nowIso = new Date().toISOString()
    const admin = getSupabaseAdmin()

    const { data, error } = await admin
      .from('dashboard_banners')
      .select('*')
      .eq('is_active', true)
      .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
      .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      // Table absente (migration 13 non exécutée) ou erreur de lecture : on
      // renvoie une liste vide plutôt qu'une erreur — une bannière manquante ne
      // doit jamais casser le dashboard.
      console.error('Lecture dashboard_banners échouée:', (error as any).code, error.message)
      return NextResponse.json({ banners: [] })
    }

    return NextResponse.json({ banners: (data || []).map(mapBannerRow) })
  } catch (error) {
    console.error('Erreur GET bannières actives:', error)
    return NextResponse.json({ banners: [] })
  }
}
