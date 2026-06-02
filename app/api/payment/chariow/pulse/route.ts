/**
 * Webhook (Pulse) Chariow : POST /api/payment/chariow/pulse
 *
 * Reçoit les Pulses Chariow pour les ventes d'abonnement.
 * Doc : https://chariow.dev/en/guides/pulses
 *
 * Règles :
 *   - Endpoint idempotent (Chariow réessaie : 1 min, 5 min, 30 min, 2 h, 24 h)
 *   - Toujours retourner HTTP 2xx
 *   - On ne fait JAMAIS confiance au statut du corps : on retrouve la vente par
 *     `custom_metadata.ref_command`, puis on re-vérifie le statut réel via
 *     GET /sales/{id} (API authentifiée) avant tout effet de bord.
 *
 * URL à déclarer dans Chariow (Automation → Pulses), événement `successful.sale` :
 *   {PUBLIC_BASE_URL}/api/payment/chariow/pulse
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSale } from '@/lib/chariow'
import { activateUserSubscription } from '@/lib/subscription-activation'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Extrait une valeur string profonde d'un objet (tolérant aux formes variées). */
function readString(obj: any, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const val = obj?.[key]
    if (typeof val === 'string' && val) return val
  }
  return undefined
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json().catch(() => ({}))) as any

    // L'événement et la vente peuvent être au premier niveau ou imbriqués
    // (payload.event / payload.data.sale). On reste tolérant.
    const event = readString(payload, 'event', 'type') || ''
    const sale = payload?.sale || payload?.data?.sale || payload?.data || payload

    const saleId = readString(sale, 'id') || readString(payload, 'id')
    const customMetadata =
      (sale?.custom_metadata as Record<string, unknown>) ||
      (payload?.custom_metadata as Record<string, unknown>) ||
      {}
    const refCommand =
      typeof customMetadata.ref_command === 'string' ? customMetadata.ref_command : undefined

    console.log('📥 Chariow pulse:', { event, saleId, refCommand })

    // On ne traite que les ventes réussies. Les autres événements sont acquittés.
    if (event && !/successful\.sale/i.test(event)) {
      return new NextResponse('OK', { status: 200 })
    }

    if (!refCommand && !saleId) {
      console.error('❌ Chariow pulse sans ref_command ni saleId', payload)
      return new NextResponse('OK', { status: 200 })
    }

    // 1. Retrouver le paiement. Clé primaire = notre ref_command (custom_metadata).
    let payment: any = null
    if (refCommand) {
      const { data } = await (supabaseAdmin as any)
        .from('payments')
        .select('id, status, metadata, user_email, amount, currency, ref_command, chariow_sale_id')
        .eq('ref_command', refCommand)
        .maybeSingle()
      payment = data
    }
    // Fallback : la saleId stockée dans la colonne chariow_sale_id à l'init.
    if (!payment && saleId) {
      const { data } = await (supabaseAdmin as any)
        .from('payments')
        .select('id, status, metadata, user_email, amount, currency, ref_command, chariow_sale_id')
        .eq('chariow_sale_id', saleId)
        .maybeSingle()
      payment = data
    }

    if (!payment) {
      console.warn(
        `⚠️ Aucun paiement trouvé (ref_command=${refCommand}, saleId=${saleId}) — pulse orphelin`
      )
      return new NextResponse('OK', { status: 200 })
    }

    // Idempotence : si déjà final, on ignore.
    const finalStatuses = ['completed', 'failed', 'refunded', 'canceled', 'rejected']
    if (finalStatuses.includes(payment.status)) {
      console.log(
        `ℹ️ Paiement ${payment.ref_command} déjà en statut final (${payment.status}), pulse ignoré`
      )
      return new NextResponse('OK', { status: 200 })
    }

    // 2. SÉCURITÉ : re-vérification du statut réel via l'API Chariow.
    const verifyId = saleId || payment.chariow_sale_id
    if (!verifyId) {
      console.warn(
        `⚠️ Pas de saleId pour ${payment.ref_command} — re-vérification impossible`
      )
      return new NextResponse('OK', { status: 200 })
    }

    let verified
    try {
      verified = await getSale(verifyId)
    } catch (e) {
      console.error('❌ Re-vérification Chariow impossible, pulse non appliqué:', e)
      return new NextResponse('OK', { status: 200 })
    }

    // 3. Mapping statut réel (vérifié) → statut interne.
    const internalStatus = verified.status === 'completed' ? 'completed' : 'pending'

    const { error: updateError } = await (supabaseAdmin as any)
      .from('payments')
      .update({
        status: internalStatus,
        completed_at:
          internalStatus === 'completed' ? new Date().toISOString() : undefined,
        ipn_data: verified as any,
        chariow_sale_id: verifyId,
      })
      .eq('id', payment.id)

    if (updateError) {
      console.error('❌ Supabase update payment error:', updateError)
      return new NextResponse('OK', { status: 200 })
    }

    // 4. Side-effect métier : activation de l'abonnement (vérifié = completed).
    if (verified.status === 'completed') {
      await activateUserSubscription(payment)
    }

    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('❌ Chariow pulse error:', error)
    return new NextResponse('OK', { status: 200 })
  }
}

// Chariow peut tester l'URL depuis le dashboard.
export async function GET() {
  return NextResponse.json({ ok: true, kind: 'chariow-pulse' })
}
