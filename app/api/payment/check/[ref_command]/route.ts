/**
 * API Route: POST /api/payment/check/[ref_command]
 *
 * Verifie le statut d'un paiement directement aupres de Moneroo
 * et met a jour la base de donnees si le paiement est complete.
 * Fallback si le webhook n'a pas ete recu.
 */

import { NextRequest, NextResponse } from 'next/server';
import { retrievePayment } from '@/lib/moneroo';
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

    // 1. Recuperer le paiement dans notre base
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

    // Deja complete
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

    // 2. Verifier aupres de Moneroo
    const monerooId = paymentData.moneroo_payment_id;
    if (!monerooId) {
      return NextResponse.json(
        { error: 'No Moneroo payment ID found' },
        { status: 400 }
      );
    }

    const monerooResult = await retrievePayment(monerooId);
    const monerooData = monerooResult.data;

    console.log('Moneroo check result:', {
      id: monerooData.id,
      status: monerooData.status,
    });

    // 3. Si le paiement est confirme, mettre a jour
    if (monerooData.status === 'success') {
      const updateData: Record<string, unknown> = {
        status: 'completed',
        payment_method: monerooData.method?.name || 'Moneroo',
        client_phone: monerooData.payment_phone_number || monerooData.customer?.phone,
        completed_at: monerooData.processed_at || new Date().toISOString(),
        final_amount: monerooData.amount,
      };

      await supabase
        .from('payments')
        .update(updateData)
        .eq('id', paymentData.id);

      // Si c'est un abonnement, activer l'utilisateur
      if (paymentData.metadata?.type === 'subscription' && paymentData.metadata?.userId) {
        const subscriptionEndDate = paymentData.metadata.subscription_end_date
          ? new Date(paymentData.metadata.subscription_end_date)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await supabase
          .from('users')
          .update({
            plan: 'Premium',
            subscription_status: 'active',
            subscription_start_date: new Date().toISOString(),
            subscription_end_date: subscriptionEndDate.toISOString(),
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', paymentData.metadata.userId);

        console.log('User subscription activated:', paymentData.metadata.userId);
      }

      return NextResponse.json({
        success: true,
        message: 'Payment verified and activated',
        payment: {
          ref_command: paymentData.ref_command,
          status: 'completed',
          amount: monerooData.amount,
        },
      });
    }

    // Paiement pas encore complete
    return NextResponse.json({
      success: false,
      message: 'Payment not yet completed',
      payment: {
        ref_command: paymentData.ref_command,
        status: paymentData.status,
        moneroo_status: monerooData.status,
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
