import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser, getSupabaseAdmin } from "@/lib/supabase-server"
import { getWebinarById } from "@/lib/webinars-server"
import { buildIcs } from "@/lib/webinars"

export const dynamic = "force-dynamic"

/**
 * GET /api/webinars/:id/calendar.ics
 * Renvoie un fichier .ics. Marque calendar_added_at si l'utilisateur est inscrit.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const webinar = await getWebinarById(id)
  if (!webinar || webinar.status !== "published") {
    return NextResponse.json({ error: "Webinaire introuvable" }, { status: 404 })
  }

  // Best-effort : trace l'ajout calendrier pour l'utilisateur inscrit.
  const user = await getAuthenticatedUser()
  if (user) {
    const supabase = getSupabaseAdmin()
    await supabase
      .from("webinar_registrations")
      .update({ calendar_added_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("webinar_id", id)
    await supabase.from("analytics_events").insert({
      user_id: user.id,
      event_name: "webinar_calendar_added",
      source: "webinar",
      metadata: { webinar_id: id },
    })
  }

  const ics = buildIcs(webinar)
  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="bigfive-decrypte-${webinar.slug}.ics"`,
    },
  })
}
