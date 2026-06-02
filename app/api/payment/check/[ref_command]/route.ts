/**
 * API Route: POST /api/payment/check/[ref_command]
 *
 * Verifie le statut d'un paiement directement aupres de FeexPay
 * et met a jour la base de donnees si le paiement est complete.
 * Fallback si le webhook n'a pas ete recu.
 *
 * `ref_command` = notre UUID interne (customId). La `reference` FeexPay
 * (clé de polling) est stockée dans `payments.metadata.feexpay_reference`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkDepositStatus } from '@/lib/feexpay';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { computeSubscriptionEnd } from '@/lib/subscription';

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY required for payment check');
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

/** Mappe un statut FeexPay vers notre statut interne. */
function mapFeexPayStatus(status: string): string {
  switch (status) {
    case 'SUCCESSFUL':
      return 'completed';
    case 'FAILED':
      return 'failed';
    case 'PENDING':
    default:
      return 'pending';
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ref_command: string }> }
) {
  try {
    const { ref_command } = await params;

    // Anti-polling abusif : 30 checks / minute par (IP, ref). Une page
    // de pending poll toutes les ~3s, soit ~20/min ; au-delà = bot.
    const ip = getClientIp(request);
    const rl = rateLimit(`payment-check:${ip}:${ref_command}`, 30, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Trop de vérifications. Patientez.' },
        { status: 429 }
      );
    }

    const supabase = getSupabase() as any;

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

    // 2. Verifier aupres de FeexPay via la reference stockée à l'init.
    const feexReference = paymentData.metadata?.feexpay_reference as string | undefined;
    if (!feexReference) {
      return NextResponse.json({
        success: false,
        message: 'Reference FeexPay non encore enregistrée',
        payment: {
          ref_command: paymentData.ref_command,
          status: paymentData.status,
        },
      });
    }

    const deposit = await checkDepositStatus(feexReference);
    const mappedStatus = mapFeexPayStatus(deposit.status);

    console.log('FeexPay check result:', {
      reference: feexReference,
      status: deposit.status,
      mapped: mappedStatus,
    });

    // 3. Si SUCCESSFUL : activer l'utilisateur / finaliser la commande
    if (mappedStatus === 'completed') {
      const updateData: Record<string, unknown> = {
        status: 'completed',
        payment_method: 'feexpay',
        completed_at: new Date().toISOString(),
        final_amount: deposit.amount ? Number(deposit.amount) : paymentData.amount,
        currency: paymentData.currency,
      };

      await supabase
        .from('payments')
        .update(updateData)
        .eq('id', paymentData.id);

      // Abonnement : activer l'utilisateur
      if (paymentData.metadata?.type === 'subscription' && paymentData.metadata?.userId) {
        const subscriptionEndDate = paymentData.metadata.subscription_end_date
          ? new Date(paymentData.metadata.subscription_end_date)
          : computeSubscriptionEnd(new Date(), { billing: paymentData.metadata.billing });

        // Plan strict — pas de fallback silencieux vers Pro.
        // Le plan doit etre present dans metadata (genere par /api/payment/subscribe).
        const rawPlan = String(paymentData.metadata.plan || '').toLowerCase().trim();
        let planName: 'Discovery' | 'Basic' | 'Pro' | null = null;
        if (rawPlan === 'basic') planName = 'Basic';
        else if (rawPlan === 'pro') planName = 'Pro';
        else if (rawPlan === 'discovery' || rawPlan === 'free') planName = 'Discovery';

        if (!planName) {
          console.error(
            '[feexpay/check] Plan invalide ou manquant dans metadata, activation annulee',
            { paymentId: paymentData.id, rawPlan, metadata: paymentData.metadata }
          );
        } else if (paymentData.metadata.promo_bonus) {
          // Bonus LAVEIYE : aligne sur callback /feexpay/deposit. Trois cas
          // (merged / before / after) — cf. lib/promo-codes.ts.
          const bonus = paymentData.metadata.promo_bonus as {
            kind: 'merged' | 'before' | 'after';
            first_phase_plan: 'Basic' | 'Pro';
            first_phase_duration_days: number;
            bonus_phase?: { plan: string; duration_days: number; billing?: string } | null;
          };
          const now = new Date();
          const firstEnd = new Date(
            now.getTime() + bonus.first_phase_duration_days * 24 * 60 * 60 * 1000
          ).toISOString();
          const update: any = {
            plan: bonus.first_phase_plan,
            subscription_status: 'active',
            subscription_start_date: now.toISOString(),
            subscription_end_date: firstEnd,
            updated_at: now.toISOString(),
          };
          if (bonus.kind !== 'merged' && bonus.bonus_phase) {
            update.pending_plan = bonus.bonus_phase.plan;
            update.pending_plan_starts_at = firstEnd;
            update.pending_duration_days = bonus.bonus_phase.duration_days;
            update.pending_billing = bonus.bonus_phase.billing || null;
          } else {
            update.pending_plan = null;
            update.pending_plan_starts_at = null;
            update.pending_duration_days = null;
            update.pending_billing = null;
          }
          await supabase.from('users').update(update).eq('id', paymentData.metadata.userId);

          if (paymentData.metadata.promo_code) {
            await supabase
              .from('keynote_registrations')
              .update({
                promo_redeemed_at: new Date().toISOString(),
                promo_status: 'used',
                promo_redeemed_by_user_id: paymentData.metadata.userId,
                promo_redeemed_plan: bonus.first_phase_plan,
                promo_redeemed_amount:
                  typeof paymentData.amount === 'number' ? paymentData.amount : null,
              } as any)
              .eq('promo_code', paymentData.metadata.promo_code)
              .is('promo_redeemed_at', null);
          }
          console.log(
            '[feexpay/check] Subscription + bonus LAVEIYE activated for user:',
            paymentData.metadata.userId,
            '\u2014 first phase:',
            bonus.first_phase_plan
          );
        } else if (
          paymentData.metadata.is_downgrade === true &&
          paymentData.metadata.pending_starts_at
        ) {
          // Downgrade différé : écrire pending_* au lieu d'écraser plan courant.
          // Doit rester aligné avec la même branche dans le callback FeexPay
          // (app/api/payment/feexpay/callback/deposit/route.ts).
          await supabase
            .from('users')
            .update({
              pending_plan: planName,
              pending_plan_starts_at: paymentData.metadata.pending_starts_at,
              pending_billing: paymentData.metadata.billing || null,
              // null → le cron applique une période calendaire selon le billing
              // (un downgrade standard n'a pas de durée promo explicite).
              pending_duration_days: null,
              updated_at: new Date().toISOString(),
            } as any)
            .eq('id', paymentData.metadata.userId);

          if (paymentData.metadata.promo_code) {
            await supabase
              .from('keynote_registrations')
              .update({
                promo_redeemed_at: new Date().toISOString(),
                promo_status: 'used',
                promo_redeemed_by_user_id: paymentData.metadata.userId,
                promo_redeemed_plan: planName,
                promo_redeemed_amount:
                  typeof paymentData.amount === 'number' ? paymentData.amount : null,
              } as any)
              .eq('promo_code', paymentData.metadata.promo_code)
              .is('promo_redeemed_at', null);
          }

          console.log(
            '[feexpay/check] Downgrade différé enregistré pour user:',
            paymentData.metadata.userId,
            '— pending:', planName
          );
        } else {
          await supabase
            .from('users')
            .update({
              plan: planName,
              subscription_status: 'active',
              subscription_start_date: new Date().toISOString(),
              subscription_end_date: subscriptionEndDate.toISOString(),
              updated_at: new Date().toISOString(),
            } as any)
            .eq('id', paymentData.metadata.userId);

          console.log('User subscription activated:', paymentData.metadata.userId, '— plan:', planName);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Payment verified and activated',
        payment: {
          ref_command: paymentData.ref_command,
          status: 'completed',
          amount: deposit.amount,
          currency: paymentData.currency,
        },
      });
    }

    // 4. Si FAILED : mettre a jour la base
    if (mappedStatus === 'failed') {
      await supabase
        .from('payments')
        .update({ status: 'failed' } as any)
        .eq('id', paymentData.id);

      return NextResponse.json({
        success: false,
        message: 'Payment failed',
        payment: {
          ref_command: paymentData.ref_command,
          status: mappedStatus,
          feexpay_status: deposit.status,
        },
      });
    }

    // 5. Paiement en cours : informations de suivi
    return NextResponse.json({
      success: false,
      message: 'Payment not yet completed',
      payment: {
        ref_command: paymentData.ref_command,
        status: paymentData.status,
        feexpay_status: deposit.status,
      },
    });

  } catch (error) {
    console.error('Check payment error:', error);
    const devDetails = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        ...(process.env.NODE_ENV !== 'production' ? { details: devDetails } : {}),
      },
      { status: 500 }
    );
  }
}
