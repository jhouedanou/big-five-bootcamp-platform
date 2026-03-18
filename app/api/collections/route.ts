/**
 * API Route: /api/collections
 * 
 * CRUD pour les collections personnalisées (favoris thématiques)
 * GET - Lister les collections de l'utilisateur
 * POST - Créer une nouvelle collection
 * PATCH - Renommer une collection
 * DELETE - Supprimer une collection
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// GET - Lister les collections avec le nombre d'items
export async function GET() {
  try {
    const supabase = await getSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Récupérer les collections avec fallback progressif si colonnes manquantes
    let collections: any[] | null = null

    // Tentative 1: toutes les colonnes (avec partage)
    const r1 = await supabase
      .from('collections')
      .select('id, name, description, created_at, share_token, is_shared')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (!r1.error) {
      collections = r1.data
    } else {
      console.warn('[collections GET] Fallback niveau 1:', r1.error.message)
      // Tentative 2: sans colonnes de partage
      const r2 = await supabase
        .from('collections')
        .select('id, name, description, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (!r2.error) {
        collections = (r2.data || []).map((c: any) => ({ ...c, share_token: null, is_shared: false }))
      } else {
        console.warn('[collections GET] Fallback niveau 2:', r2.error.message)
        // Tentative 3: colonnes minimales (sans description ni partage)
        const r3 = await supabase
          .from('collections')
          .select('id, name, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })

        if (r3.error) {
          console.error('[collections GET] Erreur Supabase finale:', r3.error.message)
          return NextResponse.json({ error: r3.error.message }, { status: 500 })
        }
        collections = (r3.data || []).map((c: any) => ({ ...c, description: null, share_token: null, is_shared: false }))
      }
    }

    // Récupérer les items de toutes les collections
    const collectionIds = (collections || []).map(c => c.id)
    let items: any[] = []

    if (collectionIds.length > 0) {
      const { data: itemsData } = await supabase
        .from('collection_items')
        .select('collection_id, campaign_id')
        .in('collection_id', collectionIds)

      items = itemsData || []
    }

    // Grouper les items par collection
    const itemsMap: Record<string, string[]> = {}
    items.forEach((item: any) => {
      if (!itemsMap[item.collection_id]) itemsMap[item.collection_id] = []
      itemsMap[item.collection_id].push(item.campaign_id)
    })

    // Enrichir les collections avec le compteur
    const enriched = (collections || []).map(c => ({
      ...c,
      item_count: itemsMap[c.id]?.length || 0,
      campaign_ids: itemsMap[c.id] || [],
    }))

    return NextResponse.json({ collections: enriched })
  } catch (error: any) {
    console.error('[collections GET] Exception:', error?.message || error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}

// POST - Créer une collection
export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nom requis' }, { status: 400 })
    }

    // Essayer d'insérer avec description, fallback sans si la colonne n'existe pas
    let data: any = null
    const { data: d1, error: e1 } = await supabase
      .from('collections')
      .insert({ user_id: user.id, name: name.trim(), description: description?.trim() || null })
      .select()
      .single()

    if (e1) {
      if (e1.message?.includes('description')) {
        console.warn('[collections POST] Fallback sans description:', e1.message)
        const { data: d2, error: e2 } = await supabase
          .from('collections')
          .insert({ user_id: user.id, name: name.trim() })
          .select()
          .single()

        if (e2) {
          console.error('[collections POST] Erreur Supabase:', e2.message, e2.details, e2.hint)
          return NextResponse.json({ error: e2.message }, { status: 500 })
        }
        data = { ...d2, description: null }
      } else {
        console.error('[collections POST] Erreur Supabase:', e1.message, e1.details, e1.hint)
        return NextResponse.json({ error: e1.message }, { status: 500 })
      }
    } else {
      data = d1
    }

    return NextResponse.json({ collection: { ...data, item_count: 0, campaign_ids: [] } })
  } catch (error: any) {
    console.error('[collections POST] Exception:', error?.message || error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Renommer une collection
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const { id, name } = body

    if (!id || !name?.trim()) {
      return NextResponse.json({ error: 'ID et nom requis' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('collections')
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ collection: data })
  } catch (error: any) {
    console.error('[collections PATCH] Exception:', error?.message || error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Supprimer une collection
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 })
    }

    // Les collection_items sont supprimés en cascade grâce au ON DELETE CASCADE
    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[collections DELETE] Exception:', error?.message || error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
