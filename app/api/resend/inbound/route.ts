import { NextRequest, NextResponse } from 'next/server'
import { Resend, type WebhookEventPayload } from 'resend'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_FORWARD_TO = 'cossi@bigfiveabidjan.com'
const DEFAULT_FORWARD_FROM = 'Laveiye Support <support@laveiye.com>'
const DEFAULT_ALLOWED_RECIPIENTS = ['support@laveiye.com']

let resendClient: Resend | null = null

function getResend() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured')
  }

  if (!resendClient) {
    resendClient = new Resend(apiKey)
  }

  return resendClient
}

function splitEmailList(value: string | undefined, fallback: string[]) {
  const emails = (value || '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean)

  return emails.length > 0 ? emails : fallback
}

function normalizeEmail(value: string) {
  const match = value.match(/<([^>]+)>/)
  return (match?.[1] || value).trim().toLowerCase()
}

async function getForwardRecipients() {
  const envFallback = splitEmailList(process.env.RESEND_INBOUND_FORWARD_TO, [DEFAULT_FORWARD_TO])

  try {
    const admin = getSupabaseAdmin()
    const { data } = await admin
      .from('site_settings')
      .select('value')
      .eq('key', 'resend_inbound_forward_to')
      .maybeSingle<{ value: string | null }>()

    return splitEmailList(data?.value || undefined, envFallback)
  } catch (error) {
    console.warn('[resend/inbound] forward recipient setting unavailable:', error)
    return envFallback
  }
}

export async function POST(request: NextRequest) {
  const payload = await request.text()
  const id = request.headers.get('svix-id')
  const timestamp = request.headers.get('svix-timestamp')
  const signature = request.headers.get('svix-signature')

  if (!id || !timestamp || !signature) {
    return NextResponse.json({ error: 'Missing Resend webhook headers' }, { status: 400 })
  }

  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: 'RESEND_WEBHOOK_SECRET is not configured' }, { status: 500 })
  }

  let event: WebhookEventPayload
  try {
    event = getResend().webhooks.verify({
      payload,
      headers: { id, timestamp, signature },
      webhookSecret,
    }) as WebhookEventPayload
  } catch (error) {
    console.error('[resend/inbound] invalid webhook signature:', error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type !== 'email.received') {
    return NextResponse.json({ ok: true, skipped: 'unsupported_event' })
  }

  const allowedRecipients = splitEmailList(
    process.env.RESEND_INBOUND_ALLOWED_RECIPIENTS,
    DEFAULT_ALLOWED_RECIPIENTS,
  ).map(normalizeEmail)
  const receivedRecipients = event.data.to.map(normalizeEmail)

  const shouldForward = receivedRecipients.some((recipient) =>
    allowedRecipients.includes(recipient),
  )

  if (!shouldForward) {
    return NextResponse.json({
      ok: true,
      skipped: 'recipient_not_allowed',
      recipients: receivedRecipients,
    })
  }

  const forwardTo = await getForwardRecipients()
  const forwardFrom = process.env.RESEND_INBOUND_FORWARD_FROM || DEFAULT_FORWARD_FROM

  const { data, error } = await getResend().emails.receiving.forward({
    emailId: event.data.email_id,
    to: forwardTo,
    from: forwardFrom,
  })

  if (error) {
    console.error('[resend/inbound] forward failed:', error)
    return NextResponse.json({ error: error.message }, { status: 502 })
  }

  return NextResponse.json({
    ok: true,
    forwardedId: data?.id,
    forwardedTo: forwardTo,
  })
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: '/api/resend/inbound',
    event: 'email.received',
  })
}
