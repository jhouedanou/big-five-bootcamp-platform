
"use client"

import { useAuthContext } from "@/components/auth-provider"
import { useRouter } from "next/navigation"

/**
 * Hook d'authentification — délègue entièrement au AuthProvider centralisé.
 * Aucun appel getUser() ou requête DB n'est effectué ici.
 */
export function useAuth() {
  const {
    user,
    session,
    userProfile,
    loading: isLoading,
    isAuthenticated,
    isAdmin,
    isModerator,
    isPremium,
    isEnterprise,
    signIn,
    signOut,
    signUp,
  } = useAuthContext()

  const router = useRouter()

  const login = async (email: string, password: string) => {
    try {
      const { error } = await signIn(email, password)
      if (error) {
        throw new Error(
          error.message === "Invalid login credentials"
            ? "Email ou mot de passe incorrect"
            : error.message
        )
      }
      router.refresh()
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  const register = async (name: string, email: string, password: string) => {
    try {
      const { error } = await signUp(email, password, name)
      if (error) {
        throw new Error(error.message)
      }
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  const logout = async () => {
    await signOut()
    router.push("/login")
    router.refresh()
  }

  const loginWithGoogle = async () => {
    console.warn("Google login disabled")
  }

  return {
    user,
    session,
    isLoading,
    isAuthenticated,
    isAdmin,
    isModerator,
    isPremium,
    isEnterprise,
    login,
    register,
    logout,
    loginWithGoogle,
  }
}
