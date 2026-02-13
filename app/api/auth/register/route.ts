import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from '@supabase/supabase-js'

const registerSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
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

    const { name, email, password } = validation.data
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://v0-big-five-bootcamp-platform.vercel.app'

    // Méthode principale : signUp() pour que Supabase envoie l'email de confirmation
    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: signUpData, error: signUpError } = await supabaseAnon.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${appUrl}/auth/callback`,
      },
    })

    if (signUpError) {
      console.error("SignUp error:", signUpError.message)

      if (signUpError.message.includes('already registered') || 
          signUpError.message.includes('already been registered') ||
          signUpError.message.includes('already exists')) {
        return NextResponse.json(
          { error: "Un compte avec cet email existe déjà" },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: signUpError.message || "Erreur lors de la création du compte" },
        { status: 500 }
      )
    }

    // Supabase peut retourner un user avec identities vide si l'email existe déjà
    // (quand "Confirm email" est activé et que l'user n'a pas confirmé)
    if (signUpData.user && signUpData.user.identities && signUpData.user.identities.length === 0) {
      return NextResponse.json(
        { error: "Un compte avec cet email existe déjà" },
        { status: 400 }
      )
    }

    if (!signUpData.user) {
      return NextResponse.json(
        { error: "Erreur lors de la création du compte" },
        { status: 500 }
      )
    }

    // Créer le profil dans la table users via service role (bypass RLS)
    try {
      const supabaseAdmin = getSupabaseAdmin()
      const { error: profileError } = await supabaseAdmin
        .from('users')
        .insert({
          id: signUpData.user.id,
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
    } catch (profileErr) {
      console.error("Profile creation exception:", profileErr)
    }

    // Déterminer si un email de confirmation a été envoyé
    // Si signUpData.session est null, c'est que l'email doit être confirmé
    const needsEmailConfirmation = !signUpData.session

    return NextResponse.json({
      message: needsEmailConfirmation 
        ? "Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse email."
        : "Compte créé avec succès",
      needsEmailConfirmation,
      user: {
        id: signUpData.user.id,
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
