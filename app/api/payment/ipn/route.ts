/**
 * API Route: POST /api/payment/ipn
 * 
 * Webhook PayTech IPN (Instant Payment Notification)
 * Reçoit les notifications de paiement de PayTech en temps réel
 * 
 * Sécurité: Vérification HMAC-SHA256 ou SHA256 des clés API
 * 
 * Types d'événements:
 * - sale_complete: Paiement réussi
 * - sale_canceled: Paiement annulé
 * - refund_complete: Remboursement effectué
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyIPN, type PaytechIPN } from '@/lib/paytech';

export async function POST(request: NextRequest) {
  try {
    // 1. Récupérer les données IPN
    const ipnData: PaytechIPN = await request.json();

    console.log('📥 PayTech IPN received:', {
      type_event: ipnData.type_event,
      ref_command: ipnData.ref_command,
      amount: ipnData.item_price,
      payment_method: ipnData.payment_method,
    });

    // 2. Vérifier l'authenticité de l'IPN
    const isValid = verifyIPN(ipnData);
    
    if (!isValid) {
      console.error('❌ Invalid IPN signature');
      return NextResponse.json(
        { error: 'Invalid IPN signature' },
        { status: 403 }
      );
    }

    // 3. Récupérer le paiement dans la base de données
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('ref_command', ipnData.ref_command)
      .single();

    if (paymentError || !payment) {
      console.error('❌ Payment not found:', ipnData.ref_command);
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // 4. Parser custom_field pour récupérer les infos
    let customData: any = {};
    try {
      if (ipnData.custom_field) {
        customData = JSON.parse(ipnData.custom_field);
      }
    } catch (e) {
      console.error('Error parsing custom_field:', e);
    }

    // 5. Traiter selon le type d'événement
    switch (ipnData.type_event) {
      case 'sale_complete':
        await handlePaymentSuccess(payment, ipnData, customData);
        break;
      
      case 'sale_canceled':
        await handlePaymentCanceled(payment, ipnData);
        break;
      
      case 'refund_complete':
        await handleRefund(payment, ipnData);
        break;
      
      default:
        console.warn('Unknown IPN event type:', ipnData.type_event);
    }

    // 6. Répondre "IPN OK" comme requis par PayTech
    return new NextResponse('IPN OK', { status: 200 });

  } catch (error) {
    console.error('IPN processing error:', error);
    return new NextResponse('IPN KO', { status: 500 });
  }
}

/**
 * Traiter un paiement réussi
 */
async function handlePaymentSuccess(
  payment: any, 
  ipnData: PaytechIPN, 
  customData: any
) {
  try {
    console.log('✅ Processing successful payment:', payment.ref_command);

    // 1. Mettre à jour le paiement
    const { error: updateError } = await supabaseAdmin
      .from('payments')
      .update({
        status: 'completed',
        payment_method: ipnData.payment_method,
        client_phone: ipnData.client_phone,
        completed_at: new Date().toISOString(),
        final_amount: ipnData.final_item_price || ipnData.item_price,
        initial_amount: ipnData.initial_item_price || ipnData.item_price,
        promo_enabled: ipnData.promo_enabled || false,
        promo_value_percent: ipnData.promo_value_percent || 0,
        ipn_data: ipnData as any, // Stocker toutes les données IPN
      })
      .eq('id', payment.id);

    if (updateError) {
      console.error('Error updating payment:', updateError);
      throw updateError;
    }

    // 2. Créer l'inscription dans registrations
    const { data: registration, error: regError } = await supabaseAdmin
      .from('registrations')
      .insert({
        session_id: payment.session_id,
        user_email: payment.user_email,
        first_name: customData.firstName || '',
        last_name: customData.lastName || '',
        phone_number: ipnData.client_phone,
        payment_status: 'Payé',
        amount: ipnData.final_item_price || ipnData.item_price,
        payment_id: payment.id,
      })
      .select()
      .single();

    if (regError) {
      console.error('Error creating registration:', regError);
      // Ne pas throw ici car le paiement est déjà validé
    } else {
      console.log('✅ Registration created:', registration);
    }

    // 3. TODO: Envoyer email de confirmation
    // await sendConfirmationEmail(payment.user_email, customData);

    console.log('✅ Payment processed successfully:', payment.ref_command);

  } catch (error) {
    console.error('Error in handlePaymentSuccess:', error);
    throw error;
  }
}

/**
 * Traiter un paiement annulé
 */
async function handlePaymentCanceled(payment: any, ipnData: PaytechIPN) {
  try {
    console.log('❌ Processing canceled payment:', payment.ref_command);

    await supabaseAdmin
      .from('payments')
      .update({
        status: 'canceled',
        ipn_data: ipnData as any,
      })
      .eq('id', payment.id);

    console.log('Payment marked as canceled:', payment.ref_command);

  } catch (error) {
    console.error('Error in handlePaymentCanceled:', error);
    throw error;
  }
}

/**
 * Traiter un remboursement
 */
async function handleRefund(payment: any, ipnData: PaytechIPN) {
  try {
    console.log('💰 Processing refund:', payment.ref_command);

    // 1. Mettre à jour le paiement
    await supabaseAdmin
      .from('payments')
      .update({
        status: 'refunded',
        ipn_data: ipnData as any,
      })
      .eq('id', payment.id);

    // 2. Supprimer l'inscription si elle existe
    if (payment.session_id) {
      await supabaseAdmin
        .from('registrations')
        .delete()
        .eq('payment_id', payment.id);
    }

    // 3. TODO: Envoyer email de notification de remboursement
    // await sendRefundEmail(payment.user_email);

    console.log('✅ Refund processed:', payment.ref_command);

  } catch (error) {
    console.error('Error in handleRefund:', error);
    throw error;
  }
}
