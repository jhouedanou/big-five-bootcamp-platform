import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/admin-auth'
import { getActiveConfig } from '@/lib/pawapay'

export const dynamic = 'force-dynamic'

export interface ActiveConfEntry {
  correspondent: string
  country: string
  currency: string
  correspondentDescription?: {
    paymentOperations?: Array<{
      operationType: 'DEPOSIT' | 'PAYOUT' | 'REFUND'
      isActive: boolean
    }>
  }
}

export async function GET(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  try {
    const data = await getActiveConfig()
    return NextResponse.json({ correspondents: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'PawaPay API error' }, { status: 502 })
  }
}
