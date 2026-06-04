import { NextRequest, NextResponse } from "next/server"
import { checkAdmin } from "@/lib/admin-auth"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { safeErrorMessage } from "@/lib/api-errors"

export const dynamic = "force-dynamic"

const MAILCHIMP_TAG = "bigfive_decrypte_registered"

/**
 * POST /api/webinars/:id/sync-mailchimp (admin)
 * Synchronise les inscrits d'une session dans Mailchimp avec le tag dédié.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdmin()
  if (!admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 })

  const { id } = await params
  const supabase = getSupabaseAdmin()

  const { data: regs } = await supabase
    .from("webinar_registrations")
    .select("user_id")
    .eq("webinar_id", id)
    .eq("registration_status", "registered")

  const userIds = (regs ?? []).map((r) => r.user_id)
  if (userIds.length === 0) {
    return NextResponse.json({ synced: 0, errors: [] })
  }

  const { data: users } = await supabase
    .from("users")
    .select("id, email, name")
    .in("id", userIds)

  try {
    const { getMailchimpService } = await import("@/lib/mailchimp")
    const mailchimp = getMailchimpService()
    await mailchimp.loadConfig()

    let synced = 0
    const errors: string[] = []
    for (const u of users ?? []) {
      if (!u.email) continue
      const firstName = (u.name || u.email.split("@")[0]).split(" ")[0]
      const res = await mailchimp.upsertMember({
        email: u.email,
        mergeFields: { FNAME: firstName },
        tags: [MAILCHIMP_TAG],
      })
      if ((res as any)?.ok) synced++
      else errors.push(`${u.email}: ${(res as any)?.error ?? "échec"}`)
    }

    return NextResponse.json({ synced, errors })
  } catch (err) {
    return NextResponse.json(
      { error: "Sync Mailchimp impossible", details: safeErrorMessage(err) },
      { status: 500 }
    )
  }
}
