import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/campaigns/suggestions
 * Retourne les valeurs distinctes de marques, pays et secteurs
 * depuis les campagnes publiées pour l'autocomplétion.
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    // Récupérer les valeurs distinctes en parallèle
    const [brandsResult, countriesResult, categoriesResult] = await Promise.all([
      supabase
        .from('campaigns')
        .select('brand')
        .eq('status', 'Publié')
        .not('brand', 'is', null),
      supabase
        .from('campaigns')
        .select('country')
        .eq('status', 'Publié')
        .not('country', 'is', null),
      supabase
        .from('campaigns')
        .select('category')
        .eq('status', 'Publié')
        .not('category', 'is', null),
    ])

    // Extraire les valeurs uniques et les trier
    const unique = (arr: any[], key: string): string[] => {
      const values = arr
        ?.map((item) => item[key]?.trim())
        .filter((v): v is string => !!v) || []
      return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'fr'))
    }

    return NextResponse.json({
      brands: unique(brandsResult.data || [], 'brand'),
      countries: unique(countriesResult.data || [], 'country'),
      categories: unique(categoriesResult.data || [], 'category'),
    })
  } catch (err) {
    console.error('Suggestions error:', err)
    return NextResponse.json({ brands: [], countries: [], categories: [] })
  }
}
