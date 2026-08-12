import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { sendStudyDeliveryEmail } from '@/lib/study-emails'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const LIMITS = {
  first_name: 100,
  last_name: 100,
  email: 200,
  phone: 40,
  company: 150,
  job_title: 150,
  utm: 200,
  referrer: 500,
}

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

/**
 * POST /api/etudes/lead
 * Body: { slug, firstName, lastName, email, phone, company?, jobTitle?,
 *         consent, utm_source?, utm_medium?, utm_campaign?, utm_content?,
 *         referrer?, website? (honeypot) }
 *
 * Enregistre le lead puis envoie l'étude par email. Un email déjà enregistré
 * pour cette étude ne renvoie PAS une erreur : on relance l'envoi. Sinon une
 * personne ayant perdu son email ne pourrait plus jamais récupérer l'étude.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const rl = rateLimit(`study-lead:${ip}`, 5, 5 * 60_000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Trop de demandes. Réessayez dans quelques minutes.' },
        { status: 429 }
      )
    }

    const payload = await request.json().catch(() => null)
    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
    }

    // Honeypot : champ invisible côté formulaire, seuls les bots le remplissent.
    // On répond succès pour ne pas leur signaler la détection.
    if (clean((payload as any).website, 200)) {
      return NextResponse.json({ success: true, alreadyRegistered: false })
    }

    const slug = clean((payload as any).slug, 100) || 'finance'
    const firstName = clean((payload as any).firstName, LIMITS.first_name)
    const lastName = clean((payload as any).lastName, LIMITS.last_name)
    const email = clean((payload as any).email, LIMITS.email).toLowerCase()
    const phone = clean((payload as any).phone, LIMITS.phone)
    const company = clean((payload as any).company, LIMITS.company) || null
    const jobTitle = clean((payload as any).jobTitle, LIMITS.job_title) || null
    const consent = (payload as any).consent === true

    if (!firstName || !lastName || !email || !phone) {
      return NextResponse.json(
        { error: 'Prénom, nom, email et numéro de contact sont obligatoires.' },
        { status: 400 }
      )
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Adresse email invalide.' }, { status: 400 })
    }
    if (!consent) {
      return NextResponse.json(
        { error: "Vous devez accepter l'utilisation de vos informations." },
        { status: 400 }
      )
    }

    const admin = getSupabaseAdmin()

    const { data: study, error: studyError } = await admin
      .from('studies')
      .select('id, title, subtitle, file_path, is_active')
      .eq('slug', slug)
      .maybeSingle()

    // Une erreur de requête n'est pas une étude absente : sans cette distinction,
    // une migration non exécutée (42P01) se présenterait au visiteur comme
    // « étude introuvable » et enverrait l'équipe chercher au mauvais endroit.
    if (studyError) {
      console.error(
        'Lecture table studies échouée:',
        (studyError as any).code,
        studyError.message,
        (studyError as any).code === '42P01'
          ? '→ migration 12_20260812_studies.sql non exécutée ?'
          : ''
      )
      return NextResponse.json(
        { error: 'Service momentanément indisponible. Réessayez dans un instant.' },
        { status: 503 }
      )
    }

    if (!study || !(study as any).is_active) {
      return NextResponse.json({ error: 'Étude introuvable.' }, { status: 404 })
    }

    const lead = {
      study_id: (study as any).id,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      company,
      job_title: jobTitle,
      consent,
      consented_at: new Date().toISOString(),
      utm_source: clean((payload as any).utm_source, LIMITS.utm) || null,
      utm_medium: clean((payload as any).utm_medium, LIMITS.utm) || null,
      utm_campaign: clean((payload as any).utm_campaign, LIMITS.utm) || null,
      utm_content: clean((payload as any).utm_content, LIMITS.utm) || null,
      referrer: clean((payload as any).referrer, LIMITS.referrer) || null,
    }

    const { data: inserted, error } = await admin
      .from('study_leads')
      .insert(lead)
      .select('download_token')
      .single()

    let downloadToken: string | null = (inserted as any)?.download_token || null
    let alreadyRegistered = false

    if (error) {
      // 23505 = contrainte unique (study_id, email) : déjà inscrit.
      if ((error as any).code === '23505') {
        alreadyRegistered = true
        const { data: existing } = await admin
          .from('study_leads')
          .select('download_token')
          .eq('study_id', (study as any).id)
          .eq('email', email)
          .single()
        downloadToken = (existing as any)?.download_token || null
      } else {
        console.error('Erreur insert study_lead:', error)
        return NextResponse.json(
          { error: "Erreur lors de l'enregistrement. Réessayez." },
          { status: 500 }
        )
      }
    }

    // Le lien n'est envoyé que si le PDF est effectivement déposé (file_path).
    const emailResult = await sendStudyDeliveryEmail({
      to: email,
      firstName,
      studyTitle: (study as any).title,
      studySubtitle: (study as any).subtitle,
      downloadToken: (study as any).file_path ? downloadToken : null,
    })

    if (!emailResult.ok) {
      // Le lead EST enregistré : on ne renvoie pas d'échec global, mais on le
      // signale pour que le front affiche un message honnête.
      console.error('Envoi email étude échoué:', emailResult.error)
    }

    return NextResponse.json({
      success: true,
      alreadyRegistered,
      emailSent: emailResult.ok,
      fileAvailable: !!(study as any).file_path,
    })
  } catch (error) {
    console.error('Erreur POST study lead:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
