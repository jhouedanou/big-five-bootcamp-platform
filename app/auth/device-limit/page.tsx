import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import {
  MAX_SESSIONS_PER_USER,
  getSessionIdFromAccessToken,
  listActiveSessions,
} from '@/lib/sessions'
import { DeviceLimitClient } from './device-limit-client'

export const dynamic = 'force-dynamic'

export default async function DeviceLimitPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: sessionData } = await supabase.auth.getSession()
  const currentSessionId = getSessionIdFromAccessToken(
    sessionData.session?.access_token,
  )

  const sessions = await listActiveSessions(user.id)

  // Limite OK → on laisse passer l'utilisateur. Le redirect ici évite que la
  // page reste accessible après résolution.
  if (sessions.length <= MAX_SESSIONS_PER_USER) {
    redirect('/dashboard')
  }

  return (
    <DeviceLimitClient
      initialSessions={sessions.map((s) => ({
        id: s.id,
        created_at: s.created_at,
        refreshed_at: s.refreshed_at,
        user_agent: s.user_agent,
        ip: s.ip,
      }))}
      currentSessionId={currentSessionId}
      maxSessions={MAX_SESSIONS_PER_USER}
    />
  )
}
