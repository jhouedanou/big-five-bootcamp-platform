import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkAdmin } from "@/lib/admin-auth"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { safeErrorMessage } from "@/lib/api-errors"
import { generateSlug } from "@/lib/utils"

export const dynamic = "force-dynamic"

/** GET /api/admin/tags — liste de tous les tags. */
export async function GET() {
  const admin = await checkAdmin()
  if (!admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 })

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("tags")
    .select("id, name, slug, color, created_at")
    .order("name", { ascending: true })

  if (error) {
    return NextResponse.json(
      { error: "Erreur de chargement", details: safeErrorMessage(error) },
      { status: 500 }
    )
  }
  return NextResponse.json({ tags: data ?? [] })
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
})

/** POST /api/admin/tags — création d'un tag. */
export async function POST(request: NextRequest) {
  const admin = await checkAdmin()
  if (!admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 })

  const json = await request.json().catch(() => null)
  const parsed = createSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const slug = generateSlug(parsed.data.name)
  if (!slug) {
    return NextResponse.json({ error: "Nom de tag invalide" }, { status: 400 })
  }

  // Idempotent : si le slug existe déjà, on renvoie le tag existant.
  const { data: existing } = await supabase
    .from("tags")
    .select("id, name, slug, color")
    .eq("slug", slug)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ tag: existing, created: false })
  }

  const { data, error } = await supabase
    .from("tags")
    .insert({
      name: parsed.data.name,
      slug,
      color: parsed.data.color ?? "#0F0F0F",
      created_by: admin.id,
    })
    .select("id, name, slug, color")
    .single()

  if (error) {
    return NextResponse.json(
      { error: "Création impossible", details: safeErrorMessage(error) },
      { status: 500 }
    )
  }

  await supabase.from("analytics_events").insert({
    user_id: admin.id,
    event_name: "admin_tag_created",
    source: "admin",
    metadata: { tag_id: data.id, name: data.name },
  })

  return NextResponse.json({ tag: data, created: true })
}
