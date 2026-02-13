/**
 * API Route: GET/POST /api/payment/check
 * 
 * Outil de diagnostic et récupération de paiements
 * Permet de vérifier un paiement directement auprès de PayTech
 * et de le créer/mettre à jour dans la base de données si nécessaire
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Vérifier un paiement par téléphone ou email
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const email = searchParams.get('email');
    const ref = searchParams.get('ref');

    if (!phone && !email && !ref) {
      return NextResponse.json(
        { error: 'Veuillez fournir un téléphone, email ou référence' },
        { status: 400 }
      );
    }

    let query = supabaseAdmin
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (ref) {
      // Recherche par référence (partielle)
      query = query.ilike('ref_command', `%${ref}%`);
    } else if (phone) {
      // Recherche par téléphone
      query = query.ilike('client_phone', `%${phone.replace(/\s/g, '')}%`);
    } else if (email) {
      // Recherche par email dans custom_field ou user_id
      query = query.or(`client_email.ilike.%${email}%,user_email.ilike.%${email}%`);
    }

    const { data: payments, error } = await query;

    if (error) {
      console.error('Error searching payments:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la recherche', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: payments?.length || 0,
      payments: payments?.map(p => ({
        id: p.id,
        ref_command: p.ref_command,
        status: p.status,
        amount: p.amount,
        payment_method: p.payment_method,
        client_phone: p.client_phone,
        item_name: p.item_name,
        created_at: p.created_at,
        completed_at: p.completed_at,
      })),
    });

  } catch (error) {
    console.error('Payment check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Créer ou mettre à jour un paiement manuellement (admin seulement)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ref_command, phone, status, amount, payment_method, item_name, user_id } = body;

    // Vérifier si le paiement existe déjà
    const { data: existingPayment } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('ref_command', ref_command)
      .single();

    if (existingPayment) {
      // Mettre à jour le paiement existant
      const { data: updated, error } = await supabaseAdmin
        .from('payments')
        .update({
          status: status || 'completed',
          payment_method: payment_method || existingPayment.payment_method,
          completed_at: status === 'completed' ? new Date().toISOString() : null,
        })
        .eq('ref_command', ref_command)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        action: 'updated',
        payment: updated,
      });
    } else {
      // Créer un nouveau paiement
      const { data: created, error } = await supabaseAdmin
        .from('payments')
        .insert({
          ref_command,
          status: status || 'completed',
          amount: amount || 0,
          currency: 'XOF',
          payment_method: payment_method || 'unknown',
          client_phone: phone,
          item_name: item_name || 'Paiement manuel',
          user_id: user_id,
          created_at: new Date().toISOString(),
          completed_at: status === 'completed' ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        action: 'created',
        payment: created,
      });
    }

  } catch (error: any) {
    console.error('Payment create/update error:', error);
    return NextResponse.json(
      { error: 'Erreur', details: error.message },
      { status: 500 }
    );
  }
}
