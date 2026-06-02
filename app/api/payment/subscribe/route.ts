/**
 * API Route: POST /api/payment/subscribe
 *
 * Crée une demande de paiement Chariow pour un abonnement.
 * Plans supportés : Découverte (1 000 XOF), Basic (4 900 XOF), Pro (9 900 XOF).
 * Supporte le renouvellement anticipé : les jours restants sont conservés.
 *
 * Body:
 * - userEmail    : Email de l'utilisateur
 * - userName?    : Nom de l'utilisateur
 * - plan         : "discovery" | "basic" | "pro"
 * - billing      : "monthly" | "annual"
 * - currency?    : Devise (defaut "XOF")
 * - promoCode?   : Code promo (ex. LAVEIYE-XXXX)
 *
 * Réponse: { success, ref_command, checkoutUrl, … }
 * Le frontend redirige `window.location.href = checkoutUrl`. Le webhook Chariow
 * (`/api/webhook/chariow`) finalise l'activation à la confirmation du paiement.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { buildCheckoutUrl, generateRefCommand, CHARIOW_CONFIG } from '@/lib/chariow';
import {
  KEYNOTE_PROMO_OFFER,
  computePromoPhases,
  isPromoCodeFormatValid,
  normalizePromoCode,
  type PromoPhases,
} from '@/lib/promo-codes';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { addDays, computeSubscriptionEnd } from '@/lib/subscription';

const PLAN_PRICES: Record<string, { price: number; annualPrice: number; label: string; dbKey: string }> = {
  discovery: { price: 1000, annualPrice: 10000, label: 'Découverte', dbKey: 'Discovery' },
  basic: { price: 4900, annualPrice: 49000, label: 'Basic', dbKey: 'Basic' },
  pro: { price: 9900, annualPrice: 99000, label: 'Pro', dbKey: 'Pro' },
};

const SUBSCRIPTION_DURATION_DAYS = 30;
const ANNUAL_SUBSCRIPTION_DURATION_DAYS = 365;

/**
 * Rang d'un plan pour interdire les downgrades quand l'abonnement
 * est encore actif. Découverte < Basic < Pro.
 */
const PLAN_RANK: Record<string, number> = {
  discovery: 1,
  basic: 2,
  pro: 3,
};

function planRank(dbKeyOrSlug: string | null | undefined): number {
  if (!dbKeyOrSlug) return 0;
  return PLAN_RANK[String(dbKeyOrSlug).toLowerCase()] ?? 0;
}

function resolveBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NODE_ENV === 'production' ? 'https://laveiye.com' : 'http://localhost:3000')
  );
}

export async function POST(request: NextRequest) {
  try {
    // Auth obligatoire : l'utilisateur doit être connecté et ne peut souscrire
    // que pour son propre compte. Empêche un attaquant d'initier un paiement
    // pour un autre email ou de consommer un code promo unique au nom d'autrui.
    const { getSupabaseServer } = await import('@/lib/supabase-server');
    const supabaseServer = await getSupabaseServer();
    const { data: { user: authUser } } = await supabaseServer.auth.getUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });
    }

    const body = await request.json();
    const { userEmail, userName, plan, billing, currency = 'XOF', promoCode, rawPromoInput } = body;

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    // Le userEmail soumis doit correspondre à la session — pas de souscription
    // pour un compte tiers.
    if ((userEmail || '').toLowerCase().trim() !== (authUser.email || '').toLowerCase().trim()) {
      return NextResponse.json(
        { error: "Email ne correspond pas à la session authentifiée." },
        { status: 403 }
      );
    }

    // Plan strict — aucun fallback silencieux vers Pro.
    const planKey = String(plan || '').toLowerCase().trim();
    const planConfig = PLAN_PRICES[planKey];
    const isAnnual = billing === 'annual';

    if (!planConfig) {
      return NextResponse.json(
        { error: 'Plan invalide. Choisissez "discovery", "basic" ou "pro".' },
        { status: 400 }
      );
    }

    // ——————————————————————————————————————————————————
    // Code promo LAVEIYE — BONUS "3 mois Basic offerts" cumulable avec
    // n'importe quel plan. Les phases (avant/après/mergé) sont calculées
    // ici puis appliquées à l'activation par le webhook Chariow.
    // ————————————————————————————————————————————————
    let promoApplied: { code: string; registrationId: string; phases: PromoPhases } | null = null;
    const normalizedPromo = normalizePromoCode(promoCode);
    if (!normalizedPromo && rawPromoInput) {
      console.warn(`[subscribe] promoCode absent mais rawPromoInput="${rawPromoInput}" pour ${userEmail} — code non appliqué côté client`);
    }

    if (normalizedPromo) {
      const ip = getClientIp(request);
      const rl = rateLimit(`promo:${ip}:${(userEmail || '').toLowerCase()}`, 5, 5 * 60_000);
      if (!rl.allowed) {
        return NextResponse.json(
          { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
          { status: 429 }
        );
      }
      if (!isPromoCodeFormatValid(normalizedPromo)) {
        return NextResponse.json(
          { error: 'Code promo invalide (format attendu : LAVEIYE-XXXX)' },
          { status: 400 }
        );
      }
      const promoEmail = (userEmail || '').toLowerCase().trim();
      const { data: regRow } = await supabaseAdmin
        .from('keynote_registrations')
        .select('id, email, promo_code, promo_redeemed_at, promo_status')
        .eq('promo_code', normalizedPromo)
        .eq('email', promoEmail)
        .maybeSingle();

      if (!regRow) {
        return NextResponse.json(
          { error: 'Code promo invalide ou email ne correspondant pas à celui qui a reçu le code.' },
          { status: 404 }
        );
      }
      const regStatus = (regRow as any).promo_status as string | null | undefined;
      if (regStatus === 'expired') {
        return NextResponse.json({ error: 'Ce code promo a expiré' }, { status: 410 });
      }
      if (regStatus === 'used' || (regRow as any).promo_redeemed_at) {
        return NextResponse.json({ error: 'Ce code a déjà été utilisé' }, { status: 409 });
      }

      const { data: pendingPayments } = await supabaseAdmin
        .from('payments')
        .select('id, status, created_at')
        .eq('promo_code', normalizedPromo)
        .in('status', ['pending', 'processing']);

      if (pendingPayments && pendingPayments.length > 0) {
        return NextResponse.json(
          { error: 'Ce code est en cours d\'utilisation par un autre paiement. Réessayez dans quelques minutes.' },
          { status: 409 }
        );
      }

      const planDurationDaysForPromo = isAnnual
        ? ANNUAL_SUBSCRIPTION_DURATION_DAYS
        : SUBSCRIPTION_DURATION_DAYS;
      const phases = computePromoPhases(planKey, planDurationDaysForPromo);

      promoApplied = {
        code: normalizedPromo,
        registrationId: (regRow as any).id,
        phases,
      };
    }

    const SUBSCRIPTION_PRICE = isAnnual ? planConfig.annualPrice : planConfig.price;
    const durationDays = promoApplied
      ? promoApplied.phases.firstDurationDays
      : (isAnnual ? ANNUAL_SUBSCRIPTION_DURATION_DAYS : SUBSCRIPTION_DURATION_DAYS);
    const billingLabel = isAnnual ? '1 an' : '1 mois';

    // Verifier si l'utilisateur existe
    let { data: existingUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, subscription_status, subscription_end_date, plan, pending_plan, pending_plan_starts_at')
      .eq('email', userEmail)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      console.error('[subscribe] user lookup error:', userError);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération du profil utilisateur.', details: userError.message },
        { status: 500 }
      );
    }

    if (!existingUser) {
      const { data: authListData } = await supabaseAdmin.auth.admin.listUsers() as any;
      const newAuthUser = authListData?.users?.find((u: any) => u.email === userEmail);

      if (!newAuthUser) {
        return NextResponse.json(
          { error: 'Utilisateur non trouve. Veuillez vous inscrire d\'abord.' },
          { status: 404 }
        );
      }

      const { data: newUser, error: createError } = await (supabaseAdmin as any)
        .from('users')
        .upsert({
          id: newAuthUser.id,
          email: newAuthUser.email!,
          name: newAuthUser.user_metadata?.name || newAuthUser.email!.split('@')[0],
          role: 'user',
          plan: 'Discovery',
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

    const now = new Date();
    const currentEndDate = (existingUser as any).subscription_end_date
      ? new Date((existingUser as any).subscription_end_date)
      : null;

    const isCurrentlyActive = (existingUser as any).subscription_status === 'active'
      && currentEndDate
      && currentEndDate > now;

    if (promoApplied && (existingUser as any).subscription_status === 'active') {
      const endDate = (existingUser as any).subscription_end_date
        ? new Date((existingUser as any).subscription_end_date)
        : null;
      if (endDate && endDate > new Date()) {
        return NextResponse.json(
          {
            error: "Le code promo n'est utilisable qu'à la souscription initiale. Votre abonnement actuel est encore actif jusqu'au " +
              endDate.toLocaleDateString('fr-FR') + '.',
          },
          { status: 409 }
        );
      }
    }

    let isDowngrade = false;
    let pendingStartsAt: Date | null = null;

    if (isCurrentlyActive) {
      const currentRank = planRank((existingUser as any).plan);
      const targetRank = planRank(planConfig.dbKey);
      if (targetRank < currentRank) {
        isDowngrade = true;
        pendingStartsAt = currentEndDate;

        if ((existingUser as any).pending_plan) {
          return NextResponse.json(
            {
              error: `Un changement de plan est déjà programmé (${(existingUser as any).pending_plan}) pour le ${new Date((existingUser as any).pending_plan_starts_at).toLocaleDateString('fr-FR')}. Annulez-le ou attendez son application avant d'en programmer un autre.`,
              pendingPlan: (existingUser as any).pending_plan,
              pendingStartsAt: (existingUser as any).pending_plan_starts_at,
            },
            { status: 409 }
          );
        }
      }
    }

    const baseDate = isDowngrade
      ? pendingStartsAt!
      : (isCurrentlyActive ? currentEndDate : now);
    const subscriptionEndDate = promoApplied
      ? addDays(baseDate!, durationDays)
      : computeSubscriptionEnd(baseDate!, { billing: isAnnual ? 'annual' : 'monthly' });

    const ref_command = generateRefCommand('SUB');
    const customerName = userName || (existingUser as any).name || userEmail.split('@')[0];

    const firstPhasePlanDbKey = promoApplied
      ? promoApplied.phases.firstPlan
      : planConfig.dbKey;

    const paymentInsert = {
      user_email: userEmail,
      amount: SUBSCRIPTION_PRICE,
      currency,
      status: 'pending',
      payment_method: 'chariow',
      ref_command,
      metadata: {
        type: 'subscription',
        plan: planKey,
        plan_label: planConfig.label,
        plan_db_key: planConfig.dbKey,
        billing: isAnnual ? 'annual' : 'monthly',
        renewal: isCurrentlyActive,
        is_downgrade: isDowngrade,
        pending_starts_at: isDowngrade ? pendingStartsAt!.toISOString() : null,
        duration_days: durationDays,
        subscription_end_date: subscriptionEndDate.toISOString(),
        previous_end_date: isCurrentlyActive ? currentEndDate!.toISOString() : null,
        item_name: promoApplied
          ? `Abonnement Laveiye ${planConfig.label} ${billingLabel} + bonus LAVEIYE`
          : (isCurrentlyActive
              ? `Renouvellement Laveiye ${planConfig.label} - ${billingLabel}`
              : `Abonnement Laveiye ${planConfig.label} - ${billingLabel}`),
        customer_name: customerName,
        userId: (existingUser as any).id,
        gateway: 'chariow',
        promo_code: promoApplied?.code || null,
        promo_registration_id: promoApplied?.registrationId || null,
        promo_bonus: promoApplied
          ? {
              label: KEYNOTE_PROMO_OFFER.label,
              kind: promoApplied.phases.kind,
              first_phase_plan: firstPhasePlanDbKey,
              first_phase_duration_days: promoApplied.phases.firstDurationDays,
              bonus_phase:
                promoApplied.phases.kind === 'merged'
                  ? null
                  : {
                      plan:
                        promoApplied.phases.kind === 'before'
                          ? promoApplied.phases.secondPlan
                          : promoApplied.phases.secondPlan,
                      duration_days:
                        promoApplied.phases.kind === 'before'
                          ? promoApplied.phases.secondDurationDays
                          : promoApplied.phases.secondDurationDays,
                      billing: isAnnual ? 'annual' : 'monthly',
                    },
            }
          : null,
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

    // Construire l'URL de checkout Chariow
    if (!CHARIOW_CONFIG.API_KEY || !CHARIOW_CONFIG.PRODUCT_ID) {
      await (supabaseAdmin as any)
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', (payment as any).id);
      return NextResponse.json(
        { error: 'Chariow non configuré (API_KEY/PRODUCT_ID manquants).' },
        { status: 500 }
      );
    }

    const baseUrl = resolveBaseUrl();
    let checkoutUrl: string;
    try {
      checkoutUrl = buildCheckoutUrl({
        refCommand: ref_command,
        email: userEmail,
        successUrl: `${baseUrl}/payment/success?ref_command=${encodeURIComponent(ref_command)}`,
        cancelUrl: `${baseUrl}/payment/failed?ref_command=${encodeURIComponent(ref_command)}`,
      });
    } catch (e: any) {
      await (supabaseAdmin as any)
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', (payment as any).id);
      console.error('[subscribe] buildCheckoutUrl error:', e);
      return NextResponse.json(
        { error: 'Impossible de construire l\'URL Chariow', details: e?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      payment_id: (payment as any).id,
      ref_command,
      checkoutUrl,
      amount: SUBSCRIPTION_PRICE,
      currency,
      plan: planKey,
      plan_label: planConfig.label,
      billing: isAnnual ? 'annual' : 'monthly',
      duration_days: durationDays,
      subscription_end_date: subscriptionEndDate.toISOString(),
      renewal: isCurrentlyActive,
      promo_code: promoApplied?.code || null,
      promo_bonus_label: promoApplied ? KEYNOTE_PROMO_OFFER.label : null,
    });

  } catch (error) {
    console.error('Subscription payment error:', error);
    const devMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Internal server error',
        ...(process.env.NODE_ENV !== 'production' ? { message: devMessage } : {}),
      },
      { status: 500 }
    );
  }
}
