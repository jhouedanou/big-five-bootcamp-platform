/**
 * GET /api/dashboard/brand-monitoring
 *
 * Renvoie les groupes de contenus à mettre en avant sur le dashboard pour les
 * demandes de Suivi de marques approuvées + payées de l'utilisateur connecté.
 *
 * Réponse :
 *   { groups: [{ requestId, brandName, countries, sectors, channels, contents }] }
 *
 * Logique :
 *   - 1 groupe par demande (= 1 sous-bloc par marque dans l'UI)
 *   - Les contenus sont issus de la table de liaison `brand_request_campaigns`
 *     (rattachement manuel effectué par l'admin). Plus d'auto-association
 *     par marque / pays / secteurs / plateformes.
 *   - Limite par groupe : `limit` query param (défaut 8)
 *   - Si l'utilisateur n'a aucune demande approuvée+payée, on renvoie groups: []
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const DEFAULT_LIMIT = 8
const MAX_LIMIT = 24

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const url = new URL(request.url)
    const limitParam = parseInt(url.searchParams.get('limit') || '', 10)
    const perGroupLimit = Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(limitParam, MAX_LIMIT)
      : DEFAULT_LIMIT
    const debug = url.searchParams.get('debug') === '1'

    const admin = getSupabaseAdmin()

    // 1. Demandes approuvées + payées de l'utilisateur
    // On inclut les statuts 'completed' ET 'accepted'/'in_progress' (legacy) pour
    // ne pas masquer les marques approuvées avant la migration des statuts.
    const { data: requests, error: reqErr } = await admin
      .from('brand_requests')
      .select(
        'id, brand_name, status, paid_at, countries, sectors, country, sector, social_networks, next_renewal_at, auto_renew, created_at'
      )
      .eq('user_id', user.id)
      .in('status', ['completed', 'accepted', 'in_progress'])
      .not('paid_at', 'is', null)
      .order('created_at', { ascending: false })

    if (reqErr) {
      console.error('[brand-monitoring] requests query failed:', reqErr)
      return NextResponse.json({ error: reqErr.message }, { status: 500 })
    }

    if (!requests || requests.length === 0) {
      return NextResponse.json({ groups: [] })
    }

    // 2. Récupération batchée : 1 requête pour tous les liens, 1 requête pour
    //    toutes les campagnes — au lieu de 2*N queries en boucle.
    const requestIds = requests.map((r: any) => r.id)
    const { data: allLinks, error: linksErr } = await admin
      .from('brand_request_campaigns')
      .select('brand_request_id, campaign_id, added_at')
      .in('brand_request_id', requestIds)
      .order('added_at', { ascending: false })

    if (linksErr) {
      console.error('[brand-monitoring] links query failed:', linksErr)
    }

    // Groupement links par brand_request_id avec cap perGroupLimit par groupe
    const linksByRequest = new Map<string, string[]>()
    for (const link of (allLinks || [])) {
      const arr = linksByRequest.get(link.brand_request_id) || []
      if (arr.length < perGroupLimit) {
        arr.push(link.campaign_id)
        linksByRequest.set(link.brand_request_id, arr)
      }
    }

    // Charger toutes les campagnes liées en une seule requête
    const allCampaignIds = Array.from(new Set(Array.from(linksByRequest.values()).flat()))
    let campaignsById = new Map<string, any>()
    if (allCampaignIds.length > 0) {
      const { data: campaigns } = await admin
        .from('campaigns')
        .select(
          'id, title, summary, description, thumbnail, platforms, country, category, format, tags, created_at, video_url, images, brand, agency, year, status, access_level, featured'
        )
        .in('id', allCampaignIds)
        .eq('status', 'Publié')
      campaignsById = new Map((campaigns || []).map((c: any) => [c.id, c]))
    }

    const groups = requests.map((r: any) => {
      const countries: string[] =
        Array.isArray(r.countries) && r.countries.length > 0
          ? r.countries
          : r.country
            ? [r.country]
            : []
      const sectors: string[] =
        Array.isArray(r.sectors) && r.sectors.length > 0
          ? r.sectors
          : r.sector
            ? [r.sector]
            : []
      const channels: string[] = Array.isArray(r.social_networks)
        ? r.social_networks
        : []

      const ids = linksByRequest.get(r.id) || []
      const contents = ids.map((cid) => campaignsById.get(cid)).filter(Boolean)

      return {
        requestId: r.id,
        brandName: r.brand_name,
        countries,
        sectors,
        channels,
        nextRenewalAt: r.next_renewal_at || null,
        autoRenew: r.auto_renew ?? null,
        contents,
        ...(debug
          ? {
              _debug: {
                linkedCount: ids.length,
                resolvedCount: contents.length,
                countries,
                sectors,
                channels,
              },
            }
          : {}),
      }
    })

    // On masque les groupes sans contenu pour ne pas afficher des sous-blocs vides.
    const nonEmpty = groups.filter((g) => g.contents.length > 0)

    if (debug) {
      return NextResponse.json({
        groups: nonEmpty,
        _debug: {
          requestsCount: requests.length,
          groupsAllCount: groups.length,
          groupsNonEmptyCount: nonEmpty.length,
          groups: groups.map((g: any) => ({
            brand: g.brandName,
            kept: g.contents.length,
            ...g._debug,
          })),
        },
      })
    }

    return NextResponse.json(
      { groups: nonEmpty },
      { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=120' } }
    )
  } catch (e: any) {
    console.error('[brand-monitoring]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
