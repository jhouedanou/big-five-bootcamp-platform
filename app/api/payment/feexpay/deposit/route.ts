/**
 * Route : POST /api/payment/feexpay/deposit
 *
 * Initie une collecte FeexPay (mobile money) générique.
 *
 * Body attendu :
 * {
 *   amount: number,
 *   currency?: string,        // défaut "XOF"
 *   phoneNumber: string,      // MSISDN complet (chiffres)
 *   provider: string,         // code interne ex. "ORANGE_CIV", "WAVE_CIV"
 *   description?: string,
 *   firstName?: string,
 *   email?: string,
 *   metadata?: { type, userId, ... }   // echo dans le webhook (callback_info)
 * }
 *
 * Retourne le ref_command (UUID) + la reference FeexPay (clé de polling).
 * Le statut final arrive via le webhook /api/payment/feexpay/callback/deposit.
 */

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { initiateDeposit, FEEXPAY_CALLBACK_URL } from '@/lib/feexpay'
import { toReseau } from '@/lib/feexpay-providers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      amount,
      currency = 'XOF',
      phoneNumber,
      provider,
      description,
      firstName,
      email,
      metadata,
      userEmail,
      sessionId,
    } = body as {
      amount: number | string
      currency?: string
      phoneNumber: string
      provider: string
      description?: string
      firstName?: string
      email?: string
      metadata?: Record<string, unknown>
      userEmail?: string
      sessionId?: string
    }

    if (!amount || !currency || !phoneNumber || !provider) {
      return NextResponse.json(
        { error: 'Champs requis manquants : amount, currency, phoneNumber, provider' },
        { status: 400 }
      )
    }

    // 1. Générer un ref_command unique (UUIDv4 — notre customId).
    const refCommand = randomUUID()

    // 2. Stocker le paiement AVANT de contacter FeexPay (idempotence merchant).
    const { error: insertError } = await (supabaseAdmin as any)
      .from('payments')
      .insert({
        ref_command: refCommand,
        amount: Number(amount),
        currency,
        status: 'pending',
        payment_method: 'feexpay',
        provider,
        client_phone: phoneNumber,
        user_email: userEmail || email || null,
        session_id: sessionId || null,
        metadata: { ...(metadata || {}), ref_command: refCommand, provider },
        created_at: new Date().toISOString(),
      })

    if (insertError) {
      console.error('❌ Erreur insertion paiement feexpay:', insertError)
    }

    // 3. Initier la collecte côté FeexPay.
    const response = await initiateDeposit({
      refCommand,
      amount,
      currency,
      phoneNumber,
      reseau: toReseau(provider),
      description,
      firstName,
      email: email || userEmail,
      callbackInfo: { ...(metadata || {}), ref_command: refCommand },
    })

    console.log('📤 FeexPay deposit initié:', {
      refCommand,
      reference: response.reference,
      status: response.status,
    })

    // 4. Stocker la reference FeexPay (clé de polling) dans metadata.
    if (response.reference) {
      await (supabaseAdmin as any)
        .from('payments')
        .update({
          metadata: {
            ...(metadata || {}),
            ref_command: refCommand,
            provider,
            feexpay_reference: response.reference,
          },
        })
        .eq('ref_command', refCommand)
    }

    return NextResponse.json({
      ref_command: refCommand,
      reference: response.reference,
      status: response.status || 'PENDING',
      pollingUrl: `/api/payment/feexpay/status/${encodeURIComponent(response.reference || '')}`,
      callbackUrl: FEEXPAY_CALLBACK_URL,
    })
  } catch (error: any) {
    console.error('❌ Erreur initiate deposit feexpay:', error)
    return NextResponse.json(
      { error: error?.message || 'Erreur inconnue' },
      { status: 500 }
    )
  }
}
