import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

// GET - Récupérer tous les paramètres du site
export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('site_settings')
      .select('key, value, description')

    if (error) {
      console.error('Error fetching settings:', error)
      return NextResponse.json({ error: 'Erreur lors de la récupération des paramètres' }, { status: 500 })
    }

    // Transformer en objet clé-valeur
    const settings: Record<string, string> = {}
    data?.forEach((row: { key: string; value: string }) => {
      settings[row.key] = row.value
    })

    return NextResponse.json({ settings })
  } catch (err) {
    console.error('Settings GET error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PUT - Mettre à jour un ou plusieurs paramètres
export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()

    // Vérifier que l'utilisateur est admin (via session)
    const { getSupabaseServer } = await import('@/lib/supabase-server')
    const supabaseServer = await getSupabaseServer()
    const { data: { session } } = await supabaseServer.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Vérifier le rôle admin
    const adminEmails = ['jeanluc@bigfiveabidjan.com', 'cossi@bigfiveabidjan.com', 'yannick@bigfiveabidjan.com', 'franck@bigfiveabidjan.com', 'stephanie@bigfiveabidjan.com']
    const isAdmin = session.user.user_metadata?.role === 'admin' || adminEmails.includes(session.user.email || '')

    if (!isAdmin) {
      return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 })
    }

    const { settings } = await request.json() as { settings: Record<string, string> }

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
    }

    // Mettre à jour chaque paramètre
    const updates = Object.entries(settings).map(async ([key, value]) => {
      const { error } = await supabase
        .from('site_settings')
        .upsert(
          { key, value, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        )
      if (error) {
        console.error(`Error updating setting ${key}:`, error)
        throw error
      }
    })

    await Promise.all(updates)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Settings PUT error:', err)
    return NextResponse.json({ error: 'Erreur lors de la sauvegarde' }, { status: 500 })
  }
}
