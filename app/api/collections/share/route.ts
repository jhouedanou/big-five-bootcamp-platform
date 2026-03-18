/**
 * API Route: /api/collections/share
 *
 * POST - Générer un lien de partage (share_token) pour une collection
 * DELETE - Révoquer le partage d'une collection
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase-server'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

// POST - Générer un share_token
export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const { collectionId } = body

    if (!collectionId) {
      return NextResponse.json({ error: 'collectionId requis' }, { status: 400 })
    }

    // Vérifier que la collection appartient à l'utilisateur
    const admin = getSupabaseAdmin()
    const { data: collection, error: fetchError } = await admin
      .from('collections')
      .select('id, user_id, share_token, is_shared')
      .eq('id', collectionId)
      .single()

    if (fetchError || !collection) {
      return NextResponse.json({ error: 'Collection introuvable' }, { status: 404 })
    }

    if (collection.user_id !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Si déjà partagée, retourner le token existant
    if (collection.is_shared && collection.share_token) {
      return NextResponse.json({ share_token: collection.share_token })
    }

    // Générer un nouveau token
    const shareToken = randomUUID()

    const { error: updateError } = await admin
      .from('collections')
      .update({ share_token: shareToken, is_shared: true })
      .eq('id', collectionId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ share_token: shareToken })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Révoquer le partage
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const url = new URL(request.url)
    const collectionId = url.searchParams.get('id')

    if (!collectionId) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    // Vérifier propriété
    const { data: collection } = await admin
      .from('collections')
      .select('id, user_id')
      .eq('id', collectionId)
      .single()

    if (!collection || collection.user_id !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const { error: updateError } = await admin
      .from('collections')
      .update({ share_token: null, is_shared: false })
      .eq('id', collectionId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
