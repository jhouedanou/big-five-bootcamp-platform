/**
 * API Route: POST /api/webhook
 *
 * Webhook Moneroo - Recoit les notifications de paiement
 * Verifie la signature HMAC-SHA256 via le header X-Moneroo-Signature
 *
 * Events:
 * - payment.success: Paiement reussi
 * - payment.failed: Paiement echoue
 * - payment.cancelled: Paiement annule
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  verifyWebhookSignature,
  retrievePayment,
  type MonerooWebhookPayload,
} from '@/lib/moneroo';

export async function POST(request: NextRequest) {
  let rawBody: string;

  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  // 1. Verifier la signature
  const signature = request.headers.get('x-moneroo-signature') || '';
  const isValid = verifyWebhookSignature(rawBody, signature);

  if (!isValid) {
    console.error('Webhook: invalid signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
  }

  // 2. Parser le payload
  let payload: MonerooWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  console.log('Webhook received:', {
    event: payload.event,
    payment_id: payload.data?.id,
    status: payload.data?.status,
  });

  const monerooPaymentId = payload.data?.id;
  if (!monerooPaymentId) {
    return NextResponse.json({ error: 'Missing payment ID' }, { status: 400 });
  }

  // 3. Recuperer les details complets du paiement via l'API Moneroo
  let paymentDetails;
  try {
    const retrieved = await retrievePayment(monerooPaymentId);
    paymentDetails = retrieved.data;
  } catch (err) {
    console.error('Webhook: failed to retrieve payment details:', err);
    return NextResponse.json({ error: 'Failed to retrieve payment' }, { status: 500 });
  }

  // 4. Trouver le paiement dans notre base via moneroo_payment_id
  const { data: payment, error: findError } = await (supabaseAdmin as any)
    .from('payments')
    .select('*')
    .eq('moneroo_payment_id', monerooPaymentId)
    .single();

  if (findError || !payment) {
    console.error('Webhook: payment not found in DB for moneroo_payment_id:', monerooPaymentId);
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  }

  // 5. Traiter selon l'evenement
  switch (payload.event) {
    case 'payment.success':
      await handlePaymentSuccess(payment, paymentDetails);
      break;

    case 'payment.failed':
      await handlePaymentFailed(payment);
      break;

    case 'payment.cancelled':
      await handlePaymentCancelled(payment);
      break;

    default:
      console.log('Webhook: unhandled event', payload.event);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

// ============================================================================
// Event Handlers
// ============================================================================

async function handlePaymentSuccess(payment: any, details: any) {
  console.log('Webhook: processing success for', payment.ref_command);

  const metadata = payment.metadata || {};

  // 1. Mettre a jour le paiement
  await (supabaseAdmin as any)
    .from('payments')
    .update({
      status: 'completed',
      payment_method: details.method?.name || 'Moneroo',
      client_phone: details.payment_phone_number || details.customer?.phone || null,
      completed_at: new Date().toISOString(),
      final_amount: details.amount,
    })
    .eq('id', payment.id);

  // 2. Traiter selon le type (subscription ou bootcamp)
  if (metadata.type === 'subscription') {
    const subscriptionEndDate = metadata.subscription_end_date
      ? new Date(metadata.subscription_end_date)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const { error: userUpdateError } = await (supabaseAdmin as any)
      .from('users')
      .update({
        plan: 'Premium',
        subscription_status: 'active',
        subscription_start_date: new Date().toISOString(),
        subscription_end_date: subscriptionEndDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', metadata.userId);

    if (userUpdateError) {
      console.error('Webhook: error updating user subscription:', userUpdateError);
    } else {
      console.log('Webhook: subscription activated for user:', metadata.userId);

      // Notification de succes
      try {
        await (supabaseAdmin as any).rpc('notify_payment_success', {
          p_user_id: metadata.userId,
          p_amount: details.amount,
          p_subscription_end_date: subscriptionEndDate.toISOString(),
        });
      } catch (e) {
        console.error('Webhook: notification error:', e);
      }

      // Annuler les rappels en attente
      try {
        await (supabaseAdmin as any)
          .from('scheduled_reminders')
          .delete()
          .eq('user_id', metadata.userId)
          .eq('sent', false);
      } catch (e) {
        console.error('Webhook: reminder cleanup error:', e);
      }
    }
  } else {
    // Inscription bootcamp
    const { error: regError } = await (supabaseAdmin as any)
      .from('registrations')
      .insert({
        session_id: payment.session_id,
        user_email: payment.user_email,
        first_name: metadata.firstName || '',
        last_name: metadata.lastName || '',
        phone_number: details.payment_phone_number || '',
        payment_status: 'Paye',
        amount: details.amount,
        payment_id: payment.id,
      })
      .select()
      .single();

    if (regError) {
      console.error('Webhook: registration error:', regError);
    } else {
      console.log('Webhook: registration created for', payment.user_email);
    }
  }
}

async function handlePaymentFailed(payment: any) {
  console.log('Webhook: processing failure for', payment.ref_command);

  await (supabaseAdmin as any)
    .from('payments')
    .update({ status: 'failed' })
    .eq('id', payment.id);

  const metadata = payment.metadata || {};
  if (metadata.userId) {
    try {
      await (supabaseAdmin as any).rpc('notify_payment_failed', {
        p_user_id: metadata.userId,
        p_reason: 'Paiement echoue',
      });
    } catch (e) {
      console.error('Webhook: failed notification error:', e);
    }
  }
}

async function handlePaymentCancelled(payment: any) {
  console.log('Webhook: processing cancellation for', payment.ref_command);

  await (supabaseAdmin as any)
    .from('payments')
    .update({ status: 'canceled' })
    .eq('id', payment.id);

  const metadata = payment.metadata || {};
  if (metadata.userId) {
    try {
      await (supabaseAdmin as any).rpc('notify_payment_failed', {
        p_user_id: metadata.userId,
        p_reason: 'Paiement annule',
      });
    } catch (e) {
      console.error('Webhook: cancel notification error:', e);
    }
  }
}
