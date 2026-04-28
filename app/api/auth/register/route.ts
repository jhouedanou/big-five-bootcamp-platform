export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from '@supabase/supabase-js'
import { verifyTurnstileToken } from "@/lib/turnstile"

const registerSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  turnstileToken: z.string().min(1, "Vérification anti-bot requise"),
})

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

    const { name, email, password, turnstileToken } = validation.data

    const remoteIp =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      undefined
    const turnstile = await verifyTurnstileToken(turnstileToken, remoteIp)
    if (!turnstile.success) {
      return NextResponse.json(
        {
          error: "Vérification anti-bot échouée. Veuillez réessayer.",
          details: turnstile.errorCodes?.join(", "),
        },
        { status: 400 }
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
