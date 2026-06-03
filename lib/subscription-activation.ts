/**
 * Activation post-paiement — abonnements & demandes de marque.
 *
 * Logique extraite du callback FeexPay (cf. anciens
 * `app/api/payment/feexpay/callback/deposit/route.ts`). Réutilisée à la fois
 * par le webhook Chariow et le fallback de polling `/api/payment/check`.
 *
 * Préserve intégralement la logique promo LAVEIYE :
 *   - phases merged / before / after (cf. lib/promo-codes.ts → computePromoPhases)
 *   - pending_plan / pending_plan_starts_at / pending_billing
 *   - keynote_registrations.promo_redeemed_at / promo_status='used'
 *   - notifyPaymentSuccess + notifyPromoCodeRedeemed
 */

import { supabaseAdmin } from '@/lib/supabase'
import { computeSubscriptionEnd } from '@/lib/subscription'
import {
  notifyPaymentSuccess,
  notifyPromoCodeRedeemed,
} from '@/lib/notifications'

export interface PaymentLike {
  id: string
  amount?: number | null
  currency?: string | null
  ref_command?: string | null
  metadata?: any
}

/**
 * Active l'abonnement d'un utilisateur après un paiement complété.
 * Idempotent côté DB (les `update` ne touchent pas d'index unique).
 */
export async function activateUserSubscription(payment: PaymentLike): Promise<void> {
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
        '[activation] Plan invalide ou manquant dans metadata, activation annulée',
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

      console.log('[activation] Activation abonnement + bonus LAVEIYE', {
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
        '[activation] Subscription activated with LAVEIYE bonus for user:',
        metadata.userId,
        '— first phase:',
        firstPlan
      )

      const refId = payment.ref_command || payment.id
      void notifyPaymentSuccess({
        userId: metadata.userId,
        plan: firstPlan,
        amount: typeof payment.amount === 'number' ? payment.amount : 0,
        currency: payment.currency || 'XOF',
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
      console.log('[activation] Downgrade programmé', {
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

      console.log(
        '[activation] Downgrade différé enregistré pour user:',
        metadata.userId,
        '— pending:',
        planName
      )
      return
    }

    console.log('[activation] Activation abonnement', {
      userId: metadata.userId,
      plan: planName,
      end,
    })

    const licenseKey = metadata.chariow_license_key || null

    await (supabaseAdmin as any)
      .from('users')
      .update({
        plan: planName,
        subscription_status: 'active',
        subscription_start_date: new Date().toISOString(),
        subscription_end_date: end,
        // Clé de licence Chariow/Moneroo (si fournie au paiement).
        ...(licenseKey ? { license_key: licenseKey } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', metadata.userId)

    console.log(
      '[activation] Subscription activated for user:',
      metadata.userId,
      '— plan:',
      planName
    )

    const refId = payment.ref_command || payment.id
    void notifyPaymentSuccess({
      userId: metadata.userId,
      plan: planName,
      amount: typeof payment.amount === 'number' ? payment.amount : 0,
      currency: payment.currency || 'XOF',
      reference: String(refId),
      billingPeriod: metadata.billing,
    })
  } catch (e) {
    console.error('[activation] Error activating subscription:', e)
  }
}

/**
 * Active une demande de suivi de marque payée :
 *  - status → completed (auto-approbation sur paiement OK)
 *  - paid_at = now
 *  - payment_reference = ref_command
 *  - payment_method = "chariow"
 *  - next_renewal_at = paid_at + 1 mois (si non déjà défini)
 *  - envoie les emails "payment_confirmed" puis "completed"
 */
export async function activateBrandRequest(payment: PaymentLike): Promise<void> {
  try {
    const metadata = payment.metadata || {}
    const brandRequestId: string | undefined = metadata.brand_request_id
    if (!brandRequestId) {
      console.warn('[activation] brand_request payment sans brand_request_id', metadata)
      return
    }

    const { data: req } = await (supabaseAdmin as any)
      .from('brand_requests')
      .select('id, status, paid_at, next_renewal_at, devis_amount')
      .eq('id', brandRequestId)
      .maybeSingle()

    if (!req) {
      console.warn('[activation] brand_request introuvable', brandRequestId)
      return
    }

    // Idempotence : déjà payée
    if (req.paid_at && (req.status === 'in_production' || req.status === 'completed')) {
      console.log('[activation] brand_request déjà active, payment ignoré', brandRequestId)
      return
    }

    const now = new Date()
    const nextRenewal =
      req.next_renewal_at || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const depositId = payment.ref_command

    const { error: updateError } = await (supabaseAdmin as any)
      .from('brand_requests')
      .update({
        status: 'completed',
        paid_at: now.toISOString(),
        payment_reference: depositId,
        payment_method: 'chariow',
        next_renewal_at: nextRenewal,
        auto_renew: true,
        updated_at: now.toISOString(),
      })
      .eq('id', brandRequestId)

    if (updateError) {
      console.error('[activation] update brand_request failed', updateError)
      return
    }

    try {
      const { sendBrandRequestEmail, createBrandRequestNotification } = await import(
        '@/lib/brand-request-emails'
      )
      const { data: full } = await (supabaseAdmin as any)
        .from('brand_requests')
        .select('*')
        .eq('id', brandRequestId)
        .maybeSingle()
      if (full) {
        const userId: string | undefined = (full as any).user_id
        const brandName: string = (full as any).brand_name
        const ctx = {
          devisAmount: (full as any).devis_amount ?? null,
          devisCurrency: (full as any).devis_currency ?? null,
          devisUrl: (full as any).devis_url ?? null,
          nextRenewalAt: (full as any).next_renewal_at ?? null,
          paymentReference: (full as any).payment_reference ?? null,
        }
        if (userId) {
          await Promise.allSettled([
            sendBrandRequestEmail({ userId, kind: 'payment_confirmed', brandName, context: ctx }),
            sendBrandRequestEmail({ userId, kind: 'completed', brandName, context: ctx }),
            createBrandRequestNotification({
              userId,
              brandRequestId,
              brandName,
              kind: 'payment_confirmed',
            }),
            createBrandRequestNotification({
              userId,
              brandRequestId,
              brandName,
              kind: 'completed',
            }),
          ])
        }
      }
    } catch (e) {
      console.error('[activation] notif/email brand_request failed', e)
    }

    console.log('[activation] brand_request activée (chariow):', brandRequestId)
  } catch (e) {
    console.error('[activation] Error activating brand_request:', e)
  }
}
