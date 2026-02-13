import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/stats
 * Récupère les statistiques publiques depuis la base de données
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
      .eq('status', 'Publié')

    if (campaignsError) {
      console.error('Erreur comptage campagnes:', campaignsError)
    }

    // Compter les marques uniques
    const { data: brandsData, error: brandsError } = await supabase
      .from('campaigns')
      .select('brand')
      .eq('status', 'Publié')
      .not('brand', 'is', null)

    const uniqueBrands = brandsData 
      ? new Set(brandsData.map((c: any) => c.brand).filter(Boolean)).size 
      : 0

    if (brandsError) {
      console.error('Erreur comptage marques:', brandsError)
    }

    // Compter les pays uniques
    const { data: countriesData, error: countriesError } = await supabase
      .from('campaigns')
      .select('country')
      .eq('status', 'Publié')
      .not('country', 'is', null)

    const uniqueCountries = countriesData 
      ? new Set(countriesData.map((c: any) => c.country).filter(Boolean)).size 
      : 0

    if (countriesError) {
      console.error('Erreur comptage pays:', countriesError)
    }

    return NextResponse.json({
      users: usersCount ?? 0,
      campaigns: campaignsCount ?? 0,
      brands: uniqueBrands,
      countries: uniqueCountries,
    })
  } catch (error) {
    console.error('Erreur API stats:', error)
    return NextResponse.json(
      { users: 0, campaigns: 0, brands: 0, countries: 0 },
      { status: 500 }
    )
  }
}
