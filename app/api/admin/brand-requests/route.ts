/**
 * API Route: /api/admin/brand-requests
 * 
 * Admin: Gestion des demandes de collecte par marque
 * GET - Lister toutes les demandes (avec infos utilisateur)
 * PATCH - Mettre à jour le statut d'une demande
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// Vérifier que l'utilisateur est admin
async function checkAdmin() {
  const supabase = await getSupabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) return null

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') return null
  return user
}

// GET - Lister toutes les demandes (admin)
export async function GET() {
  try {
    const user = await checkAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const admin = getSupabaseAdmin()

    const { data, error } = await admin
      .from('brand_requests')
      .select('*, user:users!user_id(id, name, email, plan)')
      .order('created_at', { ascending: false })

    if (error) {
      // Fallback sans join si la relation n'existe pas
      const { data: fallback, error: fallbackError } = await admin
        .from('brand_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (fallbackError) {
        return NextResponse.json({ error: fallbackError.message }, { status: 500 })
      }
      return NextResponse.json({ requests: fallback || [] })
    }

    return NextResponse.json({ requests: data || [] })
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Mettre à jour une demande (statut, notes admin)
export async function PATCH(request: NextRequest) {
  try {
    const user = await checkAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const body = await request.json()
    const { id, status, adminNotes } = body

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
    if (status) updateData.status = status
    if (adminNotes !== undefined) updateData.admin_notes = adminNotes

    const { data, error } = await admin
      .from('brand_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ request: data })
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
