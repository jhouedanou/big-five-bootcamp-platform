import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { z } from "zod"

const userUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(["user", "admin", "moderator"]).optional(),
  plan: z.enum(["free", "premium", "enterprise"]).optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
})

// GET - Détails d'un utilisateur
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      )
    }

    // Les utilisateurs peuvent voir leur propre profil, les admins peuvent voir tous
    if (session.user.id !== params.id && session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 403 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        plan: true,
        status: true,
        createdAt: true,
        image: true,
        subscription: true,
        _count: {
          select: {
            favorites: true,
            contentViews: true,
          }
        }
      }
    })

    if (!user) {
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      )
    }

    // Vérifier les permissions
    const isAdmin = session.user.role === "admin"
    const isSelf = session.user.id === params.id

    if (!isAdmin && !isSelf) {
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

    const data = validation.data

    // Seuls les admins peuvent modifier le rôle, plan et status
    if (!isAdmin) {
      delete data.role
      delete data.plan
      delete data.status
    }

    // Hasher le mot de passe si fourni
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 12)
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        plan: true,
        status: true,
        createdAt: true,
      }
    })

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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      )
    }

    // Empêcher la suppression de son propre compte admin
    if (session.user.id === params.id) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas supprimer votre propre compte" },
        { status: 400 }
      )
    }

    await prisma.user.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: "Utilisateur supprimé" })

  } catch (error) {
    console.error("User DELETE error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression" },
      { status: 500 }
    )
  }
}
