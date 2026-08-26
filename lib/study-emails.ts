/**
 * Email de livraison d'une étude téléchargeable (landing /etudes/[slug]).
 * Même transport que les autres emails transactionnels : lib/gmail-sender.ts.
 */
import { sendMail } from '@/lib/gmail-sender'
import { getSupabaseAdmin } from '@/lib/supabase-server'

const DEFAULT_FROM_EMAIL =
  process.env.GMAIL_FROM || process.env.CONTACT_FROM_EMAIL || 'Big Five <support@laveiye.com>'

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://laveiye.com'
  ).replace(/\/$/, '')
}

async function getFromEmail(): Promise<string> {
  try {
    const admin = getSupabaseAdmin()
    const { data } = await admin
      .from('site_settings')
      .select('value')
      .eq('key', 'contact_from_email')
      .maybeSingle<{ value: string | null }>()
    return data?.value || DEFAULT_FROM_EMAIL
  } catch {
    return DEFAULT_FROM_EMAIL
  }
}

/**
 * Échappe le texte injecté dans le HTML de l'email. Prénom, nom et société
 * viennent d'un formulaire public : sans ça, un champ contenant du balisage
 * casse le rendu de l'email (voire pire selon le client mail).
 */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Envoie l'étude (ou l'accusé de réception si le fichier n'est pas encore
 * disponible). Ne lève jamais : la capture du lead ne doit pas échouer parce
 * que l'email échoue — l'appelant décide quoi afficher.
 */
export async function sendStudyDeliveryEmail(opts: {
  to: string
  firstName: string
  studyTitle: string
  studySubtitle?: string | null
  /** Jeton du lead — absent si le fichier n'est pas encore déposé. */
  downloadToken?: string | null
}): Promise<{ ok: boolean; error?: string }> {
  const { to, firstName, studyTitle, studySubtitle, downloadToken } = opts
  // Passe par la page de relais, qui mesure le téléchargement avant de laisser
  // l'API servir le fichier (brief §6 : « accès effectif au fichier »). Les
  // mails déjà envoyés pointent sur /api/etudes/download, qui reste en service
  // — ils délivrent l'étude, simplement sans mesure.
  const downloadUrl = downloadToken
    ? `${appUrl()}/etudes/telechargement?token=${downloadToken}`
    : null

  const body = downloadUrl
    ? `
        <p style="color: #4b5563; line-height: 1.6;">
          Merci pour votre intérêt. Votre exemplaire de l'étude est prêt&nbsp;:
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${downloadUrl}"
             style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #2563eb); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 999px; font-weight: 600; font-size: 15px;">
            Télécharger l'étude
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 13px; line-height: 1.6;">
          Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur&nbsp;:<br />
          <span style="color: #6b7280; word-break: break-all;">${downloadUrl}</span>
        </p>`
    : `
        <p style="color: #4b5563; line-height: 1.6;">
          Merci pour votre intérêt. Votre demande est bien enregistrée&nbsp;:
          nous vous envoyons l'étude par email dès sa mise à disposition,
          d'ici quelques jours.
        </p>`

  try {
    const result = await sendMail({
      from: await getFromEmail(),
      to,
      subject: `Votre étude — ${studyTitle}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #0F0F0F; padding: 28px 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 20px; line-height: 1.4;">${esc(studyTitle)}</h1>
            ${
              studySubtitle
                ? `<p style="color: #F2B33D; margin: 8px 0 0; font-size: 15px; font-weight: 600;">${esc(studySubtitle)}</p>`
                : ''
            }
          </div>
          <div style="background: #ffffff; padding: 28px 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="color: #0F0F0F; font-size: 16px; margin-top: 0;">Bonjour ${esc(firstName)},</p>
            ${body}
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0;" />
            <p style="color: #9ca3af; font-size: 12px; line-height: 1.6; margin: 0;">
              Vous recevez cet email parce que vous avez demandé cette étude sur le site Big Five.
              Vos informations servent uniquement à vous la transmettre.
            </p>
          </div>
          <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
            © ${new Date().getFullYear()} Big Five — Laissez votre empreinte
          </p>
        </div>
      `,
    })

    return result?.ok === false
      ? { ok: false, error: (result as any)?.error || 'Envoi échoué' }
      : { ok: true }
  } catch (error: any) {
    console.error('Erreur envoi email étude:', error?.message || error)
    return { ok: false, error: error?.message || 'Envoi échoué' }
  }
}
