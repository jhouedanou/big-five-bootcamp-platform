import { sendMail } from "@/lib/gmail-sender"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import type { Webinar } from "@/lib/webinars"

const DEFAULT_FROM_EMAIL =
  process.env.GMAIL_FROM || process.env.CONTACT_FROM_EMAIL || "Laveiye <support@laveiye.com>"

async function getFromEmail(): Promise<string> {
  try {
    const admin = getSupabaseAdmin()
    const { data } = await admin
      .from("site_settings")
      .select("value")
      .eq("key", "contact_from_email")
      .maybeSingle<{ value: string | null }>()
    return data?.value || DEFAULT_FROM_EMAIL
  } catch {
    return DEFAULT_FROM_EMAIL
  }
}

function formatDateFr(date: string): string {
  try {
    return new Date(`${date}T00:00:00`).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
  } catch {
    return date
  }
}

function formatTimeFr(w: Webinar): string {
  const start = (w.start_time || "").slice(0, 5)
  const end = (w.end_time || "").slice(0, 5)
  if (start && end) return `${start} – ${end} (${w.timezone})`
  if (start) return `${start} (${w.timezone})`
  return "Heure à confirmer"
}

/**
 * Envoie l'email de confirmation d'inscription au webinaire.
 * Retourne { ok, error } — ne lève pas : l'inscription ne doit pas échouer
 * si l'email échoue.
 */
export async function sendWebinarConfirmation(opts: {
  to: string
  firstName: string
  webinar: Webinar
}): Promise<{ ok: boolean; error?: string }> {
  const { to, firstName, webinar } = opts
  const dateFr = formatDateFr(webinar.date)
  const timeFr = formatTimeFr(webinar)
  const link = webinar.meeting_link

  try {
    const result = await sendMail({
      from: await getFromEmail(),
      to,
      subject: "Confirmation d'inscription — Session #BigFiveDécrypte",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #0F0F0F; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: #F2B33D; margin: 0; font-size: 22px;">#BigFiveDécrypte</h1>
            <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0;">Laveiye</p>
          </div>
          <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="color: #0F0F0F; font-size: 16px;">Bonjour ${firstName},</p>
            <p style="color: #4b5563; line-height: 1.6;">
              Votre inscription à la session #BigFiveDécrypte est bien confirmée.
            </p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr><td style="padding: 6px 0; color: #6b7280;">Session</td><td style="padding: 6px 0; color: #0F0F0F; font-weight: 600;">${webinar.title}</td></tr>
              <tr><td style="padding: 6px 0; color: #6b7280;">Date</td><td style="padding: 6px 0; color: #0F0F0F;">${dateFr}</td></tr>
              <tr><td style="padding: 6px 0; color: #6b7280;">Heure</td><td style="padding: 6px 0; color: #0F0F0F;">${timeFr}</td></tr>
              ${link ? `<tr><td style="padding: 6px 0; color: #6b7280;">Lien de connexion</td><td style="padding: 6px 0;"><a href="${link}" style="color: #F2B33D;">${link}</a></td></tr>` : ""}
            </table>
            <p style="color: #4b5563; line-height: 1.6;">
              Nous vous recommandons d'ajouter ce rendez-vous à votre agenda.
            </p>
            <p style="color: #4b5563; line-height: 1.6; margin-top: 24px;">
              À bientôt,<br/>L'équipe Laveiye
            </p>
          </div>
        </div>
      `,
    })
    if (!result.ok) return { ok: false, error: result.error }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "send failed" }
  }
}
