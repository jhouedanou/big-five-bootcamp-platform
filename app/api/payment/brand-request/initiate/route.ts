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
 *   provider: string        // ex. "ORANGE_CIV", "WAVE_CIV", "MTN_MOMO_BEN"
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
import {
  initiateDeposit,
  PUBLIC_BASE_URL,
} from '@/lib/pawapay'

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
        payment_method: 'pawapay',
        provider,
        client_phone: cleanedPhone,
        user_email: user.email || null,
        metadata: {
          type: 'brand_request',
          brand_request_id: req.id,
          brand_name: req.brand_name,
          user_id: user.id,
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

    // 5. Appel PawaPay
    const customerMessage = `Devis ${String(req.brand_name || '').slice(0, 14)}`.slice(0, 22)
    const response = await initiateDeposit({
      depositId,
      amount: amountStr,
      currency,
      payer: {
        type: 'MMO',
        accountDetails: {
          phoneNumber: cleanedPhone,
          provider,
        },
      },
      customerMessage,
      successfulUrl: `${PUBLIC_BASE_URL}/payment/success?ref=${depositId}`,
      failedUrl: `${PUBLIC_BASE_URL}/payment/cancel?ref=${depositId}`,
    })

    // 6. Si rejet immédiat, on remet le paiement en `rejected` et on log
    if (response.status === 'REJECTED') {
      await (supabaseAdmin as any)
        .from('payments')
        .update({
          status: 'rejected',
          failure_code: response.failureReason?.failureCode,
          failure_message: response.failureReason?.failureMessage,
        })
        .eq('ref_command', depositId)

      return NextResponse.json(
        {
          error:
            response.failureReason?.failureMessage ||
            'Paiement refusé par l’opérateur',
          status: 'REJECTED',
          ref_command: depositId,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      ref_command: depositId,
      depositId,
      status: response.status,
      nextStep: response.nextStep,
      authorizationUrl: (response as any).authorizationUrl,
    })
  } catch (error: any) {
    console.error('[brand-request/initiate] error', error)
    return NextResponse.json(
      { error: error?.message || 'Erreur inconnue' },
      { status: 500 }
    )
  }
}
