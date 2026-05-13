/**
 * API Route: /api/track-search
 *
 * POST { filterId?: string } : incremente le compteur partage recherches+filtres du mois.
 *   - Decouverte : 5 recherches ou filtres / mois (compteur unique)
 *   - Basic      : 30 recherches ou filtres / mois
 *   - Pro        : illimite
 *
 * GET : retourne l'etat courant du compteur mensuel partage.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase-server'
import { QUOTAS, resolveTier, monthKey, isSameMonth, bumpSharedCount, UNLIMITED } from '@/lib/quotas'

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

    let body: { filterId?: string; query?: string; filters?: Record<string, unknown>; source?: string } = {}
    try {
      body = await request.json()
    } catch {
      // body optionnel
    }

    const admin = getSupabaseAdmin()
    const profile = await loadProfile(admin, user.id)
    if (!profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })
    }

    const tier = resolveTier(profile.plan, profile.subscription_status)
    const limit = QUOTAS[tier].monthlySearchLimit
    const currentMonth = monthKey()

    // Reset mensuel
    const searchData = isSameMonth(profile.daily_search_reset)
      ? (profile.daily_search_count || {})
      : {}

    const sharedCount = searchData['_shared'] || 0

    if (limit !== UNLIMITED && sharedCount >= limit) {
      return NextResponse.json(
        {
          allowed: false,
          filterId: body.filterId,
          count: sharedCount,
          limit,
          remaining: 0,
          tier,
          message: `Limite de ${limit} recherches ou filtres atteinte ce mois.`,
        },
        { status: 403 }
      )
    }

    const nextData = bumpSharedCount(searchData)

    const { error: updateError } = await (admin as any)
      .from('users')
      .update({
        daily_search_count: nextData,
        daily_search_reset: currentMonth,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Erreur update search count:', updateError)
      return NextResponse.json({ error: 'Erreur mise a jour' }, { status: 500 })
    }

    const newCount = nextData['_shared'] || 0

    // Journalisation détaillée (best-effort — silencieux si la table n'existe pas encore)
    try {
      await (admin as any).from('search_logs').insert({
        user_id: user.id,
        query: typeof body.query === 'string' ? body.query.trim().slice(0, 500) : null,
        filters: body.filters && typeof body.filters === 'object' ? body.filters : { filterId: body.filterId ?? null },
        source: body.source || (body.filterId ? 'filter' : 'bar'),
      })
    } catch {
      // ignore — la fonctionnalité history est optionnelle
    }

    return NextResponse.json({
      allowed: true,
      filterId: body.filterId,
      count: newCount,
      limit: limit === UNLIMITED ? null : limit,
      remaining: limit === UNLIMITED ? null : Math.max(0, limit - newCount),
      tier,
      counts: nextData,
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
    const limit = QUOTAS[tier].monthlySearchLimit
    const currentMonth = monthKey()

    let counts = profile.daily_search_count || {}
    if (!isSameMonth(profile.daily_search_reset)) {
      counts = {}
      await (admin as any)
        .from('users')
        .update({ daily_search_count: {}, daily_search_reset: currentMonth })
        .eq('id', user.id)
    }

    const sharedCount = counts['_shared'] || 0

    return NextResponse.json({
      count: sharedCount,
      counts,
      limit: limit === UNLIMITED ? null : limit,
      remaining: limit === UNLIMITED ? null : Math.max(0, limit - sharedCount),
      tier,
    })
  } catch (error) {
    console.error('Erreur GET track-search:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
