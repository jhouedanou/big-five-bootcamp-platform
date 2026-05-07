import { NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function csvEscape(v: unknown): string {
  if (v == null) return ''
  const s = String(v)
  if (/[",\n;]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}

export async function GET() {
  const admin = await checkAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('keynote_registrations')
    .select('email, first_name, last_name, country, promo_code, mailchimp_status, mailchimp_synced_at, promo_redeemed_at, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const headers = [
    'email',
    'first_name',
    'last_name',
    'country',
    'promo_code',
    'mailchimp_status',
    'mailchimp_synced_at',
    'promo_redeemed_at',
    'created_at',
  ]
  const lines = [headers.join(',')]
  for (const r of data || []) {
    lines.push(headers.map((h) => csvEscape((r as Record<string, unknown>)[h])).join(','))
  }
  const csv = lines.join('\n')

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="keynote-registrations-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
