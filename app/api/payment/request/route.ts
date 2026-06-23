/**
 * API Route: POST /api/payment/request
 *
 * Crée une demande de paiement Chariow pour une inscription à un bootcamp.
 *
 * Body:
 * - sessionId   : UUID de la session
 * - userEmail   : Email de l'utilisateur
 * - currency?   : défaut "XOF"
 *
 * Réponse: { success, paymentId, ref_command, checkoutUrl }
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { buildCheckoutUrl, generateRefCommand, CHARIOW_CONFIG } from '@/lib/chariow';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function resolveBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NODE_ENV === 'production' ? 'https://laveiye.com' : 'http://localhost:3000')
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, userEmail, currency = 'XOF' } = body;

    if (!sessionId || !userEmail) {
      return NextResponse.json(
        { error: 'Session ID and user email are required' },
        { status: 400 }
      );
    }

    // 1. Récupérer les infos de la session
    const { data: session, error: sessionError } = await (supabaseAdmin as any)
      .from('sessions')
      .select(`
        *,
        creative_library:creative_libraries (
          id,
          title,
          slug,
          price,
          tagline
        )
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const bootcamp = session.creative_library;
    if (!bootcamp) {
      return NextResponse.json(
        { error: 'Bootcamp not found for this session' },
        { status: 404 }
      );
    }

    // 2. Vérifier si un paiement existe déjà
    const { data: existingPayment } = await (supabaseAdmin as any)
      .from('payments')
      .select('id, status')
      .eq('session_id', sessionId)
      .eq('user_email', userEmail)
      .in('status', ['completed', 'pending'])
      .single();

    if (existingPayment) {
      return NextResponse.json(
        {
          error: 'A payment already exists for this session',
          paymentId: existingPayment.id,
          status: existingPayment.status
        },
        { status: 409 }
      );
    }

    // 3. Générer la référence
    const ref_command = generateRefCommand('BOOTCAMP');

    // 4. Enregistrer le paiement
    const { data: payment, error: paymentError } = await (supabaseAdmin as any)
      .from('payments')
      .insert({
        ref_command,
        amount: bootcamp.price,
        initial_amount: bootcamp.price,
        final_amount: bootcamp.price,
        currency,
        status: 'pending',
        session_id: sessionId,
        user_email: userEmail,
        item_name: `${bootcamp.title} - Session ${new Date(session.start_date).toLocaleDateString('fr-FR')}`,
        item_description: bootcamp.tagline,
        payment_method: 'chariow',
        metadata: {
          ref_command,
          type: 'bootcamp',
          session_id: String(sessionId),
          bootcamp_slug: String(bootcamp.slug),
          gateway: 'chariow',
        },
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
      return NextResponse.json(
        { error: 'Failed to create payment record' },
        { status: 500 }
      );
    }

    // 5. Construire l'URL de checkout Chariow
    if (!CHARIOW_CONFIG.API_KEY || !CHARIOW_CONFIG.PRODUCT_ID) {
      await (supabaseAdmin as any)
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', payment.id);
      return NextResponse.json(
        { error: 'Chariow non configuré (API_KEY/PRODUCT_ID manquants).' },
        { status: 500 }
      );
    }

    const baseUrl = resolveBaseUrl();
    let checkoutUrl: string;
    try {
      checkoutUrl = buildCheckoutUrl({
        refCommand: ref_command,
        email: userEmail,
        // Mobile money confirme de façon asynchrone : on passe par /payment/pending
        // (poll backend) au lieu de /payment/success direct, pour éviter une
        // redirection vers le succès avant confirmation réelle du paiement.
        successUrl: `${baseUrl}/payment/pending?ref_command=${encodeURIComponent(ref_command)}`,
        cancelUrl: `${baseUrl}/payment/failed?ref_command=${encodeURIComponent(ref_command)}`,
      });
    } catch (e: any) {
      await (supabaseAdmin as any)
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', payment.id);
      console.error('[request] buildCheckoutUrl error:', e);
      return NextResponse.json(
        { error: 'Impossible de construire l\'URL Chariow', details: e?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      ref_command,
      checkoutUrl,
    });

  } catch (error) {
    console.error('Payment request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
