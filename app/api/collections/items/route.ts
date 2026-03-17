/**
 * API Route: /api/collections/items
 * 
 * Gérer les items dans une collection
 * POST - Ajouter une campagne à une collection
 * DELETE - Retirer une campagne d'une collection
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// POST - Ajouter un favori à une collection
export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const { collectionId, campaignId } = body

    if (!collectionId || !campaignId) {
      return NextResponse.json({ error: 'collectionId et campaignId requis' }, { status: 400 })
    }

    // Vérifier que la collection appartient à l'utilisateur
    const { data: collection } = await supabase
      .from('collections')
      .select('id')
      .eq('id', collectionId)
      .eq('user_id', user.id)
      .single()

    if (!collection) {
      return NextResponse.json({ error: 'Collection introuvable' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('collection_items')
      .insert({ collection_id: collectionId, campaign_id: campaignId })
      .select()
      .single()

    if (error) {
      // Duplicata possible (contrainte UNIQUE)
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Déjà dans cette collection' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ item: data })
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Retirer un favori d'une collection
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const url = new URL(request.url)
    const collectionId = url.searchParams.get('collectionId')
    const campaignId = url.searchParams.get('campaignId')

    if (!collectionId || !campaignId) {
      return NextResponse.json({ error: 'collectionId et campaignId requis' }, { status: 400 })
    }

    // Vérifier propriété via la collection
    const { data: collection } = await supabase
      .from('collections')
      .select('id')
      .eq('id', collectionId)
      .eq('user_id', user.id)
      .single()

    if (!collection) {
      return NextResponse.json({ error: 'Collection introuvable' }, { status: 404 })
    }

    const { error } = await supabase
      .from('collection_items')
      .delete()
      .eq('collection_id', collectionId)
      .eq('campaign_id', campaignId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
