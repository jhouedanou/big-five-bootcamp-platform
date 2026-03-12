/**
 * API Route: GET /api/payment/status/[ref_command]
 * 
 * Vérifier le statut d'un paiement via sa référence de commande
 * Utilisé sur les pages de confirmation pour vérifier le paiement
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ref_command: string }> }
) {
  try {
    // Dans Next.js 15+, params est une Promise
    const { ref_command } = await params;

    if (!ref_command) {
      return NextResponse.json(
        { error: 'Reference command is required' },
        { status: 400 }
      );
    }

    // Récupérer le paiement - requête simple d'abord
    const { data: payment, error } = await (supabaseAdmin as any)
      .from('payments')
      .select('*')
      .eq('ref_command', ref_command)
      .single();

    if (error) {
      console.error('Payment lookup error:', error);
      return NextResponse.json(
        { error: 'Payment not found', details: error.message },
        { status: 404 }
      );
    }

    if (!payment) {
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
        currency: payment.currency || 'XOF',
        payment_method: payment.payment_method,
        client_phone: payment.client_phone,
        item_name: payment.item_name || payment.metadata?.item_name,
        created_at: payment.created_at,
        completed_at: payment.completed_at,
        metadata: payment.metadata,
        session: null, // Sessions non implémentées pour l'instant
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
