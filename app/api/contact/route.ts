import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { verifyHCaptcha } from '@/lib/hcaptcha'

// Valeurs par défaut
// IMPORTANT : Avec onboarding@resend.dev, Resend n'envoie qu'au propriétaire du compte.
// Pour envoyer à d'autres destinataires, vérifiez un domaine sur resend.com/domains
const DEFAULT_TO_EMAIL = process.env.CONTACT_TO_EMAIL || 'analyticsbigfive@gmail.com'
const DEFAULT_FROM_EMAIL = process.env.CONTACT_FROM_EMAIL || 'Laveiye <onboarding@resend.dev>'

// Récupérer les adresses email depuis Supabase (configurable depuis l'admin)
async function getContactEmails() {
  try {
    const supabase = getSupabaseAdmin()
    const { data } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['contact_to_email', 'contact_from_email'])

    const settings: Record<string, string> = {}
    data?.forEach((row: { key: string; value: string }) => {
      settings[row.key] = row.value
    })

    return {
      to: settings.contact_to_email || DEFAULT_TO_EMAIL,
      from: settings.contact_from_email || DEFAULT_FROM_EMAIL,
    }
  } catch {
    return { to: DEFAULT_TO_EMAIL, from: DEFAULT_FROM_EMAIL }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { firstName, lastName, email, message, captchaToken } = await request.json()

    if (!firstName || !lastName || !email || !message) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis' },
        { status: 400 }
      )
    }

    // Vérification hCaptcha
    if (captchaToken) {
      const captchaResult = await verifyHCaptcha(captchaToken)
      if (!captchaResult.success) {
        return NextResponse.json(
          { error: captchaResult.error || 'Vérification captcha échouée' },
          { status: 400 }
        )
      }
    } else if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'Token captcha manquant' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Adresse email invalide' },
        { status: 400 }
      )
    }

    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY non configurée')
      return NextResponse.json(
        { error: 'Service email non configuré' },
        { status: 500 }
      )
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const contactEmails = await getContactEmails()

    // 1. Email principal à l'équipe
    const { data, error } = await resend.emails.send({
      from: contactEmails.from,
      to: contactEmails.to,
      replyTo: email,
      subject: `Nouveau message de ${firstName} ${lastName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #80368D; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Laveiye</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">Nouveau message de contact</p>
          </div>
          <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="color: #1A1F2B; margin: 0 0 16px;">Message de ${firstName} ${lastName}</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
              <tr>
                <td style="padding: 8px 12px; background: #e5e7eb; border-radius: 6px 0 0 0; font-weight: 600; color: #374151; width: 100px;">Nom</td>
                <td style="padding: 8px 12px; background: #f3f4f6; border-radius: 0 6px 0 0; color: #4b5563;">${firstName} ${lastName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; background: #e5e7eb; font-weight: 600; color: #374151;">Email</td>
                <td style="padding: 8px 12px; background: #f3f4f6; color: #4b5563;"><a href="mailto:${email}" style="color: #80368D;">${email}</a></td>
              </tr>
            </table>
            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-top: 12px;">
              <p style="color: #374151; font-weight: 600; margin: 0 0 8px;">Message :</p>
              <p style="color: #4b5563; line-height: 1.6; margin: 0; white-space: pre-wrap;">${message}</p>
            </div>
            <p style="color: #9ca3af; font-size: 12px; margin: 16px 0 0;">
              Reçu le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      `,
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json(
        { error: "Erreur lors de l'envoi de l'email" },
        { status: 500 }
      )
    }

    // 2. Accusé de réception à l'expéditeur (non bloquant)
    try {
      await resend.emails.send({
        from: contactEmails.from,
        to: email,
        subject: 'Confirmation : nous avons bien reçu votre message',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #80368D; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Laveiye</h1>
              <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">Accusé de réception</p>
            </div>
            <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <h2 style="color: #1A1F2B; margin: 0 0 16px;">Merci ${firstName} !</h2>
              <p style="color: #4b5563; line-height: 1.6;">
                Nous avons bien reçu votre message et nous vous répondrons dans les plus brefs délais.
              </p>
              <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="color: #374151; font-weight: 600; margin: 0 0 8px;">Récapitulatif de votre message :</p>
                <p style="color: #4b5563; line-height: 1.6; margin: 0; white-space: pre-wrap;">${message}</p>
              </div>
              <p style="color: #4b5563; line-height: 1.6; margin: 16px 0 0;">
                À très bientôt,<br />
                <strong>L'équipe Laveiye</strong>
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Cet email est un accusé de réception automatique. Merci de ne pas y répondre directement.
              </p>
            </div>
          </div>
        `,
      })
    } catch (confirmError) {
      console.error('Erreur envoi accusé de réception:', confirmError)
    }

    return NextResponse.json({ success: true, id: data?.id })
  } catch (err) {
    console.error('Contact form error:', err)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
