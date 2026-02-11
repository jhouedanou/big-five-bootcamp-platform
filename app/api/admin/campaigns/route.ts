import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Helper pour vérifier si l'utilisateur est admin
async function isAdminUser(request: NextRequest): Promise<boolean> {
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
  
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.user?.email) {
    return false
  }
  
  // Liste des emails admin autorisés
  const adminEmails = ['jeanluc@bigfiveabidjan.com', 'cossi@bigfiveabidjan.com', 'yannickj@bigfiveabidjan.com']
  
  // Vérifier les métadonnées ou la liste connue
  if (session.user.user_metadata?.role === 'admin' || adminEmails.includes(session.user.email)) {
    return true
  }
  
  return false
}

/**
 * GET /api/admin/campaigns
 * Récupère toutes les campagnes (admin only, bypass RLS)
 */
export async function GET(request: NextRequest) {
  try {
    // Vérifier que l'utilisateur est admin
    const isAdmin = await isAdminUser(request)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Utiliser le client admin (service_role) pour bypass RLS
    const supabaseAdmin = getSupabaseAdmin()
    
    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching campaigns:', error)
      return NextResponse.json({ error: error.message, campaigns: [] }, { status: 500 })
    }
    
    return NextResponse.json({ campaigns: data || [] })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ error: error.message, campaigns: [] }, { status: 500 })
  }
}

/**
 * POST /api/admin/campaigns
 * Créer une nouvelle campagne (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const isAdmin = await isAdminUser(request)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const supabaseAdmin = getSupabaseAdmin()
    
    // S'assurer qu'il y a un statut par défaut
    if (!body.status) {
      body.status = 'Brouillon'
    }
    
    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .insert(body)
      .select()
      .single()
    
    if (error) {
      console.error('Error creating campaign:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ campaign: data })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PUT /api/admin/campaigns
 * Mettre à jour une campagne (admin only)
 */
export async function PUT(request: NextRequest) {
  try {
    const isAdmin = await isAdminUser(request)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { id, ...updateData } = body
    
    if (!id) {
      return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 })
    }
    
    const supabaseAdmin = getSupabaseAdmin()
    
    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating campaign:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ campaign: data })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/campaigns
 * Supprimer une campagne (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const isAdmin = await isAdminUser(request)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 })
    }
    
    const supabaseAdmin = getSupabaseAdmin()
    
    const { error } = await supabaseAdmin
      .from('campaigns')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting campaign:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
