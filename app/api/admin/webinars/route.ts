import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkAdmin } from "@/lib/admin-auth"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { generateSlug } from "@/lib/utils"
import { safeErrorMessage } from "@/lib/api-errors"
import { WEBINAR_COLUMNS } from "@/lib/webinars-server"

export const dynamic = "force-dynamic"

/** GET /api/admin/webinars — toutes les sessions (tous statuts) + nb inscrits. */
export async function GET() {
  const admin = await checkAdmin()
  if (!admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 })

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("webinars")
    .select(WEBINAR_COLUMNS)
    .order("date", { ascending: false })

  if (error) {
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 500 })
  }

  const webinars = data ?? []
  const ids = webinars.map((w: any) => w.id)
  const counts = new Map<string, number>()
  if (ids.length) {
    const { data: regs } = await supabase
      .from("webinar_registrations")
      .select("webinar_id")
      .in("webinar_id", ids)
      .eq("registration_status", "registered")
    for (const r of regs ?? []) counts.set(r.webinar_id, (counts.get(r.webinar_id) ?? 0) + 1)
  }

  return NextResponse.json({
    webinars: webinars.map((w: any) => ({ ...w, registrations_count: counts.get(w.id) ?? 0 })),
  })
}

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().max(200).optional(),
  short_description: z.string().trim().max(500).optional().nullable(),
  full_description: z.string().trim().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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

/** POST /api/admin/webinars — création de session. */
export async function POST(request: NextRequest) {
  const admin = await checkAdmin()
  if (!admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 })

  const json = await request.json().catch(() => null)
  const parsed = createSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: safeErrorMessage(parsed.error.message) },
      { status: 400 }
    )
  }

  const supabase = getSupabaseAdmin()
  const baseSlug = parsed.data.slug?.trim() || generateSlug(parsed.data.title)
  if (!baseSlug) {
    return NextResponse.json({ error: "Slug invalide" }, { status: 400 })
  }

  // Unicité du slug : suffixe incrémental si collision.
  let slug = baseSlug
  for (let i = 2; i < 100; i++) {
    const { data: clash } = await supabase.from("webinars").select("id").eq("slug", slug).maybeSingle()
    if (!clash) break
    slug = `${baseSlug}-${i}`
  }

  const { data, error } = await supabase
    .from("webinars")
    .insert({ ...parsed.data, slug })
    .select(WEBINAR_COLUMNS)
    .single()

  if (error) {
    return NextResponse.json(
      { error: "Création impossible", details: safeErrorMessage(error) },
      { status: 500 }
    )
  }

  return NextResponse.json({ webinar: data })
}
