import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkAdmin } from "@/lib/admin-auth"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { safeErrorMessage } from "@/lib/api-errors"

export const dynamic = "force-dynamic"

const schema = z.object({
  tag_ids: z.array(z.string().uuid()).min(1).max(50),
})

/**
 * POST /api/admin/users/:id/tags
 * Applique un ou plusieurs tags à un utilisateur (admin only).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await checkAdmin()
  if (!admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 })

  const { id: userId } = await params
  const json = await request.json().catch(() => null)
  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const rows = parsed.data.tag_ids.map((tag_id) => ({
    user_id: userId,
    tag_id,
    assigned_by: admin.id,
  }))

  const { error } = await supabase
    .from("user_tags")
    .upsert(rows, { onConflict: "user_id,tag_id", ignoreDuplicates: true })

  if (error) {
    return NextResponse.json(
      { error: "Application impossible", details: safeErrorMessage(error) },
      { status: 500 }
    )
  }

  await supabase.from("analytics_events").insert({
    user_id: admin.id,
    event_name: "admin_tag_applied",
    source: "admin",
    metadata: { target_user_id: userId, tag_ids: parsed.data.tag_ids },
  })

  return NextResponse.json({ success: true, applied: rows.length })
}

const deleteSchema = z.object({
  tag_id: z.string().uuid(),
})

/**
 * DELETE /api/admin/users/:id/tags
 * Retire UN tag assigné à un utilisateur (LOT G — suppression individuelle).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await checkAdmin()
  if (!admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 })

  const { id: userId } = await params
  const json = await request.json().catch(() => null)
  const parsed = deleteSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from("user_tags")
    .delete()
    .eq("user_id", userId)
    .eq("tag_id", parsed.data.tag_id)

  if (error) {
    return NextResponse.json(
      { error: "Suppression impossible", details: safeErrorMessage(error) },
      { status: 500 }
    )
  }

  await supabase.from("analytics_events").insert({
    user_id: admin.id,
    event_name: "admin_tag_removed",
    source: "admin",
    metadata: { target_user_id: userId, tag_id: parsed.data.tag_id },
  })

  return NextResponse.json({ success: true })
}
