import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { z } from "zod"

// Schéma de validation
const userCreateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8).optional(),
  role: z.enum(["user", "admin", "moderator"]).optional(),
  plan: z.enum(["free", "premium", "enterprise"]).optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
})

// GET - Liste des utilisateurs (admin uniquement)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search") || ""
    const role = searchParams.get("role")
    const plan = searchParams.get("plan")
    const status = searchParams.get("status")

    const where: any = {}
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ]
    }
    
    if (role) where.role = role
    if (plan) where.plan = plan
    if (status) where.status = status

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          plan: true,
          status: true,
          createdAt: true,
          image: true,
          _count: {
            select: {
              favorites: true,
              contentViews: true,
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where })
    ])

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error("Users GET error:", error)
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

// POST - Créer un utilisateur (admin uniquement)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validation = userCreateSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { name, email, password, role, plan, status } = validation.data

    // Vérifier si l'utilisateur existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Cet email est déjà utilisé" },
        { status: 400 }
      )
    }

    const hashedPassword = password ? await bcrypt.hash(password, 12) : null

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || "user",
        plan: plan || "free",
        status: status || "active",
      },
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

    return NextResponse.json({ user }, { status: 201 })

  } catch (error) {
    console.error("Users POST error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création" },
      { status: 500 }
    )
  }
}
