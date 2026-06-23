import { NextResponse } from "next/server"
import { z } from "zod"
import { getAuthenticatedUser, getSupabaseAdmin } from "@/lib/supabase-server"
import { safeErrorMessage } from "@/lib/api-errors"
import {
  MAX_SECTORS,
  MIN_SECTORS,
  OTHER_JOB_FUNCTION,
  OTHER_SECTOR_SLUG,
} from "@/lib/onboarding"

export const dynamic = "force-dynamic"

const sectorSchema = z.object({
  sector_id: z.string().uuid(),
  sector_other_value: z.string().trim().max(120).optional().nullable(),
})

const payloadSchema = z.object({
  country: z.string().trim().min(1).max(120),
  job_function: z.string().trim().min(1).max(120),
  job_function_other: z.string().trim().max(120).optional().nullable(),
  sectors: z.array(sectorSchema).min(MIN_SECTORS).max(MAX_SECTORS),
})

/**
 * PATCH /api/me/onboarding
 * Valide et enregistre le profil onboarding. Marque profile_completed = true.
 * Source de vérité Supabase + log analytics critique (onboarding_completed).
 */
export async function PATCH(request: Request) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const json = await request.json().catch(() => null)
    const parsed = payloadSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: safeErrorMessage(parsed.error.message) },
        { status: 400 }
      )
    }
    const payload = parsed.data

    // Fonction "Autre" → précision obligatoire.
    if (payload.job_function === OTHER_JOB_FUNCTION && !payload.job_function_other?.trim()) {
      return NextResponse.json(
        { error: "Veuillez préciser votre fonction." },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Re-valider les secteurs contre la base (existence + détection "Autre").
    const sectorIds = payload.sectors.map((s) => s.sector_id)
    const { data: dbSectors, error: sectorsError } = await supabase
      .from("sectors")
      .select("id, slug")
      .in("id", sectorIds)
      .eq("is_active", true)

    if (sectorsError) {
      return NextResponse.json(
        { error: "Erreur secteurs", details: safeErrorMessage(sectorsError) },
        { status: 500 }
      )
    }
    if (!dbSectors || dbSectors.length !== sectorIds.length) {
      return NextResponse.json(
        { error: "Un ou plusieurs secteurs sont invalides." },
        { status: 400 }
      )
    }

    const otherSector = dbSectors.find((s) => s.slug === OTHER_SECTOR_SLUG)
    if (otherSector) {
      const chosen = payload.sectors.find((s) => s.sector_id === otherSector.id)
      if (chosen && !chosen.sector_other_value?.trim()) {
        return NextResponse.json(
          { error: "Veuillez préciser votre secteur d'activité." },
          { status: 400 }
        )
      }
    }

    const completedAt = new Date().toISOString()

    // Upsert du profil (la ligne existe normalement déjà via profile-status).
    const { data: profile, error: upsertError } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: user.id,
          country: payload.country,
          job_function: payload.job_function,
          job_function_other:
            payload.job_function === OTHER_JOB_FUNCTION
              ? payload.job_function_other?.trim() || null
              : null,
          onboarding_completed: true,
          onboarding_completed_at: completedAt,
          profile_completed: true,
          profile_completed_at: completedAt,
        },
        { onConflict: "user_id" }
      )
      .select("id")
      .single()

    if (upsertError || !profile) {
      return NextResponse.json(
        { error: "Impossible d'enregistrer le profil", details: safeErrorMessage(upsertError) },
        { status: 500 }
      )
    }

    // Remplacer les secteurs (suppression puis insertion).
    await supabase.from("profile_sectors").delete().eq("profile_id", profile.id)

    const rows = payload.sectors.map((s) => ({
      profile_id: profile.id,
      sector_id: s.sector_id,
      sector_other_value:
        otherSector && s.sector_id === otherSector.id
          ? s.sector_other_value?.trim() || null
          : null,
    }))

    const { error: linkError } = await supabase.from("profile_sectors").insert(rows)
    if (linkError) {
      return NextResponse.json(
        { error: "Impossible d'enregistrer les secteurs", details: safeErrorMessage(linkError) },
        { status: 500 }
      )
    }

    // Log analytics critique côté Supabase (source de vérité).
    await supabase.from("analytics_events").insert({
      user_id: user.id,
      event_name: "onboarding_completed",
      source: "server",
      metadata: {
        country: payload.country,
        job_function: payload.job_function,
        sectors_count: payload.sectors.length,
      },
    })

    return NextResponse.json({ success: true, profile_completed: true })
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur serveur", details: safeErrorMessage(err) },
      { status: 500 }
    )
  }
}
