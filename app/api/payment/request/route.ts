/**
 * API Route: POST /api/payment/request
 *
 * Cree une demande de paiement PawaPay pour une inscription a un bootcamp
 *
 * Body:
 * - sessionId   : UUID de la session
 * - userEmail   : Email de l'utilisateur
 * - phoneNumber : MSISDN du client (ex. "2250707123456")
 * - provider    : Code provider PawaPay (ex. "ORANGE_CIV", "WAVE_CIV", "MTN_MOMO_CIV")
 * - currency?   : defaut "XOF"
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  initiateDeposit,
  generateRefCommand,
  getReturnUrl,
  getFailedUrl,
  checkDepositStatus,
} from '@/lib/pawapay';

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

    // 3. Generer la reference (UUIDv4 pour PawaPay)
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
        payment_method: 'pawapay',
        provider,
        client_phone: phoneNumber,
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

    // 5. Initier le depot PawaPay
    const customerMessage = `Bootcamp ${String(bootcamp.title || '').slice(0, 12)}`.slice(0, 22);

    let pawapayResponse;
    try {
      pawapayResponse = await initiateDeposit({
        depositId: ref_command,
        amount: String(bootcamp.price),
        currency,
        payer: {
          type: 'MMO',
          accountDetails: { phoneNumber, provider },
        },
        customerMessage,
        successfulUrl: getReturnUrl(ref_command),
        failedUrl: getFailedUrl(ref_command),
        metadata: [
          { fieldName: 'ref_command', fieldValue: ref_command },
          { fieldName: 'type', fieldValue: 'bootcamp' },
          { fieldName: 'session_id', fieldValue: String(sessionId) },
          { fieldName: 'bootcamp_slug', fieldValue: String(bootcamp.slug) },
        ],
      });
    } catch (pawapayError) {
      console.error('PawaPay initialization error:', pawapayError);
      await (supabaseAdmin as any)
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', payment.id);

      const errorMsg = pawapayError instanceof Error ? pawapayError.message : 'Erreur PawaPay';
      return NextResponse.json(
        { error: 'Le service de paiement est temporairement indisponible.', details: errorMsg },
        { status: 502 }
      );
    }

    if (pawapayResponse.status === 'REJECTED') {
      await (supabaseAdmin as any)
        .from('payments')
        .update({
          status: 'rejected',
          failure_code: pawapayResponse.failureReason?.failureCode,
          failure_message: pawapayResponse.failureReason?.failureMessage,
        })
        .eq('id', payment.id);

      return NextResponse.json(
        {
          success: false,
          error: 'Paiement rejete par PawaPay',
          failureReason: pawapayResponse.failureReason,
        },
        { status: 400 }
      );
    }

    // Flow Wave : recuperer authorizationUrl
    let authorizationUrl: string | undefined;
    if (pawapayResponse.nextStep === 'GET_AUTH_URL') {
      for (let i = 0; i < 3; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        try {
          const check = await checkDepositStatus(ref_command);
          if (check.data?.authorizationUrl) {
            authorizationUrl = check.data.authorizationUrl;
            break;
          }
        } catch {
          // ignore
        }
      }
    }

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      ref_command,
      depositId: ref_command,
      status: pawapayResponse.status,
      nextStep: pawapayResponse.nextStep,
      redirect_url: authorizationUrl,
      authorizationUrl,
      pollingUrl: `/api/payment/pawapay/status/deposit/${ref_command}`,
    });

  } catch (error) {
    console.error('Payment request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
