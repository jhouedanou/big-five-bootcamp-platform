import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { isBlockedEmail } from '@/lib/disposable-emails'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST — Supprimer des inscriptions keynote.
// Body : { ids?: string[], onlyFakes?: boolean }
//   - ids : suppression par identifiants
//   - onlyFakes : auto-détecte les emails jetables/bidons et les supprime
export async function POST(request: NextRequest) {
  const admin = await checkAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 })
  }

  let body: { ids?: string[]; onlyFakes?: boolean } = {}
  try {
    body = await request.json()
  } catch {
    /* empty body */
  }

  const supabase = getSupabaseAdmin()

  let idsToDelete: string[] = []
  let detectedEmails: string[] = []

  if (body.onlyFakes) {
    const { data, error } = await supabase
      .from('keynote_registrations')
      .select('id, email')
    if (error) {
      console.error('[keynote/delete] fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    const fakes = (data || []).filter((r: { email: string }) => isBlockedEmail(r.email || ''))
    idsToDelete = fakes.map((r: { id: string }) => r.id)
    detectedEmails = fakes.map((r: { email: string }) => r.email)
  } else if (Array.isArray(body.ids) && body.ids.length) {
    idsToDelete = body.ids
  } else {
    return NextResponse.json(
      { error: 'Paramètre manquant : ids ou onlyFakes requis' },
      { status: 400 }
    )
  }

  if (!idsToDelete.length) {
    return NextResponse.json({ ok: true, deleted: 0, emails: [] })
  }

  const { error: delErr } = await supabase
    .from('keynote_registrations')
    .delete()
    .in('id', idsToDelete)

  if (delErr) {
    console.error('[keynote/delete] delete error:', delErr)
    return NextResponse.json({ error: delErr.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    deleted: idsToDelete.length,
    emails: detectedEmails,
  })
}
