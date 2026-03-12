/**
 * API Route: POST /api/payment/webhook
 * 
 * Webhook Chariow Pulse (remplace l'ancien IPN PayTech)
 * Reçoit les notifications de paiement de Chariow en temps réel
 * 
 * Événements supportés:
 * - successful.sale: Paiement réussi
 * - abandoned.sale: Paiement abandonné
 * - failed.sale: Paiement échoué
 * - license.activated: Licence activée
 * - license.issued: Licence émise
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { ChariowPulsePayload } from '@/lib/chariow';

export async function POST(request: NextRequest) {
  try {
    // 1. Récupérer les données du Pulse
    const pulseData: ChariowPulsePayload = await request.json();

    console.log('📥 Chariow Pulse received:', {
      event: pulseData.event,
      sale_id: pulseData.sale?.id,
      customer_email: pulseData.customer?.email,
    });

    // 2. Traiter selon le type d'événement
    switch (pulseData.event) {
      case 'successful.sale':
        await handleSuccessfulSale(pulseData);
        break;
      
      case 'abandoned.sale':
        await handleAbandonedSale(pulseData);
        break;
      
      case 'failed.sale':
        await handleFailedSale(pulseData);
        break;

      case 'license.issued':
        await handleLicenseIssued(pulseData);
        break;

      case 'license.activated':
        console.log('✅ License activated:', pulseData.license?.key);
        break;
      
      default:
        console.warn('Unhandled Pulse event type:', pulseData.event);
    }

    // 3. Répondre OK pour confirmer la réception
    return new NextResponse('OK', { status: 200 });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new NextResponse('Error', { status: 500 });
  }
}

/**
 * Traiter une vente réussie
 */
async function handleSuccessfulSale(pulseData: ChariowPulsePayload) {
  try {
    const sale = pulseData.sale;
    const customer = pulseData.customer;
    const customMetadata = sale?.custom_metadata || {};
    
    console.log('✅ Processing successful sale:', sale?.id);

    // Récupérer le ref_command depuis les custom_metadata
    const refCommand = customMetadata.ref_command;
    const userId = customMetadata.user_id;
    const type = customMetadata.type;

    if (!refCommand) {
      console.warn('No ref_command in custom_metadata, searching by sale_id...');
    }

    // Trouver le paiement dans notre base
    let query = (supabaseAdmin as any).from('payments').select('*');
    
    if (refCommand) {
      query = query.eq('ref_command', refCommand);
    } else if (sale?.id) {
      query = query.eq('chariow_sale_id', sale.id);
    } else {
      console.error('❌ No ref_command or sale_id found in pulse data');
      return;
    }

    const { data: payment, error: paymentError } = await query.single();

    if (paymentError || !payment) {
      console.error('❌ Payment not found:', refCommand || sale?.id);
      // Essayer de trouver par email
      if (customer?.email) {
        const { data: paymentByEmail } = await (supabaseAdmin as any)
          .from('payments')
          .select('*')
          .eq('user_email', customer.email)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (paymentByEmail) {
          console.log('✅ Found payment by email:', paymentByEmail.id);
          await processPaymentSuccess(paymentByEmail, pulseData, userId, type);
          return;
        }
      }
      console.error('❌ Payment not found by any method');
      return;
    }

    await processPaymentSuccess(payment, pulseData, userId, type);

  } catch (error) {
    console.error('Error in handleSuccessfulSale:', error);
    throw error;
  }
}

/**
 * Mettre à jour le paiement et activer l'abonnement
 */
async function processPaymentSuccess(
  payment: any,
  pulseData: ChariowPulsePayload,
  userId?: string,
  type?: string
) {
  const sale = pulseData.sale;
  const customer = pulseData.customer;

  // 1. Mettre à jour le paiement
  const { error: updateError } = await (supabaseAdmin as any)
    .from('payments')
    .update({
      status: 'completed',
      payment_method: 'Chariow',
      client_phone: customer?.phone || null,
      completed_at: sale?.completed_at || new Date().toISOString(),
      final_amount: sale?.amount?.value || payment.amount,
      chariow_sale_id: sale?.id,
      webhook_data: pulseData,
    })
    .eq('id', payment.id);

  if (updateError) {
    console.error('Error updating payment:', updateError);
    throw updateError;
  }

  // 2. Traitement selon le type
  const paymentUserId = userId || payment.metadata?.userId;
  const paymentType = type || payment.metadata?.type;

  if (paymentType === 'subscription' && paymentUserId) {
    // Récupérer l'abonnement actuel de l'utilisateur pour gérer le renouvellement anticipé
    const { data: currentUser } = await (supabaseAdmin as any)
      .from('users')
      .select('subscription_status, subscription_end_date')
      .eq('id', paymentUserId)
      .single();

    const now = new Date();
    const isRenewal = currentUser?.subscription_status === 'active' &&
      currentUser?.subscription_end_date &&
      new Date(currentUser.subscription_end_date) > now;

    // Si renouvellement anticipé, ajouter 30 jours à la date de fin existante
    // Sinon utiliser la date prévue dans les metadata ou 30 jours à partir de maintenant
    let subscriptionEndDate: Date;
    if (isRenewal) {
      const existingEnd = new Date(currentUser.subscription_end_date);
      subscriptionEndDate = new Date(existingEnd.getTime() + 30 * 24 * 60 * 60 * 1000);
      console.log('🔄 Renouvellement anticipé: fin existante', existingEnd.toISOString(), '→ nouvelle fin', subscriptionEndDate.toISOString());
    } else {
      subscriptionEndDate = payment.metadata?.subscription_end_date
        ? new Date(payment.metadata.subscription_end_date)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    const { error: userUpdateError } = await (supabaseAdmin as any)
      .from('users')
      .update({
        plan: 'Premium',
        subscription_status: 'active',
        subscription_start_date: isRenewal ? currentUser.subscription_start_date || now.toISOString() : now.toISOString(),
        subscription_end_date: subscriptionEndDate.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', paymentUserId);

    if (userUpdateError) {
      console.error('Error updating user subscription:', userUpdateError);
    } else {
      console.log('✅ Subscription activated for user:', paymentUserId);
      
      // Créer une notification de succès
      try {
        await (supabaseAdmin as any).rpc('notify_payment_success', {
          p_user_id: paymentUserId,
          p_amount: sale?.amount?.value || payment.amount,
          p_subscription_end_date: subscriptionEndDate.toISOString(),
        });
        console.log('✅ Payment success notification created');
      } catch (notifError) {
        console.error('Error creating payment notification:', notifError);
      }

      // Annuler les rappels premium planifiés
      try {
        await (supabaseAdmin as any)
          .from('scheduled_reminders')
          .delete()
          .eq('user_id', paymentUserId)
          .eq('sent', false);
        console.log('✅ Cancelled pending premium reminders');
      } catch (reminderError) {
        console.error('Error cancelling reminders:', reminderError);
      }
    }
  } else {
    // Bootcamp registration
    const { error: regError } = await (supabaseAdmin as any)
      .from('registrations')
      .insert({
        session_id: payment.session_id,
        user_email: payment.user_email,
        first_name: customer?.first_name || '',
        last_name: customer?.last_name || '',
        phone_number: customer?.phone || '',
        payment_status: 'Payé',
        amount: sale?.amount?.value || payment.amount,
        payment_id: payment.id,
      })
      .select()
      .single();

    if (regError) {
      console.error('Error creating registration:', regError);
    } else {
      console.log('✅ Registration created');
    }
  }

  console.log('✅ Payment processed successfully:', payment.ref_command);
}

/**
 * Traiter une vente abandonnée
 */
async function handleAbandonedSale(pulseData: ChariowPulsePayload) {
  const refCommand = pulseData.sale?.custom_metadata?.ref_command;
  if (!refCommand) return;

  console.log('⚠️ Processing abandoned sale:', refCommand);

  await (supabaseAdmin as any)
    .from('payments')
    .update({
      status: 'canceled',
      webhook_data: pulseData,
    })
    .eq('ref_command', refCommand);
}

/**
 * Traiter une vente échouée
 */
async function handleFailedSale(pulseData: ChariowPulsePayload) {
  const refCommand = pulseData.sale?.custom_metadata?.ref_command;
  if (!refCommand) return;

  console.log('❌ Processing failed sale:', refCommand);

  await (supabaseAdmin as any)
    .from('payments')
    .update({
      status: 'failed',
      webhook_data: pulseData,
    })
    .eq('ref_command', refCommand);

  // Notification d'échec
  const userId = pulseData.sale?.custom_metadata?.user_id;
  if (userId) {
    try {
      await (supabaseAdmin as any).rpc('notify_payment_failed', {
        p_user_id: userId,
        p_reason: 'Paiement échoué',
      });
    } catch (notifError) {
      console.error('Error creating failure notification:', notifError);
    }
  }
}

/**
 * Traiter l'émission d'une licence
 */
async function handleLicenseIssued(pulseData: ChariowPulsePayload) {
  console.log('🔑 License issued:', pulseData.license?.key);
  const refCommand = pulseData.sale?.custom_metadata?.ref_command;
  if (refCommand && pulseData.license) {
    // Récupérer les metadata existantes pour ne pas les écraser
    const { data: existing } = await (supabaseAdmin as any)
      .from('payments')
      .select('metadata')
      .eq('ref_command', refCommand)
      .single();

    await (supabaseAdmin as any)
      .from('payments')
      .update({
        metadata: {
          ...(existing?.metadata || {}),
          license_key: pulseData.license.key,
          license_id: pulseData.license.id,
        },
      })
      .eq('ref_command', refCommand);
  }
}
