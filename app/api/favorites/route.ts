import { getSupabaseServer } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// GET - Récupérer les favoris de l'utilisateur connecté
export async function GET(request: Request) {
  try {
    const supabase = await getSupabaseServer()
    
    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Paramètre optionnel pour inclure les détails des campagnes
    const url = new URL(request.url)
    const withCampaigns = url.searchParams.get('withCampaigns') === 'true'

    let query = supabase
      .from('favorites')
      .select(withCampaigns 
        ? `
          id,
          campaign_id,
          created_at,
          campaign:campaigns (
            id,
            title,
            thumbnail,
            platforms,
            category,
            format,
            description,
            video_url
          )
        `
        : 'id, campaign_id, created_at'
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Error fetching favorites:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des favoris' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      favorites: data || [],
      count: data?.length || 0
    })

  } catch (error: any) {
    console.error('Favorites GET error:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST - Ajouter un favori
export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServer()
    
    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { campaignId } = body

    if (!campaignId) {
      return NextResponse.json(
        { error: 'campaignId est requis' },
        { status: 400 }
      )
    }

    // Vérifier que la campagne existe
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campagne non trouvée' },
        { status: 404 }
      )
    }

    // Ajouter le favori
    const { data, error } = await supabase
      .from('favorites')
      .insert({
        user_id: user.id,
        campaign_id: campaignId
      })
      .select('id, campaign_id, created_at')
      .single()

    if (error) {
      // Si c'est un doublon, retourner succès quand même
      if (error.code === '23505') {
        return NextResponse.json({
          success: true,
          message: 'Déjà en favoris',
          alreadyExists: true
        })
      }
      
      console.error('Error adding favorite:', error)
      return NextResponse.json(
        { error: 'Erreur lors de l\'ajout aux favoris' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      favorite: data,
      message: 'Ajouté aux favoris'
    })

  } catch (error: any) {
    console.error('Favorites POST error:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un favori
export async function DELETE(request: Request) {
  try {
    const supabase = await getSupabaseServer()
    
    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const campaignId = url.searchParams.get('campaignId')

    if (!campaignId) {
      return NextResponse.json(
        { error: 'campaignId est requis' },
        { status: 400 }
      )
    }

    // Supprimer le favori
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('campaign_id', campaignId)

    if (error) {
      console.error('Error removing favorite:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la suppression du favori' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Retiré des favoris'
    })

  } catch (error: any) {
    console.error('Favorites DELETE error:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    )
  }
}
