/**
 * API Route: /api/search-history
 *
 * GET : retourne les 20 dernières recherches/filtres de l'utilisateur courant.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  try {
    const supabase = await getSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const admin = getSupabaseAdmin()
    const { data, error } = await (admin as any)
      .from('search_logs')
      .select('id, query, filters, source, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      // Table peut-être absente : on retourne une liste vide plutôt qu'une erreur.
      return NextResponse.json({ items: [], available: false })
    }

    return NextResponse.json({ items: data || [], available: true })
  } catch (error) {
    console.error('Erreur GET search-history:', error)
    return NextResponse.json({ items: [], available: false })
  }
}
