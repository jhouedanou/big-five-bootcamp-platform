import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Durée de validité du lien signé remis au visiteur. */
const SIGNED_URL_TTL_SECONDS = 60 * 60 // 1 h

/**
 * GET /api/etudes/download?token=<uuid>
 *
 * Valide le jeton du lead, compte le téléchargement, puis redirige vers une URL
 * signée du bucket privé `studies`. Le PDF n'a jamais d'URL publique stable :
 * sans ça, un seul lien partagé rendrait la collecte de leads inutile.
 */
export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'Lien invalide.' }, { status: 400 })
  }

  try {
    const admin = getSupabaseAdmin()

    const { data: lead, error: leadError } = await admin
      .from('study_leads')
      .select('id, study_id, download_count')
      .eq('download_token', token)
      .maybeSingle()

    // Erreur de requête ≠ jeton inconnu : ne pas dire au visiteur que son lien
    // est invalide alors que c'est la base qui est en cause.
    if (leadError) {
      console.error('Lecture study_leads échouée:', (leadError as any).code, leadError.message)
      return NextResponse.json(
        { error: 'Service momentanément indisponible. Réessayez dans un instant.' },
        { status: 503 }
      )
    }

    if (!lead) {
      return NextResponse.json(
        { error: 'Lien invalide ou expiré. Redemandez l’étude depuis la page.' },
        { status: 404 }
      )
    }

    const { data: study } = await admin
      .from('studies')
      .select('file_path, is_active')
      .eq('id', (lead as any).study_id)
      .maybeSingle()

    if (!study || !(study as any).is_active || !(study as any).file_path) {
      return NextResponse.json(
        { error: "L'étude n'est pas encore disponible au téléchargement." },
        { status: 409 }
      )
    }

    const { data: signed, error: signError } = await admin.storage
      .from('studies')
      .createSignedUrl((study as any).file_path, SIGNED_URL_TTL_SECONDS, { download: true })

    if (signError || !signed?.signedUrl) {
      console.error('Erreur signature URL étude:', signError)
      return NextResponse.json(
        { error: 'Téléchargement momentanément indisponible.' },
        { status: 500 }
      )
    }

    // Comptage best-effort : un échec ici ne doit pas priver le visiteur du fichier.
    void admin
      .from('study_leads')
      .update({
        downloaded_at: new Date().toISOString(),
        download_count: ((lead as any).download_count || 0) + 1,
      })
      .eq('id', (lead as any).id)
      .then(({ error }) => {
        if (error) console.error('Erreur comptage téléchargement:', error)
      })

    return NextResponse.redirect(signed.signedUrl)
  } catch (error) {
    console.error('Erreur GET téléchargement étude:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
