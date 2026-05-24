import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthenticatedUser } from '@/lib/supabase-server'
import { getViewerAccess, projectCampaigns } from '@/lib/content-access'

export const dynamic = 'force-dynamic';

/**
 * GET /api/campaigns
 * Récupère les campagnes. Authentification requise : le contenu n'est jamais
 * servi à un visiteur anonyme. Les non-admins ne voient que les campagnes
 * publiées, et les champs premium sont retirés sans abonnement payant.
 * Query params:
 * - status: 'Publié' | 'Brouillon' | 'En attente' (admin uniquement)
 * - author_id: UUID de l'auteur
 */
export async function GET(request: NextRequest) {
  try {
    const viewer = await getViewerAccess()
    if (!viewer.isAuthenticated) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const authorId = searchParams.get('author_id')

    let query = (supabaseAdmin as any)
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)

    if (viewer.isAdmin) {
      // Seul un admin peut filtrer/voir des statuts autres que "Publié".
      if (status) query = query.eq('status', status)
    } else {
      query = query.eq('status', 'Publié')
    }

    if (authorId) {
      query = query.eq('author_id', authorId)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(projectCampaigns(data || [], viewer))
  } catch (error: any) {
    console.error('Error fetching campaigns:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
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
    const currentUser = await getAuthenticatedUser()
    if (!currentUser?.isAdmin) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

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
        author_id: currentUser.id,
        author_name: currentUser.profile?.name || currentUser.email,
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
