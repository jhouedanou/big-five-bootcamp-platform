import { NextRequest, NextResponse } from "next/server"
import { checkAdmin } from "@/lib/admin-auth"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { getWebinarById } from "@/lib/webinars-server"
import { safeErrorMessage } from "@/lib/api-errors"

export const dynamic = "force-dynamic"

const MAILCHIMP_TAG = "bigfive_decrypte_registered"

const MONTHS_FR = [
  "Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre",
]

/** Nettoie un libellé pour un tag Mailchimp : sans accents, mots en _ . */
function sanitizeTagPart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

/**
 * Tag spécifique au webinaire (LOT C), généré dynamiquement :
 * Webinaire_Laveiye_<Nom>_<Mois>_<Année>
 */
function buildWebinarTag(title: string, date: string): string {
  const d = new Date(`${date}T00:00:00`)
  const month = Number.isNaN(d.getTime()) ? "" : MONTHS_FR[d.getMonth()]
  const year = Number.isNaN(d.getTime()) ? "" : String(d.getFullYear())
  return ["Webinaire_Laveiye", sanitizeTagPart(title), month, year]
    .filter(Boolean)
    .join("_")
}

/**
 * POST /api/webinars/:id/sync-mailchimp (admin)
 * Synchronise les inscrits d'une session dans Mailchimp avec le tag dédié.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdmin()
  if (!admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 })

  const { id } = await params
  const supabase = getSupabaseAdmin()

  const webinar = await getWebinarById(id)
  if (!webinar) {
    return NextResponse.json({ error: "Webinaire introuvable" }, { status: 404 })
  }
  const webinarTag = buildWebinarTag(webinar.title, webinar.date)

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
    .select("id, email, name, phone_e164, phone_number")
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
      const phone = (u as any).phone_e164 || (u as any).phone_number || ""
      const mergeFields: Record<string, string> = { FNAME: firstName }
      if (phone) mergeFields.PHONE = phone
      const res = await mailchimp.upsertMember({
        email: u.email,
        mergeFields,
        tags: [MAILCHIMP_TAG, webinarTag].filter(Boolean),
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
