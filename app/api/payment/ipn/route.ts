/**
 * API Route: POST /api/payment/ipn
 * 
 * Ancien endpoint PayTech IPN - Redirige vers le nouveau webhook Chariow
 * Conservé pour compatibilité arrière
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Rediriger vers le nouveau endpoint webhook Chariow
  console.log('⚠️ IPN endpoint appelé - redirection vers /api/payment/webhook');
  
  const body = await request.text();
  const baseUrl = request.nextUrl.origin;
  
  try {
    const webhookResponse = await fetch(`${baseUrl}/api/payment/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    
    const responseText = await webhookResponse.text();
    return new NextResponse(responseText, { status: webhookResponse.status });
  } catch (error) {
    console.error('IPN redirect error:', error);
    return new NextResponse('Error', { status: 500 });
  }
}
