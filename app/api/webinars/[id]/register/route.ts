import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser, getSupabaseAdmin } from "@/lib/supabase-server"
import { getWebinarById, getRegistrationCount } from "@/lib/webinars-server"
import { canRegister } from "@/lib/webinars"
import { sendWebinarConfirmation } from "@/lib/webinar-emails"
import { safeErrorMessage } from "@/lib/api-errors"
import { sendGA4ServerEvent } from "@/lib/ga4-mp"

export const dynamic = "force-dynamic"

const MAILCHIMP_TAG = "bigfive_decrypte_registered"

/**
 * POST /api/webinars/:id/register
 * Inscrit l'utilisateur connecté : contrôles + insertion + email + Mailchimp.
 * L'email/Mailchimp ne bloquent JAMAIS l'inscription.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 })
    }

    const webinar = await getWebinarById(id)
    if (!webinar || webinar.status !== "published") {
      return NextResponse.json({ error: "Webinaire introuvable" }, { status: 404 })
    }

    const supabase = getSupabaseAdmin()

    // Anti-doublon : déjà inscrit ?
    const { data: existing } = await supabase
      .from("webinar_registrations")
      .select("id, registration_status")
      .eq("user_id", user.id)
      .eq("webinar_id", id)
      .maybeSingle()
    if (existing && existing.registration_status === "registered") {
      return NextResponse.json({ error: "Vous êtes déjà inscrit à cette session.", alreadyRegistered: true }, { status: 409 })
    }

    // Inscriptions ouvertes / session non passée / non complète
    const count = await getRegistrationCount(id)
    if (!canRegister(webinar, count)) {
      return NextResponse.json(
        { error: "Les inscriptions ne sont pas ouvertes pour cette session." },
        { status: 409 }
      )
    }

    // Insertion (réactive une éventuelle inscription annulée).
    const { data: reg, error: insertError } = await supabase
      .from("webinar_registrations")
      .upsert(
        {
          user_id: user.id,
          webinar_id: id,
          registration_status: "registered",
          registered_at: new Date().toISOString(),
        },
        { onConflict: "user_id,webinar_id" }
      )
      .select("id")
      .single()

    if (insertError || !reg) {
      return NextResponse.json(
        { error: "Inscription impossible", details: safeErrorMessage(insertError) },
        { status: 500 }
      )
    }

    // Log critique (Supabase) : inscription complétée.
    await supabase.from("analytics_events").insert({
      user_id: user.id,
      event_name: "webinar_registration_completed",
      source: "webinar",
      metadata: { webinar_id: id, slug: webinar.slug },
    })

    // Relais GA4 (Measurement Protocol) — événement critique côté serveur.
    void sendGA4ServerEvent("webinar_registration_completed", {
      source: "webinar",
      webinar_id: id,
      slug: webinar.slug,
      user_id: user.id,
    })

    const email = user.email!
    const firstName = (user.profile?.name || email.split("@")[0]).split(" ")[0]

    // --- Email de confirmation (non bloquant) ---
    const emailResult = await sendWebinarConfirmation({ to: email, firstName, webinar })
    if (emailResult.ok) {
      await supabase
        .from("webinar_registrations")
        .update({ confirmation_email_sent: true, confirmation_email_sent_at: new Date().toISOString() })
        .eq("id", reg.id)
      await supabase.from("analytics_events").insert({
        user_id: user.id,
        event_name: "webinar_confirmation_email_sent",
        source: "webinar",
        metadata: { webinar_id: id },
      })
    } else {
      // Conserver l'inscription, marquer l'échec, logguer.
      await supabase
        .from("webinar_registrations")
        .update({ confirmation_email_sent: false })
        .eq("id", reg.id)
      console.error(`[webinar/register] email échoué pour ${email}:`, emailResult.error)
    }

    // --- Mailchimp (non bloquant) ---
    try {
      const { getMailchimpService } = await import("@/lib/mailchimp")
      const mailchimp = getMailchimpService()
      await mailchimp.loadConfig()
      await mailchimp.upsertMember({
        email,
        mergeFields: { FNAME: firstName },
        tags: [MAILCHIMP_TAG],
      })
    } catch (e) {
      console.error("[webinar/register] Mailchimp échoué:", e)
    }

    return NextResponse.json({
      success: true,
      registration_id: reg.id,
      confirmation_email_sent: emailResult.ok,
    })
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur serveur", details: safeErrorMessage(err) },
      { status: 500 }
    )
  }
}
