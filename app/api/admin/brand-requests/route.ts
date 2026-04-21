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
import { Resend } from 'resend'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { checkAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

const DEFAULT_FROM_EMAIL =
  process.env.CONTACT_FROM_EMAIL || 'Laveiye <onboarding@resend.dev>'

async function getFromEmail(): Promise<string> {
  try {
    const admin = getSupabaseAdmin()
    const { data } = await admin
      .from('site_settings')
      .select('key, value')
      .eq('key', 'contact_from_email')
      .single()
    const value = (data as any)?.value
    return value || DEFAULT_FROM_EMAIL
  } catch {
    return DEFAULT_FROM_EMAIL
  }
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
    const { id, status, adminNotes } = body

    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

    const admin = getSupabaseAdmin()

    const { data: current } = await admin
      .from('brand_requests')
      .select('status, brand_name, user_id')
      .eq('id', id)
      .single()

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (status) updateData.status = status
    if (adminNotes !== undefined) updateData.admin_notes = adminNotes

    const { data, error } = await admin
      .from('brand_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const isNewlyCompleted =
      status === 'completed' && current?.status !== 'completed' && current?.user_id

    if (isNewlyCompleted) {
      // Non-bloquant : on ne fait pas attendre la réponse sur Resend
      notifyCompletion({
        requestId: id,
        userId: current.user_id,
        brandName: current.brand_name,
        adminNotes: typeof adminNotes === 'string' ? adminNotes : null,
      }).catch((e) => console.error('[brand-requests] notifyCompletion error:', e))
    }

    return NextResponse.json({ request: data })
  } catch (e: any) {
    console.error('[admin/brand-requests PATCH]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── Notifications (in-app + email) ────────────────────────────────────────

async function notifyCompletion(params: {
  requestId: string
  userId: string
  brandName: string
  adminNotes: string | null
}) {
  const { requestId, userId, brandName, adminNotes } = params
  const admin = getSupabaseAdmin()

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://laveiye.com'
  ).replace(/\/$/, '')
  const brandQuery = encodeURIComponent(brandName)
  const actionUrl = `/dashboard?brand=${brandQuery}`
  const fullDashboardUrl = `${appUrl}${actionUrl}`

  // 1) Notification in-app
  try {
    await admin.from('notifications').insert({
      user_id: userId,
      type: 'brand_request_completed',
      title: `Suivi de marque prêt : ${brandName}`,
      message: `Votre demande de suivi pour ${brandName} est terminée. Consultez les campagnes associées.`,
      read: false,
      action_url: actionUrl,
      metadata: { brand_request_id: requestId, brand_name: brandName },
    } as any)
  } catch (e) {
    console.error('[brand-requests] notification insert failed:', e)
  }

  // 2) Email Resend — uniquement si clé présente et user non désabonné
  if (!process.env.RESEND_API_KEY) {
    console.warn('[brand-requests] RESEND_API_KEY absent, email completion non envoyé.')
    return
  }

  try {
    const { data: userRow } = await admin
      .from('users')
      .select('email, name, email_unsubscribed')
      .eq('id', userId)
      .single()

    const email = (userRow as any)?.email
    if (!email) {
      console.warn('[brand-requests] user email introuvable, skip email.')
      return
    }
    if ((userRow as any)?.email_unsubscribed) {
      console.info('[brand-requests] user désabonné, skip email.')
      return
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const from = await getFromEmail()
    await resend.emails.send({
      from,
      to: email,
      subject: `Votre suivi de marque "${brandName}" est prêt`,
      html: buildCompletedEmailHtml({
        userName: (userRow as any)?.name || '',
        brandName,
        dashboardUrl: fullDashboardUrl,
        adminNotes,
      }),
    })
  } catch (e) {
    console.error('[brand-requests] email send failed:', e)
  }
}

function buildCompletedEmailHtml(params: {
  userName: string
  brandName: string
  dashboardUrl: string
  adminNotes: string | null
}): string {
  const { userName, brandName, dashboardUrl, adminNotes } = params
  const safeName = userName || 'Bonjour'
  const notesBlock = adminNotes
    ? `<div style="margin-top:16px;padding:16px;background:#fff7e6;border:1px solid #F2B33D33;border-radius:12px;">
         <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#b45309;">Note de l'équipe Laveiye</p>
         <p style="margin:0;color:#0F0F0F;white-space:pre-line;">${adminNotes.replace(/</g, '&lt;')}</p>
       </div>`
    : ''

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background:#F2B33D;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
        <h1 style="color:white;margin:0;font-size:24px;">Laveiye</h1>
        <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;">Votre suivi de marque est prêt</p>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
        <h2 style="color:#0F0F0F;margin:0 0 12px;font-size:20px;">${safeName},</h2>
        <p style="color:#374151;line-height:1.6;margin:0 0 16px;">
          Bonne nouvelle : votre demande de suivi pour la marque
          <strong style="color:#F2B33D;">${brandName}</strong> est terminée.
        </p>
        <p style="color:#374151;line-height:1.6;margin:0 0 20px;">
          Les campagnes correspondantes sont disponibles dans votre tableau de bord.
        </p>
        <div style="text-align:center;margin:28px 0;">
          <a href="${dashboardUrl}"
             style="display:inline-block;background:#F2B33D;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;">
            Voir les campagnes
          </a>
        </div>
        ${notesBlock}
        <p style="color:#9ca3af;font-size:12px;margin-top:24px;text-align:center;">
          Cet email a été envoyé automatiquement suite au traitement de votre demande.
        </p>
      </div>
    </div>
  `
}
