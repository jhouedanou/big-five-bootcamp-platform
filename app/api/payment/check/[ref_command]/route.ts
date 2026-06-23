/**
 * API Route: POST /api/payment/check/[ref_command]
 *
 * Vérifie le statut d'un paiement directement auprès de Chariow
 * et met à jour la base de données si le paiement est complété.
 * Fallback si le webhook n'a pas été reçu.
 *
 * `ref_command` = notre identifiant interne. Le `chariow_sale_id` éventuel est
 * stocké dans `payments.metadata.chariow_sale_id` après réception du webhook.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSale } from '@/lib/chariow';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import {
  activateUserSubscription,
  activateBrandRequest,
} from '@/lib/subscription-activation';

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

/**
 * Mappe un statut Chariow vers notre statut interne.
 * `abandoned` (client a quitté le checkout) est distingué de `failed`
 * (paiement refusé) → état `canceled`, message UI différent.
 */
function mapChariowStatus(
  status: string | undefined
): 'completed' | 'failed' | 'canceled' | 'pending' {
  const s = String(status || '').toLowerCase();
  if (s === 'paid' || s === 'completed' || s === 'successful') return 'completed';
  if (s === 'abandoned') return 'canceled';
  if (
    s === 'failed' ||
    s === 'canceled' ||
    s === 'cancelled' ||
    s === 'rejected' ||
    s === 'expired' ||
    s === 'refunded'
  )
    return 'failed';
  return 'pending';
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ref_command: string }> }
) {
  try {
    const { ref_command } = await params;

    // Anti-polling abusif : 30 checks / minute par (IP, ref).
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

    // 1. Récupérer le paiement
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

    // Déjà complété
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

    // Contexte de paiement pour orienter le bouton "Réessayer" côté navigateur
    // (un devis brand_request doit revenir sur sa page de paiement, pas /subscribe).
    const paymentType = paymentData.metadata?.type as string | undefined;
    const brandRequestId = paymentData.metadata?.brand_request_id as string | undefined;

    // Statut terminal négatif déjà posé en base (par le webhook : échec / abandon).
    // Inutile de re-poller Chariow : on renvoie l'état final pour que la page
    // d'attente cesse de tourner et affiche le bon message.
    const terminalNegative = ['failed', 'rejected', 'canceled', 'refunded'];
    if (terminalNegative.includes(paymentData.status)) {
      return NextResponse.json({
        success: false,
        message: `Payment ${paymentData.status}`,
        payment: {
          ref_command: paymentData.ref_command,
          status: paymentData.status === 'rejected' ? 'rejected' : paymentData.status,
          type: paymentType,
          brandRequestId,
          failureReason: paymentData.failure_message
            ? { failureMessage: paymentData.failure_message }
            : undefined,
        },
      });
    }

    // 2. Vérifier auprès de Chariow via le sale_id stocké (webhook a déjà reçu),
    // sinon on ne peut pas poller : Chariow ne sait pas qui est "notre" ref_command.
    const saleId = paymentData.metadata?.chariow_sale_id as string | undefined;
    if (!saleId) {
      return NextResponse.json({
        success: false,
        message: 'Statut Chariow non encore disponible (en attente du webhook).',
        payment: {
          ref_command: paymentData.ref_command,
          status: paymentData.status,
        },
      });
    }

    let verifiedData: any = null;
    try {
      verifiedData = await getSale(saleId);
    } catch (e) {
      console.error('[payment/check] Chariow getSale failed:', e);
      return NextResponse.json({
        success: false,
        message: 'Vérification Chariow indisponible.',
        payment: {
          ref_command: paymentData.ref_command,
          status: paymentData.status,
        },
      });
    }

    const mappedStatus = mapChariowStatus(verifiedData?.status);

    console.log('[payment/check] Chariow result:', {
      ref_command,
      sale_id: saleId,
      status: verifiedData?.status,
      mapped: mappedStatus,
    });

    // 3. Si completed : activer l'utilisateur / finaliser la commande
    if (mappedStatus === 'completed') {
      const updateData: Record<string, unknown> = {
        status: 'completed',
        payment_method: 'chariow',
        completed_at: new Date().toISOString(),
        final_amount: verifiedData?.amount ? Number(verifiedData.amount) : paymentData.amount,
        currency: paymentData.currency,
        ipn_data: verifiedData as any,
      };

      await supabase
        .from('payments')
        .update(updateData)
        .eq('id', paymentData.id);

      // Branches activation : abonnement vs brand_request — déléguée aux
      // helpers communs pour rester aligné avec le webhook Chariow.
      try {
        if (paymentData.metadata?.type === 'brand_request') {
          await activateBrandRequest(paymentData);
        } else {
          await activateUserSubscription(paymentData);
        }
      } catch (e) {
        console.error('[payment/check] activation error:', e);
      }

      return NextResponse.json({
        success: true,
        message: 'Payment verified and activated',
        payment: {
          ref_command: paymentData.ref_command,
          status: 'completed',
          amount: verifiedData?.amount,
          currency: paymentData.currency,
        },
      });
    }

    // 4. Si failed / canceled (abandon) : mettre à jour la base et renvoyer
    // l'état terminal pour stopper le poll côté navigateur.
    if (mappedStatus === 'failed' || mappedStatus === 'canceled') {
      await supabase
        .from('payments')
        .update({
          status: mappedStatus,
          failure_message:
            mappedStatus === 'canceled' ? 'Paiement abandonné' : 'Paiement échoué',
        } as any)
        .eq('id', paymentData.id);

      return NextResponse.json({
        success: false,
        message: mappedStatus === 'canceled' ? 'Payment abandoned' : 'Payment failed',
        payment: {
          ref_command: paymentData.ref_command,
          status: mappedStatus,
          type: paymentType,
          brandRequestId,
          chariow_status: verifiedData?.status,
          failureReason: {
            failureMessage:
              mappedStatus === 'canceled' ? 'Paiement abandonné' : 'Paiement échoué',
          },
        },
      });
    }

    // 5. Paiement en cours
    return NextResponse.json({
      success: false,
      message: 'Payment not yet completed',
      payment: {
        ref_command: paymentData.ref_command,
        status: paymentData.status,
        type: paymentType,
        brandRequestId,
        chariow_status: verifiedData?.status,
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
