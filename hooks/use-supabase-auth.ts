'use client'

import { useAuthContext } from '@/components/auth-provider'

/**
 * Hook d'authentification Supabase — délègue entièrement au AuthProvider centralisé.
 * Aucun appel getUser() ou requête DB n'est effectué ici.
 */
export function useSupabaseAuth() {
  const {
    user,
    userProfile,
    loading,
    isAuthenticated,
    isAdmin,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
  } = useAuthContext()

  return {
    user,
    userProfile,
    loading,
    isAuthenticated,
    isAdmin,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
  }
}
