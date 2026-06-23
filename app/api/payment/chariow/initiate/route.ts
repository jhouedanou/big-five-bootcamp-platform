/**
 * POST /api/payment/chariow/initiate
 *
 * Crée un paiement en base (status: pending, payment_method: 'chariow')
 * et retourne l'URL du checkout Chariow vers laquelle rediriger le client.
 *
 * Phase 1 — wiring minimal. Le flow complet de calcul de plan/promo/durée
 * vit toujours dans /api/payment/subscribe (FeexPay). On migrera après que
 * Chariow soit confirmé en prod.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { buildCheckoutUrl, generateRefCommand, CHARIOW_CONFIG } from '@/lib/chariow';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface InitiateBody {
  userEmail: string;
  userName?: string;
  plan: 'discovery' | 'basic' | 'pro';
  billing?: 'monthly' | 'annual';
  amount: number;
  currency?: 'XOF' | 'XAF' | 'EUR' | 'USD';
  productId?: string;
}

export async function POST(request: NextRequest) {
  try {
    if (!CHARIOW_CONFIG.API_KEY) {
      return NextResponse.json(
        { error: 'CHARIOW_API_KEY non configurée' },
        { status: 500 }
      );
    }

    const body = (await request.json()) as InitiateBody;
    const { userEmail, userName, plan, billing = 'monthly', amount, currency = 'XOF', productId } = body;

    if (!userEmail || !plan || !amount) {
      return NextResponse.json(
        { error: 'userEmail, plan et amount requis' },
        { status: 400 }
      );
    }

    // Auth check
    const { getAuthenticatedUser } = await import('@/lib/supabase-server');
    const authUser = await getAuthenticatedUser();
    if (!authUser?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    if (authUser.email.toLowerCase().trim() !== userEmail.toLowerCase().trim()) {
      return NextResponse.json({ error: 'Email session mismatch' }, { status: 403 });
    }

    const { data: existingUser } = await (supabaseAdmin as any)
      .from('users')
      .select('id, name')
      .eq('email', userEmail)
      .maybeSingle();
    if (!existingUser) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const ref_command = generateRefCommand('CHW');

    const paymentInsert = {
      user_email: userEmail,
      amount,
      currency,
      status: 'pending',
      payment_method: 'chariow',
      ref_command,
      metadata: {
        type: 'subscription',
        plan,
        billing,
        gateway: 'chariow',
        product_id: productId || CHARIOW_CONFIG.PRODUCT_ID,
        userId: existingUser.id,
        customer_name: userName || existingUser.name || userEmail.split('@')[0],
      },
    };

    const { data: payment, error: paymentError } = await (supabaseAdmin as any)
      .from('payments')
      .insert(paymentInsert)
      .select()
      .single();

    if (paymentError) {
      console.error('[chariow/initiate] payment insert error:', paymentError);
      return NextResponse.json(
        { error: 'Échec création paiement', details: paymentError.message },
        { status: 500 }
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.NODE_ENV === 'production' ? 'https://laveiye.com' : 'http://localhost:3000');

    const checkoutUrl = buildCheckoutUrl({
      productId: productId || CHARIOW_CONFIG.PRODUCT_ID,
      refCommand: ref_command,
      email: userEmail,
      // Mobile money confirme de façon asynchrone : on passe par /payment/pending
      // (poll backend) au lieu de /payment/success direct, pour éviter une
      // redirection vers le succès avant confirmation réelle du paiement.
      successUrl: `${baseUrl}/payment/pending?ref_command=${encodeURIComponent(ref_command)}`,
      cancelUrl: `${baseUrl}/payment/failed?ref_command=${encodeURIComponent(ref_command)}`,
    });

    return NextResponse.json({
      success: true,
      ref_command,
      checkoutUrl,
      paymentId: payment.id,
    });
  } catch (error: any) {
    console.error('[chariow/initiate] error:', error);
    return NextResponse.json(
      { error: error?.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}
