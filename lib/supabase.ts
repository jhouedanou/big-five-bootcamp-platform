
import { createBrowserClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Singleton pour le client browser (évite les instances multiples de GoTrueClient)
let browserClient: ReturnType<typeof createBrowserClient> | null = null

export const createClient = () => {
  // Éviter la création côté serveur
  if (typeof window === 'undefined') {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  
  if (browserClient) return browserClient
  
  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return browserClient
}

// Alias pour compatibilité - sera initialisé seulement côté client
export const supabase = typeof window !== 'undefined' ? createClient() : null!

// Client Supabase admin (avec la service role key pour les opérations côté serveur)
// Note: Ne pas utiliser côté client, seulement dans les API routes
// Créé paresseusement pour éviter les instances multiples
let adminClient: ReturnType<typeof createSupabaseClient> | null = null

export const getSupabaseAdmin = () => {
  if (adminClient) return adminClient
  
  adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return adminClient
}

// Pour la compatibilité avec le code existant
export const supabaseAdmin = getSupabaseAdmin()
