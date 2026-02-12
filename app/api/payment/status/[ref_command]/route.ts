/**
 * API Route: GET /api/payment/status/[ref_command]
 * 
 * Vérifier le statut d'un paiement via sa référence de commande
 * Utilisé sur les pages de confirmation pour vérifier le paiement
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { ref_command: string } }
) {
  try {
    const { ref_command } = params;

    if (!ref_command) {
      return NextResponse.json(
        { error: 'Reference command is required' },
        { status: 400 }
      );
    }

    // Récupérer le paiement avec les infos de session et bootcamp
    const { data: payment, error } = await supabaseAdmin
      .from('payments')
      .select(`
        *,
        session:sessions (
          id,
          start_date,
          end_date,
          location,
          city,
          format,
          trainer_name,
          creative_library:creative_libraries (
            title,
            slug,
            tagline,
            level
          )
        )
      `)
      .eq('ref_command', ref_command)
      .single();

    if (error || !payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Retourner les infos de paiement
    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        ref_command: payment.ref_command,
        status: payment.status,
        amount: payment.final_amount || payment.amount,
        currency: payment.currency,
        payment_method: payment.payment_method,
        client_phone: payment.client_phone,
        item_name: payment.item_name,
        created_at: payment.created_at,
        completed_at: payment.completed_at,
        // @ts-ignore
        session: payment.session,
      },
    });

  } catch (error) {
    console.error('Error fetching payment status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
