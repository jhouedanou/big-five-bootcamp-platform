"use client"

import React, { createContext, useContext, useEffect, useState, useRef, useMemo, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase"
import type { User, Session, AuthChangeEvent } from "@supabase/supabase-js"

// Types
export interface UserProfile {
  id: string
  email: string
  name: string
  role: string
  plan: string
  status: string
  subscription_status: string | null
  subscription_end_date: string | null
  monthly_click_count?: number
  monthly_campaigns_explored?: number
  monthly_click_reset?: string
  [key: string]: any
}

interface AuthContextType {
  // Auth state
  user: User | null
  session: Session | null
  userProfile: UserProfile | null
  loading: boolean

  // Derived state
  isAuthenticated: boolean
  isAdmin: boolean
  isModerator: boolean
  isPremium: boolean
  isEnterprise: boolean
  userPlan: string
  isFreeUser: boolean

  // Click counters (chargés depuis /api/track-click)
  monthlyClicks: number
  monthlyExplored: number
  refreshClickCounters: () => Promise<void>

  // Actions
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>
  signUp: (email: string, password: string, name?: string) => Promise<{ data: any; error: any }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ data: any; error: any }>
  updatePassword: (newPassword: string) => Promise<{ data: any; error: any }>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [monthlyClicks, setMonthlyClicks] = useState(0)
  const [monthlyExplored, setMonthlyExplored] = useState(0)

  const initialCheckDone = useRef(false)
  const profileFetchedForId = useRef<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  // Fetch user profile from DB (une seule fois par user ID)
  const fetchUserProfile = useCallback(async (authUser: User) => {
    // Éviter les doubles appels pour le même user
    if (profileFetchedForId.current === authUser.id && userProfile) return

    profileFetchedForId.current = authUser.id

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single()

      if (error?.code === "PGRST116") {
        // L'utilisateur n'existe pas encore en DB, le créer
        const { data: newProfile, error: createError } = await supabase
          .from("users")
          .insert({
            id: authUser.id,
            email: authUser.email!,
            name: authUser.user_metadata?.name || authUser.email!.split("@")[0],
            role: "user",
            plan: "Free",
            status: "active",
            subscription_status: "none",
          })
          .select("*")
          .single()

        if (!createError && newProfile) {
          setUserProfile(newProfile as UserProfile)
        }
      } else if (!error && data) {
        // Vérifier si l'abonnement payant est expiré
        const isPaid = ["basic", "pro"].includes(
          data.plan?.toLowerCase() || ""
        )
        if (
          isPaid &&
          data.subscription_end_date &&
          new Date(data.subscription_end_date) < new Date()
        ) {
          // Abonnement expiré → forcer Free côté client
          setUserProfile({ ...data, plan: "Free", subscription_status: "expired" } as UserProfile)
          // Fire & forget : synchroniser la DB
          fetch("/api/cron/check-subscriptions").catch(() => {})
        } else {
          setUserProfile(data as UserProfile)
        }
      }
    } catch (err) {
      console.error("AuthProvider: erreur chargement profil", err)
    }
  }, [supabase, userProfile])

  // Charger les compteurs de clics
  const refreshClickCounters = useCallback(async () => {
    try {
      const res = await fetch("/api/track-click")
      if (res.ok) {
        const data = await res.json()
        setMonthlyClicks(data.clicks || 0)
        setMonthlyExplored(data.explored || 0)
      }
    } catch {
      // Silencieux
    }
  }, [])

  // Forcer le rechargement du profil (par ex. après un paiement)
  const refreshProfile = useCallback(async () => {
    if (user) {
      profileFetchedForId.current = null
      await fetchUserProfile(user)
      await refreshClickCounters()
    }
  }, [user, fetchUserProfile, refreshClickCounters])

  // Initialisation : une seule vérification auth + onAuthStateChange
  useEffect(() => {
    let mounted = true

    const initialize = async () => {
      try {
        // 1. getUser() valide le token côté serveur (fiable après refresh middleware)
        const { data: { user: authUser } } = await supabase.auth.getUser()

        if (!mounted) return

        if (authUser) {
          setUser(authUser)
          // Récupérer aussi la session
          const { data: { session: authSession } } = await supabase.auth.getSession()
          if (mounted) setSession(authSession)

          await fetchUserProfile(authUser)
          await refreshClickCounters()
        }

        initialCheckDone.current = true
      } catch (err) {
        console.error("AuthProvider: erreur init", err)
        initialCheckDone.current = true
      } finally {
        if (mounted) setLoading(false)
      }
    }

    initialize()

    // 2. Écouter les changements d'auth (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, newSession: Session | null) => {
        // Ignorer les events tant que l'init n'est pas finie
        if (!initialCheckDone.current) return
        if (!mounted) return

        if (event === "PASSWORD_RECOVERY") {
          // L'utilisateur a cliqué sur le lien de réinitialisation de mot de passe
          // Rediriger vers la page de changement de mot de passe
          if (newSession?.user) {
            setUser(newSession.user)
            setSession(newSession)
          }
          router.push("/update-password")
          return
        } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
          if (newSession?.user) {
            setUser(newSession.user)
            setSession(newSession)

            // Ne re-fetch le profil que si c'est un nouvel user
            if (profileFetchedForId.current !== newSession.user.id) {
              await fetchUserProfile(newSession.user)
              await refreshClickCounters()
            }
          }
        } else if (event === "SIGNED_OUT") {
          setUser(null)
          setSession(null)
          setUserProfile(null)
          setMonthlyClicks(0)
          setMonthlyExplored(0)
          profileFetchedForId.current = null
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase, fetchUserProfile, refreshClickCounters])

  // Actions
  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }, [supabase])

  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: name || email.split("@")[0] },
      },
    })

    if (data.user && !error) {
      await supabase.from("users").insert({
        id: data.user.id,
        email: data.user.email!,
        name: name || data.user.email!.split("@")[0],
        role: "user",
        plan: "Free",
        status: "active",
        subscription_status: "none",
      })
    }

    return { data, error }
  }, [supabase])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut({ scope: "local" })
    setUser(null)
    setSession(null)
    setUserProfile(null)
    setMonthlyClicks(0)
    setMonthlyExplored(0)
    profileFetchedForId.current = null
  }, [supabase])

  const resetPassword = useCallback(async (email: string) => {
    const baseUrl = window.location.origin
    // Poser un cookie pour que le callback sache qu'il s'agit d'un reset password
    // (les query params dans redirectTo peuvent être perdus lors du redirect Supabase)
    document.cookie = 'sb-password-recovery=true; path=/; max-age=3600; samesite=lax'
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${baseUrl}/auth/callback?type=recovery&next=/update-password`,
    })
    return { data, error }
  }, [supabase])

  const updatePassword = useCallback(async (newPassword: string) => {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword })
    return { data, error }
  }, [supabase])

  // Derived state
  const planLower = userProfile?.plan?.toLowerCase() || "free"
  const isAuthenticated = !!user
  const isAdmin = userProfile?.role === "admin"
  const isModerator = userProfile?.role === "moderator" || isAdmin
  const isPremium = ["basic", "pro"].includes(planLower)
  // Legacy : agency / enterprise n'existent plus mais on garde un flag neutre pour compat
  const isEnterprise = false
  const userPlan = userProfile?.plan || "Free"
  const isFreeUser = !isPremium || userProfile?.subscription_status !== "active"

  const contextValue = useMemo<AuthContextType>(() => ({
    user,
    session,
    userProfile,
    loading,
    isAuthenticated,
    isAdmin,
    isModerator,
    isPremium,
    isEnterprise,
    userPlan,
    isFreeUser,
    monthlyClicks,
    monthlyExplored,
    refreshClickCounters,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    refreshProfile,
  }), [
    user, session, userProfile, loading,
    isAuthenticated, isAdmin, isModerator, isPremium, isEnterprise,
    userPlan, isFreeUser,
    monthlyClicks, monthlyExplored, refreshClickCounters,
    signIn, signUp, signOut, resetPassword, updatePassword, refreshProfile,
  ])

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook pour consommer le contexte Auth.
 * Doit être utilisé dans un composant enfant de <AuthProvider>.
 */
export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuthContext doit être utilisé à l'intérieur de <AuthProvider>")
  }
  return ctx
}
