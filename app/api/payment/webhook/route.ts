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
import { generateRefCommand, activateLicense } from '@/lib/chariow';

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
 * Gère deux flows :
 * 1. API Checkout (avec ref_command dans custom_metadata)
 * 2. Widget Chariow (sans ref_command, match par email client)
 */
async function handleSuccessfulSale(pulseData: ChariowPulsePayload) {
  try {
    const sale = pulseData.sale;
    const customer = pulseData.customer;
    const customMetadata = sale?.custom_metadata || {};
    
    console.log('✅ Processing successful sale:', sale?.id);

    const refCommand = customMetadata.ref_command;
    const userId = customMetadata.user_id;
    const type = customMetadata.type;

    // ========== Flow 1 : API Checkout (ref_command présent) ==========
    if (refCommand) {
      const { data: payment, error: paymentError } = await (supabaseAdmin as any)
        .from('payments')
        .select('*')
        .eq('ref_command', refCommand)
        .single();

      if (!paymentError && payment) {
        await processPaymentSuccess(payment, pulseData, userId, type);
        return;
      }
      console.warn('⚠️ Payment not found by ref_command:', refCommand);
    }

    // ========== Flow 2 : Widget Chariow (pas de ref_command) ==========
    // Chercher un paiement pending existant par sale_id ou email
    let payment = null;

    if (sale?.id) {
      const { data } = await (supabaseAdmin as any)
        .from('payments')
        .select('*')
        .eq('chariow_sale_id', sale.id)
        .single();
      payment = data;
    }

    if (!payment && customer?.email) {
      const { data } = await (supabaseAdmin as any)
        .from('payments')
        .select('*')
        .eq('user_email', customer.email)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      payment = data;
    }

    if (payment) {
      console.log('✅ Found existing payment:', payment.id);
      await processPaymentSuccess(payment, pulseData, userId || payment.metadata?.userId, type || payment.metadata?.type);
      return;
    }

    // ========== Flow Widget : créer un nouveau paiement ==========
    if (customer?.email) {
      console.log('🆕 Widget purchase — creating payment for:', customer.email);

      // Trouver l'utilisateur par email
      const { data: dbUser } = await (supabaseAdmin as any)
        .from('users')
        .select('id, email, name, subscription_status, subscription_end_date, subscription_start_date')
        .eq('email', customer.email)
        .single();

      if (!dbUser) {
        console.warn('⚠️ No user found for email:', customer.email);
        return;
      }

      // Créer l'enregistrement de paiement
      const widgetRef = generateRefCommand('WDG');
      const { data: newPayment, error: insertError } = await (supabaseAdmin as any)
        .from('payments')
        .insert({
          ref_command: widgetRef,
          user_email: customer.email,
          amount: sale?.amount?.value || 0,
          final_amount: sale?.amount?.value || 0,
          currency: sale?.amount?.currency || 'XOF',
          status: 'completed',
          payment_method: 'Chariow Widget',
          chariow_sale_id: sale?.id,
          webhook_data: pulseData,
          completed_at: sale?.completed_at || new Date().toISOString(),
          item_name: 'Abonnement Big Five - Widget',
          metadata: {
            type: 'subscription',
            userId: dbUser.id,
            source: 'widget',
            customer_name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
          },
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error creating widget payment:', insertError);
        return;
      }

      // Activer l'abonnement
      const now = new Date();
      const isRenewal = dbUser.subscription_status === 'active' &&
        dbUser.subscription_end_date &&
        new Date(dbUser.subscription_end_date) > now;

      // Utiliser la durée de licence Chariow si disponible, sinon 30 jours
      const licenseExpiresAt = pulseData.license?.expires_at;
      let subscriptionEndDate: Date;

      if (licenseExpiresAt) {
        // Synchro directe avec la licence Chariow
        subscriptionEndDate = new Date(licenseExpiresAt);
        console.log('📅 License duration sync:', subscriptionEndDate.toISOString());
      } else if (isRenewal) {
        subscriptionEndDate = new Date(
          new Date(dbUser.subscription_end_date).getTime() + 30 * 24 * 60 * 60 * 1000
        );
        console.log('🔄 Renewal: extending to', subscriptionEndDate.toISOString());
      } else {
        subscriptionEndDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      }

      const { error: userUpdateError } = await (supabaseAdmin as any)
        .from('users')
        .update({
          plan: 'Premium',
          subscription_status: 'active',
          subscription_start_date: isRenewal
            ? (dbUser.subscription_start_date || now.toISOString())
            : now.toISOString(),
          subscription_end_date: subscriptionEndDate.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', dbUser.id);

      if (userUpdateError) {
        console.error('❌ Error updating user subscription:', userUpdateError);
      } else {
        console.log('✅ Widget subscription activated for:', dbUser.id);

        // Notification de succès
        try {
          await (supabaseAdmin as any).rpc('notify_payment_success', {
            p_user_id: dbUser.id,
            p_amount: sale?.amount?.value || 0,
            p_subscription_end_date: subscriptionEndDate.toISOString(),
          });
        } catch (notifError) {
          console.error('Notification error:', notifError);
        }

        // Annuler les rappels
        try {
          await (supabaseAdmin as any)
            .from('scheduled_reminders')
            .delete()
            .eq('user_id', dbUser.id)
            .eq('sent', false);
        } catch (reminderError) {
          console.error('Error cancelling reminders:', reminderError);
        }
      }
      return;
    }

    console.error('❌ No ref_command, sale_id, or customer email — cannot process sale');

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
 * Sauvegarde la clé, auto-active si nécessaire, et synchronise les durées
 */
async function handleLicenseIssued(pulseData: ChariowPulsePayload) {
  const license = pulseData.license;
  const customer = pulseData.customer;
  const refCommand = pulseData.sale?.custom_metadata?.ref_command;

  if (!license?.key) return;
  console.log('🔑 License issued:', license.key, 'status:', license.status);

  // 1. Trouver le paiement associé (par ref_command ou par email)
  let payment: any = null;

  if (refCommand) {
    const { data } = await (supabaseAdmin as any)
      .from('payments')
      .select('id, metadata')
      .eq('ref_command', refCommand)
      .single();
    payment = data;
  }

  if (!payment && customer?.email) {
    const { data } = await (supabaseAdmin as any)
      .from('payments')
      .select('id, metadata')
      .eq('user_email', customer.email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    payment = data;
  }

  // 2. Sauvegarder la clé de licence dans le paiement
  if (payment) {
    await (supabaseAdmin as any)
      .from('payments')
      .update({
        metadata: {
          ...(payment.metadata || {}),
          license_key: license.key,
          license_id: license.id,
          license_expires_at: license.expires_at,
          license_status: license.status,
        },
      })
      .eq('id', payment.id);
  }

  // 3. Auto-activer la licence si elle est en attente d'activation
  if (license.status === 'pending_activation') {
    try {
      const result = await activateLicense(license.key, 'web-platform');
      console.log('🔑 Auto-activated license:', result.message);
    } catch (err) {
      console.error('Failed to auto-activate license:', err);
    }
  }

  // 4. Synchroniser la durée de licence avec l'abonnement utilisateur
  if (license.expires_at && customer?.email) {
    const { data: user } = await (supabaseAdmin as any)
      .from('users')
      .select('id, subscription_end_date')
      .eq('email', customer.email)
      .single();

    if (user) {
      const licenseExpiry = new Date(license.expires_at);
      const currentEnd = user.subscription_end_date ? new Date(user.subscription_end_date) : null;

      // Mettre à jour si la date de licence est différente (>1 min de diff)
      if (!currentEnd || Math.abs(licenseExpiry.getTime() - currentEnd.getTime()) > 60000) {
        await (supabaseAdmin as any)
          .from('users')
          .update({
            subscription_end_date: licenseExpiry.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        console.log('📅 Subscription synced with license expiry:', licenseExpiry.toISOString());
      }
    }
  }
}
