import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

/**
 * Client Supabase admin pour les API routes (server-side)
 * Utilise la service_role key pour bypasser les RLS policies
 */
export function getSupabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    // Fail fast: using anon key here would silently make admin routes subject to RLS
    // which is a common source of "no data for admin" bugs. Throw to make the
    // misconfiguration visible during development.
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set — admin operations require the service role key')
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

/**
 * Client Supabase server avec cookies (pour vérifier l'auth de l'utilisateur courant)
 */
export async function getSupabaseServer() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignoré si appelé depuis un Server Component
          }
        },
      },
    }
  )
}

/**
 * Vérifie l'utilisateur authentifié et retourne son profil
 * Retourne null si non authentifié
 */
export async function getAuthenticatedUser() {
  const supabase = await getSupabaseServer()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return null
  }

  // Récupérer le profil depuis la table users
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return {
    ...user,
    profile,
    role: profile?.role || 'user',
    isAdmin: profile?.role === 'admin',
  }
}
