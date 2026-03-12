/**
 * API Route: GET /api/payment/check-subscription
 * 
 * Vérifie le statut d'abonnement d'un utilisateur.
 * Utilisé pour le polling après un paiement via le widget Chariow.
 * 
 * Query params:
 * - email: Email de l'utilisateur
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email requis' },
        { status: 400 }
      );
    }

    const { data: user, error } = await (supabaseAdmin as any)
      .from('users')
      .select('id, email, plan, subscription_status, subscription_start_date, subscription_end_date')
      .eq('email', email)
      .single();

    if (error || !user) {
      return NextResponse.json({
        isPremium: false,
        subscription_status: null,
        subscription_end_date: null,
      });
    }

    const isPremium = user.plan?.toLowerCase() === 'premium' || user.plan?.toLowerCase() === 'enterprise';
    const isActive = user.subscription_status === 'active';
    const endDate = user.subscription_end_date;
    const isExpired = endDate ? new Date(endDate) < new Date() : false;

    return NextResponse.json({
      isPremium: isPremium && isActive && !isExpired,
      plan: user.plan,
      subscription_status: user.subscription_status,
      subscription_start_date: user.subscription_start_date,
      subscription_end_date: user.subscription_end_date,
    });
  } catch (error) {
    console.error('Check subscription error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
