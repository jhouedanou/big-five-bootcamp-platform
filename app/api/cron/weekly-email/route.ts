/**
 * API Route: GET /api/cron/weekly-email
 *
 * Récapitulatif hebdomadaire éditorialisé des nouvelles campagnes.
 * Départ : chaque lundi à 8 h (contenus chargés les vendredis soirs).
 *
 * ENVOI VIA MAILCHIMP, ET UNIQUEMENT MAILCHIMP.
 * Le contenu est identique pour tous les destinataires : une campagne unique
 * envoyée à un segment fait le même travail qu'une boucle d'e-mails
 * transactionnels, et confie à Mailchimp ce qui est son métier — la liste, le
 * désabonnement, les statistiques d'ouverture. Les e-mails transactionnels
 * (webinaires, confirmation, livraison d'étude) restent sur lib/gmail-sender.
 *
 * Le segment repose sur les champs de fusion écrits par `syncUsersWithAudience` : la
 * synchronisation tourne donc en tête de traitement, sinon le segment
 * refléterait l'état de la semaine précédente.
 *
 * Sécurité : protégé par l'en-tête CRON_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getMailchimpService } from '@/lib/mailchimp'
import {
  buildWeeklyDigestHtml,
  buildWeeklyDigestSubject,
  type DigestCampaign,
} from '@/lib/weekly-digest-email'

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

    // Répétition : construit et dépose la campagne en brouillon sans l'envoyer.
    const dryRun = new URL(request.url).searchParams.get('dryRun') === '1'

    // LOT E : fenêtre = 7 jours GLISSANTS précédant l'envoi, calculée
    // automatiquement depuis la date d'envoi (envoi lundi → semaine écoulée).
    // L'ancien calcul ("depuis lundi 00:00") ne couvrait que quelques heures
    // quand le cron tournait le lundi matin.
    const now = new Date()
    const windowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // 1. Campagnes ajoutées sur les 7 derniers jours
    const { data: newCampaigns, error: campaignsError } = await (supabaseAdmin as any)
      .from('campaigns')
      .select(
        'id, title, description, brand, category, axe, country, thumbnail, slug, platforms, format, featured, created_at'
      )
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
        message: 'Aucune nouvelle campagne cette semaine, campagne non créée',
        campaigns: 0,
      })
    }

    // 2. Analyse de la période : secteurs, pays et axes créatifs recalculés
    //    à chaque envoi plutôt que figés.
    const industries = new Set<string>()
    const countries = new Set<string>()
    const axes = new Set<string>()

    for (const campaign of newCampaigns as DigestCampaign[]) {
      if (campaign.category) industries.add(campaign.category)
      if (campaign.country) countries.add(campaign.country)
      if (Array.isArray((campaign as any).axe)) {
        for (const axis of (campaign as any).axe as string[]) {
          if (axis) axes.add(axis)
        }
      }
    }

    const digest = {
      campaigns: newCampaigns as DigestCampaign[],
      industries: Array.from(industries),
      countries: Array.from(countries),
      axes: Array.from(axes),
      weekLabel: windowStart.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      appUrl: (process.env.NEXT_PUBLIC_APP_URL || 'https://laveiye.com').replace(/\/$/, ''),
    }

    const html = buildWeeklyDigestHtml(digest)
    const subject = buildWeeklyDigestSubject(digest)

    // 3. Mailchimp : synchronisation (qui crée les champs de fusion au besoin),
    //    segment, puis envoi.
    const mailchimp = getMailchimpService()

    // Le segment lit PLAN et SUBSTATUS : sans cette synchronisation, il
    // refléterait l'état de la semaine précédente — un compte résilié entre
    // deux envois recevrait encore l'alerte.
    const sync = await mailchimp.syncUsersWithAudience()
    if (!sync.success) {
      return NextResponse.json(
        { error: `Synchronisation Mailchimp : ${sync.errors.join(' | ')}` },
        { status: 502 }
      )
    }

    let segmentId: number | undefined
    try {
      segmentId = (await mailchimp.ensureWeeklySegment()).id
    } catch (err: any) {
      return NextResponse.json(
        { error: `Segment Mailchimp : ${err?.message || 'création impossible'}` },
        { status: 502 }
      )
    }

    const result = await mailchimp.sendCampaign({
      subject,
      title: `Laveiye — veille hebdo du ${digest.weekLabel}`,
      html,
      segmentId,
      dryRun,
    })

    if (!result.ok) {
      console.error('[cron/weekly-email] envoi Mailchimp échoué:', result.error)
      return NextResponse.json({ error: result.error }, { status: 502 })
    }

    console.log(
      `[cron/weekly-email] campagne ${result.campaignId} ${result.sent ? 'envoyée' : 'créée (brouillon)'} — ${newCampaigns.length} campagnes`
    )

    return NextResponse.json({
      success: true,
      message: result.sent
        ? 'Campagne Mailchimp envoyée au segment des abonnés actifs'
        : 'Campagne Mailchimp créée en brouillon (dryRun)',
      campaignId: result.campaignId,
      sent: result.sent,
      segmentId,
      synced: sync.synced,
      syncErrors: sync.errors.length,
      campaigns: newCampaigns.length,
      industries: digest.industries,
      countries: digest.countries,
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
