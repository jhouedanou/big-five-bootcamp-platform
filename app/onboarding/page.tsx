import { redirect } from "next/navigation"
import { getAuthenticatedUser, getSupabaseAdmin } from "@/lib/supabase-server"
import { OnboardingPageClient } from "./OnboardingPageClient"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Complétez votre profil | Laveiye",
  robots: { index: false, follow: false },
}

/**
 * Valide la destination post-onboarding : chemin interne uniquement
 * (pas d'open redirect via //host ou URL absolue).
 */
function sanitizeNext(next: string | undefined): string {
  if (!next) return "/dashboard"
  if (!next.startsWith("/") || next.startsWith("//")) return "/dashboard"
  return next
}

/**
 * Écran d'onboarding obligatoire.
 * - Non authentifié → /login
 * - Profil déjà complété → destination ?next= (ou /dashboard)
 */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const user = await getAuthenticatedUser()
  if (!user) {
    redirect("/login?redirect=/onboarding")
  }

  const { next } = await searchParams
  const nextPath = sanitizeNext(next)

  const supabase = getSupabaseAdmin()
  const { data: profile } = await supabase
    .from("profiles")
    .select("profile_completed")
    .eq("user_id", user.id)
    .maybeSingle()

  if (profile?.profile_completed) {
    redirect(nextPath)
  }

  return <OnboardingPageClient nextPath={nextPath} />
}
