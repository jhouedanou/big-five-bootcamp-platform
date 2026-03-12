/**
 * API Route: POST /api/payment/check/[ref_command]
 *
 * Vérifie le statut d'un paiement directement auprès de Chariow
 * et met à jour la base de données si le paiement est complété.
 *
 * Fallback si le webhook Pulse n'a pas été reçu.
 *
 * Body (optionnel):
 * - sale_id?: ID de vente Chariow (passé par la page de succès si dispo dans l'URL)
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSale } from '@/lib/chariow';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ref_command: string }> }
) {
  try {
    const { ref_command } = await params;

    if (!ref_command) {
      return NextResponse.json(
        { error: 'Reference command is required' },
        { status: 400 }
      );
    }

    // Lire le body optionnel (peut contenir sale_id)
    let bodySaleId: string | undefined;
    try {
      const body = await request.json();
      bodySaleId = body?.sale_id;
    } catch {
      // Pas de body, c'est OK
    }

    console.log('🔍 Checking payment status with Chariow:', ref_command, bodySaleId ? `(sale_id from body: ${bodySaleId})` : '');

    // 1. Récupérer le paiement dans notre base
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('ref_command', ref_command)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json(
        { error: 'Payment not found in database' },
        { status: 404 }
      );
    }

    const paymentData = payment as any;

    // Si déjà complété, retourner les infos
    if (paymentData.status === 'completed') {
      return NextResponse.json({
        success: true,
        message: 'Payment already completed',
        payment: {
          ref_command: paymentData.ref_command,
          status: paymentData.status,
          amount: paymentData.final_amount || paymentData.amount,
          completed_at: paymentData.completed_at,
        },
      });
    }

    // 2. Déterminer le sale_id : DB > body > metadata
    const saleId = paymentData.chariow_sale_id
      || bodySaleId
      || paymentData.metadata?.chariow_response?.sale_id;

    if (!saleId) {
      console.log('⚠️ No sale_id available for', ref_command);
      return NextResponse.json({
        success: false,
        message: 'Waiting for payment confirmation (no sale ID yet)',
        payment: {
          ref_command: paymentData.ref_command,
          status: paymentData.status,
        },
      });
    }

    // Si on a un sale_id du body mais pas en DB, le sauvegarder
    if (!paymentData.chariow_sale_id && saleId) {
      await supabase
        .from('payments')
        .update({ chariow_sale_id: saleId })
        .eq('id', paymentData.id);
    }

    const chariowSale = await getSale(saleId);
    console.log('📥 Chariow sale status:', chariowSale.data?.status);

    if (!chariowSale.data) {
      return NextResponse.json({
        success: false,
        message: 'Could not verify payment with Chariow',
        payment: {
          ref_command: paymentData.ref_command,
          status: paymentData.status,
        },
      });
    }

    // 3. Si le paiement est confirmé par Chariow, mettre à jour notre base
    if (chariowSale.data.status === 'completed') {
      console.log('✅ Chariow confirms payment success, updating database...');

      const updateData: Record<string, unknown> = {
        status: 'completed',
        payment_method: chariowSale.data.payment?.method?.name || 'Chariow',
        completed_at: chariowSale.data.completed_at || new Date().toISOString(),
        final_amount: chariowSale.data.amount?.value || paymentData.amount,
        chariow_sale_id: saleId,
      };

      const { error: updateError } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', paymentData.id);

      if (updateError) {
        console.error('Error updating payment:', updateError);
        return NextResponse.json(
          { error: 'Failed to update payment status' },
          { status: 500 }
        );
      }

      // Si c'est un abonnement, activer l'utilisateur
      if (paymentData.metadata?.type === 'subscription' && paymentData.metadata?.userId) {
        const userId = paymentData.metadata.userId;

        // Récupérer l'abonnement actuel pour gérer le renouvellement anticipé
        const { data: currentUser } = await supabase
          .from('users')
          .select('subscription_status, subscription_end_date, subscription_start_date')
          .eq('id', userId)
          .single();

        const now = new Date();
        const isRenewal = (currentUser as any)?.subscription_status === 'active' &&
          (currentUser as any)?.subscription_end_date &&
          new Date((currentUser as any).subscription_end_date) > now;

        // Si renouvellement anticipé, ajouter 30 jours à la date de fin existante
        let subscriptionEndDate: Date;
        if (isRenewal) {
          const existingEnd = new Date((currentUser as any).subscription_end_date);
          subscriptionEndDate = new Date(existingEnd.getTime() + 30 * 24 * 60 * 60 * 1000);
          console.log('🔄 Renouvellement anticipé:', existingEnd.toISOString(), '→', subscriptionEndDate.toISOString());
        } else {
          subscriptionEndDate = paymentData.metadata.subscription_end_date
            ? new Date(paymentData.metadata.subscription_end_date)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        }

        const userUpdateData: Record<string, unknown> = {
          plan: 'Premium',
          subscription_status: 'active',
          subscription_start_date: isRenewal ? (currentUser as any).subscription_start_date || now.toISOString() : now.toISOString(),
          subscription_end_date: subscriptionEndDate.toISOString(),
          updated_at: now.toISOString(),
        };

        const { error: userError } = await supabase
          .from('users')
          .update(userUpdateData)
          .eq('id', userId);

        if (userError) {
          console.error('Error updating user:', userError);
        } else {
          console.log('✅ User subscription activated:', userId);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Payment verified and activated',
        payment: {
          ref_command: paymentData.ref_command,
          status: 'completed',
          amount: chariowSale.data.amount?.value || paymentData.amount,
          completed_at: chariowSale.data.completed_at,
        },
      });
    }

    // Paiement pas encore complété
    return NextResponse.json({
      success: false,
      message: 'Payment not yet completed',
      payment: {
        ref_command: paymentData.ref_command,
        status: paymentData.status,
        chariow_status: chariowSale.data.status,
      },
    });

  } catch (error) {
    console.error('Check payment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
