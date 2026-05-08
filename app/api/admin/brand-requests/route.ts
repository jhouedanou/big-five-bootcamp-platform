/**
 * API Route: /api/admin/brand-requests
 *
 * Admin: Gestion des demandes de collecte par marque
 * GET   - Lister toutes les demandes (avec infos utilisateur)
 * PATCH - Mettre à jour le statut / notes d'une demande
 *         → Si nouveau statut = "completed" : envoie un email Resend
 *           ET crée une notification in-app (type: brand_request_completed)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { checkAdmin } from '@/lib/admin-auth'
import {
  sendBrandRequestEmail,
  createBrandRequestNotification,
  type BrandEmailKind,
} from '@/lib/brand-request-emails'

export const dynamic = 'force-dynamic'

const ALLOWED_STATUSES = [
  'pending',
  'quote_in_preparation',
  'quote_sent',
  'quote_accepted',
  'in_payment',
  'in_production',
  'completed',
  'rejected',
  'cancelled',
  // Statuts legacy conservés pour compat ascendante
  'accepted',
  'in_progress',
] as const

const STATUS_TO_EMAIL: Partial<Record<string, BrandEmailKind>> = {
  quote_sent:        'quote_sent',
  quote_accepted:    'quote_accepted',
  in_payment:        'quote_accepted',
  in_production:     'in_production',
  completed:         'completed',
  rejected:          'rejected',
  cancelled:         'cancelled',
}

export async function GET() {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[admin/brand-requests] missing SUPABASE_SERVICE_ROLE_KEY')
      return NextResponse.json(
        { error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY not set' },
        { status: 500 }
      )
    }

    const user = await checkAdmin()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('brand_requests')
      .select('*, user:users!user_id(id, name, email, plan)')
      .order('created_at', { ascending: false })

    if (error) {
      const { data: fallback, error: fallbackError } = await admin
        .from('brand_requests')
        .select('*')
        .order('created_at', { ascending: false })
      if (fallbackError) return NextResponse.json({ error: fallbackError.message }, { status: 500 })
      return NextResponse.json({ requests: fallback || [] })
    }

    return NextResponse.json({ requests: data || [] })
  } catch (e: any) {
    console.error('[admin/brand-requests GET]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[admin/brand-requests PATCH] missing SUPABASE_SERVICE_ROLE_KEY')
      return NextResponse.json(
        { error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY not set' },
        { status: 500 }
      )
    }

    const adminUser = await checkAdmin()
    if (!adminUser) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    const body = await request.json()
    const {
      id,
      status,
      adminNotes,
      devisAmount,
      devisCurrency,
      devisUrl,
      nextRenewalAt,
      autoRenew,
      paymentReference,
      paymentMethod,
    } = body

    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

    if (status && !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: `Statut invalide : ${status}` }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    const { data: current } = await admin
      .from('brand_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (!current) {
      return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
    }

    // Garde-fou commercial : ne pas autoriser la mise à dispo des contenus
    // (« completed » = « Disponible ») sans paiement confirmé.
    if (
      status === 'completed' &&
      !(current as any).paid_at &&
      // sauf si on définit le paiement dans la même requête
      paymentReference === undefined
    ) {
      return NextResponse.json(
        {
          error:
            'Impossible de marquer la demande Disponible : aucun paiement confirmé (paid_at vide). Passez d’abord par « En cours de traitement ».',
        },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()
    const updateData: Record<string, unknown> = { updated_at: now }

    if (status) updateData.status = status
    if (adminNotes !== undefined) updateData.admin_notes = adminNotes
    if (devisAmount !== undefined) updateData.devis_amount = devisAmount
    if (devisCurrency !== undefined) updateData.devis_currency = devisCurrency
    if (devisUrl !== undefined) updateData.devis_url = devisUrl
    if (nextRenewalAt !== undefined) updateData.next_renewal_at = nextRenewalAt
    if (autoRenew !== undefined) updateData.auto_renew = autoRenew
    if (paymentReference !== undefined) updateData.payment_reference = paymentReference
    if (paymentMethod !== undefined) updateData.payment_method = paymentMethod

    // Marqueurs automatiques par transition de statut
    if (status === 'quote_sent' && current.status !== 'quote_sent') {
      updateData.devis_sent_at = updateData.devis_sent_at || now
    }
    if (status === 'in_production' && !current.paid_at) {
      updateData.paid_at = now
      // Première date de renouvellement : 1 mois après paiement si pas déjà fixée
      if (!current.next_renewal_at && updateData.next_renewal_at === undefined) {
        const d = new Date(now)
        d.setMonth(d.getMonth() + 1)
        updateData.next_renewal_at = d.toISOString()
      }
    }

    const { data, error } = await admin
      .from('brand_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Email + notification suivant le nouveau statut
    if (status && status !== current.status && current.user_id) {
      const kind = STATUS_TO_EMAIL[status]
      if (kind) {
        const userId = current.user_id
        const brandName = current.brand_name
        const ctx = {
          adminNotes: typeof adminNotes === 'string' ? adminNotes : current.admin_notes,
          devisAmount: (data as any).devis_amount ?? null,
          devisCurrency: (data as any).devis_currency ?? null,
          devisUrl: (data as any).devis_url ?? null,
          nextRenewalAt: (data as any).next_renewal_at ?? null,
          paymentReference: (data as any).payment_reference ?? null,
        }
        Promise.all([
          createBrandRequestNotification({ userId, brandRequestId: id, brandName, kind }),
          sendBrandRequestEmail({ userId, kind, brandName, context: ctx }),
        ]).catch((e) => console.error('[admin/brand-requests] notify failed:', e))

        // Si paiement validé (in_production), envoyer aussi le mail "payment_confirmed"
        if (status === 'in_production') {
          Promise.all([
            createBrandRequestNotification({ userId, brandRequestId: id, brandName, kind: 'payment_confirmed' }),
            sendBrandRequestEmail({ userId, kind: 'payment_confirmed', brandName, context: ctx }),
          ]).catch(() => { /* ignore */ })
        }
      }
    }

    return NextResponse.json({ request: data })
  } catch (e: any) {
    console.error('[admin/brand-requests PATCH]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[admin/brand-requests DELETE] missing SUPABASE_SERVICE_ROLE_KEY')
      return NextResponse.json(
        { error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY not set' },
        { status: 500 }
      )
    }

    const adminUser = await checkAdmin()
    if (!adminUser) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

    const admin = getSupabaseAdmin()

    // On supprime aussi les notifications liées (FK douce via metadata.brand_request_id),
    // sinon l'utilisateur garde des notifs orphelines pointant sur une demande disparue.
    await admin
      .from('notifications')
      .delete()
      .like('type', 'brand_request_%')
      .contains('metadata', { brand_request_id: id })

    const { error } = await admin
      .from('brand_requests')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, id })
  } catch (e: any) {
    console.error('[admin/brand-requests DELETE]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
