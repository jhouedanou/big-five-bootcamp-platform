export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server"
import { getAuthenticatedUser, getSupabaseAdmin } from "@/lib/supabase-server"
import { z } from "zod"

const userUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(["user", "admin"]).optional(),
  plan: z.enum(["Free", "Premium"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
})

// GET - Détails d'un utilisateur
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Dans Next.js 15+, params est une Promise
    const { id } = await params;
    const currentUser = await getAuthenticatedUser()
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      )
    }

    // Les utilisateurs peuvent voir leur propre profil, les admins peuvent voir tous
    if (currentUser.id !== id && !currentUser.isAdmin) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdmin()
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      )
    }

    return NextResponse.json({ user })

  } catch (error) {
    console.error("User GET error:", error)
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

// PATCH - Mettre à jour un utilisateur
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Dans Next.js 15+, params est une Promise
    const { id } = await params;
    const currentUser = await getAuthenticatedUser()
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      )
    }

    const isSelf = currentUser.id === id

    if (!currentUser.isAdmin && !isSelf) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validation = userUpdateSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const data: any = { ...validation.data }

    // Seuls les admins peuvent modifier le rôle, plan et status
    if (!currentUser.isAdmin) {
      delete data.role
      delete data.plan
      delete data.status
    }

    const supabase = getSupabaseAdmin()
    const { data: user, error } = await supabase
      .from('users')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ user })

  } catch (error) {
    console.error("User PATCH error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour" },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un utilisateur (admin uniquement)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Dans Next.js 15+, params est une Promise
    const { id } = await params;
    const currentUser = await getAuthenticatedUser()
    
    if (!currentUser || !currentUser.isAdmin) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      )
    }

    // Empêcher la suppression de son propre compte admin
    if (currentUser.id === id) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas supprimer votre propre compte" },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    
    // Supprimer le profil
    const { error: profileError } = await supabase
      .from('users')
      .delete()
      .eq('id', id)

    if (profileError) throw profileError

    // Supprimer l'utilisateur auth
    const { error: authError } = await supabase.auth.admin.deleteUser(id)
    if (authError) console.error("Auth deletion warning:", authError)

    return NextResponse.json({ message: "Utilisateur supprimé" })

  } catch (error) {
    console.error("User DELETE error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression" },
      { status: 500 }
    )
  }
}
