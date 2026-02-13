/**
 * API Route: POST /api/payment/request
 * 
 * Crée une demande de paiement PayTech pour une inscription à un bootcamp
 * 
 * Body:
 * - sessionId: UUID de la session
 * - userEmail: Email de l'utilisateur
 * - paymentMethod?: Méthode ciblée (ex: "Orange Money")
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { 
  requestPayment, 
  generateRefCommand,
  type PaytechPaymentRequest 
} from '@/lib/paytech';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, userEmail, paymentMethod } = body;

    // Validation
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

    // @ts-ignore - Supabase join type
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

    // 3. Générer la référence de commande unique
    const ref_command = generateRefCommand('BOOTCAMP');

    // 4. Préparer la demande PayTech
    const paymentRequest: PaytechPaymentRequest = {
      item_name: `${bootcamp.title} - Session ${new Date(session.start_date).toLocaleDateString('fr-FR')}`,
      item_price: bootcamp.price,
      currency: 'XOF',
      ref_command,
      command_name: `Inscription ${bootcamp.title} - Big Five Bootcamp`,
      target_payment: paymentMethod, // Méthode ciblée ou undefined pour toutes les méthodes
      custom_field: JSON.stringify({
        sessionId,
        userEmail,
        bootcampSlug: bootcamp.slug,
        bootcampTitle: bootcamp.title,
      }),
    };

    // 5. Créer l'enregistrement de paiement dans Supabase (statut: pending)
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
        item_name: paymentRequest.item_name,
        item_description: bootcamp.tagline,
        env: process.env.PAYTECH_ENV || 'test',
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

    // 6. Appeler PayTech pour obtenir l'URL de paiement
    const paytechResponse = await requestPayment(paymentRequest);

    if (paytechResponse.success !== 1) {
      // Mettre à jour le statut à 'failed'
      await (supabaseAdmin as any)
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', payment.id);

      return NextResponse.json(
        { error: paytechResponse.message || 'PayTech request failed' },
        { status: 500 }
      );
    }

    // 7. Mettre à jour le payment avec le token PayTech
    await (supabaseAdmin as any)
      .from('payments')
      .update({ 
        paytech_token: paytechResponse.token 
      })
      .eq('id', payment.id);

    // 8. Retourner l'URL de redirection
    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      ref_command,
      redirect_url: paytechResponse.redirect_url || paytechResponse.redirectUrl,
      token: paytechResponse.token,
    });

  } catch (error) {
    console.error('Payment request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
