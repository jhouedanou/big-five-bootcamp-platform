import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Test de connexion à Supabase
    const { data, error, count } = await supabase
      .from('bootcamps')
      .select('id, title, slug', { count: 'exact' })
      .limit(5)

    if (error) throw error

    return NextResponse.json({ 
      success: true, 
      message: '✅ Connexion Supabase réussie!',
      stats: {
        total_bootcamps: count,
        sample_bootcamps: data
      },
      next_steps: [
        '1. Vérifier que les données sont bien présentes',
        '2. Compléter la clé NEXT_PUBLIC_SUPABASE_ANON_KEY si nécessaire',
        '3. Commencer à créer les pages du site'
      ]
    })
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      help: 'Vérifiez que le schéma SQL a été exécuté dans Supabase Dashboard'
    }, { status: 500 })
  }
}
