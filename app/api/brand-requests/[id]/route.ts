/**
 * API Route : /api/brand-requests/[id]
 *
 * Actions utilisateur sur sa propre demande :
 *  - PATCH { action: 'accept_quote' }   → quote_sent → quote_accepted
 *  - PATCH { action: 'refuse_quote' }   → quote_sent → pending (avec notes)
 *  - PATCH { action: 'cancel_renewal' } → désactive l'auto-renouvellement
 *  - PATCH { action: 'enable_renewal' } → réactive l'auto-renouvellement
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase-server'
import {
  sendBrandRequestEmail,
  createBrandRequestNotification,
} from '@/lib/brand-request-emails'

export const dynamic = 'force-dynamic'

type Action = 'accept_quote' | 'refuse_quote' | 'cancel_renewal' | 'enable_renewal'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

  try {
    const supabase = await getSupabaseServer()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const action = body?.action as Action | undefined
    if (!action) {
      return NextResponse.json({ error: 'Action requise' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const { data: current, error: fetchErr } = await admin
      .from('brand_requests')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchErr || !current) {
      return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
    }

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    let emailKind: Parameters<typeof sendBrandRequestEmail>[0]['kind'] | null = null

    switch (action) {
      case 'accept_quote': {
        if (current.status !== 'quote_sent') {
          return NextResponse.json(
            { error: 'Aucun devis en attente d\'acceptation.' },
            { status: 400 },
          )
        }
        update.status = 'quote_accepted'
        update.devis_accepted_at = new Date().toISOString()
        emailKind = 'quote_accepted'
        break
      }
      case 'refuse_quote': {
        if (current.status !== 'quote_sent') {
          return NextResponse.json(
            { error: 'Aucun devis en attente.' },
            { status: 400 },
          )
        }
        update.status = 'pending'
        update.devis_sent_at = null
        update.devis_amount = null
        update.devis_url = null
        if (typeof body?.notes === 'string' && body.notes.trim()) {
          update.notes = `${current.notes || ''}\n\n[Devis refusé] ${body.notes.trim()}`.trim()
        }
        break
      }
      case 'cancel_renewal': {
        update.auto_renew = false
        update.cancelled_at = new Date().toISOString()
        emailKind = 'cancelled'
        break
      }
      case 'enable_renewal': {
        update.auto_renew = true
        update.cancelled_at = null
        break
      }
      default:
        return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
    }

    const { data: updated, error: updateErr } = await admin
      .from('brand_requests')
      .update(update)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    if (emailKind) {
      const kind = emailKind
      Promise.all([
        createBrandRequestNotification({
          userId: user.id,
          brandRequestId: id,
          brandName: current.brand_name,
          kind,
        }),
        sendBrandRequestEmail({
          userId: user.id,
          kind,
          brandName: current.brand_name,
          context: {
            devisAmount: current.devis_amount,
            devisCurrency: current.devis_currency,
            nextRenewalAt: current.next_renewal_at,
          },
        }),
      ]).catch((e) => console.error('[brand-requests/:id] notify failed:', e))
    }

    return NextResponse.json({ request: updated })
  } catch (e: any) {
    console.error('[brand-requests/:id PATCH]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
