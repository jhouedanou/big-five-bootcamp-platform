/**
 * API Route: POST /api/payment/request
 * 
 * Crée une demande de paiement Chariow pour une inscription à un bootcamp
 * 
 * Body:
 * - sessionId: UUID de la session
 * - userEmail: Email de l'utilisateur
 * - firstName?: Prénom
 * - lastName?: Nom
 * - phoneNumber?: Numéro de téléphone
 * - phoneCountryCode?: Code pays ISO (ex: "CI")
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { 
  initCheckout,
  generateRefCommand,
  buildSuccessUrl,
} from '@/lib/chariow';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, userEmail, firstName, lastName, phoneNumber, phoneCountryCode } = body;

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

    // 4. Créer l'enregistrement de paiement dans Supabase (statut: pending)
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

    // 5. Appeler Chariow Checkout
    const chariowResponse = await initCheckout({
      product_id: process.env.CHARIOW_BOOTCAMP_PRODUCT_ID || process.env.CHARIOW_PRODUCT_ID || '',
      email: userEmail,
      first_name: firstName || userEmail.split('@')[0],
      last_name: lastName || 'Client',
      phone: {
        number: phoneNumber?.replace(/\D/g, '') || '0000000000',
        country_code: phoneCountryCode || 'CI',
      },
      redirect_url: buildSuccessUrl(ref_command),
      custom_metadata: {
        ref_command,
        session_id: sessionId,
        bootcamp_slug: bootcamp.slug,
        bootcamp_title: bootcamp.title,
        type: 'bootcamp',
      },
    });

    if (chariowResponse.data.step !== 'payment' || !chariowResponse.data.payment?.checkout_url) {
      // Mettre à jour le statut à 'failed'
      await (supabaseAdmin as any)
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', payment.id);

      return NextResponse.json(
        { error: chariowResponse.data.message || 'Chariow checkout failed' },
        { status: 500 }
      );
    }

    // 6. Mettre à jour le payment avec l'ID de vente Chariow
    await (supabaseAdmin as any)
      .from('payments')
      .update({ 
        chariow_sale_id: chariowResponse.data.purchase?.id,
      })
      .eq('id', payment.id);

    // 7. Retourner l'URL de redirection
    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      ref_command,
      redirect_url: chariowResponse.data.payment.checkout_url,
      sale_id: chariowResponse.data.purchase?.id,
    });

  } catch (error) {
    console.error('Payment request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
