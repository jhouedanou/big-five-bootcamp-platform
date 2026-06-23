/**
 * Route : POST /api/payment/brand-request/initiate
 *
 * Initie un paiement Chariow pour le devis d'une demande de suivi de marque.
 * L'admin a au préalable défini `devis_amount`/`devis_url` et passé la demande
 * en statut `quote_sent`. L'utilisateur a ensuite accepté le devis
 * (statut → `quote_accepted`).
 *
 * Body :
 * {
 *   brandRequestId: string  // UUID de la brand_request
 * }
 *
 * Retour : { success, ref_command, checkoutUrl }
 *
 * Effets :
 *  - Insère un paiement dans `payments` avec metadata.type = 'brand_request'
 *  - Bascule la demande en statut `in_payment`
 *  - Le webhook Chariow finalisera : `completed` + `paid_at`
 *    + `next_renewal_at = paid_at + 1 month`.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase'
import { buildCheckoutUrl, generateRefCommand, CHARIOW_CONFIG } from '@/lib/chariow'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function resolveBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NODE_ENV === 'production' ? 'https://laveiye.com' : 'http://localhost:3000')
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { brandRequestId } = body as { brandRequestId?: string }

    if (!brandRequestId) {
      return NextResponse.json(
        { error: 'Champ requis manquant : brandRequestId' },
        { status: 400 }
      )
    }

    const { data: req, error: reqError } = await (supabaseAdmin as any)
      .from('brand_requests')
      .select(
        'id, user_id, status, brand_name, devis_amount, devis_currency, devis_sent_at',
      )
      .eq('id', brandRequestId)
      .maybeSingle()

    if (reqError || !req) {
      return NextResponse.json(
        { error: 'Demande introuvable' },
        { status: 404 }
      )
    }

    if (req.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Demande non autorisée' },
        { status: 403 }
      )
    }

    if (!req.devis_amount || Number(req.devis_amount) <= 0) {
      return NextResponse.json(
        { error: 'Aucun devis valide pour cette demande' },
        { status: 400 }
      )
    }

    const allowedStatuses = ['quote_accepted', 'in_payment', 'quote_sent']
    if (!allowedStatuses.includes(req.status)) {
      return NextResponse.json(
        {
          error: `Le paiement n'est pas disponible pour cette demande (statut : ${req.status}).`,
        },
        { status: 400 }
      )
    }

    const ref_command = generateRefCommand('BRAND')
    const amount = Math.round(Number(req.devis_amount))
    const currency = req.devis_currency || 'XOF'

    const { error: insertError } = await (supabaseAdmin as any)
      .from('payments')
      .insert({
        ref_command,
        amount,
        currency,
        status: 'pending',
        payment_method: 'chariow',
        user_email: user.email || null,
        metadata: {
          type: 'brand_request',
          brand_request_id: req.id,
          brand_name: req.brand_name,
          user_id: user.id,
          ref_command,
          gateway: 'chariow',
        },
        created_at: new Date().toISOString(),
      })

    if (insertError) {
      console.error('[brand-request/initiate] insert payment failed', insertError)
    }

    await (supabaseAdmin as any)
      .from('brand_requests')
      .update({
        status: 'in_payment',
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.id)

    if (!CHARIOW_CONFIG.API_KEY || !CHARIOW_CONFIG.PRODUCT_ID) {
      return NextResponse.json(
        { error: 'Chariow non configuré (API_KEY/PRODUCT_ID manquants).' },
        { status: 500 }
      )
    }

    const baseUrl = resolveBaseUrl()
    let checkoutUrl: string
    try {
      checkoutUrl = buildCheckoutUrl({
        refCommand: ref_command,
        email: user.email || undefined,
        // Mobile money confirme de façon asynchrone : on passe par /payment/pending
        // (poll backend) au lieu de /payment/success direct, pour éviter une
        // redirection vers le succès avant confirmation réelle du paiement.
        successUrl: `${baseUrl}/payment/pending?ref_command=${encodeURIComponent(ref_command)}`,
        cancelUrl: `${baseUrl}/payment/failed?ref_command=${encodeURIComponent(ref_command)}`,
      })
    } catch (e: any) {
      console.error('[brand-request/initiate] buildCheckoutUrl error:', e)
      return NextResponse.json(
        { error: 'Impossible de construire l\'URL Chariow', details: e?.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      ref_command,
      checkoutUrl,
    })
  } catch (error: any) {
    console.error('[brand-request/initiate] error', error)
    return NextResponse.json(
      { error: error?.message || 'Erreur inconnue' },
      { status: 500 }
    )
  }
}
