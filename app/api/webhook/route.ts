/**
 * API Route: /api/webhook (DEPRECATED)
 *
 * Ancien webhook de paiement deprecie. Utiliser le callback FeexPay :
 *   - POST /api/payment/feexpay/callback/deposit
 *
 * On renvoie 410 Gone pour signaler que cette ressource n'existe plus.
 */

import { NextResponse } from 'next/server';

const GONE_BODY = {
  error: 'Gone',
  message:
    'This endpoint has been replaced by FeexPay. Use /api/payment/feexpay/callback/deposit.',
};

export async function POST() {
  return NextResponse.json(GONE_BODY, { status: 410 });
}

export async function GET() {
  return NextResponse.json(GONE_BODY, { status: 410 });
}
