/**
 * Webhook Chariow (Pulses).
 *
 * URL à déclarer dans le dashboard Chariow :
 *   {PUBLIC_BASE_URL}/api/webhook/chariow
 *
 * Règles :
 *   - Idempotent (Chariow peut renvoyer le même évènement)
 *   - Toujours 200 OK
 *   - Re-vérifier le statut via getSale() avant tout effet de bord
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyWebhookSignature, getSale, validateLicense } from '@/lib/chariow';
import {
  activateUserSubscription,
  activateBrandRequest,
} from '@/lib/subscription-activation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-chariow-signature');

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.warn('[chariow/webhook] Signature invalide');
      return new NextResponse('Invalid signature', { status: 401 });
    }

    let payload: any = {};
    try {
      payload = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      console.error('[chariow/webhook] Body non-JSON');
      return new NextResponse('OK', { status: 200 });
    }

    console.log('📥 Chariow webhook:', {
      event: payload.event || payload.type,
      sale_id: payload.sale_id || payload.id,
      license_key: payload.license_key,
      ref_command: payload?.metadata?.ref_command,
    });

    // Extraction tolérante — adapter selon payload réel
    const refCommand: string | undefined =
      payload?.metadata?.ref_command ||
      payload?.ref_command ||
      payload?.callback_info?.ref_command;
    const saleId: string | undefined = payload.sale_id || payload.id;
    const licenseKey: string | undefined = payload.license_key;

    if (!refCommand && !saleId) {
      console.warn('[chariow/webhook] Pas de ref_command/sale_id', payload);
      return new NextResponse('OK', { status: 200 });
    }

    // 1. Retrouver le paiement
    let payment: any = null;
    if (refCommand) {
      const { data } = await (supabaseAdmin as any)
        .from('payments')
        .select('id, status, metadata, user_email, amount, currency, ref_command, provider_transaction_id')
        .eq('ref_command', refCommand)
        .maybeSingle();
      payment = data;
    }
    if (!payment && saleId) {
      const { data } = await (supabaseAdmin as any)
        .from('payments')
        .select('id, status, metadata, user_email, amount, currency, ref_command, provider_transaction_id')
        .eq('metadata->>chariow_sale_id', saleId)
        .maybeSingle();
      payment = data;
    }

    if (!payment) {
      console.warn(
        `[chariow/webhook] Paiement introuvable (ref=${refCommand}, sale=${saleId}) — orphelin`
      );
      return new NextResponse('OK', { status: 200 });
    }

    // Idempotence
    const finalStatuses = ['completed', 'failed', 'refunded', 'canceled', 'rejected'];
    if (finalStatuses.includes(payment.status)) {
      return new NextResponse('OK', { status: 200 });
    }

    // 2. Re-vérification côté API Chariow (jamais confiance au body seul)
    let verifiedStatus: 'completed' | 'failed' | 'pending' = 'pending';
    let verifiedData: any = null;
    if (saleId) {
      try {
        verifiedData = await getSale(saleId);
        const s = String(verifiedData?.status || '').toLowerCase();
        verifiedStatus =
          s === 'paid' || s === 'completed' || s === 'successful'
            ? 'completed'
            : s === 'failed' || s === 'canceled'
            ? 'failed'
            : 'pending';
      } catch (e) {
        console.error('[chariow/webhook] getSale échec, paiement non appliqué:', e);
        return new NextResponse('OK', { status: 200 });
      }
    } else if (licenseKey) {
      // Pas de saleId → valider la licence
      try {
        const v = await validateLicense(licenseKey);
        verifiedStatus = v.valid ? 'completed' : 'failed';
        verifiedData = v.license;
      } catch (e) {
        console.error('[chariow/webhook] validateLicense échec:', e);
        return new NextResponse('OK', { status: 200 });
      }
    }

    // Extraction tolérante d'un éventuel motif d'échec (selon payload Chariow/Moneroo).
    const failureCode: string | null =
      payload?.failure_code ||
      payload?.error_code ||
      verifiedData?.payment?.failure_code ||
      verifiedData?.failure_code ||
      null;
    const failureMessage: string | null =
      payload?.failure_message ||
      payload?.message ||
      verifiedData?.payment?.failure_message ||
      verifiedData?.failure_reason ||
      null;

    // 3. Update paiement
    const { error: updateError } = await (supabaseAdmin as any)
      .from('payments')
      .update({
        status: verifiedStatus,
        completed_at: verifiedStatus === 'completed' ? new Date().toISOString() : undefined,
        provider_transaction_id: saleId || payment.provider_transaction_id,
        failure_code: verifiedStatus === 'failed' ? failureCode : null,
        failure_message: verifiedStatus === 'failed' ? failureMessage : null,
        ipn_data: { payload, verified: verifiedData } as any,
        metadata: {
          ...(payment.metadata || {}),
          chariow_sale_id: saleId,
          chariow_license_key: licenseKey,
        },
      })
      .eq('id', payment.id);

    if (updateError) {
      console.error('[chariow/webhook] update payment error:', updateError);
      return new NextResponse('OK', { status: 200 });
    }

    // 4. Activation métier (abonnement ou brand_request) si paiement complété.
    if (verifiedStatus === 'completed') {
      const metadata = (payment.metadata || {}) as any;
      const enrichedPayment = {
        ...payment,
        metadata: {
          ...(payment.metadata || {}),
          chariow_sale_id: saleId,
          chariow_license_key: licenseKey,
        },
      };

      try {
        if (metadata.type === 'brand_request') {
          await activateBrandRequest(enrichedPayment);
        } else {
          await activateUserSubscription(enrichedPayment);
        }
      } catch (e) {
        console.error('[chariow/webhook] activation error:', e);
      }

      console.log(
        `[chariow/webhook] ✅ Paiement ${payment.ref_command} complété et activé`
      );
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('[chariow/webhook] error:', error);
    return new NextResponse('OK', { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, kind: 'chariow-webhook' });
}
