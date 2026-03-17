/**
 * API Route: /api/brand-requests
 * 
 * Gestion des demandes de collecte par marque (plan Agency)
 * GET - Lister les demandes de l'utilisateur
 * POST - Créer une nouvelle demande
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// GET - Lister les demandes de l'utilisateur connecté
export async function GET() {
  try {
    const supabase = await getSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('brand_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ requests: data || [] })
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Créer une nouvelle demande
export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Vérifier que l'utilisateur est Agency (ou Pro pour le moment)
    const admin = getSupabaseAdmin()
    const { data: profile } = await admin
      .from('users')
      .select('plan, subscription_status')
      .eq('id', user.id)
      .single()

    const allowedPlans = ['agency', 'enterprise']
    if (!profile || !allowedPlans.includes(profile.plan?.toLowerCase() || '')) {
      return NextResponse.json({ error: 'Cette fonctionnalité est réservée aux abonnés Agency' }, { status: 403 })
    }

    const body = await request.json()
    const { brandName, brandUrl, brandCountry, brandSector, notes } = body

    if (!brandName?.trim()) {
      return NextResponse.json({ error: 'Nom de marque requis' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('brand_requests')
      .insert({
        user_id: user.id,
        brand_name: brandName.trim(),
        brand_url: brandUrl?.trim() || null,
        brand_country: brandCountry?.trim() || null,
        brand_sector: brandSector?.trim() || null,
        notes: notes?.trim() || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ request: data })
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
