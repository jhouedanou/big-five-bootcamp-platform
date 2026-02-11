import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/stats
 * Récupère les statistiques publiques : nombre d'utilisateurs et de campagnes
 */
export async function GET() {
  try {
    // Compter les utilisateurs
    const { count: usersCount, error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    if (usersError) {
      console.error('Erreur comptage utilisateurs:', usersError)
    }

    // Compter les campagnes publiées
    const { count: campaignsCount, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })

    if (campaignsError) {
      console.error('Erreur comptage campagnes:', campaignsError)
    }

    return NextResponse.json({
      users: usersCount ?? 0,
      campaigns: campaignsCount ?? 0,
    })
  } catch (error) {
    console.error('Erreur API stats:', error)
    return NextResponse.json(
      { users: 0, campaigns: 0 },
      { status: 500 }
    )
  }
}
