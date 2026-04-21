/**
 * API Route: /api/track-click
 *
 * POST : incremente le compteur de consultations du jour.
 *        Bloque les free users a DAILY_CLICK_LIMIT consultations / jour.
 * GET  : retourne l'etat courant du compteur (remaining, limit, etc.)
 *
 * Reset automatique a minuit (UTC) via comparaison `daily_click_reset = today`.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase-server'
import { QUOTAS, resolveTier, todayKey, UNLIMITED } from '@/lib/quotas'

export const dynamic = 'force-dynamic'

/** Conserve pour compat avec l'UI existante. */
const DAILY_CLICK_LIMIT = QUOTAS.free.dailyClickLimit

type UserProfile = {
  id: string
  plan: string | null
  subscription_status: string | null
  daily_click_count: number | null
  daily_click_reset: string | null
  monthly_campaigns_explored: number | null
}

async function loadProfile(admin: ReturnType<typeof getSupabaseAdmin>, userId: string) {
  const { data, error } = await admin
    .from('users')
    .select(
      'id, plan, subscription_status, daily_click_count, daily_click_reset, monthly_campaigns_explored'
    )
    .eq('id', userId)
    .single<UserProfile>()

  if (error || !data) return null
  return data
}

export async function POST(_request: NextRequest) {
  try {
    const supabase = await getSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
    }

    const admin = getSupabaseAdmin()
    const profile = await loadProfile(admin, user.id)
    if (!profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })
    }

    const tier = resolveTier(profile.plan, profile.subscription_status)
    const isFree = tier === 'free'
    const limit = QUOTAS[tier].dailyClickLimit
    const today = todayKey()

    let currentClicks = profile.daily_click_count || 0
    if (profile.daily_click_reset !== today) {
      currentClicks = 0
    }

    if (isFree && currentClicks >= limit) {
      return NextResponse.json(
        {
          allowed: false,
          clicks: currentClicks,
          limit,
          remaining: 0,
          isFree,
          tier,
          message: 'Limite quotidienne atteinte',
        },
        { status: 403 }
      )
    }

    const newClicks = currentClicks + 1
    const newExplored = (profile.monthly_campaigns_explored || 0) + 1

    const updateData: Record<string, unknown> = {
      monthly_campaigns_explored: newExplored,
      daily_click_reset: today,
      updated_at: new Date().toISOString(),
    }
    if (isFree) {
      updateData.daily_click_count = newClicks
    } else {
      updateData.daily_click_count = 0
    }

    const { error: updateError } = await (admin as any)
      .from('users')
      .update(updateData)
      .eq('id', user.id)

    if (updateError) {
      console.error('Erreur update compteur:', updateError)
      return NextResponse.json({ error: 'Erreur mise a jour' }, { status: 500 })
    }

    const remaining = limit === UNLIMITED ? null : Math.max(0, limit - newClicks)

    return NextResponse.json({
      allowed: true,
      clicks: isFree ? newClicks : null,
      limit: limit === UNLIMITED ? null : limit,
      remaining,
      explored: newExplored,
      isFree,
      tier,
    })
  } catch (error) {
    console.error('Erreur track-click:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(_request: NextRequest) {
  try {
    const supabase = await getSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
    }

    const admin = getSupabaseAdmin()
    const profile = await loadProfile(admin, user.id)
    if (!profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })
    }

    const tier = resolveTier(profile.plan, profile.subscription_status)
    const isFree = tier === 'free'
    const limit = QUOTAS[tier].dailyClickLimit
    const today = todayKey()

    let clicks = profile.daily_click_count || 0
    if (profile.daily_click_reset !== today) {
      clicks = 0
      await (admin as any)
        .from('users')
        .update({ daily_click_count: 0, daily_click_reset: today })
        .eq('id', user.id)
    }

    return NextResponse.json({
      clicks,
      limit: limit === UNLIMITED ? null : limit,
      remaining: limit === UNLIMITED ? null : Math.max(0, limit - clicks),
      explored: profile.monthly_campaigns_explored || 0,
      isFree,
      tier,
    })
  } catch (error) {
    console.error('Erreur GET track-click:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export { DAILY_CLICK_LIMIT }
