/**
 * API Route: /api/webhook (DEPRECATED)
 *
 * Ancien webhook deprecie. Utiliser le webhook Chariow :
 *   - POST /api/webhook/chariow
 */

import { NextResponse } from 'next/server';

const GONE_BODY = {
  error: 'Gone',
  message: 'This endpoint has been replaced. Use /api/webhook/chariow.',
};

export async function POST() {
  return NextResponse.json(GONE_BODY, { status: 410 });
}

export async function GET() {
  return NextResponse.json(GONE_BODY, { status: 410 });
}
