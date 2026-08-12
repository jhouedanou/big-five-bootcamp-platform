import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { ADMIN_EMAILS } from '@/lib/admin-auth'
import {
  getUserFromBearer,
  isAdminUser,
  fetchAuthors,
  serializeComment,
  validateBody,
} from '@/lib/comments'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20
const MAX_PAGE_SIZE = 50

/**
 * GET /api/comments?campaignId=<uuid>&offset=0&limit=20
 * Liste les commentaires visibles d'une campagne : épinglés d'abord,
 * puis du plus récent au plus ancien.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaignId')
    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId manquant' }, { status: 400 })
    }

    // Lecture réservée aux utilisateurs connectés (cf. policy RLS
    // campaign_comments_select_visible).
    const user = await getUserFromBearer(request)
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const offset = Math.max(0, Number(searchParams.get('offset')) || 0)
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number(searchParams.get('limit')) || PAGE_SIZE)
    )

    const admin = getSupabaseAdmin()
    const { data, count, error } = await admin
      .from('campaign_comments')
      .select('id, body, user_id, created_at, edited_at, is_official, is_pinned', {
        count: 'exact',
      })
      .eq('campaign_id', campaignId)
      .eq('is_hidden', false)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Erreur GET commentaires:', error)
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }

    const rows = data || []
    const authors = await fetchAuthors(rows.map((r: any) => r.user_id))
    const comments = rows.map((r: any) => serializeComment(r, authors, user.id))
    const total = count ?? comments.length

    return NextResponse.json({
      comments,
      total,
      hasMore: offset + comments.length < total,
    })
  } catch (error) {
    console.error('Erreur GET commentaires:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * POST /api/comments
 * Body: { campaignId: string, body: string }
 * Publie un commentaire. Un commentaire posté par un admin est marqué
 * `is_official` pour être mis en avant côté front.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromBearer(request)
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Anti-flood : 5 commentaires / 5 min. Clé sur l'utilisateur ET l'IP pour
    // qu'un même compte multi-onglets ou une IP partagée restent bornés.
    const limited = rateLimit(`comment:${user.id}:${getClientIp(request)}`, 5, 5 * 60_000)
    if (!limited.allowed) {
      return NextResponse.json(
        { error: 'Trop de commentaires publiés. Réessayez dans quelques minutes.' },
        { status: 429 }
      )
    }

    const payload = await request.json().catch(() => null)
    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
    }

    const { campaignId } = payload as { campaignId?: string }
    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId manquant' }, { status: 400 })
    }

    const validated = validateBody((payload as any).body)
    if ('error' in validated) {
      return NextResponse.json({ error: validated.error }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    // La campagne doit exister — évite d'accumuler des commentaires orphelins
    // sur un id inventé (le FK le refuserait, mais l'erreur serait opaque).
    const { data: campaign } = await admin
      .from('campaigns')
      .select('id, title')
      .eq('id', campaignId)
      .single()

    if (!campaign) {
      return NextResponse.json({ error: 'Campagne introuvable' }, { status: 404 })
    }

    const isAdmin = await isAdminUser(user)

    const { data: inserted, error: insertError } = await admin
      .from('campaign_comments')
      .insert({
        campaign_id: campaignId,
        user_id: user.id,
        body: validated.body,
        is_official: isAdmin,
      })
      .select('id, body, user_id, created_at, edited_at, is_official, is_pinned')
      .single()

    if (insertError || !inserted) {
      console.error('Erreur insert commentaire:', insertError)
      return NextResponse.json({ error: "Erreur lors de l'enregistrement" }, { status: 500 })
    }

    // Notifier les admins — best-effort, ne doit jamais faire échouer la publication.
    if (!isAdmin) {
      void notifyAdmins(campaignId, (campaign as any).title, validated.body).catch((err) =>
        console.error('Erreur notification admin commentaire:', err)
      )
    }

    const authors = await fetchAuthors([user.id])
    return NextResponse.json(
      { comment: serializeComment(inserted, authors, user.id) },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erreur POST commentaire:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * Notification in-app aux admins sur nouveau commentaire.
 * Deux sources d'admins (role en base + liste blanche email), fusionnées :
 * checkAdmin() accepte les deux, la notification doit couvrir les deux.
 */
async function notifyAdmins(campaignId: string, campaignTitle: string, body: string) {
  const admin = getSupabaseAdmin()

  const [byRole, byEmail] = await Promise.all([
    admin.from('users').select('id').eq('role', 'admin'),
    ADMIN_EMAILS.length
      ? admin.from('users').select('id').in('email', ADMIN_EMAILS)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const ids = new Set<string>()
  for (const row of [...((byRole as any).data || []), ...((byEmail as any).data || [])]) {
    if (row?.id) ids.add(row.id)
  }
  if (ids.size === 0) return

  const excerpt = body.length > 140 ? `${body.slice(0, 140)}…` : body

  await admin.from('notifications').insert(
    [...ids].map((userId) => ({
      user_id: userId,
      type: 'comment_posted',
      title: 'Nouveau commentaire',
      message: `Sur « ${campaignTitle} » : ${excerpt}`,
      read: false,
      action_url: `/content/${campaignId}#campaign-comments`,
      metadata: { campaign_id: campaignId, campaign_title: campaignTitle },
    }))
  )
}
