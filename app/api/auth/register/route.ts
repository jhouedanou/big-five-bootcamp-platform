export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from '@supabase/supabase-js'
import { isDisposableEmail } from '@/lib/disposable-emails'

const registerSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  website: z.string().optional(),
  elapsedMs: z.number().optional(),
})

// Rate limit en mémoire : max 5 tentatives par IP / 10 minutes
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX = 5
const MIN_FORM_TIME_MS = 1500
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

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const validation = registerSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { name, email, password, website, elapsedMs } = validation.data

    // Refuser les domaines d'emails jetables / temporaires
    if (isDisposableEmail(email)) {
      return NextResponse.json(
        {
          error:
            "Les adresses email jetables ne sont pas acceptées. Merci d'utiliser une adresse email personnelle ou professionnelle valide.",
        },
        { status: 400 }
      )
    }

    // Honeypot : champ "website" doit rester vide. Si rempli → bot.
    if (website && website.trim().length > 0) {
      return NextResponse.json({ message: "Compte créé avec succès" }, { status: 201 })
    }

    // Anti-bot temporel : un humain met au moins 1.5s à remplir le formulaire
    if (typeof elapsedMs === "number" && elapsedMs < MIN_FORM_TIME_MS) {
      return NextResponse.json({ message: "Compte créé avec succès" }, { status: 201 })
    }

    // Rate limiting par IP
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

    // Création du compte via l'admin API avec email_confirm: true
    // → l'utilisateur est immédiatement actif, pas de vérification email
    const supabaseAdmin = getSupabaseAdmin()

    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    })

    if (createError) {
      console.error("CreateUser error:", createError.message)

      if (createError.message.toLowerCase().includes('already') ||
          createError.message.toLowerCase().includes('exists') ||
          createError.message.toLowerCase().includes('registered')) {
        return NextResponse.json(
          { error: "Un compte avec cet email existe déjà" },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: createError.message || "Erreur lors de la création du compte" },
        { status: 500 }
      )
    }

    if (!createData.user) {
      return NextResponse.json(
        { error: "Erreur lors de la création du compte" },
        { status: 500 }
      )
    }

    // Créer le profil dans la table users via service role (bypass RLS)
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: createData.user.id,
        email,
        name,
        role: 'user',
        plan: 'Free',
        status: 'active',
      })

    if (profileError) {
      console.error("Profile creation error:", profileError.message)
      // Non bloquant — le profil sera créé au premier login si nécessaire
    }

    return NextResponse.json({
      message: "Compte créé avec succès",
      needsEmailConfirmation: false,
      user: {
        id: createData.user.id,
        email,
        name,
      }
    }, { status: 201 })

  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la création du compte" },
      { status: 500 }
    )
  }
}
