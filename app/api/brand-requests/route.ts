/**
 * API Route: /api/brand-requests
 *
 * Gestion des demandes de curation de marques (abonnés Pro)
 *   GET  – liste des demandes de l'utilisateur connecté
 *   POST – création d'une nouvelle demande
 *          body : { brandName, socialNetworks: string[], brandUrls: string[], notes? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// Réseaux sociaux autorisés (whitelist — doit matcher l'UI)
const ALLOWED_SOCIAL_NETWORKS = [
  'facebook',
  'instagram',
  'linkedin',
  'x',
  'tiktok',
] as const
type SocialNetwork = (typeof ALLOWED_SOCIAL_NETWORKS)[number]

// Plans autorisés à soumettre des demandes.
const ALLOWED_PLANS = ['pro']

// Validation basique d'URL
function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value.trim())
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

// GET - Lister les demandes de l'utilisateur connecté
export async function GET() {
  try {
    const supabase = await getSupabaseServer()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('brand_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ requests: data || [] })
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Créer une nouvelle demande
export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Vérifier le plan (Pro minimum) — les admins passent toujours
    const admin = getSupabaseAdmin()
    const { data: profile } = await admin
      .from('users')
      .select('plan, subscription_status, role')
      .eq('id', user.id)
      .single()

    const plan = (profile?.plan || '').toLowerCase()
    const isAdmin = (profile?.role || '').toLowerCase() === 'admin'
    if (!profile || (!isAdmin && !ALLOWED_PLANS.includes(plan))) {
      return NextResponse.json(
        { error: 'Cette fonctionnalité est réservée aux abonnés Pro.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { brandName, socialNetworks, brandUrls, notes } = body as {
      brandName?: string
      socialNetworks?: unknown
      brandUrls?: unknown
      notes?: string
    }

    // 1) Nom de la marque
    if (!brandName || typeof brandName !== 'string' || !brandName.trim()) {
      return NextResponse.json(
        { error: 'Le nom de la marque est requis.' },
        { status: 400 }
      )
    }

    // 2) Réseaux sociaux — cochés
    const socials: SocialNetwork[] = Array.isArray(socialNetworks)
      ? (socialNetworks
          .map((s) => String(s).toLowerCase().trim())
          .filter((s): s is SocialNetwork =>
            (ALLOWED_SOCIAL_NETWORKS as readonly string[]).includes(s)
          ))
      : []

    if (socials.length === 0) {
      return NextResponse.json(
        { error: 'Sélectionnez au moins un réseau social.' },
        { status: 400 }
      )
    }

    // 3) Liens — requis sauf si la marque existe déjà dans les campagnes
    //    (dans ce cas, l'équipe sait où chercher via les campagnes existantes)
    const urlsRaw: string[] = Array.isArray(brandUrls)
      ? brandUrls.map((u) => String(u).trim()).filter(Boolean)
      : []

    const { data: existing } = await admin
      .from('campaigns')
      .select('brand')
      .ilike('brand', brandName.trim())
      .limit(1)
    const brandIsKnown = (existing?.length ?? 0) > 0

    if (urlsRaw.length === 0 && !brandIsKnown) {
      return NextResponse.json(
        { error: 'Au moins un lien est requis pour une nouvelle marque.' },
        { status: 400 }
      )
    }

    const invalid = urlsRaw.find((u) => !isValidUrl(u))
    if (invalid) {
      return NextResponse.json(
        { error: `Lien invalide : ${invalid}` },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('brand_requests')
      .insert({
        user_id: user.id,
        brand_name: brandName.trim(),
        social_networks: socials,
        brand_urls: urlsRaw,
        // Compat avec l'ancienne colonne single-URL (première entrée)
        brand_url: urlsRaw[0] ?? null,
        notes: typeof notes === 'string' ? notes.trim() || null : null,
      })
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
