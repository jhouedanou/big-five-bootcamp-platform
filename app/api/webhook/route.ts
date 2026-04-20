/**
 * API Route: /api/webhook (DEPRECATED)
 *
 * Ancien webhook de paiement deprecie. Utiliser les callbacks PawaPay.
 * Les nouveaux callbacks sont dans :
 *   - POST /api/payment/pawapay/callback/deposit
 *   - POST /api/payment/pawapay/callback/payout
 *   - POST /api/payment/pawapay/callback/refund
 *
 * On renvoie 410 Gone pour signaler que cette ressource n'existe plus.
 */

import { NextResponse } from 'next/server';

const GONE_BODY = {
  error: 'Gone',
  message:
    'This endpoint has been replaced by PawaPay. Use /api/payment/pawapay/callback/{deposit|payout|refund}.',
};

export async function POST() {
  return NextResponse.json(GONE_BODY, { status: 410 });
}

export async function GET() {
  return NextResponse.json(GONE_BODY, { status: 410 });
}
