
"use client"

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export function useAuth() {
  const [user, setUser] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dbUser, setDbUser] = useState<any>(null)
  const initialCheckDone = useRef(false)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      try {
        // getUser() valide le token côté serveur (fiable après refresh)
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
          setSession(null)
          setUser(null)
          setDbUser(null)
          initialCheckDone.current = true
          return
        }

        // Récupérer la session pour les composants qui en ont besoin
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setUser(user)
        initialCheckDone.current = true

        if (user.email) {
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('email', user.email)
            .single()
          setDbUser(data)
        }

      } catch (error) {
        console.error("Error checking auth:", error)
        initialCheckDone.current = true
      } finally {
        setIsLoading(false)
      }
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
      // Ignorer les events tant que getUser() n'a pas fini
      // pour éviter que INITIAL_SESSION écrase user à null
      if (!initialCheckDone.current) return

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

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  const logout = async () => {
    await supabase.auth.signOut({ scope: 'local' })
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
  const isPremium = ["premium", "pro", "basic", "agency", "enterprise"].includes(dbUser?.plan?.toLowerCase() || "")
  const isEnterprise = dbUser?.plan?.toLowerCase() === "enterprise"

  return {
    user,
    session,
    isLoading,
    isAuthenticated: !!session || !!user,
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
