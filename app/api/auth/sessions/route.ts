import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import {
  MAX_SESSIONS_PER_USER,
  getSessionIdFromAccessToken,
  listActiveSessions,
  revokeSession,
} from '@/lib/sessions'

export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/sessions
 *
 * Renvoie la liste des sessions actives de l'utilisateur courant + l'ID
 * de la session du navigateur appelant (`currentSessionId`).
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const { data: sessionData } = await supabase.auth.getSession()
  const currentSessionId = getSessionIdFromAccessToken(
    sessionData.session?.access_token,
  )

  try {
    const sessions = await listActiveSessions(user.id)
    return NextResponse.json({
      sessions,
      currentSessionId,
      maxSessions: MAX_SESSIONS_PER_USER,
      overLimit: sessions.length > MAX_SESSIONS_PER_USER,
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Erreur lecture sessions' },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/auth/sessions?id=<session_id>
 *
 * Révoque la session indiquée si elle appartient à l'utilisateur courant.
 * Si l'utilisateur révoque sa propre session courante, le client doit
 * appeler `supabase.auth.signOut()` côté navigateur pour nettoyer l'état local.
 */
export async function DELETE(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('id')
  if (!sessionId) {
    return NextResponse.json({ error: 'Paramètre `id` manquant' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  try {
    const removed = await revokeSession(sessionId, user.id)
    if (!removed) {
      return NextResponse.json(
        { error: 'Session introuvable ou déjà révoquée' },
        { status: 404 },
      )
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Erreur révocation session' },
      { status: 500 },
    )
  }
}
