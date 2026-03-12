import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';

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

    if (withCampaigns) {
      // Essayer d'abord avec la jointure directe
      const { data, error } = await supabase
        .from('favorites')
        .select(`
          id,
          campaign_id,
          created_at,
          campaign:campaigns!campaign_id (
            id,
            title,
            thumbnail,
            platforms,
            category,
            format,
            description,
            video_url
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching favorites with campaigns (join):', error)
        // Fallback : charger les favoris puis les campagnes séparément
        const { data: favs, error: favsError } = await supabase
          .from('favorites')
          .select('id, campaign_id, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (favsError) {
          return NextResponse.json(
            { error: 'Erreur lors de la récupération des favoris' },
            { status: 500 }
          )
        }

        // Charger les campagnes correspondantes
        const campaignIds = (favs || []).map((f: any) => f.campaign_id)
        let campaignsMap: Record<string, any> = {}

        if (campaignIds.length > 0) {
          const { data: campaigns } = await supabase
            .from('campaigns')
            .select('id, title, thumbnail, platforms, category, format, description, video_url')
            .in('id', campaignIds)

          if (campaigns) {
            campaigns.forEach((c: any) => { campaignsMap[c.id] = c })
          }
        }

        // Assembler favoris + campagnes
        const merged = (favs || []).map((f: any) => ({
          ...f,
          campaign: campaignsMap[f.campaign_id] || null
        }))

        return NextResponse.json({
          success: true,
          favorites: merged,
          count: merged.length
        })
      }

      return NextResponse.json({
        success: true,
        favorites: data || [],
        count: data?.length || 0
      })
    }

    // Sans campagnes
    const { data, error } = await supabase
      .from('favorites')
      .select('id, campaign_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

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
      .select('id, title')
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

    // Créer une notification pour l'utilisateur (via admin pour bypass RLS)
    try {
      const supabaseAdmin = getSupabaseAdmin()
      await (supabaseAdmin as any)
        .from('notifications')
        .insert({
          user_id: user.id,
          type: 'favorite_added',
          title: 'Campagne ajoutée aux favoris',
          message: `Vous avez ajouté "${(campaign as any).title}" à vos favoris.`,
          read: false,
          action_url: `/content/${campaignId}`,
          metadata: {
            campaign_id: campaignId,
            campaign_title: (campaign as any).title,
          }
        })
    } catch (notifErr) {
      // Ne pas bloquer si la notification échoue
      console.error('Error creating favorite notification:', notifErr)
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
