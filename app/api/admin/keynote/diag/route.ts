import { NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getMailchimpService } from '@/lib/mailchimp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET — Diagnostic Mailchimp keynote : montre exactement ce qui est en DB
// et teste l'accès à l'audience configurée.
export async function GET() {
  const admin = await checkAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 })
  }

  const supabase = getSupabaseAdmin()

  const { data: settings, error } = await supabase
    .from('site_settings')
    .select('key, value, updated_at')
    .in('key', [
      'mailchimp_api_key',
      'mailchimp_audience_id',
      'mailchimp_keynote_audience_id',
      'mailchimp_keynote_tag',
      'mailchimp_keynote_promo_tag',
    ])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const map: Record<string, { value: string; updated_at: string }> = {}
  settings?.forEach((row: { key: string; value: string; updated_at: string }) => {
    map[row.key] = { value: row.value, updated_at: row.updated_at }
  })

  const apiKeyRow = map['mailchimp_api_key']
  const mainAudRow = map['mailchimp_audience_id']
  const keynoteAudRow = map['mailchimp_keynote_audience_id']

  // Test ping + audience lookup si possible
  let mailchimpTest: any = null
  try {
    const service = getMailchimpService()
    const config = await service.loadConfig()
    if (config.apiKey) {
      const dcMatch = config.apiKey.match(/-([a-z]{2}\d{1,3})$/i)
      const dc = dcMatch?.[1]?.toLowerCase()
      const audienceToTest =
        (keynoteAudRow?.value || '').trim() || (mainAudRow?.value || '').trim()
      if (dc && audienceToTest) {
        const url = `https://${dc}.api.mailchimp.com/3.0/lists/${audienceToTest}`
        const res = await fetch(url, {
          headers: {
            Authorization: `apikey ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
        })
        const data = await res.json().catch(() => ({}))
        mailchimpTest = res.ok
          ? {
              ok: true,
              audienceId: audienceToTest,
              name: data.name,
              memberCount: data.stats?.member_count,
            }
          : {
              ok: false,
              audienceId: audienceToTest,
              status: res.status,
              error: data.detail || data.title || 'Erreur Mailchimp',
            }
      }
    }
  } catch (err: any) {
    mailchimpTest = { ok: false, error: err?.message || 'Erreur test' }
  }

  return NextResponse.json({
    db: {
      mailchimp_api_key_present: !!apiKeyRow?.value,
      mailchimp_audience_id: mainAudRow?.value || '(absent)',
      mailchimp_audience_id_length: (mainAudRow?.value || '').length,
      mailchimp_keynote_audience_id: keynoteAudRow?.value || '(absent)',
      mailchimp_keynote_audience_id_length: (keynoteAudRow?.value || '').length,
      mailchimp_keynote_audience_id_updated_at: keynoteAudRow?.updated_at || null,
      mailchimp_keynote_tag: map['mailchimp_keynote_tag']?.value || '(absent)',
      mailchimp_keynote_promo_tag: map['mailchimp_keynote_promo_tag']?.value || '(absent)',
    },
    mailchimpTest,
  })
}
