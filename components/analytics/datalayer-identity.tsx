"use client"

import { useEffect, useState } from "react"

import { useAuthContext } from "@/components/auth-provider"
import { hasCompletedActivation } from "@/lib/analytics"
import { clearDataLayerIdentity, setDataLayerIdentity } from "@/lib/datalayer"

/**
 * Paramètres transversaux du brief (§5) : `user_id`, `user_stage`,
 * `subscription_plan`.
 *
 * Le brief en fait des paramètres transversaux, pas des paramètres d'événement :
 * ils doivent accompagner CHAQUE push, pas seulement les quelques événements qui
 * les nomment. Les poser ici, une fois, plutôt que sur chaque appel, est le seul
 * moyen qu'ils ne finissent pas par manquer quelque part.
 *
 * `user_id` est l'identifiant interne Supabase — pseudonyme, jamais l'adresse
 * e-mail, comme l'exige le brief.
 */

type Stage = "lead" | "account_created" | "signup_completed" | "activated" | "paid"

/**
 * `dormant` est absent de cette liste à dessein : le brief §9 en fait un calcul
 * quotidien du back-end (« aucune activité depuis 14 jours »). Un navigateur en
 * train d'émettre un événement est, par définition, tout sauf dormant.
 */
function resolveStage(opts: {
  authenticated: boolean
  subscriptionActive: boolean
  onboardingCompleted: boolean | null
  activated: boolean
}): Stage {
  if (!opts.authenticated) return "lead"
  if (opts.subscriptionActive) return "paid"
  if (opts.activated) return "activated"
  if (opts.onboardingCompleted) return "signup_completed"
  return "account_created"
}

export function DataLayerIdentity() {
  const { user, userProfile, isAuthenticated } = useAuthContext()
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null)

  // L'état d'onboarding vit dans `profiles`, que le contexte d'auth ne charge
  // pas. Une lecture par session suffit : il ne change qu'une fois.
  useEffect(() => {
    if (!isAuthenticated) {
      setOnboardingCompleted(null)
      return
    }
    let cancelled = false
    fetch("/api/me/profile-status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        setOnboardingCompleted(data.onboarding_completed === true)
      })
      .catch(() => {
        /* la mesure ne doit jamais dépendre de cet appel */
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Visiteur anonyme : pas d'identifiant, mais l'étape reste une information.
      setDataLayerIdentity({ user_stage: "lead" })
      return
    }

    const plan = (userProfile?.plan || "").toLowerCase()
    const subscriptionActive = userProfile?.subscription_status === "active"

    setDataLayerIdentity({
      user_id: user.id,
      user_stage: resolveStage({
        authenticated: true,
        subscriptionActive,
        onboardingCompleted,
        activated: hasCompletedActivation(),
      }),
      // Le brief attend `free`, `discovery`, `basic` ou `pro`. Un compte sans
      // plan est un compte gratuit, pas un compte sans valeur.
      subscription_plan: plan || "free",
    })

    return () => {
      clearDataLayerIdentity()
    }
  }, [isAuthenticated, user, userProfile, onboardingCompleted])

  return null
}
