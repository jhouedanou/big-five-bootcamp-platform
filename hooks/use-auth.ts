"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"

export function useAuth() {
  const { data: session, status, update } = useSession()
  const router = useRouter()

  const isLoading = status === "loading"
  const isAuthenticated = status === "authenticated"
  const user = session?.user

  const login = async (email: string, password: string) => {
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        throw new Error(result.error)
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de l'inscription")
      }

      // Auto-login après inscription
      return await login(email, password)
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  const logout = async () => {
    await signOut({ redirect: false })
    router.push("/")
  }

  const loginWithGoogle = async () => {
    await signIn("google", { callbackUrl: "/dashboard" })
  }

  const isAdmin = user?.role === "admin"
  const isModerator = user?.role === "moderator" || isAdmin
  const isPremium = user?.plan === "premium" || user?.plan === "enterprise"
  const isEnterprise = user?.plan === "enterprise"

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
    updateSession: update,
  }
}
