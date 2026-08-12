import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { checkAdmin } from '@/lib/admin-auth'
import { fetchAuthors } from '@/lib/comments'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PAGE_SIZE = 30
const MAX_PAGE_SIZE = 100

type Filter = 'reported' | 'hidden' | 'all'

/**
 * GET /api/admin/comments?filter=reported|hidden|all&offset=&limit=
 * File de modération. `reported` = commentaires ayant au moins un signalement
 * encore ouvert ; c'est la vue par défaut.
 */
export async function GET(request: NextRequest) {
  const admin = await checkAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const filter = (searchParams.get('filter') || 'reported') as Filter
    const offset = Math.max(0, Number(searchParams.get('offset')) || 0)
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number(searchParams.get('limit')) || PAGE_SIZE)
    )

    const db = getSupabaseAdmin()

    // Signalements ouverts : sert au filtre `reported` et au compteur affiché.
    const { data: openReports } = await db
      .from('comment_reports')
      .select('comment_id, reason')
      .eq('status', 'open')

    const reportCounts = new Map<string, { count: number; reasons: string[] }>()
    for (const row of (openReports as any[]) || []) {
      const entry = reportCounts.get(row.comment_id) || { count: 0, reasons: [] }
      entry.count += 1
      if (row.reason) entry.reasons.push(row.reason)
      reportCounts.set(row.comment_id, entry)
    }

    if (filter === 'reported' && reportCounts.size === 0) {
      return NextResponse.json({ comments: [], total: 0, hasMore: false })
    }

    let query = db
      .from('campaign_comments')
      .select(
        'id, body, user_id, campaign_id, created_at, edited_at, is_official, is_pinned, is_hidden, hidden_reason',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (filter === 'reported') {
      query = query.in('id', [...reportCounts.keys()])
    } else if (filter === 'hidden') {
      query = query.eq('is_hidden', true)
    }

    const { data, count, error } = await query
    if (error) {
      console.error('Erreur GET admin commentaires:', error)
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }

    const rows = (data as any[]) || []
    const authors = await fetchAuthors(rows.map((r) => r.user_id))

    // Titres de campagne, pour situer chaque commentaire dans la file.
    const campaignIds = [...new Set(rows.map((r) => r.campaign_id))]
    const titles = new Map<string, string>()
    if (campaignIds.length) {
      const { data: campaigns } = await db
        .from('campaigns')
        .select('id, title, slug')
        .in('id', campaignIds)
      for (const c of (campaigns as any[]) || []) {
        titles.set(c.id, c.title)
      }
    }

    const comments = rows.map((r) => ({
      id: r.id,
      body: r.body,
      createdAt: r.created_at,
      editedAt: r.edited_at,
      isOfficial: r.is_official,
      isPinned: r.is_pinned,
      isHidden: r.is_hidden,
      hiddenReason: r.hidden_reason,
      campaignId: r.campaign_id,
      campaignTitle: titles.get(r.campaign_id) || '(campagne supprimée)',
      author: authors.get(r.user_id) || { id: r.user_id, name: 'Utilisateur', avatarUrl: null },
      reportCount: reportCounts.get(r.id)?.count || 0,
      reportReasons: reportCounts.get(r.id)?.reasons || [],
    }))

    const total = count ?? comments.length
    return NextResponse.json({
      comments,
      total,
      hasMore: offset + comments.length < total,
    })
  } catch (error) {
    console.error('Erreur GET admin commentaires:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

const ACTIONS = ['hide', 'unhide', 'pin', 'unpin', 'dismiss_reports'] as const
type Action = (typeof ACTIONS)[number]

/**
 * PATCH /api/admin/comments
 * Body: { commentId: string, action: 'hide'|'unhide'|'pin'|'unpin'|'dismiss_reports', reason?: string }
 *
 * Masquer retire le commentaire du front sans le détruire (réversible et
 * traçable) ; la suppression définitive passe par DELETE.
 */
export async function PATCH(request: NextRequest) {
  const admin = await checkAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  try {
    const payload = await request.json().catch(() => null)
    const commentId = (payload as any)?.commentId
    const action = (payload as any)?.action as Action

    if (!commentId || !ACTIONS.includes(action)) {
      return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
    }

    const db = getSupabaseAdmin()

    if (action === 'dismiss_reports') {
      const { error } = await db
        .from('comment_reports')
        .update({ status: 'dismissed' })
        .eq('comment_id', commentId)
        .eq('status', 'open')
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    const patch: Record<string, unknown> =
      action === 'hide'
        ? { is_hidden: true, hidden_reason: (payload as any)?.reason || null }
        : action === 'unhide'
          ? { is_hidden: false, hidden_reason: null }
          : action === 'pin'
            ? { is_pinned: true }
            : { is_pinned: false }

    const { error } = await db.from('campaign_comments').update(patch).eq('id', commentId)
    if (error) throw error

    // Masquer un commentaire clôt les signalements qui le visaient.
    if (action === 'hide') {
      await db
        .from('comment_reports')
        .update({ status: 'reviewed' })
        .eq('comment_id', commentId)
        .eq('status', 'open')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur PATCH admin commentaire:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/comments?commentId=<uuid>
 * Suppression définitive (les signalements liés partent en cascade).
 */
export async function DELETE(request: NextRequest) {
  const admin = await checkAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  try {
    const commentId = new URL(request.url).searchParams.get('commentId')
    if (!commentId) {
      return NextResponse.json({ error: 'commentId manquant' }, { status: 400 })
    }

    const db = getSupabaseAdmin()
    const { error } = await db.from('campaign_comments').delete().eq('id', commentId)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE admin commentaire:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
