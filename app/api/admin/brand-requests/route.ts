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

    // Deux requêtes séparées pour éviter la dépendance sur une FK PostgREST
    // entre brand_requests et public.users (la FK réelle pointe sur auth.users).
    const [{ data: rawRequests, error: reqError }, { data: allUsers, error: usersError }] =
      await Promise.all([
        admin.from('brand_requests').select('*').order('created_at', { ascending: false }),
        admin.from('users').select('id, name, email, plan'),
      ])

    if (reqError) return NextResponse.json({ error: reqError.message }, { status: 500 })

    const userMap = new Map<string, { id: string; name: string; email: string; plan: string }>()
    for (const u of allUsers || []) {
      userMap.set((u as any).id, u as any)
    }

    const requests = (rawRequests || []).map((r: any) => ({
      ...r,
      user: r.user_id ? (userMap.get(r.user_id) ?? null) : null,
    }))

    return NextResponse.json({ requests })
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
      // Bouton "Approuver" : force status=completed + paid_at=now()
      // + payment_method='admin_override'. Distingue les approbations manuelles
      // des paiements FeexPay (payment_method LIKE 'feexpay/%') côté SQL.
      forceApprove,
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
    // (« completed » = « Disponible ») sans paiement confirmé — sauf si on
    // pose paid_at dans la même requête (paymentReference ou forceApprove).
    if (
      status === 'completed' &&
      !(current as any).paid_at &&
      paymentReference === undefined &&
      !forceApprove
    ) {
      return NextResponse.json(
        {
          error:
            'Impossible de marquer la demande Disponible : aucun paiement confirmé (paid_at vide). Utilisez « Approuver » ou passez par le flow FeexPay.',
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

    // Bouton "Approuver" — approbation manuelle admin
    if (forceApprove) {
      updateData.status = 'completed'
      if (!(current as any).paid_at) {
        updateData.paid_at = now
      }
      if (paymentMethod === undefined) {
        updateData.payment_method = 'admin_override'
      }
      // Renouvellement par défaut : +1 mois si non défini
      if (!(current as any).next_renewal_at && nextRenewalAt === undefined) {
        const d = new Date(now)
        d.setMonth(d.getMonth() + 1)
        updateData.next_renewal_at = d.toISOString()
      }
      if ((current as any).auto_renew === null || (current as any).auto_renew === undefined) {
        updateData.auto_renew = true
      }
    }

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

    // Email + notification suivant le nouveau statut. On considère aussi
    // les changements implicites (ex : forceApprove → status='completed').
    const effectiveStatus = (updateData.status as string | undefined) || status
    if (effectiveStatus && effectiveStatus !== current.status && current.user_id) {
      const kind = STATUS_TO_EMAIL[effectiveStatus]
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
        if (effectiveStatus === 'in_production') {
          Promise.all([
            createBrandRequestNotification({ userId, brandRequestId: id, brandName, kind: 'payment_confirmed' }),
            sendBrandRequestEmail({ userId, kind: 'payment_confirmed', brandName, context: ctx }),
          ]).catch(() => { /* ignore */ })
        }
        // Approbation manuelle admin → envoyer aussi "payment_confirmed"
        if (forceApprove && effectiveStatus === 'completed') {
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
