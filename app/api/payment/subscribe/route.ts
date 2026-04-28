/**
 * API Route: POST /api/payment/subscribe
 *
 * Cree une demande de paiement PawaPay pour un abonnement
 * Supporte Basic (4 900 XOF) et Pro (9 900 XOF)
 * Supporte le renouvellement anticipe : les jours restants sont conserves
 *
 * Body:
 * - userEmail    : Email de l'utilisateur
 * - userName?   : Nom de l'utilisateur
 * - plan        : "basic" | "pro"
 * - billing     : "monthly" | "annual"
 * - phoneNumber : MSISDN du client (ex. "2250707123456")
 * - provider    : Code provider PawaPay (ex. "ORANGE_CIV", "WAVE_CIV", "MTN_MOMO_CIV")
 * - currency?   : Devise (defaut "XOF")
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  initiateDeposit,
  generateRefCommand,
  getReturnUrl,
  getFailedUrl,
  checkDepositStatus,
} from '@/lib/pawapay';

const PLAN_PRICES: Record<string, { price: number; annualPrice: number; label: string }> = {
  basic: { price: 4900, annualPrice: 49000, label: 'Basic' },
  pro: { price: 9900, annualPrice: 99000, label: 'Pro' },
};

const SUBSCRIPTION_DURATION_DAYS = 30;
const ANNUAL_SUBSCRIPTION_DURATION_DAYS = 365;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userEmail, userName, plan, billing, phoneNumber, provider, currency = 'XOF' } = body;

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    if (!phoneNumber || !provider) {
      return NextResponse.json(
        { error: 'phoneNumber et provider sont requis (ex. provider: "ORANGE_CIV").' },
        { status: 400 }
      );
    }

    const planKey = (plan || 'pro').toLowerCase();
    const planConfig = PLAN_PRICES[planKey];
    const isAnnual = billing === 'annual';

    if (!planConfig) {
      return NextResponse.json(
        { error: 'Plan invalide. Choisissez "basic" ou "pro".' },
        { status: 400 }
      );
    }

    const SUBSCRIPTION_PRICE = isAnnual ? planConfig.annualPrice : planConfig.price;
    const durationDays = isAnnual ? ANNUAL_SUBSCRIPTION_DURATION_DAYS : SUBSCRIPTION_DURATION_DAYS;
    const billingLabel = isAnnual ? '1 an' : '1 mois';

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
    subscriptionEndDate.setDate(subscriptionEndDate.getDate() + durationDays);

    const ref_command = generateRefCommand('SUB');
    const customerName = userName || (existingUser as any).name || userEmail.split('@')[0];

    const customerMessage = (isCurrentlyActive
      ? `Renouv ${planConfig.label}`
      : `Abo ${planConfig.label}`
    ).slice(0, 22); // PawaPay : max 22 chars

    // Creer le paiement dans la base
    const paymentInsert = {
      user_email: userEmail,
      amount: SUBSCRIPTION_PRICE,
      currency,
      status: 'pending',
      payment_method: 'pawapay',
      provider,
      client_phone: phoneNumber,
      ref_command,
      metadata: {
        type: 'subscription',
        plan: planKey,
        plan_label: planConfig.label,
        billing: isAnnual ? 'annual' : 'monthly',
        renewal: isCurrentlyActive,
        duration_days: durationDays,
        subscription_end_date: subscriptionEndDate.toISOString(),
        previous_end_date: isCurrentlyActive ? currentEndDate!.toISOString() : null,
        item_name: isCurrentlyActive
          ? `Renouvellement Laveiye ${planConfig.label} - ${billingLabel}`
          : `Abonnement Laveiye ${planConfig.label} - ${billingLabel}`,
        customer_name: customerName,
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

    // Initier le depot PawaPay
    let pawapayResponse;
    try {
      pawapayResponse = await initiateDeposit({
        depositId: ref_command,
        amount: String(SUBSCRIPTION_PRICE),
        currency,
        payer: {
          type: 'MMO',
          accountDetails: { phoneNumber, provider },
        },
        customerMessage,
        successfulUrl: getReturnUrl(ref_command),
        failedUrl: getFailedUrl(ref_command),
        metadata: [
          { ref_command },
          { type: 'subscription' },
          { plan: planKey },
          { billing: isAnnual ? 'annual' : 'monthly' },
          { user_id: String((existingUser as any).id) },
          { renewal: isCurrentlyActive ? 'true' : 'false' },
        ],
      });
    } catch (pawapayError) {
      console.error('PawaPay initialization error:', pawapayError);

      await (supabaseAdmin as any)
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', (payment as any).id);

      const errorMsg = pawapayError instanceof Error ? pawapayError.message : 'Erreur PawaPay';
      return NextResponse.json(
        { error: 'Le service de paiement est temporairement indisponible. Veuillez reessayer.', details: errorMsg },
        { status: 502 }
      );
    }

    // Si REJECTED, marquer le paiement et retourner l'erreur
    if (pawapayResponse.status === 'REJECTED') {
      await (supabaseAdmin as any)
        .from('payments')
        .update({
          status: 'rejected',
          failure_code: pawapayResponse.failureReason?.failureCode,
          failure_message: pawapayResponse.failureReason?.failureMessage,
        })
        .eq('id', (payment as any).id);

      return NextResponse.json(
        {
          success: false,
          error: 'Paiement rejete par PawaPay',
          failureReason: pawapayResponse.failureReason,
        },
        { status: 400 }
      );
    }

    // Flow avec redirection (Wave SEN/CIV) : attendre que l'URL d'auth soit disponible
    let authorizationUrl: string | undefined;
    if (pawapayResponse.nextStep === 'GET_AUTH_URL') {
      for (let i = 0; i < 3; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        try {
          const check = await checkDepositStatus(ref_command);
          if (check.data?.authorizationUrl) {
            authorizationUrl = check.data.authorizationUrl;
            break;
          }
        } catch {
          // ignorer, le frontend pourra poller
        }
      }
    }

    return NextResponse.json({
      success: true,
      payment_id: (payment as any).id,
      ref_command,
      depositId: ref_command,
      status: pawapayResponse.status,
      nextStep: pawapayResponse.nextStep,
      // Si on a une URL d'auth (Wave SEN/CIV), on la propose comme redirect_url
      redirect_url: authorizationUrl,
      authorizationUrl,
      // Sinon le frontend affiche "verifiez votre telephone" et polle cet endpoint
      pollingUrl: `/api/payment/pawapay/status/deposit/${ref_command}`,
      amount: SUBSCRIPTION_PRICE,
      currency,
      plan: planKey,
      plan_label: planConfig.label,
      billing: isAnnual ? 'annual' : 'monthly',
      duration_days: durationDays,
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
