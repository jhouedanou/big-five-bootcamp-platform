/**
 * Callback URL : POST /api/payment/pawapay/callback/refund
 *
 * Reçoit les callbacks PawaPay pour les refunds (remboursements).
 * Doc : https://docs.pawapay.io/v2/docs/what_to_know#callbacks
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import {
  isAllowedPawaPayIP,
  checkRefundStatus,
  type PawaPayRefundCallback,
} from '@/lib/pawapay'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    if (!isAllowedPawaPayIP(request)) {
      console.warn('⚠️ PawaPay refund callback reçu depuis une IP non autorisée')
      return new NextResponse('IP not allowed', { status: 200 })
    }

    const payload = (await request.json()) as PawaPayRefundCallback

    console.log('📥 PawaPay refund callback:', {
      refundId: payload.refundId,
      depositId: payload.depositId,
      status: payload.status,
      amount: payload.amount,
    })

    if (!payload.refundId) {
      console.error('❌ refund callback sans refundId', payload)
      return new NextResponse('OK', { status: 200 })
    }

    // SÉCURITÉ : callbacks non signés → on revérifie le statut réel via l'API
    // authentifiée. Un refund forgé pourrait sinon marquer abusivement un
    // paiement légitime comme "refunded" (et dégrader l'accès de l'utilisateur).
    let verified: PawaPayRefundCallback
    try {
      const result = await checkRefundStatus(payload.refundId)
      if (result.status === 'NOT_FOUND' || !result.data) {
        console.warn(`⚠️ refund ${payload.refundId} introuvable chez PawaPay — callback ignoré`)
        return new NextResponse('OK', { status: 200 })
      }
      verified = result.data
    } catch (e) {
      console.error('❌ Vérification PawaPay (refund) impossible, callback non appliqué:', e)
      return new NextResponse('OK', { status: 200 })
    }

    const depositId = verified.depositId || payload.depositId

    // 1. Rechercher d'abord dans une table `refunds` dédiée
    const { data: refund } = await (supabaseAdmin as any)
      .from('refunds')
      .select('id, status, payment_id')
      .eq('refund_id', payload.refundId)
      .maybeSingle()

    const internalStatus = mapRefundStatus(verified.status)

    if (refund) {
      // Idempotence
      if (['completed', 'failed', 'rejected'].includes(refund.status)) {
        return new NextResponse('OK', { status: 200 })
      }

      await (supabaseAdmin as any)
        .from('refunds')
        .update({
          status: internalStatus,
          amount: verified.amount ? Number(verified.amount) : undefined,
          currency: verified.currency || null,
          country: verified.country || null,
          provider_transaction_id: verified.providerTransactionId || null,
          failure_code: verified.failureReason?.failureCode || null,
          failure_message: verified.failureReason?.failureMessage || null,
          callback_data: verified as any,
          completed_at:
            internalStatus === 'completed'
              ? new Date().toISOString()
              : undefined,
        })
        .eq('id', refund.id)

      // Si le refund est complet → marquer le paiement original comme "refunded"
      if (verified.status === 'COMPLETED' && refund.payment_id) {
        await (supabaseAdmin as any)
          .from('payments')
          .update({
            status: 'refunded',
            refunded_at: new Date().toISOString(),
          })
          .eq('id', refund.payment_id)
      }

      return new NextResponse('OK', { status: 200 })
    }

    // 2. Fallback : pas de table refunds → on met quand même à jour le paiement original
    if (depositId && verified.status === 'COMPLETED') {
      await (supabaseAdmin as any)
        .from('payments')
        .update({
          status: 'refunded',
          refunded_at: new Date().toISOString(),
          ipn_data: verified as any,
        })
        .eq('ref_command', depositId)

      return new NextResponse('OK', { status: 200 })
    }

    await storeOrphanCallback('refund', payload)
    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('❌ PawaPay refund callback error:', error)
    return new NextResponse('OK', { status: 200 })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, kind: 'refund' })
}

function mapRefundStatus(status: PawaPayRefundCallback['status']): string {
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
