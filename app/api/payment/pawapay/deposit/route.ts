/**
 * Route : POST /api/payment/pawapay/deposit
 *
 * Initie un dépôt PawaPay (collecte d'argent depuis le mobile money du client).
 *
 * Body attendu :
 * {
 *   amount: number,            // ex. 100
 *   currency: string,          // ex. "XOF"
 *   phoneNumber: string,       // MSISDN complet, ex. "22507xxxxxxxx"
 *   provider: string,          // ex. "ORANGE_CIV", "WAVE_CIV", "MTN_MOMO_BEN"
 *   customerMessage?: string,  // max 22 chars, affiché au client
 *   metadata?: {               // stocké dans la table payments
 *     type: "subscription" | "bootcamp",
 *     userId?: string,
 *     subscription_end_date?: string,
 *     ...
 *   }
 * }
 *
 * Retourne l'ACK PawaPay + le depositId (UUIDv4) à stocker côté client.
 * Le statut final arrivera via le callback /api/payment/pawapay/callback/deposit.
 */

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import {
  initiateDeposit,
  PAWAPAY_CALLBACK_URLS,
  PUBLIC_BASE_URL,
} from '@/lib/pawapay'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      amount,
      currency,
      phoneNumber,
      provider,
      customerMessage,
      metadata,
      userEmail,
      sessionId,
      successfulUrl,
      failedUrl,
    } = body as {
      amount: number | string
      currency: string
      phoneNumber: string
      provider: string
      customerMessage?: string
      metadata?: Record<string, unknown>
      userEmail?: string
      sessionId?: string
      successfulUrl?: string
      failedUrl?: string
    }

    // Validation basique
    if (!amount || !currency || !phoneNumber || !provider) {
      return NextResponse.json(
        {
          error:
            'Champs requis manquants : amount, currency, phoneNumber, provider',
        },
        { status: 400 }
      )
    }

    // 1. Générer un depositId unique (UUIDv4)
    const depositId = randomUUID()

    // 2. Stocker le paiement AVANT de contacter PawaPay (idempotence côté merchant)
    const { error: insertError } = await (supabaseAdmin as any)
      .from('payments')
      .insert({
        ref_command: depositId,
        amount: Number(amount),
        currency,
        status: 'pending',
        payment_method: 'pawapay',
        provider,
        client_phone: phoneNumber,
        user_email: userEmail || null,
        session_id: sessionId || null,
        metadata: metadata || {},
        created_at: new Date().toISOString(),
      })

    if (insertError) {
      console.error('❌ Erreur insertion paiement pawapay:', insertError)
      // On log mais on continue — tant que le depositId est stocké
      // côté Supabase, on pourra récupérer par polling/reconciliation.
    }

    // 3. Initier le deposit côté PawaPay
    const response = await initiateDeposit({
      depositId,
      amount: String(amount),
      currency,
      payer: {
        type: 'MMO',
        accountDetails: {
          phoneNumber,
          provider,
        },
      },
      customerMessage: customerMessage?.slice(0, 22),
      // Pour les providers avec flow de redirection (WAVE_SEN, WAVE_CIV)
      successfulUrl:
        successfulUrl || `${PUBLIC_BASE_URL}/payment/success?ref=${depositId}`,
      failedUrl:
        failedUrl || `${PUBLIC_BASE_URL}/payment/failed?ref=${depositId}`,
    })

    console.log('📤 PawaPay deposit initié:', {
      depositId,
      status: response.status,
      nextStep: response.nextStep,
    })

    // 4. Si REJECTED → marquer tout de suite le paiement comme échoué
    if (response.status === 'REJECTED') {
      await (supabaseAdmin as any)
        .from('payments')
        .update({
          status: 'rejected',
          failure_code: response.failureReason?.failureCode,
          failure_message: response.failureReason?.failureMessage,
        })
        .eq('ref_command', depositId)
    }

    return NextResponse.json({
      depositId,
      status: response.status,
      nextStep: response.nextStep,
      created: response.created,
      failureReason: response.failureReason,
      callbackUrl: PAWAPAY_CALLBACK_URLS.deposit,
    })
  } catch (error: any) {
    console.error('❌ Erreur initiate deposit pawapay:', error)
    return NextResponse.json(
      { error: error?.message || 'Erreur inconnue' },
      { status: 500 }
    )
  }
}
