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
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase-server'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

async function checkAdmin() {
  const supabase = await getSupabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return null
  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || profile.role !== 'admin') return null
  return user
}

export async function GET() {
  try {
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
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const adminUser = await checkAdmin()
    if (!adminUser) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    const body = await request.json()
    const { id, status, adminNotes } = body

    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

    const admin = getSupabaseAdmin()

    // Récupérer l'état actuel pour savoir si on change vraiment vers "completed"
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

    // Déclencher les notifications uniquement quand on passe à "completed"
    const isNewlyCompleted =
      status === 'completed' && current?.status !== 'completed' && current?.user_id

    if (isNewlyCompleted) {
      const brandName: string = current.brand_name
      const userId: string = current.user_id

      // Récupérer les infos du client
      const { data: userProfile } = await admin
        .from('users')
        .select('email, name, email_unsubscribed')
        .eq('id', userId)
        .single()

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://laveiye.com'
      const feedUrl = `${appUrl}/dashboard?brand=${encodeURIComponent(brandName)}`

      // 1. Notification in-app
      await admin.from('notifications').insert({
        user_id: userId,
        type: 'brand_request_completed',
        title: `Votre demande pour "${brandName}" est prête !`,
        message: `Les contenus de la marque ${brandName} sont maintenant disponibles dans votre fil.`,
        read: false,
        action_url: feedUrl,
        metadata: { brand_name: brandName, request_id: id },
      })

      // 2. Email Resend (si l'utilisateur n'est pas désabonné)
      if (userProfile?.email && !userProfile.email_unsubscribed) {
        const resend = new Resend(process.env.RESEND_API_KEY)
        const userName = userProfile.name || 'là'

        await resend.emails.send({
          from: 'Laveiye <onboarding@resend.dev>',
          to: userProfile.email,
          subject: `✅ "${brandName}" — vos contenus sont disponibles`,
          html: buildCompletionEmail({ userName, brandName, feedUrl, appUrl, adminNotes }),
        })
      }
    }

    return NextResponse.json({ request: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── Template email ────────────────────────────────────────────────────────

function buildCompletionEmail({
  userName,
  brandName,
  feedUrl,
  appUrl,
  adminNotes,
}: {
  userName: string
  brandName: string
  feedUrl: string
  appUrl: string
  adminNotes?: string
}): string {
  const noteBlock = adminNotes
    ? `<div style="background:#f3e8ff;border-left:4px solid #80368D;border-radius:0 8px 8px 0;padding:14px 16px;margin:20px 0;">
        <p style="margin:0;font-size:14px;color:#4b5563;line-height:1.6;">
          <strong style="color:#80368D;">Note de l'équipe :</strong><br/>${adminNotes}
        </p>
      </div>`
    : ''

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8f9fa;padding:20px;">
  <div style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

    <div style="background:linear-gradient(135deg,#80368D,#a855f7);padding:36px 24px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:26px;letter-spacing:-0.5px;">Laveiye</h1>
      <p style="color:rgba(255,255,255,0.85);margin:10px 0 0;font-size:15px;">Votre veille créative</p>
    </div>

    <div style="padding:32px 24px;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;background:#dcfce7;border-radius:50%;margin-bottom:12px;">
          <span style="font-size:32px;">✅</span>
        </div>
        <h2 style="color:#1A1F2B;margin:0;font-size:22px;">Bonne nouvelle, ${userName} !</h2>
      </div>

      <p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 8px;">
        Votre demande de suivi pour la marque
        <strong style="color:#80368D;">${brandName}</strong>
        a été traitée. Les contenus sont maintenant disponibles dans votre fil de veille.
      </p>

      ${noteBlock}

      <div style="text-align:center;margin:28px 0;">
        <a href="${feedUrl}"
           style="display:inline-block;background:linear-gradient(135deg,#80368D,#a855f7);color:white;padding:16px 36px;border-radius:50px;text-decoration:none;font-weight:700;font-size:15px;box-shadow:0 4px 12px rgba(128,54,141,0.3);">
          Voir les contenus ${brandName} →
        </a>
      </div>

      <p style="color:#9ca3af;font-size:13px;text-align:center;margin:0;">
        Ou copiez ce lien dans votre navigateur :<br/>
        <a href="${feedUrl}" style="color:#80368D;font-size:12px;word-break:break-all;">${feedUrl}</a>
      </p>
    </div>

    <div style="background:#f8f9fa;padding:20px 24px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="color:#9ca3af;font-size:12px;margin:0;line-height:1.6;">
        Vous recevez cet email car vous avez soumis une demande de suivi de marque sur Laveiye.<br/>
        <a href="${appUrl}/profile" style="color:#80368D;">Gérer mes préférences</a>
      </p>
    </div>

  </div>
</body>
</html>`
}
