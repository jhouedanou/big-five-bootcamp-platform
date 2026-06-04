import { redirect } from "next/navigation"
import { getAuthenticatedUser, getSupabaseAdmin } from "@/lib/supabase-server"
import { OnboardingPageClient } from "./OnboardingPageClient"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Complétez votre profil | Laveiye",
  robots: { index: false, follow: false },
}

/**
 * Écran d'onboarding obligatoire.
 * - Non authentifié → /login
 * - Profil déjà complété → /dashboard (pas de re-onboarding)
 */
export default async function OnboardingPage() {
  const user = await getAuthenticatedUser()
  if (!user) {
    redirect("/login?redirect=/onboarding")
  }

  const supabase = getSupabaseAdmin()
  const { data: profile } = await supabase
    .from("profiles")
    .select("profile_completed")
    .eq("user_id", user.id)
    .maybeSingle()

  if (profile?.profile_completed) {
    redirect("/dashboard")
  }

  return <OnboardingPageClient />
}
