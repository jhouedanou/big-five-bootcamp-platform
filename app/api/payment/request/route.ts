/**
 * API Route: POST /api/payment/request
 *
 * Cree une demande de paiement PawaPay pour une inscription a un bootcamp
 *
 * Body:
 * - sessionId   : UUID de la session
 * - userEmail   : Email de l'utilisateur
 * - phoneNumber : MSISDN du client (ex. "2250707123456")
 * - provider    : Code provider PawaPay (ex. "ORANGE_CIV", "MTN_MOMO_CIV", "MOOV_CIV" — Wave non supporté)
 * - currency?   : defaut "XOF"
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  initiateDeposit,
  generateRefCommand,
} from '@/lib/feexpay';
import { toReseau } from '@/lib/feexpay-providers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, userEmail, phoneNumber, provider, currency = 'XOF' } = body;

    if (!sessionId || !userEmail) {
      return NextResponse.json(
        { error: 'Session ID and user email are required' },
        { status: 400 }
      );
    }

    if (!phoneNumber || !provider) {
      return NextResponse.json(
        { error: 'phoneNumber et provider sont requis (ex. provider: "ORANGE_CIV").' },
        { status: 400 }
      );
    }

    // 1. Recuperer les infos de la session
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

    // 2. Verifier si un paiement existe deja
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

    // 3. Generer la reference (UUIDv4 — customId FeexPay)
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
        payment_method: 'feexpay',
        provider,
        client_phone: phoneNumber,
        metadata: { ref_command, type: 'bootcamp', session_id: String(sessionId), bootcamp_slug: String(bootcamp.slug) },
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

    // 5. Initier la collecte FeexPay
    const customerMessage = `Bootcamp ${String(bootcamp.title || '').slice(0, 30)}`.slice(0, 50);

    let feexpayResponse;
    try {
      feexpayResponse = await initiateDeposit({
        refCommand: ref_command,
        amount: bootcamp.price,
        currency,
        phoneNumber,
        reseau: toReseau(provider),
        description: customerMessage,
        email: userEmail,
        callbackInfo: {
          ref_command,
          type: 'bootcamp',
          session_id: String(sessionId),
          bootcamp_slug: String(bootcamp.slug),
        },
      });
    } catch (feexpayError) {
      console.error('FeexPay initialization error:', feexpayError);
      await (supabaseAdmin as any)
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', payment.id);

      const errorMsg = feexpayError instanceof Error ? feexpayError.message : 'Erreur FeexPay';
      return NextResponse.json(
        { error: 'Le service de paiement est temporairement indisponible.', details: errorMsg },
        { status: 502 }
      );
    }

    if (feexpayResponse.status === 'FAILED') {
      await (supabaseAdmin as any)
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', payment.id);

      return NextResponse.json(
        { success: false, error: 'Paiement refusé par FeexPay' },
        { status: 400 }
      );
    }

    // Stocker la reference FeexPay (clé de polling).
    if (feexpayResponse.reference) {
      await (supabaseAdmin as any)
        .from('payments')
        .update({
          metadata: {
            ref_command,
            type: 'bootcamp',
            session_id: String(sessionId),
            bootcamp_slug: String(bootcamp.slug),
            feexpay_reference: feexpayResponse.reference,
          },
        })
        .eq('id', payment.id);
    }

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      ref_command,
      reference: feexpayResponse.reference,
      status: feexpayResponse.status || 'PENDING',
      pollingUrl: `/api/payment/feexpay/status/${encodeURIComponent(feexpayResponse.reference || '')}`,
    });

  } catch (error) {
    console.error('Payment request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
