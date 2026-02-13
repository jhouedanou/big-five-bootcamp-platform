
"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export function useAuth() {
  const [user, setUser] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dbUser, setDbUser] = useState<any>(null)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user?.email) {
          // Fetch additional user details from DB if needed
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('email', session.user.email)
            .single()
          setDbUser(data)
        }

      } catch (error) {
        console.error("Error checking auth:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user?.email) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('email', session.user.email)
          .single()
        setDbUser(data)
      } else {
        setDbUser(null)
      }

      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const login = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw new Error(error.message === "Invalid login credentials" ? "Email ou mot de passe incorrect" : error.message)
      }

      router.refresh()
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  const register = async (name: string, email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
          emailRedirectTo: `${location.origin}/auth/callback`
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      // Note: Ideally, a Trigger creates the User record in public.User.
      // If not using triggers, we might need to insert here, but RLS might block it.
      // For now, we assume Supabase Auth is the source of truth for auth, 
      // and we might need an API route to sync if Trigger isn't set up.

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setDbUser(null)
    router.push("/login")
    router.refresh()
  }

  const loginWithGoogle = async () => {
    // Removed as per user request
    console.warn("Google login disabled")
  }

  // Derived state from DB user or fallbacks
  const isAdmin = dbUser?.role === "admin"
  const isModerator = dbUser?.role === "moderator" || isAdmin
  const isPremium = dbUser?.plan?.toLowerCase() === "premium" || dbUser?.plan?.toLowerCase() === "enterprise"
  const isEnterprise = dbUser?.plan?.toLowerCase() === "enterprise"

  return {
    user,
    session,
    isLoading,
    isAuthenticated: !!session,
    isAdmin,
    isModerator,
    isPremium,
    isEnterprise,
    login,
    register,
    logout,
    loginWithGoogle,
    // updateSession: update, // Not needed with Supabase real-time
  }
}
