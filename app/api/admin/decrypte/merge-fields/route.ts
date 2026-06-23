/**
 * GET  /api/admin/decrypte/merge-fields — vérifie que les champs de fusion
 *      utilisés par l'inscription #BigFiveDecrypte existent dans l'audience.
 * POST /api/admin/decrypte/merge-fields — crée les champs manquants.
 *
 * L'audience visée est celle configurée pour #BigFiveDecrypte
 * (site_settings.mailchimp_decrypte_audience_id), avec repli sur l'audience
 * principale. La liste DECRYPTE_MERGE_FIELDS doit rester alignée avec les
 * mergeFields envoyés par app/api/decrypte/register et app/api/admin/decrypte/sync.
 */

import { NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getMailchimpService, type MergeFieldDef } from '@/lib/mailchimp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Champs de fusion attendus côté Mailchimp pour #BigFiveDecrypte.
// FNAME/LNAME existent par défaut dans toute audience ; les autres sont
// custom et doivent être créés sinon Mailchimp ignore silencieusement
// les valeurs envoyées (perte de données).
export const DECRYPTE_MERGE_FIELDS: MergeFieldDef[] = [
  { tag: 'FNAME', name: 'Prénom', type: 'text' },
  { tag: 'LNAME', name: 'Nom', type: 'text' },
  { tag: 'COMPANY', name: 'Entreprise', type: 'text' },
  { tag: 'JOBTITLE', name: 'Poste', type: 'text' },
  { tag: 'TOPICS', name: "Sujets d'intérêt", type: 'text' },
  { tag: 'PHONE', name: 'Téléphone', type: 'phone' },
  { tag: 'SESSION', name: 'Session', type: 'text' },
]

async function run(create: boolean) {
  const admin = await checkAdmin()
  if (!admin) {
    return NextResponse.json(
      { error: 'Accès réservé aux administrateurs' },
      { status: 403 }
    )
  }

  const supabase = getSupabaseAdmin()
  const { data: settings } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', ['mailchimp_decrypte_audience_id'])
  const map: Record<string, string> = {}
  settings?.forEach((row: { key: string; value: string }) => (map[row.key] = row.value))
  const decrypteAud = (map['mailchimp_decrypte_audience_id'] || '').trim()

  const service = getMailchimpService()
  let config
  try {
    config = await service.loadConfig()
  } catch (err: any) {
    return NextResponse.json(
      { error: `Config Mailchimp illisible : ${err?.message || 'erreur'}` },
      { status: 500 }
    )
  }

  if (!config.apiKey) {
    return NextResponse.json(
      { error: 'Clé API Mailchimp non configurée. Renseignez-la dans Admin → Mailchimp.' },
      { status: 400 }
    )
  }

  const effectiveAudienceId = decrypteAud || config.audienceId
  if (!effectiveAudienceId) {
    return NextResponse.json(
      {
        error:
          "Aucune audience Mailchimp configurée. Renseignez 'Audience #BigFiveDecrypte' (ou l'audience principale) dans Admin → Mailchimp.",
      },
      { status: 400 }
    )
  }

  const result = await service.ensureMergeFields(DECRYPTE_MERGE_FIELDS, {
    create,
    audienceId: effectiveAudienceId,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 })
  }

  const stillMissing = result.missing.filter((t) => !result.created.includes(t))

  return NextResponse.json({
    ok: true,
    audienceId: effectiveAudienceId,
    usingMainAudience: !decrypteAud,
    required: DECRYPTE_MERGE_FIELDS.map((f) => ({ tag: f.tag, name: f.name })),
    existing: result.existing,
    missing: result.missing,
    created: result.created,
    createErrors: result.createErrors,
    stillMissing,
    allPresent: stillMissing.length === 0,
  })
}

export async function GET() {
  return run(false)
}

export async function POST() {
  return run(true)
}
