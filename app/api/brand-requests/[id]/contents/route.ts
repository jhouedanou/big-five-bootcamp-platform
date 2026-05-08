/**
 * GET /api/brand-requests/[id]/contents
 *
 * Renvoie les campagnes (table `campaigns`, status='Publié') correspondant
 * à la marque de cette demande, à condition que la demande soit
 * approuvée (status='completed') et appartienne à l'utilisateur connecté.
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
      .select('id, user_id, brand_name, status, paid_at')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !req) {
      return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
    }

    // SÉCURITÉ COMMERCIALE : l'accès aux contenus exige
    //   status='completed' (« Disponible ») ET paid_at non null.
    // Cf. spec : « demande approuvée + paiement confirmé ».
    const isPaid = !!(req as any).paid_at
    if (req.status !== 'completed' || !isPaid) {
      return NextResponse.json({ contents: [], status: req.status, paid: isPaid })
    }

    const { data: campaigns } = await admin
      .from('campaigns')
      .select('*')
      .ilike('brand', req.brand_name)
      .eq('status', 'Publié')
      .order('created_at', { ascending: false })

    return NextResponse.json({ contents: campaigns || [], status: req.status })
  } catch (e: any) {
    console.error('[brand-requests/:id/contents]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
