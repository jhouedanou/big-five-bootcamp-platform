import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkAdmin } from "@/lib/admin-auth"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { safeErrorMessage } from "@/lib/api-errors"
import { WEBINAR_COLUMNS } from "@/lib/webinars-server"

export const dynamic = "force-dynamic"

const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  short_description: z.string().trim().max(500).optional().nullable(),
  full_description: z.string().trim().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  start_time: z.string().optional().nullable(),
  end_time: z.string().optional().nullable(),
  timezone: z.string().optional(),
  meeting_link: z.string().trim().max(500).optional().nullable(),
  speaker_name: z.string().trim().max(200).optional().nullable(),
  status: z.enum(["draft", "published", "completed", "cancelled"]).optional(),
  registration_enabled: z.boolean().optional(),
  public_preview_enabled: z.boolean().optional(),
  max_participants: z.number().int().positive().optional().nullable(),
})

/** PATCH /api/admin/webinars/:id — édition / publication / statut / inscriptions. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdmin()
  if (!admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 })

  const { id } = await params
  const json = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 })
  }
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour" }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("webinars")
    .update(parsed.data)
    .eq("id", id)
    .select(WEBINAR_COLUMNS)
    .single()

  if (error) {
    return NextResponse.json(
      { error: "Mise à jour impossible", details: safeErrorMessage(error) },
      { status: 500 }
    )
  }
  return NextResponse.json({ webinar: data })
}

/** DELETE /api/admin/webinars/:id */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdmin()
  if (!admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 })

  const { id } = await params
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from("webinars").delete().eq("id", id)
  if (error) {
    return NextResponse.json(
      { error: "Suppression impossible", details: safeErrorMessage(error) },
      { status: 500 }
    )
  }
  return NextResponse.json({ success: true })
}
