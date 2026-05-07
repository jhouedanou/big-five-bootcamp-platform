import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getMailchimpService } from '@/lib/mailchimp'
import { generatePromoCode } from '@/lib/promo-codes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Payload {
  firstName?: string
  lastName?: string
  email?: string
  country?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function getKeynoteSettings() {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', [
      'mailchimp_keynote_audience_id',
      'mailchimp_keynote_tag',
      'mailchimp_keynote_promo_tag',
    ])
  const map: Record<string, string> = {}
  data?.forEach((row: { key: string; value: string }) => {
    map[row.key] = row.value
  })
  return {
    audienceId: map['mailchimp_keynote_audience_id'] || '',
    keynoteTag: map['mailchimp_keynote_tag'] || 'keynote-2026',
    promoTag: map['mailchimp_keynote_promo_tag'] || 'promo-pre-launch',
  }
}

export async function POST(request: NextRequest) {
  let body: Payload
  try {
    body = (await request.json()) as Payload
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const email = String(body.email || '').trim().toLowerCase()
  const firstName = String(body.firstName || '').trim().slice(0, 60)
  const lastName = String(body.lastName || '').trim().slice(0, 60)
  const country = String(body.country || '').trim().slice(0, 60)

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Adresse email invalide' }, { status: 400 })
  }
  if (!firstName || !lastName) {
    return NextResponse.json({ error: 'Prénom et nom requis' }, { status: 400 })
  }
  if (!country) {
    return NextResponse.json({ error: 'Pays requis' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  // Si l'email existe déjà → on retourne le code existant (idempotent)
  const { data: existing } = await supabase
    .from('keynote_registrations')
    .select('promo_code')
    .eq('email', email)
    .maybeSingle()

  let promoCode: string
  let isNew = false

  if (existing?.promo_code) {
    promoCode = existing.promo_code
  } else {
    isNew = true
    // Générer un code unique (jusqu'à 5 essais)
    promoCode = generatePromoCode()
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: clash } = await supabase
        .from('keynote_registrations')
        .select('id')
        .eq('promo_code', promoCode)
        .maybeSingle()
      if (!clash) break
      promoCode = generatePromoCode()
    }

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      null
    const userAgent = request.headers.get('user-agent') || null

    const { error: insertErr } = await supabase.from('keynote_registrations').insert({
      email,
      first_name: firstName,
      last_name: lastName,
      country,
      promo_code: promoCode,
      ip,
      user_agent: userAgent,
      source: 'keynote-page',
    })

    if (insertErr) {
      // En cas de doublon de course, on relit
      const { data: again } = await supabase
        .from('keynote_registrations')
        .select('promo_code')
        .eq('email', email)
        .maybeSingle()
      if (again?.promo_code) {
        promoCode = again.promo_code
      } else {
        console.error('keynote insert error:', insertErr)
        return NextResponse.json({ error: 'Impossible d\'enregistrer l\'inscription' }, { status: 500 })
      }
    }
  }

  // Sync Mailchimp (best-effort, n'échoue pas l'inscription)
  let mailchimpStatus: 'subscribed' | 'error' | 'skipped' = 'skipped'
  let mailchimpError: string | null = null

  try {
    const settings = await getKeynoteSettings()
    const service = getMailchimpService()
    await service.loadConfig()

    const res = await service.upsertMember({
      email,
      audienceId: settings.audienceId || undefined,
      mergeFields: {
        FNAME: firstName,
        LNAME: lastName,
        COUNTRY: country,
        PROMO: promoCode,
      },
      tags: [settings.keynoteTag, settings.promoTag].filter(Boolean),
    })

    if (res.ok) {
      mailchimpStatus = 'subscribed'
    } else {
      mailchimpStatus = 'error'
      mailchimpError = res.error
    }
  } catch (err: any) {
    mailchimpStatus = 'error'
    mailchimpError = err?.message || 'Erreur Mailchimp'
  }

  // Mettre à jour les infos de sync (ne bloque pas la réponse)
  await supabase
    .from('keynote_registrations')
    .update({
      mailchimp_synced_at: new Date().toISOString(),
      mailchimp_status: mailchimpStatus,
      mailchimp_error: mailchimpError,
      updated_at: new Date().toISOString(),
    })
    .eq('email', email)

  return NextResponse.json({
    ok: true,
    isNew,
    promoCode,
    mailchimp: {
      status: mailchimpStatus,
      error: mailchimpError,
    },
  })
}
