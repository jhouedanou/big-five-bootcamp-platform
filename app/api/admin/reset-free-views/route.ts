/**
 * POST /api/admin/reset-free-views
 *
 * Remet à zéro les compteurs de consultations de campagnes
 * pour tous les utilisateurs en plan Free.
 *
 * Champs réinitialisés :
 *   - daily_click_count
 *   - daily_click_reset (forcé à aujourd'hui)
 *   - monthly_campaigns_explored
 *   - monthly_click_count (legacy)
 *   - monthly_click_reset (legacy)
 *
 * Accès : admin uniquement.
 */

import { NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST() {
  const adminUser = await checkAdmin()
  if (!adminUser) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const admin = getSupabaseAdmin()

  // Sélectionner les free users (plan Free ou null, pas de subscription active)
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

  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

  const { error: updateError, count } = await admin
    .from('users')
    .update({
      daily_click_count: 0,
      daily_click_reset: today,
      monthly_campaigns_explored: 0,
      monthly_click_count: 0,
      monthly_click_reset: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
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
