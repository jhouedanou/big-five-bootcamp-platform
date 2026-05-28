/**
 * Gestion des sessions multi-appareils.
 *
 * Source de vérité : la table `auth.sessions` de Supabase (créée par GoTrue).
 * On l'interroge via le service role pour lister les sessions actives d'un
 * utilisateur et révoquer celles qu'il choisit.
 *
 * Limite : MAX_SESSIONS_PER_USER appareils connectés simultanément.
 */

import { createClient } from '@supabase/supabase-js'

export const MAX_SESSIONS_PER_USER = 3

export interface SessionInfo {
  id: string
  user_id: string
  created_at: string
  updated_at: string | null
  not_after: string | null
  refreshed_at: string | null
  user_agent: string | null
  ip: string | null
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase env vars for admin client')
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/**
 * Liste les sessions actives (non expirées) d'un utilisateur, triées par
 * dernière activité (la plus récente en premier). Si `limit` est fourni,
 * limite la requête côté DB (utile pour les vérifs middleware).
 */
export async function listActiveSessions(
  userId: string,
  limit?: number,
): Promise<SessionInfo[]> {
  const admin = getSupabaseAdmin()
  let query = admin
    .schema('auth')
    .from('sessions')
    .select('id, user_id, created_at, updated_at, not_after, refreshed_at, user_agent, ip')
    .eq('user_id', userId)
    // not_after est nullable ; quand renseigné, doit être dans le futur.
    .or(`not_after.is.null,not_after.gt.${new Date().toISOString()}`)
    .order('refreshed_at', { ascending: false, nullsFirst: false })

  if (typeof limit === 'number' && limit > 0) {
    query = query.limit(limit)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as SessionInfo[]
}

/**
 * Supprime la session indiquée — uniquement si elle appartient à `userId`.
 * Retourne true si une ligne a été supprimée.
 */
export async function revokeSession(sessionId: string, userId: string): Promise<boolean> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .schema('auth')
    .from('sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', userId)
    .select('id')

  if (error) throw error
  return (data?.length ?? 0) > 0
}

/**
 * Décode base64url → string UTF-8. Compatible Edge (atob + TextDecoder),
 * pas de dépendance à `Buffer`.
 */
function base64UrlDecode(input: string): string {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder('utf-8').decode(bytes)
}

/**
 * Décode (sans vérification cryptographique — usage purement informatif) un
 * JWT Supabase pour en extraire `session_id`. La vérification est faite par
 * `getUser()` côté Supabase ; ici on lit juste un claim.
 */
export function getSessionIdFromAccessToken(accessToken: string | null | undefined): string | null {
  if (!accessToken) return null
  const parts = accessToken.split('.')
  if (parts.length !== 3) return null
  try {
    const payload = JSON.parse(base64UrlDecode(parts[1]))
    return typeof payload.session_id === 'string' ? payload.session_id : null
  } catch {
    return null
  }
}
