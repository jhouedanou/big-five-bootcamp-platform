/**
 * API Route: GET /api/cron/weekly-email
 *
 * Envoie un récapitulatif hebdomadaire des nouvelles campagnes à tous les utilisateurs inscrits.
 * À appeler chaque lundi matin via un cron Vercel ou un service externe.
 *
 * Sécurité: Protégé par CRON_SECRET header
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Vérification de sécurité
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const lastMonday = new Date(now)
    lastMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    lastMonday.setHours(0, 0, 0, 0)

    // 1. Récupérer les nouvelles campagnes de la semaine
    const { data: newCampaigns, error: campaignsError } = await (supabaseAdmin as any)
      .from('campaigns')
      .select('id, title, description, category, country, thumbnail, slug')
      .eq('status', 'Publié')
      .gte('created_at', lastMonday.toISOString())
      .order('created_at', { ascending: false })

    if (campaignsError) {
      console.error('❌ Erreur récupération campagnes:', campaignsError.message)
      return NextResponse.json({ error: campaignsError.message }, { status: 500 })
    }

    if (!newCampaigns || newCampaigns.length === 0) {
      console.log('ℹ️ Aucune nouvelle campagne cette semaine')
      return NextResponse.json({
        success: true,
        message: 'Aucune nouvelle campagne cette semaine, email non envoyé',
        campaigns: 0,
      })
    }

    // 2. Récupérer tous les utilisateurs abonnés aux emails (sans unsubscribed)
    const { data: users, error: usersError } = await (supabaseAdmin as any)
      .from('users')
      .select('id, email, name, email_unsubscribed')
      .eq('status', 'active')
      .neq('email_unsubscribed', true)

    if (usersError) {
      console.error('❌ Erreur récupération utilisateurs:', usersError.message)
      return NextResponse.json({ error: usersError.message }, { status: 500 })
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ success: true, message: 'Aucun destinataire', sent: 0 })
    }

    // 3. Grouper les campagnes par pays et secteur pour le contenu email
    const byCountry: Record<string, typeof newCampaigns> = {}
    const bySector: Record<string, typeof newCampaigns> = {}

    newCampaigns.forEach((c: any) => {
      if (c.country) {
        if (!byCountry[c.country]) byCountry[c.country] = []
        byCountry[c.country].push(c)
      }
      if (c.category) {
        if (!bySector[c.category]) bySector[c.category] = []
        bySector[c.category].push(c)
      }
    })

    // 4. Construire le HTML de l'email
    const weekLabel = lastMonday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://big-five-bootcamp-platform.vercel.app'

    const campaignRows = newCampaigns.slice(0, 6).map((c: any) => `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
          <a href="${appUrl}/content/${c.slug || c.id}" style="font-weight: 600; color: #80368D; text-decoration: none;">
            ${c.title}
          </a>
          <br/>
          <span style="font-size: 12px; color: #666;">${c.country || ''} · ${c.category || ''}</span>
        </td>
      </tr>
    `).join('')

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Big Five — Nouvelles campagnes de la semaine</title></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
  <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #80368D, #a855f7); padding: 32px 24px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">Big Five Creative Library</h1>
      <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">Semaine du ${weekLabel}</p>
    </div>

    <!-- Content -->
    <div style="padding: 24px;">
      <h2 style="color: #1A1F2B; font-size: 20px; margin-bottom: 8px;">
        📚 ${newCampaigns.length} nouvelles campagnes cette semaine
      </h2>
      <p style="color: #666; margin-bottom: 24px;">
        Voici les meilleures campagnes ajoutées à la bibliothèque cette semaine, sélectionnées pour vous.
      </p>

      <table style="width: 100%; border-collapse: collapse;">
        ${campaignRows}
      </table>

      ${newCampaigns.length > 6 ? `<p style="color: #666; font-size: 13px; margin-top: 12px;">+ ${newCampaigns.length - 6} autres campagnes disponibles</p>` : ''}

      <!-- CTA -->
      <div style="text-align: center; margin-top: 32px;">
        <a href="${appUrl}/dashboard" style="display: inline-block; background: #80368D; color: white; padding: 14px 32px; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 16px;">
          Voir toutes les campagnes →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #f8f9fa; padding: 16px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #999; font-size: 12px; margin: 0;">
        Vous recevez cet email car vous êtes inscrit sur Big Five Creative Library.<br/>
        <a href="${appUrl}/profile" style="color: #80368D;">Se désabonner</a>
      </p>
    </div>
  </div>
</body>
</html>
    `

    // 5. Envoyer les emails via Resend (si configuré) ou logguer
    const resendApiKey = process.env.RESEND_API_KEY
    let sent = 0
    let failed = 0

    if (resendApiKey) {
      for (const user of users) {
        try {
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Big Five Creative Library <noreply@bigfiveabidjan.com>',
              to: user.email,
              subject: `📚 ${newCampaigns.length} nouvelles campagnes cette semaine — Big Five`,
              html: emailHtml,
            }),
          })

          if (response.ok) {
            sent++
          } else {
            failed++
            console.warn(`⚠️ Email failed for ${user.email}:`, response.status)
          }
        } catch (emailError) {
          failed++
          console.warn(`⚠️ Email error for ${user.email}:`, emailError)
        }
      }
    } else {
      // Mode simulation si pas de clé Resend
      console.log(`📧 [SIMULATION] Envoi de ${users.length} emails (RESEND_API_KEY non configuré)`)
      sent = users.length
    }

    console.log(`✅ Emails envoyés: ${sent}/${users.length} (${failed} échecs)`)

    return NextResponse.json({
      success: true,
      message: `Email hebdo envoyé à ${sent} utilisateurs`,
      campaigns: newCampaigns.length,
      recipients: users.length,
      sent,
      failed,
      week_start: lastMonday.toISOString(),
    })
  } catch (error: any) {
    console.error('❌ Erreur cron weekly-email:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
