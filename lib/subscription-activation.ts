/**
 * Activation d'abonnement après paiement confirmé.
 *
 * Logique partagée entre les webhooks paiement (Chariow Pulse pour les
 * abonnements, callback FeexPay conservé pour compatibilité). Gère :
 *   - les phases du bonus promo LAVEIYE (merged / before / after)
 *   - le downgrade différé (pending_plan appliqué à expiration par le cron)
 *   - les notifications (paiement réussi, code promo consommé)
 *
 * Le paiement passé en entrée doit contenir `metadata.type === 'subscription'`.
 */

import { supabaseAdmin } from '@/lib/supabase'
import { computeSubscriptionEnd } from '@/lib/subscription'
import { notifyPaymentSuccess, notifyPromoCodeRedeemed } from '@/lib/notifications'

export async function activateUserSubscription(payment: {
  id: string
  amount?: number | null
  metadata?: any
  ref_command?: string
  currency?: string | null
}) {
  try {
    const metadata = payment.metadata || {}
    if (metadata.type !== 'subscription' || !metadata.userId) return

    // Plan strict — pas de fallback silencieux vers Pro.
    const rawPlan = String(metadata.plan || '').toLowerCase().trim()
    let planName: 'Discovery' | 'Basic' | 'Pro'
    if (rawPlan === 'basic') {
      planName = 'Basic'
    } else if (rawPlan === 'pro') {
      planName = 'Pro'
    } else if (rawPlan === 'discovery' || rawPlan === 'free') {
      planName = 'Discovery'
    } else {
      console.error(
        '[subscription-activation] Plan invalide ou manquant dans metadata, activation annulée',
        { paymentId: payment.id, rawPlan, metadata }
      )
      return
    }

    // ——————————————————————————————————————————————————————————————
    // Bonus LAVEIYE : déroule les phases d'abonnement calculées au moment
    // du paiement (merged / before / after). Cf. lib/promo-codes.ts.
    // ——————————————————————————————————————————————————————————————
    const bonus = metadata.promo_bonus as
      | {
          label?: string
          kind: 'merged' | 'before' | 'after'
          first_phase_plan: 'Basic' | 'Pro'
          first_phase_duration_days: number
          bonus_phase?: {
            plan: 'Discovery' | 'Basic' | 'Pro'
            duration_days: number
            billing?: string
          } | null
        }
      | null
      | undefined

    if (bonus && (bonus.kind === 'merged' || bonus.kind === 'before' || bonus.kind === 'after')) {
      const now = new Date()
      const firstPlan = bonus.first_phase_plan
      const firstDays = bonus.first_phase_duration_days
      const firstEnd = new Date(now.getTime() + firstDays * 24 * 60 * 60 * 1000).toISOString()

      const update: any = {
        plan: firstPlan,
        subscription_status: 'active',
        subscription_start_date: now.toISOString(),
        subscription_end_date: firstEnd,
        updated_at: now.toISOString(),
      }

      if (bonus.kind !== 'merged' && bonus.bonus_phase) {
        update.pending_plan = bonus.bonus_phase.plan
        update.pending_plan_starts_at = firstEnd
        update.pending_duration_days = bonus.bonus_phase.duration_days
        update.pending_billing = bonus.bonus_phase.billing || null
      } else {
        update.pending_plan = null
        update.pending_plan_starts_at = null
        update.pending_duration_days = null
        update.pending_billing = null
      }

      console.log('[subscription-activation] Activation abonnement + bonus LAVEIYE', {
        userId: metadata.userId,
        kind: bonus.kind,
        firstPlan,
        firstEnd,
        pending: update.pending_plan,
      })

      await (supabaseAdmin as any).from('users').update(update).eq('id', metadata.userId)

      if (metadata.promo_code) {
        await (supabaseAdmin as any)
          .from('keynote_registrations')
          .update({
            promo_redeemed_at: new Date().toISOString(),
            promo_status: 'used',
            promo_redeemed_by_user_id: metadata.userId,
            promo_redeemed_plan: firstPlan,
            promo_redeemed_amount: typeof payment.amount === 'number' ? payment.amount : null,
          })
          .eq('promo_code', metadata.promo_code)
          .is('promo_redeemed_at', null)
      }

      console.log(
        '✅ Subscription activated with LAVEIYE bonus for user:',
        metadata.userId,
        '— first phase:',
        firstPlan
      )

      const refId = (payment as any).ref_command || payment.id
      void notifyPaymentSuccess({
        userId: metadata.userId,
        plan: firstPlan,
        amount: typeof payment.amount === 'number' ? payment.amount : 0,
        currency: (payment as any).currency || 'XOF',
        reference: String(refId),
        billingPeriod: metadata.billing,
      })
      if (metadata.promo_code) {
        void notifyPromoCodeRedeemed({
          userId: metadata.userId,
          promoCode: String(metadata.promo_code),
          plan: firstPlan,
          bonusLabel: bonus.label,
        })
      }
      return
    }

    // ——————————————————————————————————————————————————————————————
    // Cas sans promo : comportement historique.
    // ——————————————————————————————————————————————————————————————
    const end =
      metadata.subscription_end_date ||
      computeSubscriptionEnd(new Date(), { billing: metadata.billing }).toISOString()

    // Downgrade différé : on stocke en `pending_plan` au lieu d'écraser le plan
    // courant. Le cron `apply-pending-plans` basculera à expiration.
    if (metadata.is_downgrade === true && metadata.pending_starts_at) {
      console.log('[subscription-activation] Downgrade programmé', {
        userId: metadata.userId,
        pendingPlan: planName,
        startsAt: metadata.pending_starts_at,
        durationDays: metadata.duration_days,
      })

      await (supabaseAdmin as any)
        .from('users')
        .update({
          pending_plan: planName,
          pending_plan_starts_at: metadata.pending_starts_at,
          pending_billing: metadata.billing || null,
          pending_duration_days: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', metadata.userId)

      console.log('✅ Downgrade différé enregistré pour user:', metadata.userId, '— pending:', planName)
      return
    }

    console.log('[subscription-activation] Activation abonnement', {
      userId: metadata.userId,
      plan: planName,
      end,
    })

    await (supabaseAdmin as any)
      .from('users')
      .update({
        plan: planName,
        subscription_status: 'active',
        subscription_start_date: new Date().toISOString(),
        subscription_end_date: end,
        updated_at: new Date().toISOString(),
      })
      .eq('id', metadata.userId)

    console.log('✅ Subscription activated for user:', metadata.userId, '— plan:', planName)

    const refId = (payment as any).ref_command || payment.id
    void notifyPaymentSuccess({
      userId: metadata.userId,
      plan: planName,
      amount: typeof payment.amount === 'number' ? payment.amount : 0,
      currency: (payment as any).currency || 'XOF',
      reference: String(refId),
      billingPeriod: metadata.billing,
    })
  } catch (e) {
    console.error('Error activating subscription:', e)
  }
}
