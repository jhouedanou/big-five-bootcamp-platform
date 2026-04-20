/**
 * Route : GET /api/payment/pawapay/status/[type]/[id]
 *
 * Polling de secours (cf. doc PawaPay "Ensuring consistency") :
 *   - type : "deposit" | "payout" | "refund"
 *   - id   : depositId / payoutId / refundId
 *
 * Utile quand un callback n'a pas été reçu (réseau, downtime...) ou pour la
 * page "success/failed" après redirection d'un flow Wave.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  checkDepositStatus,
  checkPayoutStatus,
  checkRefundStatus,
} from '@/lib/pawapay'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const { type, id } = await ctx.params

    if (!id) {
      return NextResponse.json({ error: 'id manquant' }, { status: 400 })
    }

    switch (type) {
      case 'deposit': {
        const res = await checkDepositStatus(id)
        return NextResponse.json(res)
      }
      case 'payout': {
        const res = await checkPayoutStatus(id)
        return NextResponse.json(res)
      }
      case 'refund': {
        const res = await checkRefundStatus(id)
        return NextResponse.json(res)
      }
      default:
        return NextResponse.json(
          { error: `type invalide: ${type} (attendu: deposit|payout|refund)` },
          { status: 400 }
        )
    }
  } catch (error: any) {
    console.error('❌ PawaPay check status error:', error)
    return NextResponse.json(
      { error: error?.message || 'Erreur inconnue' },
      { status: 500 }
    )
  }
}
