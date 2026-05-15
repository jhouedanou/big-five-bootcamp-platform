export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server"
import { createClient } from '@supabase/supabase-js'
import { z } from "zod"

const bodySchema = z.object({
  email: z.string().email("Email invalide"),
})

// Rate limit en mémoire : max 3 renvois / IP / 10 min
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX = 3
const ipAttempts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const entry = ipAttempts.get(ip)
  if (!entry || entry.resetAt < now) {
    ipAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true }
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }
  entry.count++
  return { allowed: true }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }
    const { email } = parsed.data

    const remoteIp =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown"
    const rate = checkRateLimit(remoteIp)
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Trop de tentatives. Réessayez dans ${rate.retryAfter}s.` },
        { status: 429, headers: { "Retry-After": String(rate.retryAfter ?? 60) } }
      )
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anonKey) {
      return NextResponse.json({ error: "Configuration Supabase manquante" }, { status: 500 })
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      new URL(request.url).origin
    const emailRedirectTo = `${siteUrl}/auth/callback?next=/dashboard`

    const supabase = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo },
    })

    if (error) {
      console.error("Resend confirmation error:", error.message)
      // Réponse générique pour éviter d'exposer si l'email existe ou non.
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Resend confirmation unexpected error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur inattendue" },
      { status: 500 }
    )
  }
}
