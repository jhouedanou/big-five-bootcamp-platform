/**
 * API Route: POST /api/payment/subscribe
 *
 * Cree une demande de paiement Moneroo pour un abonnement mensuel
 * Supporte Basic (4 900 XOF) et Pro (9 900 XOF)
 * Supporte le renouvellement anticipe : les jours restants sont conserves
 *
 * Body:
 * - userEmail: Email de l'utilisateur
 * - userName?: Nom de l'utilisateur
 * - plan: "basic" | "pro"
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  initializePayment,
  generateRefCommand,
  getReturnUrl,
} from '@/lib/moneroo';

const PLAN_PRICES: Record<string, { price: number; label: string }> = {
  basic: { price: 4900, label: 'Basic' },
  pro: { price: 9900, label: 'Pro' },
};

const SUBSCRIPTION_DURATION_DAYS = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userEmail, userName, plan } = body;

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    const planKey = (plan || 'pro').toLowerCase();
    const planConfig = PLAN_PRICES[planKey];

    if (!planConfig) {
      return NextResponse.json(
        { error: 'Plan invalide. Choisissez "basic" ou "pro".' },
        { status: 400 }
      );
    }

    const SUBSCRIPTION_PRICE = planConfig.price;

    // Verifier si l'utilisateur existe
    let { data: existingUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, subscription_status, subscription_end_date, plan')
      .eq('email', userEmail)
      .single();

    // Si l'utilisateur n'existe pas, le creer
    if (!existingUser || userError?.code === 'PGRST116') {
      const { data: authListData } = await supabaseAdmin.auth.admin.listUsers() as any;
      const authUser = authListData?.users?.find((u: any) => u.email === userEmail);

      if (!authUser) {
        return NextResponse.json(
          { error: 'Utilisateur non trouve. Veuillez vous inscrire d\'abord.' },
          { status: 404 }
        );
      }

      const { data: newUser, error: createError } = await (supabaseAdmin as any)
        .from('users')
        .upsert({
          id: authUser.id,
          email: authUser.email!,
          name: authUser.user_metadata?.name || authUser.email!.split('@')[0],
          role: 'user',
          plan: 'Free',
          status: 'active',
        }, { onConflict: 'id' })
        .select('id, email, name, subscription_status, subscription_end_date, plan')
        .single();

      if (createError) {
        return NextResponse.json(
          { error: 'Impossible de creer le profil utilisateur', details: createError.message },
          { status: 500 }
        );
      }

      existingUser = newUser;
    }

    // Calculer la date de fin
    const now = new Date();
    const currentEndDate = (existingUser as any).subscription_end_date
      ? new Date((existingUser as any).subscription_end_date)
      : null;

    const isCurrentlyActive = (existingUser as any).subscription_status === 'active'
      && currentEndDate
      && currentEndDate > now;

    const baseDate = isCurrentlyActive ? currentEndDate : now;
    const subscriptionEndDate = new Date(baseDate!);
    subscriptionEndDate.setDate(subscriptionEndDate.getDate() + SUBSCRIPTION_DURATION_DAYS);

    const ref_command = generateRefCommand('SUB');
    const customerName = userName || (existingUser as any).name || userEmail.split('@')[0];
    const nameParts = customerName.split(' ');

    const description = isCurrentlyActive
      ? `Renouvellement Big Five ${planConfig.label} - 1 mois (${ref_command})`
      : `Abonnement Big Five ${planConfig.label} - 1 mois (${ref_command})`;

    // Creer le paiement dans la base
    const paymentInsert = {
      user_email: userEmail,
      amount: SUBSCRIPTION_PRICE,
      status: 'pending',
      payment_method: 'Moneroo',
      ref_command,
      metadata: {
        type: 'subscription',
        plan: planKey,
        plan_label: planConfig.label,
        renewal: isCurrentlyActive,
        duration_days: SUBSCRIPTION_DURATION_DAYS,
        subscription_end_date: subscriptionEndDate.toISOString(),
        previous_end_date: isCurrentlyActive ? currentEndDate!.toISOString() : null,
        item_name: isCurrentlyActive
          ? `Renouvellement Big Five ${planConfig.label} - 1 mois`
          : `Abonnement Big Five ${planConfig.label} - 1 mois`,
        userId: (existingUser as any).id,
      },
    };

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert(paymentInsert as any)
      .select()
      .single();

    if (paymentError) {
      console.error('Payment creation error:', paymentError);
      return NextResponse.json(
        { error: 'Failed to create payment record', details: paymentError.message },
        { status: 500 }
      );
    }

    // Initialiser le paiement Moneroo
    let monerooResponse;
    try {
      monerooResponse = await initializePayment({
        amount: SUBSCRIPTION_PRICE,
        currency: 'XOF',
        description,
        return_url: getReturnUrl(ref_command),
        customer: {
          email: userEmail,
          first_name: nameParts[0] || 'Client',
          last_name: nameParts.slice(1).join(' ') || 'Big Five',
          phone: undefined,
        },
        metadata: {
          ref_command,
          type: 'subscription',
          plan: planKey,
          user_id: (existingUser as any).id,
          renewal: isCurrentlyActive ? 'true' : 'false',
        },
      });
    } catch (monerooError) {
      console.error('Moneroo initialization error:', monerooError);

      await (supabaseAdmin as any)
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', (payment as any).id);

      const errorMsg = monerooError instanceof Error ? monerooError.message : 'Erreur Moneroo';
      return NextResponse.json(
        { error: 'Le service de paiement est temporairement indisponible. Veuillez reessayer.', details: errorMsg },
        { status: 502 }
      );
    }

    // Stocker l'ID Moneroo dans le paiement
    await (supabaseAdmin as any)
      .from('payments')
      .update({
        moneroo_payment_id: monerooResponse.data.id,
      })
      .eq('id', (payment as any).id);

    return NextResponse.json({
      success: true,
      payment_id: (payment as any).id,
      ref_command,
      redirect_url: monerooResponse.data.checkout_url,
      amount: SUBSCRIPTION_PRICE,
      plan: planKey,
      plan_label: planConfig.label,
      duration_days: SUBSCRIPTION_DURATION_DAYS,
      subscription_end_date: subscriptionEndDate.toISOString(),
      renewal: isCurrentlyActive,
    });

  } catch (error) {
    console.error('Subscription payment error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
