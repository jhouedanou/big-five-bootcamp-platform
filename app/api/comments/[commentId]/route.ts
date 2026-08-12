import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import {
  getUserFromBearer,
  isAdminUser,
  fetchAuthors,
  serializeComment,
  validateBody,
} from '@/lib/comments'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * PATCH /api/comments/[commentId]
 * Body: { body: string }
 * Modifie son propre commentaire. Un admin ne réécrit pas le texte d'un
 * utilisateur : sa seule prise sur le contenu d'autrui est masquer/supprimer.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await params

    const user = await getUserFromBearer(request)
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const payload = await request.json().catch(() => null)
    const validated = validateBody((payload as any)?.body)
    if ('error' in validated) {
      return NextResponse.json({ error: validated.error }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const { data: existing } = await admin
      .from('campaign_comments')
      .select('id, user_id, is_hidden')
      .eq('id', commentId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Commentaire introuvable' }, { status: 404 })
    }
    if ((existing as any).user_id !== user.id) {
      return NextResponse.json({ error: 'Action non autorisée' }, { status: 403 })
    }
    if ((existing as any).is_hidden) {
      return NextResponse.json(
        { error: 'Ce commentaire a été masqué par la modération' },
        { status: 403 }
      )
    }

    const { data: updated, error } = await admin
      .from('campaign_comments')
      .update({ body: validated.body, edited_at: new Date().toISOString() })
      .eq('id', commentId)
      .select('id, body, user_id, created_at, edited_at, is_official, is_pinned')
      .single()

    if (error || !updated) {
      console.error('Erreur update commentaire:', error)
      return NextResponse.json({ error: 'Erreur lors de la modification' }, { status: 500 })
    }

    const authors = await fetchAuthors([user.id])
    return NextResponse.json({ comment: serializeComment(updated, authors, user.id) })
  } catch (error) {
    console.error('Erreur PATCH commentaire:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * DELETE /api/comments/[commentId]
 * Supprime son propre commentaire. Un admin peut supprimer n'importe lequel.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await params

    const user = await getUserFromBearer(request)
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const admin = getSupabaseAdmin()
    const { data: existing } = await admin
      .from('campaign_comments')
      .select('id, user_id')
      .eq('id', commentId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Commentaire introuvable' }, { status: 404 })
    }

    const isOwner = (existing as any).user_id === user.id
    if (!isOwner && !(await isAdminUser(user))) {
      return NextResponse.json({ error: 'Action non autorisée' }, { status: 403 })
    }

    const { error } = await admin.from('campaign_comments').delete().eq('id', commentId)
    if (error) {
      console.error('Erreur delete commentaire:', error)
      return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE commentaire:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
