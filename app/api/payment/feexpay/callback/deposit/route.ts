/**
 * Callback URL : POST /api/payment/feexpay/callback/deposit
 *
 * Reçoit les webhooks FeexPay pour les collectes (requesttopay).
 * Doc : https://docs.feexpay.me/?section=api-rest-integrations
 *
 * Règles :
 *   - Endpoint idempotent (FeexPay peut renvoyer plusieurs fois le même webhook)
 *   - Toujours retourner HTTP 200 OK
 *   - La forme du payload n'est pas garantie : on ne fait JAMAIS confiance au
 *     `status` du corps. On retrouve la transaction (par customId/ref_command
 *     ou par reference) puis on re-vérifie le statut réel via l'API FeexPay
 *     authentifiée avant tout effet de bord.
 *
 * URL à déclarer dans le Dashboard FeexPay :
 *   {PUBLIC_BASE_URL}/api/payment/feexpay/callback/deposit
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import {
  isAllowedFeexPayIP,
  checkDepositStatus,
  type FeexPayDepositCallback,
  type FeexPayStatusResponse,
} from '@/lib/feexpay'
import { computeSubscriptionEnd } from '@/lib/subscription'
import {
  notifyPaymentSuccess,
  notifyPromoCodeRedeemed,
} from '@/lib/notifications'

// FeexPay doit pouvoir accéder à cette route sans auth applicative. On désactive
// aussi le cache et on force un rendu dynamique.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    if (!isAllowedFeexPayIP(request)) {
      return new NextResponse('Unauthorized source', { status: 401 })
    }

    const payload = (await request.json().catch(() => ({}))) as FeexPayDepositCallback

    // FeexPay nous renvoie nos `callback_info`. On y a placé `ref_command`.
    const callbackInfo = (payload.callback_info || {}) as Record<string, unknown>
    const refCommand =
      (typeof callbackInfo.ref_command === 'string' && callbackInfo.ref_command) ||
      undefined
    const feexReference =
      (typeof payload.reference === 'string' && payload.reference) || undefined

    console.log('📥 FeexPay deposit callback:', {
      reference: feexReference,
      refCommand,
      status: payload.status,
      amount: payload.amount,
    })

    if (!refCommand && !feexReference) {
      console.error('❌ FeexPay callback sans reference ni ref_command', payload)
      return new NextResponse('OK', { status: 200 })
    }

    // 1. Récupérer le paiement. Clé primaire = notre ref_command (customId).
    // Fallback : la reference FeexPay stockée dans metadata.feexpay_reference.
    let payment: any = null
    if (refCommand) {
      const { data } = await (supabaseAdmin as any)
        .from('payments')
        .select('id, status, metadata, user_email, amount, currency, ref_command')
        .eq('ref_command', refCommand)
        .maybeSingle()
      payment = data
    }
    if (!payment && feexReference) {
      const { data } = await (supabaseAdmin as any)
        .from('payments')
        .select('id, status, metadata, user_email, amount, currency, ref_command')
        .eq('metadata->>feexpay_reference', feexReference)
        .maybeSingle()
      payment = data
    }

    if (!payment) {
      console.warn(
        `⚠️ Aucun paiement trouvé (ref_command=${refCommand}, reference=${feexReference}) — webhook orphelin`
      )
      await storeOrphanCallback(payload)
      return new NextResponse('OK', { status: 200 })
    }

    // Idempotence : si déjà final, on ignore.
    const finalStatuses = ['completed', 'failed', 'refunded', 'canceled', 'rejected']
    if (finalStatuses.includes(payment.status)) {
      console.log(
        `ℹ️ Paiement ${payment.ref_command} déjà en statut final (${payment.status}), webhook ignoré`
      )
      return new NextResponse('OK', { status: 200 })
    }

    // 2. SÉCURITÉ : re-vérification du statut réel via l'API FeexPay
    // authentifiée. On polle par la `reference` FeexPay (jamais par le statut
    // du corps). La reference est soit dans le payload, soit stockée chez nous.
    const reference =
      feexReference ||
      ((payment.metadata || {}).feexpay_reference as string | undefined)

    if (!reference) {
      console.warn(
        `⚠️ Pas de reference FeexPay pour ${payment.ref_command} — vérification impossible`
      )
      return new NextResponse('OK', { status: 200 })
    }

    let verified: FeexPayStatusResponse
    try {
      verified = await checkDepositStatus(reference)
    } catch (e) {
      // Échec de vérification (réseau / token) : on n'active rien sur la foi du
      // body. Le polling /api/payment/check prendra le relais côté client.
      console.error('❌ Vérification FeexPay impossible, webhook non appliqué:', e)
      return new NextResponse('OK', { status: 200 })
    }

    // 3. Mapping statut réel (vérifié) → statut interne.
    const internalStatus = mapFeexPayStatus(verified.status)

    const { error: updateError } = await (supabaseAdmin as any)
      .from('payments')
      .update({
        status: internalStatus,
        final_amount: verified.amount ? Number(verified.amount) : undefined,
        completed_at:
          internalStatus === 'completed' ? new Date().toISOString() : undefined,
        ipn_data: verified as any,
      })
      .eq('id', payment.id)

    if (updateError) {
      console.error('❌ Supabase update payment error:', updateError)
      return new NextResponse('OK', { status: 200 })
    }

    // 4. Side-effects métier lorsque le paiement est réellement complété.
    if (verified.status === 'SUCCESSFUL') {
      const metadata = (payment.metadata || {}) as any
      if (metadata.type === 'brand_request') {
        await activateBrandRequest(payment)
      } else {
        await activateUserSubscription(payment)
      }
    }

    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('❌ FeexPay deposit callback error:', error)
    return new NextResponse('OK', { status: 200 })
  }
}

// FeexPay peut tester l'URL depuis le dashboard.
export async function GET() {
  return NextResponse.json({ ok: true, kind: 'deposit' })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapFeexPayStatus(status: FeexPayStatusResponse['status']): string {
  switch (status) {
    case 'SUCCESSFUL':
      return 'completed'
    case 'FAILED':
      return 'failed'
    case 'PENDING':
    default:
      return 'pending'
  }
}

async function storeOrphanCallback(payload: unknown) {
  try {
    await (supabaseAdmin as any).from('pawapay_orphan_callbacks').insert({
      kind: 'deposit',
      payload: payload as any,
    })
  } catch (e) {
    // La table n'existe peut-être pas — on log seulement.
    console.error('Could not persist orphan callback', e)
  }
}

async function activateUserSubscription(payment: {
  id: string
  amount?: number | null
  metadata?: any
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
        '[feexpay/deposit] Plan invalide ou manquant dans metadata, activation annulée',
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

      console.log('[feexpay/deposit] Activation abonnement + bonus LAVEIYE', {
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
      console.log('[feexpay/deposit] Downgrade programmé', {
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

    console.log('[feexpay/deposit] Activation abonnement', {
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

    console.log('✅ Subscription activated (feexpay) for user:', metadata.userId, '— plan:', planName)

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
    console.error('Error activating subscription from feexpay callback:', e)
  }
}

/**
 * Active une demande de suivi de marque payée :
 *  - status → completed (auto-approbation sur paiement OK)
 *  - paid_at = now
 *  - payment_reference = ref_command
 *  - payment_method = "feexpay/<provider>"
 *  - next_renewal_at = paid_at + 1 mois (si non déjà défini)
 *  - envoie les emails "payment_confirmed" puis "completed"
 */
async function activateBrandRequest(payment: {
  id: string
  metadata?: any
  ref_command?: string
}) {
  try {
    const metadata = payment.metadata || {}
    const brandRequestId: string | undefined = metadata.brand_request_id
    if (!brandRequestId) {
      console.warn('[feexpay/deposit] brand_request payment sans brand_request_id', metadata)
      return
    }

    const { data: req } = await (supabaseAdmin as any)
      .from('brand_requests')
      .select('id, status, paid_at, next_renewal_at, devis_amount')
      .eq('id', brandRequestId)
      .maybeSingle()

    if (!req) {
      console.warn('[feexpay/deposit] brand_request introuvable', brandRequestId)
      return
    }

    // Idempotence : déjà payée
    if (req.paid_at && (req.status === 'in_production' || req.status === 'completed')) {
      console.log('[feexpay/deposit] brand_request déjà active, webhook ignoré', brandRequestId)
      return
    }

    const now = new Date()
    const nextRenewal =
      req.next_renewal_at || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const provider = (metadata.provider as string) || 'feexpay'
    const depositId = (payment as any).ref_command

    const { error: updateError } = await (supabaseAdmin as any)
      .from('brand_requests')
      .update({
        status: 'completed',
        paid_at: now.toISOString(),
        payment_reference: depositId,
        payment_method: `feexpay/${provider}`,
        next_renewal_at: nextRenewal,
        auto_renew: true,
        updated_at: now.toISOString(),
      })
      .eq('id', brandRequestId)

    if (updateError) {
      console.error('[feexpay/deposit] update brand_request failed', updateError)
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
        await Promise.allSettled([
          sendBrandRequestEmail('payment_confirmed', full),
          sendBrandRequestEmail('completed', full),
          createBrandRequestNotification('payment_confirmed', full),
          createBrandRequestNotification('completed', full),
        ])
      }
    } catch (e) {
      console.error('[feexpay/deposit] notif/email brand_request failed', e)
    }

    console.log('✅ brand_request activée (feexpay):', brandRequestId)
  } catch (e) {
    console.error('Error activating brand_request from feexpay callback:', e)
  }
}
