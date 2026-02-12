/**
 * API Route: POST /api/payment/check/[ref_command]
 * 
 * Vérifie le statut d'un paiement directement auprès de PayTech
 * et met à jour la base de données si le paiement est complété.
 * 
 * C'est un fallback si l'IPN n'a pas été reçue.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPaymentStatus } from '@/lib/paytech';
import { createClient } from '@supabase/supabase-js';

// Créer un client admin sans types stricts
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

    console.log('🔍 Checking payment status with PayTech:', ref_command);

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

    // Cast payment to any for flexibility
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

    // 2. Vérifier le statut auprès de PayTech
    const token = paymentData.paytech_token;
    if (!token) {
      return NextResponse.json(
        { error: 'No PayTech token found for this payment' },
        { status: 400 }
      );
    }

    const paytechStatus = await getPaymentStatus(token);
    console.log('📥 PayTech status response:', paytechStatus);

    if (!paytechStatus.success) {
      return NextResponse.json({
        success: false,
        message: 'Could not verify payment with PayTech',
        payment: {
          ref_command: paymentData.ref_command,
          status: paymentData.status,
        },
      });
    }

    // 3. Si le paiement est confirmé par PayTech, mettre à jour notre base
    const paytechPayment = (paytechStatus as any).payment;
    
    if (paytechPayment?.state === 'success') {
      console.log('✅ PayTech confirms payment success, updating database...');

      // Mettre à jour le paiement
      const updateData: Record<string, unknown> = {
        status: 'completed',
        client_phone: paytechPayment.buyer_phone_number || paymentData.metadata?.phoneNumber,
        completed_at: paytechPayment.date_checkout || new Date().toISOString(),
        final_amount: paytechPayment.item_price || paymentData.amount,
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
        
        const userUpdateData: Record<string, unknown> = {
          plan: 'Premium',
          status: 'active',
          updated_at: new Date().toISOString(),
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
          amount: paytechPayment.item_price || paymentData.amount,
          completed_at: paytechPayment.date_checkout,
          buyer_phone: paytechPayment.buyer_phone_number,
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
        paytech_state: paytechPayment?.state || 'unknown',
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
