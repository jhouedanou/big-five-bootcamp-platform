import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic';

/**
 * GET /api/campaigns
 * Récupère toutes les campagnes
 * Query params:
 * - status: 'Publié' | 'Brouillon' | 'En attente'
 * - author_id: UUID de l'auteur
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const authorId = searchParams.get('author_id')

    let query = (supabase as any)
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (authorId) {
      query = query.eq('author_id', authorId)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error fetching campaigns:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/campaigns
 * Créer une nouvelle campagne
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { data, error } = await (supabaseAdmin as any)
      .from('campaigns')
      .insert({
        title: body.title,
        description: body.description,
        brand: body.brand,
        category: body.category,
        thumbnail: body.thumbnail,
        images: body.images || [],
        video_url: body.video_url,
        platforms: body.platforms || [],
        duration: body.duration,
        target_audience: body.target_audience,
        tags: body.tags || [],
        status: body.status || 'Brouillon',
        author_id: body.author_id,
        author_name: body.author_name,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error('Error creating campaign:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
