/**
 * Route PUBLIQUE : POST /api/payment/brand-request/[id]/pay
 *
 * Initie un paiement Mobile Money (PawaPay) pour le devis d'une demande de
 * suivi de marque, **sans authentification**. Cette route est appelée depuis
 * la page publique /pay/brand-request/[id], dont le lien est envoyé par
 * l'admin au client.
 *
 * Sécurité : la connaissance de l'UUID `brand_requests.id` (non énumérable)
 * sert de jeton d'accès. La route refuse :
 *  - les demandes déjà payées (paid_at non null) ou inactives (cancelled/rejected)
 *  - les demandes sans devis_amount > 0
 *
 * Body :
 * {
 *   phoneNumber: string  // MSISDN complet, ex. "22507xxxxxxxx"
 *   provider: string     // ex. "ORANGE_CIV", "MTN_MOMO_BEN", "FREE_SEN" (Wave non supporté par PawaPay)
 * }
 *
 * Effets :
 *  - Insère un paiement dans `payments` avec metadata.type = 'brand_request'
 *  - Bascule la demande en statut `in_payment`
 *  - Le callback PawaPay (deposit) finalisera : `completed` + `paid_at`.
 */

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { initiateDeposit } from '@/lib/feexpay'
import { toReseau } from '@/lib/feexpay-providers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

    const body = await request.json().catch(() => ({}))
    const { phoneNumber, provider } = body as {
      phoneNumber?: string
      provider?: string
    }

    if (!phoneNumber || !provider) {
      return NextResponse.json(
        { error: 'Champs requis manquants : phoneNumber, provider' },
        { status: 400 }
      )
    }

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

    // Refus : déjà payée
    if (req.paid_at) {
      return NextResponse.json(
        { error: 'Cette demande est déjà payée.' },
        { status: 400 }
      )
    }

    // Refus : statuts terminaux
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

    const depositId = randomUUID()
    const cleanedPhone = String(phoneNumber).replace(/\D/g, '')
    const amountStr = String(Math.round(Number(req.devis_amount)))
    const currency = req.devis_currency || 'XOF'

    const { error: insertError } = await (supabaseAdmin as any)
      .from('payments')
      .insert({
        ref_command: depositId,
        amount: Number(amountStr),
        currency,
        status: 'pending',
        payment_method: 'feexpay',
        provider,
        client_phone: cleanedPhone,
        metadata: {
          type: 'brand_request',
          brand_request_id: req.id,
          brand_name: req.brand_name,
          user_id: req.user_id,
          ref_command: depositId,
          provider,
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

    const customerMessage = `Devis ${String(req.brand_name || '').slice(0, 30)}`.slice(0, 50)
    const response = await initiateDeposit({
      refCommand: depositId,
      amount: amountStr,
      currency,
      phoneNumber: cleanedPhone,
      reseau: toReseau(provider),
      description: customerMessage,
      callbackInfo: {
        ref_command: depositId,
        type: 'brand_request',
        brand_request_id: req.id,
      },
    })

    if (response.status === 'FAILED') {
      await (supabaseAdmin as any)
        .from('payments')
        .update({ status: 'failed' })
        .eq('ref_command', depositId)

      return NextResponse.json(
        { error: 'Paiement refusé par FeexPay', status: 'FAILED', ref_command: depositId },
        { status: 400 }
      )
    }

    // Stocker la reference FeexPay (clé de polling).
    if (response.reference) {
      await (supabaseAdmin as any)
        .from('payments')
        .update({
          metadata: {
            type: 'brand_request',
            brand_request_id: req.id,
            brand_name: req.brand_name,
            user_id: req.user_id,
            ref_command: depositId,
            provider,
            feexpay_reference: response.reference,
          },
        })
        .eq('ref_command', depositId)
    }

    return NextResponse.json({
      success: true,
      ref_command: depositId,
      reference: response.reference,
      status: response.status || 'PENDING',
    })
  } catch (error: any) {
    console.error('[brand-request/:id/pay] error', error)
    return NextResponse.json(
      { error: error?.message || 'Erreur inconnue' },
      { status: 500 }
    )
  }
}
