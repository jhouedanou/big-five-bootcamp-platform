/**
 * GET /api/brand-requests/[id]/contents
 *
 * Renvoie les campagnes (table `campaigns`, status='Publié') correspondant aux
 * critères de la demande de suivi : marque + (pays) + (secteurs) + (canaux).
 *
 * La demande doit appartenir à l'utilisateur connecté, être approuvée
 * (status='completed') et payée (paid_at non null).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

  try {
    const supabase = await getSupabaseServer()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const admin = getSupabaseAdmin()
    const { data: req, error } = await admin
      .from('brand_requests')
      .select('id, user_id, brand_name, status, paid_at, countries, sectors, country, sector, social_networks')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !req) {
      return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
    }

    // SÉCURITÉ COMMERCIALE : l'accès aux contenus exige
    //   status='completed' (« Disponible ») ET paid_at non null.
    const isPaid = !!(req as any).paid_at
    if (req.status !== 'completed' || !isPaid) {
      return NextResponse.json({ contents: [], status: req.status, paid: isPaid })
    }

    // Critères multi-valeurs (avec fallback sur les anciens champs single)
    const countries: string[] = Array.isArray((req as any).countries) && (req as any).countries.length > 0
      ? (req as any).countries
      : (req as any).country ? [(req as any).country] : []
    const sectors: string[] = Array.isArray((req as any).sectors) && (req as any).sectors.length > 0
      ? (req as any).sectors
      : (req as any).sector ? [(req as any).sector] : []
    const channels: string[] = Array.isArray((req as any).social_networks)
      ? (req as any).social_networks
      : []

    let q = admin
      .from('campaigns')
      .select('*')
      .ilike('brand', req.brand_name)
      .eq('status', 'Publié')

    if (countries.length > 0) q = q.in('country', countries)
    if (sectors.length > 0) q = q.in('category', sectors)
    // platforms est un TEXT[] dans campaigns : `&&` (overlap) côté PG via .overlaps()
    if (channels.length > 0) q = q.overlaps('platforms', channels)

    const { data: campaigns } = await q.order('created_at', { ascending: false })

    return NextResponse.json({ contents: campaigns || [], status: req.status })
  } catch (e: any) {
    console.error('[brand-requests/:id/contents]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
