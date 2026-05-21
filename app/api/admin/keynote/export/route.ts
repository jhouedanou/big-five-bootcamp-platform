import { NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// CSV : on échappe les valeurs contenant des séparateurs / retours / guillemets.
function csvEscape(v: unknown): string {
  if (v == null) return ''
  const s = String(v)
  if (/[",\n;]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}

function isoToFr(v: string | null | undefined): string {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().replace('T', ' ').slice(0, 19)
}

function statusLabel(s: string | null | undefined, redeemedAt: string | null | undefined): string {
  // Source de vérité : promo_status. Fallback (lignes pré-migration) :
  // si on a une date de redemption, on considère le code comme utilisé.
  if (s === 'used') return 'utilisé'
  if (s === 'expired') return 'expiré'
  if (s === 'active') return 'actif'
  return redeemedAt ? 'utilisé' : 'actif'
}

export async function GET() {
  const admin = await checkAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('keynote_registrations')
    .select(
      'email, first_name, last_name, phone, country, source, promo_code, promo_status, promo_redeemed_at, promo_redeemed_plan, promo_redeemed_amount, promo_redeemed_by_user_id, mailchimp_status, mailchimp_synced_at, created_at'
    )
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Joindre les utilisateurs ayant consommé le code pour exposer leur nom
  // dans l'export (avantage opérationnel : suivre qui a converti).
  const userIds = Array.from(
    new Set(
      (data || [])
        .map((r: any) => r.promo_redeemed_by_user_id)
        .filter((id: string | null) => !!id)
    )
  ) as string[]
  const usersById: Record<string, { full_name?: string; email?: string }> = {}
  if (userIds.length) {
    const { data: users } = await supabase
      .from('users')
      .select('id, full_name, email')
      .in('id', userIds)
    for (const u of users || []) {
      usersById[(u as any).id] = {
        full_name: (u as any).full_name,
        email: (u as any).email,
      }
    }
  }

  const headers = [
    'code_promo',
    'statut',
    'avantage',
    'utilisateur_nom',
    'utilisateur_email',
    'email_inscription',
    'prenom',
    'nom',
    'telephone',
    'pays',
    'source',
    'date_inscription',
    'date_utilisation',
    'plan_active',
    'montant_paye_fcfa',
    'mailchimp_status',
    'mailchimp_synced_at',
  ]

  const lines = [headers.join(',')]
  for (const r of (data || []) as any[]) {
    const u = r.promo_redeemed_by_user_id ? usersById[r.promo_redeemed_by_user_id] : undefined
    const row: Record<string, unknown> = {
      code_promo: r.promo_code,
      statut: statusLabel(r.promo_status, r.promo_redeemed_at),
      avantage: '3 mois Basic offerts',
      utilisateur_nom: u?.full_name || '',
      utilisateur_email: u?.email || '',
      email_inscription: r.email,
      prenom: r.first_name || '',
      nom: r.last_name || '',
      telephone: r.phone || '',
      pays: r.country || '',
      source: r.source || '',
      date_inscription: isoToFr(r.created_at),
      date_utilisation: isoToFr(r.promo_redeemed_at),
      plan_active: r.promo_redeemed_plan || '',
      montant_paye_fcfa: r.promo_redeemed_amount ?? '',
      mailchimp_status: r.mailchimp_status || '',
      mailchimp_synced_at: isoToFr(r.mailchimp_synced_at),
    }
    lines.push(headers.map((h) => csvEscape(row[h])).join(','))
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
