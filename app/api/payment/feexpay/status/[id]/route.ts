/**
 * Route : GET /api/payment/feexpay/status/[id]
 *
 * Polling de secours quand un webhook n'a pas été reçu, ou pour la page
 * "pending/success" côté client.
 *
 * `id` = la `reference` FeexPay retournée à l'initiation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkDepositStatus } from '@/lib/feexpay'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params

    if (!id) {
      return NextResponse.json({ error: 'id (reference) manquant' }, { status: 400 })
    }

    const res = await checkDepositStatus(id)
    return NextResponse.json(res)
  } catch (error: any) {
    console.error('❌ FeexPay check status error:', error)
    return NextResponse.json(
      { error: error?.message || 'Erreur inconnue' },
      { status: 500 }
    )
  }
}
