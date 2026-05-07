import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getMailchimpService } from '@/lib/mailchimp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST — (Re)synchroniser les inscrits keynote vers Mailchimp.
// Body: { onlyFailed?: boolean, ids?: string[] }
export async function POST(request: NextRequest) {
  const admin = await checkAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 })
  }

  let body: { onlyFailed?: boolean; ids?: string[] } = {}
  try {
    body = await request.json()
  } catch {
    /* empty body ok */
  }

  const supabase = getSupabaseAdmin()

  // Settings keynote
  const { data: settings } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', ['mailchimp_keynote_audience_id', 'mailchimp_keynote_tag', 'mailchimp_keynote_promo_tag'])
  const map: Record<string, string> = {}
  settings?.forEach((row: { key: string; value: string }) => (map[row.key] = row.value))
  const audienceId = map['mailchimp_keynote_audience_id'] || ''
  const keynoteTag = map['mailchimp_keynote_tag'] || 'keynote-2026'
  const promoTag = map['mailchimp_keynote_promo_tag'] || 'promo-pre-launch'

  // Liste à synchroniser
  let query = supabase
    .from('keynote_registrations')
    .select('id, email, first_name, last_name, country, promo_code, mailchimp_status')

  if (Array.isArray(body.ids) && body.ids.length) {
    query = query.in('id', body.ids)
  } else if (body.onlyFailed) {
    query = query.or('mailchimp_status.is.null,mailchimp_status.neq.subscribed')
  }

  const { data: rows, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const service = getMailchimpService()
  await service.loadConfig()

  let synced = 0
  const errors: { email: string; error: string }[] = []

  for (const r of rows || []) {
    const res = await service.upsertMember({
      email: r.email,
      audienceId: audienceId || undefined,
      mergeFields: {
        FNAME: r.first_name || '',
        LNAME: r.last_name || '',
        COUNTRY: r.country || '',
        PROMO: r.promo_code || '',
      },
      tags: [keynoteTag, promoTag].filter(Boolean),
    })

    if (res.ok) {
      synced++
      await supabase
        .from('keynote_registrations')
        .update({
          mailchimp_status: 'subscribed',
          mailchimp_synced_at: new Date().toISOString(),
          mailchimp_error: null,
        })
        .eq('id', r.id)
    } else {
      errors.push({ email: r.email, error: res.error })
      await supabase
        .from('keynote_registrations')
        .update({
          mailchimp_status: 'error',
          mailchimp_synced_at: new Date().toISOString(),
          mailchimp_error: res.error,
        })
        .eq('id', r.id)
    }
  }

  return NextResponse.json({
    ok: true,
    total: rows?.length || 0,
    synced,
    errors,
  })
}
