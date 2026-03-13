/**
 * API Route: POST /api/payment/request
 *
 * Cree une demande de paiement Moneroo pour une inscription a un bootcamp
 *
 * Body:
 * - sessionId: UUID de la session
 * - userEmail: Email de l'utilisateur
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  initializePayment,
  generateRefCommand,
  getReturnUrl,
} from '@/lib/moneroo';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, userEmail } = body;

    if (!sessionId || !userEmail) {
      return NextResponse.json(
        { error: 'Session ID and user email are required' },
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

    // 3. Generer la reference
    const ref_command = generateRefCommand('BOOTCAMP');

    // 4. Enregistrer le paiement
    const { data: payment, error: paymentError } = await (supabaseAdmin as any)
      .from('payments')
      .insert({
        ref_command,
        amount: bootcamp.price,
        initial_amount: bootcamp.price,
        final_amount: bootcamp.price,
        currency: 'XOF',
        status: 'pending',
        session_id: sessionId,
        user_email: userEmail,
        item_name: `${bootcamp.title} - Session ${new Date(session.start_date).toLocaleDateString('fr-FR')}`,
        item_description: bootcamp.tagline,
        payment_method: 'Moneroo',
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

    // 5. Initialiser le paiement Moneroo
    const monerooResponse = await initializePayment({
      amount: bootcamp.price,
      currency: 'XOF',
      description: `${bootcamp.title} - Big Five Bootcamp (${ref_command})`,
      return_url: getReturnUrl(ref_command),
      customer: {
        email: userEmail,
        first_name: userEmail.split('@')[0],
        last_name: 'Big Five',
      },
      metadata: {
        ref_command,
        type: 'bootcamp',
        session_id: sessionId,
        bootcamp_slug: bootcamp.slug,
      },
    });

    // 6. Stocker l'ID Moneroo
    await (supabaseAdmin as any)
      .from('payments')
      .update({
        moneroo_payment_id: monerooResponse.data.id,
      })
      .eq('id', payment.id);

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      ref_command,
      redirect_url: monerooResponse.data.checkout_url,
    });

  } catch (error) {
    console.error('Payment request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
