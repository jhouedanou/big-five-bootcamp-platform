/**
 * API Route: /api/track-search
 *
 * POST { filterId: string } : incremente le compteur de recherches pour ce filtre.
 *   - Decouverte : 3 / filtre / jour
 *   - Basic      : 15 / filtre / jour
 *   - Pro        : illimite
 *
 * GET : retourne l'etat courant du compteur pour tous les filtres.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase-server'
import { QUOTAS, resolveTier, todayKey, bumpSearchCount, UNLIMITED } from '@/lib/quotas'

export const dynamic = 'force-dynamic'

type UserProfile = {
  id: string
  plan: string | null
  subscription_status: string | null
  daily_search_count: Record<string, number> | null
  daily_search_reset: string | null
}

async function loadProfile(admin: ReturnType<typeof getSupabaseAdmin>, userId: string) {
  const { data, error } = await admin
    .from('users')
    .select('id, plan, subscription_status, daily_search_count, daily_search_reset')
    .eq('id', userId)
    .single<UserProfile>()

  if (error || !data) return null
  return data
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
    }

    let body: { filterId?: string } = {}
    try {
      body = await request.json()
    } catch {
      // body optionnel : on refusera en dessous si filterId manquant
    }

    const filterId = (body.filterId || '').trim()
    if (!filterId) {
      return NextResponse.json({ error: 'filterId requis' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const profile = await loadProfile(admin, user.id)
    if (!profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })
    }

    const tier = resolveTier(profile.plan, profile.subscription_status)
    const limit = QUOTAS[tier].dailySearchPerFilter
    const today = todayKey()

    // Reset quotidien
    const searchCount =
      profile.daily_search_reset === today ? (profile.daily_search_count || {}) : {}

    const currentForFilter = searchCount[filterId] || 0

    if (limit !== UNLIMITED && currentForFilter >= limit) {
      return NextResponse.json(
        {
          allowed: false,
          filterId,
          count: currentForFilter,
          limit,
          remaining: 0,
          tier,
          message: `Limite de ${limit} recherches atteinte pour ce filtre aujourd'hui.`,
        },
        { status: 403 }
      )
    }

    const nextCount = bumpSearchCount(searchCount, filterId)

    const { error: updateError } = await (admin as any)
      .from('users')
      .update({
        daily_search_count: nextCount,
        daily_search_reset: today,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Erreur update search count:', updateError)
      return NextResponse.json({ error: 'Erreur mise a jour' }, { status: 500 })
    }

    return NextResponse.json({
      allowed: true,
      filterId,
      count: nextCount[filterId],
      limit: limit === UNLIMITED ? null : limit,
      remaining: limit === UNLIMITED ? null : Math.max(0, limit - nextCount[filterId]),
      tier,
      // Map complete pour que le client puisse afficher tous les compteurs
      counts: nextCount,
    })
  } catch (error) {
    console.error('Erreur track-search:', error)
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
    const limit = QUOTAS[tier].dailySearchPerFilter
    const today = todayKey()

    let counts = profile.daily_search_count || {}
    if (profile.daily_search_reset !== today) {
      counts = {}
      await (admin as any)
        .from('users')
        .update({ daily_search_count: {}, daily_search_reset: today })
        .eq('id', user.id)
    }

    return NextResponse.json({
      counts,
      limit: limit === UNLIMITED ? null : limit,
      tier,
    })
  } catch (error) {
    console.error('Erreur GET track-search:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
