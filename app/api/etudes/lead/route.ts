import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { sendStudyDeliveryEmail } from '@/lib/study-emails'
import { toE164 } from '@/lib/countries'

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
 * Body: { slug, firstName, lastName, email, phone, country, countryCode,
 *         sector, company?, jobTitle?, consent, marketingConsent?,
 *         utm_source?, utm_medium?, utm_campaign?, utm_content?,
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
    const rawPhone = clean((payload as any).phone, LIMITS.phone)
    // Pays et secteur : demandés par le brief « Formulaire de collecte ». Le
    // pays porte aussi l'indicatif du numéro, déjà préfixé côté formulaire.
    const country = clean((payload as any).country, 100)
    const countryCode = clean((payload as any).countryCode, 2).toUpperCase()
    const sector = clean((payload as any).sector, 100)
    const company = clean((payload as any).company, LIMITS.company) || null
    const jobTitle = clean((payload as any).jobTitle, LIMITS.job_title) || null
    const consent = (payload as any).consent === true

    if (!firstName || !lastName || !email || !rawPhone) {
      return NextResponse.json(
        { error: 'Prénom, nom, email et numéro de contact sont obligatoires.' },
        { status: 400 }
      )
    }
    if (!country || !countryCode) {
      return NextResponse.json({ error: 'Le pays est obligatoire.' }, { status: 400 })
    }
    if (!sector) {
      return NextResponse.json(
        { error: "Le secteur d'activité est obligatoire." },
        { status: 400 }
      )
    }
    // L'API est publique : le E.164 est RECONSTRUIT à partir du pays déclaré
    // plutôt que repris tel quel. Un indicatif recopié dans le numéro national
    // serait sinon stocké en double, et la contrainte d'indicatif ne servirait
    // à rien dès qu'on sort du formulaire.
    const phone = toE164(rawPhone, countryCode)
    if (!/^\+\d{7,20}$/.test(phone)) {
      return NextResponse.json(
        { error: 'Numéro invalide. Vérifiez le pays et le numéro saisi.' },
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
      country,
      country_code: countryCode,
      sector,
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

    // Conversion Meta côté serveur. Contrairement au pixel, elle n'est pas
    // bloquée par un adblocker. `eventId` est renvoyé au client pour qu'il
    // déclenche le même événement avec le même identifiant : Meta dédoublonne.
    // Uniquement sur une vraie nouvelle inscription — un renvoi de lien ne doit
    // pas gonfler le compte de conversions.
    const eventId = randomUUID()
    if (!alreadyRegistered) {
      void import('@/lib/fb-capi')
        .then(({ sendFbCapiEvent }) =>
          sendFbCapiEvent({
            eventName: 'Lead',
            eventId,
            email,
            phone,
            eventSourceUrl: request.headers.get('referer') || undefined,
            clientIp: ip,
            userAgent: request.headers.get('user-agent'),
            customData: {
              content_name: (study as any).title,
              study_slug: slug,
              country: countryCode,
              sector,
            },
            // Refus marketing : la conversion part quand même (elle est réelle
            // et constatée côté serveur), mais sans les identifiants issus du
            // navigateur, qui ne servent qu'au rapprochement publicitaire.
            marketingConsent: (payload as any).marketingConsent === true,
          })
        )
        .catch((err) => console.error('CAPI Lead échoué:', err))
    }

    return NextResponse.json({
      success: true,
      alreadyRegistered,
      emailSent: emailResult.ok,
      fileAvailable: !!(study as any).file_path,
      eventId: alreadyRegistered ? null : eventId,
    })
  } catch (error) {
    console.error('Erreur POST study lead:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
