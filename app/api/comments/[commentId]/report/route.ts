import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getUserFromBearer } from '@/lib/comments'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_REASON_LENGTH = 500

/**
 * POST /api/comments/[commentId]/report
 * Body: { reason?: string }
 * Signale un commentaire. Modération a posteriori : le commentaire reste
 * visible, il entre dans la file admin (/admin/commentaires).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await params

    const user = await getUserFromBearer(request)
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const limited = rateLimit(`report:${user.id}:${getClientIp(request)}`, 10, 10 * 60_000)
    if (!limited.allowed) {
      return NextResponse.json(
        { error: 'Trop de signalements. Réessayez plus tard.' },
        { status: 429 }
      )
    }

    const payload = await request.json().catch(() => ({}))
    const rawReason = (payload as any)?.reason
    const reason =
      typeof rawReason === 'string' ? rawReason.trim().slice(0, MAX_REASON_LENGTH) : null

    const admin = getSupabaseAdmin()
    const { data: comment } = await admin
      .from('campaign_comments')
      .select('id, user_id')
      .eq('id', commentId)
      .single()

    if (!comment) {
      return NextResponse.json({ error: 'Commentaire introuvable' }, { status: 404 })
    }
    if ((comment as any).user_id === user.id) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas signaler votre propre commentaire' },
        { status: 400 }
      )
    }

    const { error } = await admin.from('comment_reports').insert({
      comment_id: commentId,
      reporter_user_id: user.id,
      reason,
    })

    // 23505 = signalement déjà enregistré pour ce couple (commentaire, auteur).
    // On répond succès : l'utilisateur n'a pas à savoir qu'il a déjà signalé,
    // et rien ne justifie de lui montrer une erreur.
    if (error && (error as any).code !== '23505') {
      console.error('Erreur insert signalement:', error)
      return NextResponse.json({ error: 'Erreur lors du signalement' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur POST signalement:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
