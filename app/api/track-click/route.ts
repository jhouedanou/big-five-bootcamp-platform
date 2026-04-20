/**
 * API Route: POST /api/track-click
 * 
 * Incrémente le compteur de clics mensuel pour l'utilisateur connecté.
 * Pour les free users : vérifie la limite de 5/mois
 * Pour les Pro/Agency : incrémente monthly_campaigns_explored (stats)
 * 
 * Reset automatique le 1er du mois (vérifié à chaque appel)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const MONTHLY_CLICK_LIMIT = 3

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const admin = getSupabaseAdmin()

    // Récupérer le profil utilisateur
    const { data: profile, error: profileError } = await admin
      .from('users')
      .select('id, plan, subscription_status, monthly_click_count, monthly_click_reset, monthly_campaigns_explored')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })
    }

    // Vérifier si on doit reset le compteur (nouveau mois)
    const now = new Date()
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastReset = profile.monthly_click_reset ? new Date(profile.monthly_click_reset) : new Date(0)
    
    let currentClicks = profile.monthly_click_count || 0
    let currentExplored = profile.monthly_campaigns_explored || 0

    // Reset si le dernier reset est avant le 1er du mois courant
    if (lastReset < firstOfMonth) {
      currentClicks = 0
      currentExplored = 0
    }

    // Déterminer si l'utilisateur est free
    const isPaid = ['basic', 'pro'].includes(profile.plan?.toLowerCase() || '') && profile.subscription_status === 'active'
    const isFree = !isPaid

    // Pour les free users : vérifier la limite
    if (isFree && currentClicks >= MONTHLY_CLICK_LIMIT) {
      return NextResponse.json({
        allowed: false,
        clicks: currentClicks,
        limit: MONTHLY_CLICK_LIMIT,
        message: 'Limite mensuelle atteinte',
      }, { status: 403 })
    }

    // Incrémenter les compteurs
    const newClicks = currentClicks + 1
    const newExplored = currentExplored + 1

    const updateData: Record<string, any> = {
      monthly_campaigns_explored: newExplored,
      updated_at: now.toISOString(),
    }

    // Reset si nouveau mois
    if (lastReset < firstOfMonth) {
      updateData.monthly_click_reset = now.toISOString()
    }

    // Pour les free users, on met à jour le compteur de clics aussi
    if (isFree) {
      updateData.monthly_click_count = newClicks
    }

    const { error: updateError } = await admin
      .from('users')
      .update(updateData)
      .eq('id', user.id)

    if (updateError) {
      console.error('Erreur update compteur:', updateError)
      return NextResponse.json({ error: 'Erreur mise à jour' }, { status: 500 })
    }

    return NextResponse.json({
      allowed: true,
      clicks: isFree ? newClicks : null,
      limit: isFree ? MONTHLY_CLICK_LIMIT : null,
      explored: newExplored,
      isFree,
    })
  } catch (error: any) {
    console.error('Erreur track-click:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - Récupérer l'état actuel du compteur
export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const admin = getSupabaseAdmin()

    const { data: profile } = await admin
      .from('users')
      .select('plan, subscription_status, monthly_click_count, monthly_click_reset, monthly_campaigns_explored')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })
    }

    // Vérifier reset mensuel
    const now = new Date()
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastReset = profile.monthly_click_reset ? new Date(profile.monthly_click_reset) : new Date(0)

    let clicks = profile.monthly_click_count || 0
    let explored = profile.monthly_campaigns_explored || 0

    if (lastReset < firstOfMonth) {
      clicks = 0
      explored = 0
      // Reset en base aussi
      await admin
        .from('users')
        .update({ 
          monthly_click_count: 0, 
          monthly_campaigns_explored: 0, 
          monthly_click_reset: now.toISOString() 
        })
        .eq('id', user.id)
    }

    const isPaid = ['basic', 'pro'].includes(profile.plan?.toLowerCase() || '') && profile.subscription_status === 'active'
    const isFree = !isPaid

    return NextResponse.json({
      clicks,
      limit: MONTHLY_CLICK_LIMIT,
      explored,
      isFree,
    })
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
