/**
 * POST /api/admin/reset-free-views
 *
 * Remet à zéro les compteurs mensuels de consultations + recherches/filtres
 * pour les utilisateurs Découverte (DB key "Free").
 *
 * Body (optionnel) : { userId?: string } pour cibler un utilisateur précis.
 * Sans body : reset tous les Free users.
 *
 * Champs réinitialisés :
 *   - daily_click_count        (compteur mensuel consultations)
 *   - daily_click_reset        (cle mois courant YYYY-MM)
 *   - daily_search_count       (compteur mensuel partage recherches+filtres)
 *   - daily_search_reset       (cle mois courant YYYY-MM)
 *   - monthly_campaigns_explored
 *
 * Accès : admin uniquement.
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { monthKey } from '@/lib/quotas'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const adminUser = await checkAdmin()
  if (!adminUser) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  let body: { userId?: string } = {}
  try {
    body = await request.json()
  } catch {
    // body optionnel
  }

  const admin = getSupabaseAdmin()
  const currentMonth = monthKey()

  const resetPayload = {
    daily_click_count: 0,
    daily_click_reset: currentMonth,
    daily_search_count: {},
    daily_search_reset: currentMonth,
    monthly_campaigns_explored: 0,
    updated_at: new Date().toISOString(),
  }

  // Reset cible (un seul utilisateur)
  if (body.userId) {
    const { error: targetedError } = await admin
      .from('users')
      .update(resetPayload as any)
      .eq('id', body.userId)

    if (targetedError) {
      console.error('reset-free-views: erreur update ciblee', targetedError)
      return NextResponse.json({ error: 'Erreur mise a jour' }, { status: 500 })
    }
    return NextResponse.json({ updated: 1, message: `Compteurs reinitialises pour user ${body.userId}` })
  }

  // Reset global : tous les utilisateurs Free
  const { data: freeUsers, error: selectError } = await admin
    .from('users')
    .select('id')
    .or('plan.is.null,plan.ilike.free')

  if (selectError) {
    console.error('reset-free-views: erreur sélection', selectError)
    return NextResponse.json({ error: 'Erreur lors de la récupération des utilisateurs' }, { status: 500 })
  }

  if (!freeUsers || freeUsers.length === 0) {
    return NextResponse.json({ updated: 0, message: 'Aucun utilisateur Free trouvé' })
  }

  const ids = freeUsers.map((u: { id: string }) => u.id)

  const { error: updateError, count } = await admin
    .from('users')
    .update(resetPayload as any)
    .in('id', ids)

  if (updateError) {
    console.error('reset-free-views: erreur update', updateError)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
  }

  return NextResponse.json({
    updated: count ?? ids.length,
    message: `Compteurs réinitialisés pour ${count ?? ids.length} utilisateur(s) Free`,
  })
}
