/**
 * Route PUBLIQUE : POST /api/payment/brand-request/[id]/pay
 *
 * Initie un paiement Chariow pour le devis d'une demande de suivi de marque,
 * **sans authentification**. Cette route est appelée depuis la page publique
 * /pay/brand-request/[id], dont le lien est envoyé par l'admin au client.
 *
 * Sécurité : la connaissance de l'UUID `brand_requests.id` (non énumérable)
 * sert de jeton d'accès. La route refuse :
 *  - les demandes déjà payées (paid_at non null) ou inactives (cancelled/rejected)
 *  - les demandes sans devis_amount > 0
 *
 * Body : {} (rien — Chariow gère la collecte des infos client)
 *
 * Effets :
 *  - Insère un paiement dans `payments` avec metadata.type = 'brand_request'
 *  - Bascule la demande en statut `in_payment`
 *  - Le webhook Chariow finalisera : `completed` + `paid_at`.
 */

import { NextRequest, NextResponse } from 'next/server'
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

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

    const { data: req, error: reqError } = await (supabaseAdmin as any)
      .from('brand_requests')
      .select(
        'id, user_id, status, brand_name, devis_amount, devis_currency, paid_at',
      )
      .eq('id', id)
      .maybeSingle()

    if (reqError || !req) {
      return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
    }

    if (req.paid_at) {
      return NextResponse.json(
        { error: 'Cette demande est déjà payée.' },
        { status: 400 }
      )
    }

    if (req.status === 'cancelled' || req.status === 'rejected') {
      return NextResponse.json(
        { error: 'Cette demande n\'accepte plus de paiement.' },
        { status: 400 }
      )
    }

    if (!req.devis_amount || Number(req.devis_amount) <= 0) {
      return NextResponse.json(
        { error: 'Aucun devis valide pour cette demande.' },
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
        metadata: {
          type: 'brand_request',
          brand_request_id: req.id,
          brand_name: req.brand_name,
          user_id: req.user_id,
          ref_command,
          gateway: 'chariow',
        },
        created_at: new Date().toISOString(),
      })

    if (insertError) {
      console.error('[brand-request/:id/pay] insert payment failed', insertError)
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
        successUrl: `${baseUrl}/payment/success?ref_command=${encodeURIComponent(ref_command)}`,
        cancelUrl: `${baseUrl}/payment/failed?ref_command=${encodeURIComponent(ref_command)}`,
      })
    } catch (e: any) {
      console.error('[brand-request/:id/pay] buildCheckoutUrl error:', e)
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
    console.error('[brand-request/:id/pay] error', error)
    return NextResponse.json(
      { error: error?.message || 'Erreur inconnue' },
      { status: 500 }
    )
  }
}
