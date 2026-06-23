import { NextResponse } from "next/server"
import { getAuthenticatedUser, getSupabaseAdmin } from "@/lib/supabase-server"
import { safeErrorMessage } from "@/lib/api-errors"
import type { ProfileStatus } from "@/lib/onboarding"

export const dynamic = "force-dynamic"

/**
 * GET /api/me/profile-status
 * Retourne l'état de complétion du profil de l'utilisateur courant.
 * Crée la ligne profiles à la volée si elle n'existe pas encore.
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()

    let { data: profile } = await supabase
      .from("profiles")
      .select(
        "id, country, job_function, job_function_other, onboarding_completed, profile_completed"
      )
      .eq("user_id", user.id)
      .maybeSingle()

    // Auto-création de la ligne profil au premier accès.
    if (!profile) {
      const { data: created, error: insertError } = await supabase
        .from("profiles")
        .insert({ user_id: user.id })
        .select(
          "id, country, job_function, job_function_other, onboarding_completed, profile_completed"
        )
        .single()

      if (insertError) {
        return NextResponse.json(
          { error: "Erreur profil", details: safeErrorMessage(insertError) },
          { status: 500 }
        )
      }
      profile = created
    }

    const { data: links } = await supabase
      .from("profile_sectors")
      .select("sector_id")
      .eq("profile_id", profile.id)

    const status: ProfileStatus = {
      profile_completed: profile.profile_completed,
      onboarding_completed: profile.onboarding_completed,
      country: profile.country,
      job_function: profile.job_function,
      job_function_other: profile.job_function_other,
      sector_ids: (links ?? []).map((l) => l.sector_id),
    }

    return NextResponse.json(status)
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur serveur", details: safeErrorMessage(err) },
      { status: 500 }
    )
  }
}
