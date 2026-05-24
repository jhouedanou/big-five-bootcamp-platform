/**
 * Callback URL : POST /api/payment/pawapay/callback/payout
 *
 * Reçoit les callbacks PawaPay pour les payouts (envois d'argent vers un client).
 * Doc : https://docs.pawapay.io/v2/docs/what_to_know#callbacks
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import {
  isAllowedPawaPayIP,
  checkPayoutStatus,
  type PawaPayPayoutCallback,
} from '@/lib/pawapay'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    if (!isAllowedPawaPayIP(request)) {
      console.warn('⚠️ PawaPay payout callback reçu depuis une IP non autorisée')
      return new NextResponse('IP not allowed', { status: 200 })
    }

    const payload = (await request.json()) as PawaPayPayoutCallback

    console.log('📥 PawaPay payout callback:', {
      payoutId: payload.payoutId,
      status: payload.status,
      amount: payload.amount,
      currency: payload.currency,
      provider: payload.recipient?.accountDetails?.provider,
    })

    if (!payload.payoutId) {
      console.error('❌ payout callback sans payoutId', payload)
      return new NextResponse('OK', { status: 200 })
    }

    // Les payouts sont stockés dans la table `payouts` (à créer si nécessaire),
    // sinon on les log dans `pawapay_orphan_callbacks`.
    const { data: payout } = await (supabaseAdmin as any)
      .from('payouts')
      .select('id, status')
      .eq('payout_id', payload.payoutId)
      .maybeSingle()

    if (!payout) {
      await storeOrphanCallback('payout', payload)
      return new NextResponse('OK', { status: 200 })
    }

    // Idempotence
    const finalStatuses = ['completed', 'failed', 'rejected']
    if (finalStatuses.includes(payout.status)) {
      return new NextResponse('OK', { status: 200 })
    }

    // SÉCURITÉ : les callbacks PawaPay ne sont pas signés. On revérifie le
    // statut réel via l'API authentifiée plutôt que de faire confiance au body.
    let verified: PawaPayPayoutCallback
    try {
      const result = await checkPayoutStatus(payload.payoutId)
      if (result.status === 'NOT_FOUND' || !result.data) {
        console.warn(`⚠️ payout ${payload.payoutId} introuvable chez PawaPay — callback ignoré`)
        return new NextResponse('OK', { status: 200 })
      }
      verified = result.data
    } catch (e) {
      console.error('❌ Vérification PawaPay (payout) impossible, callback non appliqué:', e)
      return new NextResponse('OK', { status: 200 })
    }

    const internalStatus = mapPayoutStatus(verified.status)

    await (supabaseAdmin as any)
      .from('payouts')
      .update({
        status: internalStatus,
        provider: verified.recipient?.accountDetails?.provider || null,
        phone_number: verified.recipient?.accountDetails?.phoneNumber || null,
        amount: verified.amount ? Number(verified.amount) : undefined,
        currency: verified.currency || null,
        country: verified.country || null,
        provider_transaction_id: verified.providerTransactionId || null,
        failure_code: verified.failureReason?.failureCode || null,
        failure_message: verified.failureReason?.failureMessage || null,
        callback_data: verified as any,
        completed_at:
          internalStatus === 'completed' ? new Date().toISOString() : undefined,
      })
      .eq('id', payout.id)

    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('❌ PawaPay payout callback error:', error)
    return new NextResponse('OK', { status: 200 })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, kind: 'payout' })
}

function mapPayoutStatus(status: PawaPayPayoutCallback['status']): string {
  switch (status) {
    case 'COMPLETED':
      return 'completed'
    case 'FAILED':
      return 'failed'
    case 'REJECTED':
      return 'rejected'
    case 'ENQUEUED':
      return 'enqueued'
    case 'PROCESSING':
    case 'ACCEPTED':
      return 'processing'
    case 'IN_RECONCILIATION':
      return 'in_reconciliation'
    default:
      return 'pending'
  }
}

async function storeOrphanCallback(
  kind: 'deposit' | 'payout' | 'refund',
  payload: unknown
) {
  try {
    await (supabaseAdmin as any).from('pawapay_orphan_callbacks').insert({
      kind,
      payload: payload as any,
    })
  } catch (e) {
    console.error('Could not persist orphan callback', e)
  }
}
