/**
 * API Route: POST /api/promo/validate
 *
 * Valide un code promo LAVEIYE distribué lors de l'inscription au keynote
 * et retourne les conditions de l'offre (3 mois Basic à 10 000 FCFA).
 *
 * Body: { code: string }
 * Réponse OK : { valid: true, offer: { plan, price, originalPrice, durationDays, ... } }
 * Réponse KO : { valid: false, error: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import {
  KEYNOTE_PROMO_OFFER,
  isPromoCodeFormatValid,
  normalizePromoCode,
} from '@/lib/promo-codes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  let body: { code?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ valid: false, error: 'JSON invalide' }, { status: 400 })
  }

  const code = normalizePromoCode(body.code)
  if (!code) {
    return NextResponse.json({ valid: false, error: 'Code requis' }, { status: 400 })
  }
  if (!isPromoCodeFormatValid(code)) {
    return NextResponse.json(
      { valid: false, error: 'Format de code invalide (attendu : LAVEIYE-XXXX)' },
      { status: 400 }
    )
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('keynote_registrations')
    .select('id, email, promo_code, promo_redeemed_at')
    .eq('promo_code', code)
    .maybeSingle()

  if (error) {
    return NextResponse.json(
      { valid: false, error: 'Erreur serveur lors de la vérification' },
      { status: 500 }
    )
  }

  if (!data) {
    return NextResponse.json(
      { valid: false, error: 'Code promo introuvable' },
      { status: 404 }
    )
  }

  if (data.promo_redeemed_at) {
    return NextResponse.json(
      { valid: false, error: 'Ce code a déjà été utilisé' },
      { status: 409 }
    )
  }

  return NextResponse.json({
    valid: true,
    offer: {
      plan: KEYNOTE_PROMO_OFFER.plan,
      planLabel: KEYNOTE_PROMO_OFFER.planLabel,
      price: KEYNOTE_PROMO_OFFER.price,
      originalPrice: KEYNOTE_PROMO_OFFER.originalPrice,
      durationDays: KEYNOTE_PROMO_OFFER.durationDays,
      durationLabel: KEYNOTE_PROMO_OFFER.durationLabel,
      billing: KEYNOTE_PROMO_OFFER.billing,
    },
  })
}
