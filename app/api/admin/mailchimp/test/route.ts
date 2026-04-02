import { NextRequest, NextResponse } from 'next/server'
import { getMailchimpService } from '@/lib/mailchimp'

// POST — Tester la connexion Mailchimp avec une clé API
export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification admin
    const { getSupabaseServer } = await import('@/lib/supabase-server')
    const supabaseServer = await getSupabaseServer()
    const { data: { user } } = await supabaseServer.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const adminEmails = ['jeanluc@bigfiveabidjan.com', 'cossi@bigfiveabidjan.com', 'yannick@bigfiveabidjan.com', 'franck@bigfiveabidjan.com', 'stephanie@bigfiveabidjan.com']
    const isAdmin = user.user_metadata?.role === 'admin' || adminEmails.includes(user.email || '')

    if (!isAdmin) {
      return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 })
    }

    const { apiKey } = await request.json()

    if (!apiKey) {
      return NextResponse.json({ error: 'Clé API requise' }, { status: 400 })
    }

    const service = getMailchimpService()
    const result = await service.testConnection(apiKey)

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('Mailchimp test error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Erreur serveur' },
      { status: 500 }
    )
  }
}
