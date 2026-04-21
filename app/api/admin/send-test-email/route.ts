import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(request: NextRequest) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { email, name } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 })
    }

    const { data, error } = await resend.emails.send({
      from: 'Laveiye <onboarding@resend.dev>',
      to: email,
      subject: 'Test - Laveiye',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #F2B33D; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Laveiye</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">Creative Library</p>
          </div>
          <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="color: #0F0F0F; margin: 0 0 12px;">Salut ${name || 'there'} !</h2>
            <p style="color: #4b5563; line-height: 1.6;">
              Ceci est un email de test envoyé depuis l'administration Laveiye.
              Si tu reçois cet email, Resend fonctionne correctement.
            </p>
            <div style="background: #10B981; color: white; padding: 12px 20px; border-radius: 8px; text-align: center; margin: 20px 0; font-weight: bold;">
              Resend OK
            </div>
            <p style="color: #9ca3af; font-size: 12px; margin: 16px 0 0;">
              Envoyé le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      `,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data?.id })
  } catch (err) {
    console.error('Send test email error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
