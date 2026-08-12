/**
 * Helpers partagés par les routes /api/comments/*.
 *
 * Auth : les commentaires sont postés depuis la page détail, un composant
 * client qui tient déjà le token via useAuthContext — on reprend donc le
 * schéma `Authorization: Bearer` de /api/reactions/[campaignId] plutôt que
 * l'auth par cookie. La vérification du token passe par la service role.
 */

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { ADMIN_EMAILS } from '@/lib/admin-auth'
import type { User } from '@supabase/supabase-js'

export const MAX_COMMENT_LENGTH = 1500

export interface CommentAuthor {
  id: string
  name: string
  avatarUrl: string | null
}

export interface SerializedComment {
  id: string
  body: string
  createdAt: string
  editedAt: string | null
  isOfficial: boolean
  isPinned: boolean
  author: CommentAuthor
  /** true si le lecteur courant est l'auteur — pilote l'affichage Modifier/Supprimer */
  isMine: boolean
}

/**
 * Authentifie une requête via le header Bearer. Retourne null si absent/invalide.
 */
export async function getUserFromBearer(request: Request): Promise<User | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null

  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) return null

  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin.auth.getUser(token)
    if (error || !data?.user) return null
    return data.user
  } catch {
    return null
  }
}

/**
 * Vrai si l'utilisateur est admin. Même source de vérité que checkAdmin()
 * (lib/admin-auth.ts) mais à partir d'un User déjà résolu, sans relire le cookie.
 * On lit `app_metadata` et jamais `user_metadata`, modifiable par l'utilisateur.
 */
export async function isAdminUser(user: User): Promise<boolean> {
  if ((user.app_metadata as any)?.role === 'admin') return true
  if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) return true

  try {
    const admin = getSupabaseAdmin()
    const { data } = await admin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    return (data as any)?.role === 'admin'
  } catch {
    return false
  }
}

/**
 * Résout nom + avatar des auteurs. La jointure doit passer par la service role :
 * `profiles` est en RLS select-own, donc un utilisateur ne peut pas lire les
 * infos d'affichage des autres avec son propre token.
 */
export async function fetchAuthors(userIds: string[]): Promise<Map<string, CommentAuthor>> {
  const map = new Map<string, CommentAuthor>()
  const unique = [...new Set(userIds)].filter(Boolean)
  if (unique.length === 0) return map

  const admin = getSupabaseAdmin()

  // `avatar_url` peut ne pas exister selon l'état de la base (cf. app/api/avatars/route.ts).
  let rows: any[] | null = null
  try {
    const { data, error } = await admin
      .from('users')
      .select('id, name, email, avatar_url')
      .in('id', unique)
    if (error) throw error
    rows = data
  } catch {
    const { data } = await admin
      .from('users')
      .select('id, name, email')
      .in('id', unique)
    rows = data
  }

  for (const row of rows || []) {
    map.set(row.id, {
      id: row.id,
      name: displayName(row.name, row.email),
      avatarUrl: row.avatar_url || null,
    })
  }
  return map
}

/**
 * Nom affiché : `name` si renseigné, sinon la partie locale de l'email.
 * On n'expose jamais l'email complet d'un utilisateur aux autres lecteurs.
 */
function displayName(name: string | null, email: string | null): string {
  const trimmed = (name || '').trim()
  if (trimmed) return trimmed
  const local = (email || '').split('@')[0]?.trim()
  return local || 'Utilisateur'
}

export function serializeComment(
  row: any,
  authors: Map<string, CommentAuthor>,
  currentUserId: string | null
): SerializedComment {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    editedAt: row.edited_at || null,
    isOfficial: !!row.is_official,
    isPinned: !!row.is_pinned,
    author:
      authors.get(row.user_id) || { id: row.user_id, name: 'Utilisateur', avatarUrl: null },
    isMine: !!currentUserId && row.user_id === currentUserId,
  }
}

/**
 * Valide et normalise un corps de commentaire.
 * Retourne `{ error }` avec un message prêt à afficher, ou `{ body }` nettoyé.
 */
export function validateBody(raw: unknown): { body: string } | { error: string } {
  if (typeof raw !== 'string') return { error: 'Commentaire invalide' }
  const body = raw.trim()
  if (!body) return { error: 'Le commentaire ne peut pas être vide' }
  if (body.length > MAX_COMMENT_LENGTH) {
    return { error: `Le commentaire ne peut pas dépasser ${MAX_COMMENT_LENGTH} caractères` }
  }
  return { body }
}
