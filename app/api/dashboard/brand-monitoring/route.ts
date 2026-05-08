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
 *   - Filtres : marque + (pays ∈ ...) + (catégorie ∈ ...) + (platforms ∩ canaux)
 *   - Comparaisons sur pays/secteur tolérantes aux accents et à la casse,
 *     les codes de réseaux sociaux mappés vers les libellés campagnes.
 *   - Limite par groupe : `limit` query param (défaut 8)
 *   - Si l'utilisateur n'a aucune demande approuvée+payée, on renvoie groups: []
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const DEFAULT_LIMIT = 8
const MAX_LIMIT = 24

// brand_requests.social_networks stocke des codes lowercase (facebook, x, ...)
// alors que campaigns.platforms stocke des labels TitleCase (Facebook, Twitter/X, ...).
// L'opérateur && (overlaps) PostgreSQL est sensible à la casse, on doit donc
// mapper les codes vers TOUS les libellés possibles côté campaigns avant le filtre.
const CHANNEL_TO_CAMPAIGN_PLATFORMS: Record<string, string[]> = {
  facebook:  ['Facebook'],
  instagram: ['Instagram'],
  linkedin:  ['LinkedIn'],
  tiktok:    ['TikTok'],
  // 'x' (anciennement Twitter) — on accepte les libellés historiques présents en base
  x:         ['Twitter/X', 'X', 'Twitter'],
  youtube:   ['YouTube'],
}

// Normalisation tolérante (trim + lowercase + suppression des accents) pour
// comparer pays/secteurs entre brand_requests et campaigns sans rater les
// "Côte d'Ivoire" vs "Cote d'Ivoire" ou "Télécoms" vs "Telecoms".
function fold(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
}

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
    const { data: requests, error: reqErr } = await admin
      .from('brand_requests')
      .select(
        'id, brand_name, status, paid_at, countries, sectors, country, sector, social_networks, next_renewal_at, auto_renew, created_at'
      )
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .not('paid_at', 'is', null)
      .order('created_at', { ascending: false })

    if (reqErr) {
      console.error('[brand-monitoring] requests query failed:', reqErr)
      return NextResponse.json({ error: reqErr.message }, { status: 500 })
    }

    if (!requests || requests.length === 0) {
      return NextResponse.json({ groups: [] })
    }

    // 2. Pour chaque demande, on récupère ses contenus correspondants.
    //    On parallélise les requêtes (une par groupe).
    const groups = await Promise.all(
      requests.map(async (r: any) => {
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

        // Mapping codes → libellés campagne pour le filtre &&.
        const platformLabels = channels.flatMap(
          (c) => CHANNEL_TO_CAMPAIGN_PLATFORMS[String(c).toLowerCase()] || []
        )

        // 1er passage SQL : marque + canaux. Les filtres pays/secteurs sont
        // appliqués en JS (fold) pour gérer les variations d'accents/casse.
        let q = admin
          .from('campaigns')
          .select('*')
          .ilike('brand', r.brand_name)
          .eq('status', 'Publié')

        if (platformLabels.length > 0) q = q.overlaps('platforms', platformLabels)

        const { data: rawContents, error: campErr } = await q
          .order('created_at', { ascending: false })
          .limit(perGroupLimit * 4) // marge pour le filtrage JS pays/secteurs

        if (campErr) {
          console.error('[brand-monitoring] campaigns query failed:', campErr)
        }

        const foldedCountries = countries.map(fold).filter(Boolean)
        const foldedSectors = sectors.map(fold).filter(Boolean)

        const filtered = (rawContents || []).filter((c: any) => {
          if (foldedCountries.length > 0) {
            if (!foldedCountries.includes(fold(c.country))) return false
          }
          if (foldedSectors.length > 0) {
            if (!foldedSectors.includes(fold(c.category))) return false
          }
          return true
        })

        return {
          requestId: r.id,
          brandName: r.brand_name,
          countries,
          sectors,
          channels,
          nextRenewalAt: r.next_renewal_at || null,
          autoRenew: r.auto_renew ?? null,
          contents: filtered.slice(0, perGroupLimit),
          ...(debug
            ? {
                _debug: {
                  rawCount: rawContents?.length ?? 0,
                  filteredCount: filtered.length,
                  platformLabels,
                  countries,
                  sectors,
                  channels,
                },
              }
            : {}),
        }
      })
    )

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

    return NextResponse.json({ groups: nonEmpty })
  } catch (e: any) {
    console.error('[brand-monitoring]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
