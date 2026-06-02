/**
 * Route : POST /api/payment/brand-request/initiate
 *
 * Initie un paiement Mobile Money (PawaPay) pour le devis d'une demande de
 * suivi de marque. L'admin a au préalable défini `devis_amount`/`devis_url`
 * et passé la demande en statut `quote_sent`. L'utilisateur a ensuite
 * accepté le devis (statut → `quote_accepted`).
 *
 * Body :
 * {
 *   brandRequestId: string  // UUID de la brand_request
 *   phoneNumber: string     // MSISDN complet, ex. "22507xxxxxxxx"
 *   provider: string        // ex. "ORANGE_CIV", "MTN_MOMO_BEN", "FREE_SEN" (Wave non supporté par PawaPay)
 * }
 *
 * Retour : { depositId, status, nextStep, authorizationUrl?, ref_command }
 *
 * Effets :
 *  - Insère un paiement dans `payments` avec metadata.type = 'brand_request'
 *  - Bascule la demande en statut `in_payment`
 *  - Le callback PawaPay (deposit) finalisera : `in_production` + `paid_at`
 *    + `next_renewal_at = paid_at + 1 month`.
 */

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getSupabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase'
import { initiateDeposit } from '@/lib/feexpay'
import { toReseau } from '@/lib/feexpay-providers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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
    const { brandRequestId, phoneNumber, provider } = body as {
      brandRequestId?: string
      phoneNumber?: string
      provider?: string
    }

    if (!brandRequestId || !phoneNumber || !provider) {
      return NextResponse.json(
        {
          error:
            'Champs requis manquants : brandRequestId, phoneNumber, provider',
        },
        { status: 400 }
      )
    }

    // 1. Récupérer la demande et vérifier la propriété + état autorisé
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

    // 2. Préparer le deposit
    const depositId = randomUUID()
    const cleanedPhone = String(phoneNumber).replace(/\D/g, '')
    const amountStr = String(Math.round(Number(req.devis_amount)))
    const currency = req.devis_currency || 'XOF'

    // 3. Stocker le paiement avant l'appel PawaPay (idempotence)
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
        user_email: user.email || null,
        metadata: {
          type: 'brand_request',
          brand_request_id: req.id,
          brand_name: req.brand_name,
          user_id: user.id,
          ref_command: depositId,
          provider,
        },
        created_at: new Date().toISOString(),
      })

    if (insertError) {
      console.error('[brand-request/initiate] insert payment failed', insertError)
    }

    // 4. Bascule de la demande en `in_payment` (best-effort)
    await (supabaseAdmin as any)
      .from('brand_requests')
      .update({
        status: 'in_payment',
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.id)

    // 5. Appel FeexPay
    const customerMessage = `Devis ${String(req.brand_name || '').slice(0, 30)}`.slice(0, 50)
    const response = await initiateDeposit({
      refCommand: depositId,
      amount: amountStr,
      currency,
      phoneNumber: cleanedPhone,
      reseau: toReseau(provider),
      description: customerMessage,
      email: user.email || undefined,
      callbackInfo: {
        ref_command: depositId,
        type: 'brand_request',
        brand_request_id: req.id,
      },
    })

    // 6. Si refus immédiat, on remet le paiement en `failed`.
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
            user_id: user.id,
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
    console.error('[brand-request/initiate] error', error)
    return NextResponse.json(
      { error: error?.message || 'Erreur inconnue' },
      { status: 500 }
    )
  }
}
