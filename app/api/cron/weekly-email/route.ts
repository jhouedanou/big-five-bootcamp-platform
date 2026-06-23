/**
 * API Route: GET /api/cron/weekly-email
 *
 * Envoie un récapitulatif hebdomadaire éditorialisé des nouvelles campagnes
 * à tous les utilisateurs inscrits.
 * Départ : chaque lundi à 8h (contenus chargés les vendredis soirs)
 *
 * Contenu :
 * - Volume de contenus chargés
 * - Industries (secteurs) couverts
 * - Pays représentés
 * - Liens vers des campagnes spécifiques
 *
 * Sécurité: Protégé par CRON_SECRET header
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendMail } from '@/lib/gmail-sender'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Vérification de sécurité
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // Fail-closed : si le secret n'est pas configuré, on refuse plutôt que
    // d'exposer un endpoint publiquement déclenchable.
    if (!cronSecret) {
      console.error('[cron/weekly-email] CRON_SECRET non configuré')
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 })
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // LOT E : fenêtre = 7 jours GLISSANTS précédant l'envoi, calculée
    // automatiquement depuis la date d'envoi (envoi lundi → semaine écoulée).
    // L'ancien calcul ("depuis lundi 00:00") ne couvrait que quelques heures
    // quand le cron tournait le lundi matin.
    const now = new Date()
    const windowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // 1. Récupérer les campagnes ajoutées sur les 7 derniers jours
    const { data: newCampaigns, error: campaignsError } = await (supabaseAdmin as any)
      .from('campaigns')
      .select('id, title, description, brand, category, axe, country, thumbnail, slug, platforms, format, featured')
      .eq('status', 'Publié')
      .gte('created_at', windowStart.toISOString())
      .order('created_at', { ascending: false })

    if (campaignsError) {
      console.error('Erreur récupération campagnes:', campaignsError.message)
      return NextResponse.json({ error: campaignsError.message }, { status: 500 })
    }

    if (!newCampaigns || newCampaigns.length === 0) {
      console.log('Aucune nouvelle campagne cette semaine')
      return NextResponse.json({
        success: true,
        message: 'Aucune nouvelle campagne cette semaine, email non envoyé',
        campaigns: 0,
      })
    }

    // 2. Recuperer les utilisateurs avec abonnement actif (Discovery/Basic/Pro)
    //    et qui n'ont pas desactive les emails. Les comptes sans abonnement
    //    actif ne recoivent pas l'email hebdo (alignement spec : feature
    //    "Alertes email hebdo" reservee aux trois plans payants).
    const { data: users, error: usersError } = await (supabaseAdmin as any)
      .from('users')
      .select('id, email, name, email_unsubscribed')
      .eq('status', 'active')
      .eq('subscription_status', 'active')
      .neq('email_unsubscribed', true)

    if (usersError) {
      console.error('Erreur récupération utilisateurs:', usersError.message)
      return NextResponse.json({ error: usersError.message }, { status: 500 })
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ success: true, message: 'Aucun destinataire', sent: 0 })
    }

    // 3. Analyser les campagnes de la PÉRIODE uniquement (LOT E) :
    //    marques, secteurs, pays et axes créatifs recalculés dynamiquement.
    const industries = new Set<string>()
    const countries = new Set<string>()
    const brands = new Set<string>()
    const axes = new Set<string>()
    const featuredCampaigns = newCampaigns.filter((c: any) => c.featured)

    newCampaigns.forEach((c: any) => {
      if (c.category) industries.add(c.category)
      if (c.country) countries.add(c.country)
      if (c.brand) brands.add(c.brand)
      if (Array.isArray(c.axe)) c.axe.forEach((a: string) => a && axes.add(a))
    })

    const industriesList = Array.from(industries)
    const countriesList = Array.from(countries)
    const axesList = Array.from(axes)

    // 4. Construire le HTML éditorialisé
    const weekLabel = windowStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://laveiye.com'

    // Top campagnes à mettre en avant (featured d'abord, puis les plus récentes)
    const topCampaigns = featuredCampaigns.length > 0
      ? featuredCampaigns.slice(0, 3)
      : newCampaigns.slice(0, 3)

    // Campagne vedette
    const starCampaign = topCampaigns[0]

    // Lignes détaillées des campagnes
    const campaignCards = newCampaigns.slice(0, 8).map((c: any) => `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              ${c.thumbnail ? `<td width="80" style="vertical-align: top; padding-right: 12px;">
                <img src="${c.thumbnail}" alt="" width="80" height="60" style="border-radius: 8px; object-fit: cover; display: block;" />
              </td>` : ''}
              <td style="vertical-align: top;">
                <a href="${appUrl}/dashboard" style="font-weight: 600; color: #F2B33D; text-decoration: none; font-size: 14px;">
                  ${c.title}
                </a>
                <br/>
                <span style="font-size: 12px; color: #999; line-height: 1.6;">
                  ${c.brand ? `<strong>${c.brand}</strong> · ` : ''}${c.country || ''}${c.category ? ` · ${c.category}` : ''}${c.format ? ` · ${c.format}` : ''}
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `).join('')

    // Tags industries
    const industryTags = industriesList.slice(0, 6).map(ind =>
      `<span style="display: inline-block; background: #f3e8ff; color: #F2B33D; padding: 4px 12px; border-radius: 50px; font-size: 12px; font-weight: 500; margin: 2px 4px 2px 0;">${ind}</span>`
    ).join('')

    // Tags pays
    const countryTags = countriesList.slice(0, 6).map(c =>
      `<span style="display: inline-block; background: #e0f2fe; color: #0369a1; padding: 4px 12px; border-radius: 50px; font-size: 12px; font-weight: 500; margin: 2px 4px 2px 0;">${c}</span>`
    ).join('')

    // Tags axes créatifs (période uniquement)
    const axisTags = axesList.slice(0, 6).map(a =>
      `<span style="display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 50px; font-size: 12px; font-weight: 500; margin: 2px 4px 2px 0;">${a}</span>`
    ).join('')

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Laveiye — Votre veille créative de la semaine</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
  <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #F2B33D, #a855f7); padding: 36px 24px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 26px; letter-spacing: -0.5px;">Laveiye</h1>
      <p style="color: rgba(255,255,255,0.85); margin: 10px 0 0; font-size: 15px;">Votre veille créative — Semaine du ${weekLabel}</p>
    </div>

    <!-- Intro éditorialisée -->
    <div style="padding: 28px 24px 0;">
      <p style="color: #0F0F0F; font-size: 16px; line-height: 1.6; margin: 0 0 6px;">
        Bonjour,
      </p>
      <p style="color: #444; font-size: 15px; line-height: 1.7; margin: 0;">
        Cette semaine, <strong style="color: #F2B33D;">${newCampaigns.length} nouvelle${newCampaigns.length > 1 ? 's' : ''} campagne${newCampaigns.length > 1 ? 's' : ''}</strong>
        ${newCampaigns.length > 1 ? 'ont été ajoutées' : 'a été ajoutée'} à la bibliothèque,
        couvrant <strong>${industriesList.length} secteur${industriesList.length > 1 ? 's' : ''}</strong>
        et <strong>${countriesList.length} pays</strong>.
      </p>
    </div>

    <!-- Stats rapides -->
    <div style="padding: 20px 24px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td width="33%" style="text-align: center; padding: 16px 8px; background: #faf5ff; border-radius: 12px;">
            <div style="font-size: 28px; font-weight: 800; color: #F2B33D;">${newCampaigns.length}</div>
            <div style="font-size: 11px; color: #F2B33D; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">Campagnes</div>
          </td>
          <td width="4%"></td>
          <td width="33%" style="text-align: center; padding: 16px 8px; background: #f0f9ff; border-radius: 12px;">
            <div style="font-size: 28px; font-weight: 800; color: #0369a1;">${industriesList.length}</div>
            <div style="font-size: 11px; color: #0369a1; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">Secteurs</div>
          </td>
          <td width="4%"></td>
          <td width="33%" style="text-align: center; padding: 16px 8px; background: #fefce8; border-radius: 12px;">
            <div style="font-size: 28px; font-weight: 800; color: #a16207;">${countriesList.length}</div>
            <div style="font-size: 11px; color: #a16207; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">Pays</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Industries couvertes -->
    <div style="padding: 0 24px 16px;">
      <h3 style="color: #0F0F0F; font-size: 14px; font-weight: 700; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.5px;">Industries couvertes</h3>
      <div>${industryTags}</div>
    </div>

    <!-- Pays représentés -->
    <div style="padding: 0 24px 20px;">
      <h3 style="color: #0F0F0F; font-size: 14px; font-weight: 700; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.5px;">Pays représentés</h3>
      <div>${countryTags}</div>
    </div>

    ${axesList.length > 0 ? `
    <!-- Axes créatifs -->
    <div style="padding: 0 24px 20px;">
      <h3 style="color: #0F0F0F; font-size: 14px; font-weight: 700; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.5px;">Axes créatifs</h3>
      <div>${axisTags}</div>
    </div>
    ` : ''}

    <!-- Campagne vedette -->
    ${starCampaign ? `
    <div style="padding: 0 24px 20px;">
      <div style="background: linear-gradient(135deg, #faf5ff, #f0f9ff); border: 2px solid #e9d5ff; border-radius: 12px; padding: 20px; text-align: center;">
        <div style="font-size: 11px; color: #F2B33D; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Campagne de la semaine</div>
        ${starCampaign.thumbnail ? `<img src="${starCampaign.thumbnail}" alt="" width="100%" style="border-radius: 8px; max-height: 200px; object-fit: cover; margin-bottom: 12px;" />` : ''}
        <h3 style="color: #0F0F0F; font-size: 18px; margin: 0 0 4px;">${starCampaign.title}</h3>
        <p style="color: #666; font-size: 13px; margin: 0 0 12px;">
          ${starCampaign.brand ? `${starCampaign.brand} · ` : ''}${starCampaign.country || ''}${starCampaign.category ? ` · ${starCampaign.category}` : ''}
        </p>
        <a href="${appUrl}/dashboard" style="display: inline-block; background: #F2B33D; color: white; padding: 10px 24px; border-radius: 50px; text-decoration: none; font-weight: 600; font-size: 14px;">
          Voir la campagne
        </a>
      </div>
    </div>
    ` : ''}

    <!-- Liste des campagnes -->
    <div style="padding: 0 24px 24px;">
      <h3 style="color: #0F0F0F; font-size: 14px; font-weight: 700; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.5px;">
        Toutes les nouveautés
      </h3>
      <table style="width: 100%; border-collapse: collapse; background: #fafafa; border-radius: 12px; overflow: hidden;">
        ${campaignCards}
      </table>

      ${newCampaigns.length > 8 ? `<p style="color: #999; font-size: 13px; margin-top: 8px; text-align: center;">+ ${newCampaigns.length - 8} autres campagnes sur la plateforme</p>` : ''}
    </div>

    <!-- CTA principal -->
    <div style="text-align: center; padding: 0 24px 32px;">
      <a href="${appUrl}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #F2B33D, #a855f7); color: white; padding: 16px 40px; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 16px; box-shadow: 0 4px 12px rgba(242, 179, 61,0.3);">
        Explorer la bibliothèque
      </a>
    </div>

    <!-- Footer -->
    <div style="background: #f8f9fa; padding: 20px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #999; font-size: 12px; margin: 0; line-height: 1.6;">
        Vous recevez cet email car vous êtes inscrit sur Laveiye.<br/>
        <a href="${appUrl}/profile" style="color: #F2B33D;">Gérer mes préférences</a> · <a href="${appUrl}/profile" style="color: #999;">Se désabonner</a>
      </p>
    </div>
  </div>
</body>
</html>
    `

    // 5. Envoyer les emails via Gmail API
    let sent = 0
    let failed = 0

    if (process.env.GMAIL_PRIVATE_KEY || process.env.RESEND_API_KEY) {
      const fromAddr = process.env.GMAIL_FROM || 'Laveiye <support@laveiye.com>'
      for (const user of users) {
        const result = await sendMail({
          from: fromAddr,
          to: user.email,
          subject: `${newCampaigns.length} nouvelles campagnes cette semaine — ${industriesList.slice(0, 3).join(', ')}`,
          html: emailHtml,
        })
        if (result.ok) {
          sent++
        } else {
          failed++
          console.warn(`Email failed for ${user.email}: ${result.error}`)
        }
      }
    } else {
      console.log(`[SIMULATION] Envoi de ${users.length} emails (ni GMAIL_PRIVATE_KEY ni RESEND_API_KEY configurés)`)
      sent = users.length
    }

    console.log(`Emails envoyés: ${sent}/${users.length} (${failed} échecs)`)

    return NextResponse.json({
      success: true,
      message: `Email hebdo envoyé à ${sent} utilisateurs`,
      campaigns: newCampaigns.length,
      industries: industriesList,
      countries: countriesList,
      recipients: users.length,
      sent,
      failed,
      window_start: windowStart.toISOString(),
    })
  } catch (error: any) {
    console.error('Erreur cron weekly-email:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
