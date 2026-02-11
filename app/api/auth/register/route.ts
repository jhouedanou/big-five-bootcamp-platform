import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from '@supabase/supabase-js'

const registerSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
})

// Client avec anon key pour l'inscription auth
const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Client avec service role key pour bypasser le RLS et insérer dans public.users
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

    // Créer l'utilisateur dans Supabase Auth
    const { data: authData, error: authError } = await supabaseAuth.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        return NextResponse.json(
          { error: "Un compte avec cet email existe déjà" },
          { status: 400 }
        )
      }
      throw authError
    }

    if (!authData.user) {
      throw new Error("Erreur lors de la création du compte")
    }

    // Créer le profil dans la table users (avec service role pour bypasser RLS)
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        name,
        role: 'user',
        plan: 'Free',
        status: 'active',
      })

    if (profileError) {
      console.error("Profile creation error:", profileError)
      // L'utilisateur auth est créé mais le profil a échoué - pas bloquant
    }

    return NextResponse.json({
      message: "Compte créé avec succès",
      user: {
        id: authData.user.id,
        email,
        name,
      }
    }, { status: 201 })

  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création du compte" },
      { status: 500 }
    )
  }
}
