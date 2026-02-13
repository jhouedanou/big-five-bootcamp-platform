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

    let supabaseAdmin: any
    try {
      supabaseAdmin = getSupabaseAdmin()
    } catch (envError) {
      console.error("Missing env vars:", envError)
      return NextResponse.json(
        { error: "Configuration serveur manquante. Contactez l'administrateur." },
        { status: 500 }
      )
    }

    // Créer l'utilisateur via Admin API (service role) — plus fiable, pas besoin de confirmer l'email
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirmer l'email
      user_metadata: { name },
    })

    if (authError) {
      console.error("Auth signUp error:", authError.message)

      if (authError.message.includes('already registered') || 
          authError.message.includes('already been registered') ||
          authError.message.includes('already exists')) {
        return NextResponse.json(
          { error: "Un compte avec cet email existe déjà" },
          { status: 400 }
        )
      }
      
      // Si l'admin API échoue (service key invalide), fallback sur signUp classique
      console.warn("Admin API failed, falling back to signUp...")
      const supabaseAnon = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      const { data: fallbackData, error: fallbackError } = await supabaseAnon.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      })
      
      if (fallbackError) {
        console.error("Fallback signUp error:", fallbackError.message)
        
        if (fallbackError.message.includes('already registered') || 
            fallbackError.message.includes('already exists')) {
          return NextResponse.json(
            { error: "Un compte avec cet email existe déjà" },
            { status: 400 }
          )
        }
        
        return NextResponse.json(
          { error: fallbackError.message || "Erreur lors de la création du compte" },
          { status: 500 }
        )
      }
      
      if (!fallbackData.user) {
        return NextResponse.json(
          { error: "Erreur lors de la création du compte" },
          { status: 500 }
        )
      }

      // Créer le profil via l'anon key (peut échouer si RLS bloque)
      try {
        await supabaseAnon.from('users').insert({
          id: fallbackData.user.id,
          email,
          name,
          role: 'user',
          plan: 'Free',
          status: 'active',
        })
      } catch (profileErr) {
        console.error("Profile creation error (fallback):", profileErr)
      }

      return NextResponse.json({
        message: "Compte créé avec succès",
        user: {
          id: fallbackData.user.id,
          email,
          name,
        }
      }, { status: 201 })
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Erreur lors de la création du compte" },
        { status: 500 }
      )
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
      // L'utilisateur auth est créé mais le profil a échoué — pas bloquant,
      // le callback auth créera le profil à la prochaine connexion
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
      { error: error instanceof Error ? error.message : "Erreur lors de la création du compte" },
      { status: 500 }
    )
  }
}
